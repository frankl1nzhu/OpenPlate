import type { Nutrients } from '../types'
import { EMPTY_NUTRIENTS, ALL_NUTRIENT_KEYS, NUTRIENT_LABELS, NUTRIENT_UNITS } from '../types'

const API_KEY = 'sk-af51d11f5ab7463896c85438490e7567'
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const MODEL = 'qwen3.6-flash'

// Build the nutrient field description for the prompt
const NUTRIENT_SPEC = ALL_NUTRIENT_KEYS.map(
  (k) => `"${k}": number // ${NUTRIENT_LABELS[k]} (${NUTRIENT_UNITS[k]})`,
).join('\n')

function buildFoodPrompt(description?: string): string {
  const descPart = description ? `用户描述：${description}\n` : ''
  return `你是一个专业的食物营养分析师。请根据图片${description ? '和用户描述' : ''}识别食物，并返回每100克该食物的营养成分数据。

${descPart}请返回严格的JSON格式（不要有其他文字），包含以下字段：
{
  "name": "食物名称",
  "isCompleteProtein": boolean, // 是否为完全蛋白来源（肉/蛋/奶/鱼/大豆/荞麦/藜麦/奇亚籽/火麻仁）
  "nutrients": {
${NUTRIENT_SPEC}
  }
}

注意：
- 蛋白质需要拆分为完全蛋白(completeProtein)和不完全蛋白(incompleteProtein)，根据isCompleteProtein决定归类
- 如果是完全蛋白来源，所有蛋白质放入completeProtein，incompleteProtein为0
- 如果不是完全蛋白来源，所有蛋白质放入incompleteProtein，completeProtein为0
- 所有数值都是每100克的含量
- 不确定的微量元素可以填0
- 只返回JSON，不要有任何其他文字`
}

function buildQuickRecordPrompt(description?: string): string {
  const descPart = description ? `用户描述：${description}\n` : ''
  return `你是一个专业的食物营养分析师。请根据图片${description ? '和用户描述' : ''}识别图中所有食物，并估算图中食物的总营养成分。

${descPart}请返回严格的JSON格式（不要有其他文字），包含以下字段：
{
  "name": "食物概述（简短描述，如'番茄炒蛋+米饭'）",
  "isCompleteProtein": boolean, // 主要蛋白来源是否为完全蛋白
  "nutrients": {
${NUTRIENT_SPEC}
  }
}

注意：
- 这是图中所有食物的总营养素，不是每100克
- 请估算图中食物的实际份量并计算总量
- 蛋白质需要拆分为完全蛋白(completeProtein)和不完全蛋白(incompleteProtein)
- 如果主要蛋白来源是完全蛋白（肉/蛋/奶/鱼/大豆等），大部分蛋白放入completeProtein
- 如果有混合来源，按比例分配
- 不确定的微量元素可以填0
- 只返回JSON，不要有任何其他文字`
}

export interface LLMFoodResult {
  name: string
  isCompleteProtein: boolean
  nutrients: Nutrients
}

async function callLLM(imageBase64: string, prompt: string): Promise<LLMFoodResult> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Extract JSON from response (might be wrapped in markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('LLM返回格式异常，无法解析')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate and build nutrients
  const nutrients: Nutrients = { ...EMPTY_NUTRIENTS }
  for (const key of ALL_NUTRIENT_KEYS) {
    const val = parsed.nutrients?.[key]
    if (typeof val === 'number' && !isNaN(val) && val >= 0) {
      nutrients[key] = Math.round(val * 10) / 10
    }
  }

  return {
    name: parsed.name || '未识别食物',
    isCompleteProtein: !!parsed.isCompleteProtein,
    nutrients,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Analyze food photo for creating a new food (per 100g nutrients) */
export async function analyzeFoodPhoto(imageFile: File, description?: string): Promise<LLMFoodResult> {
  const base64 = await fileToBase64(imageFile)
  return callLLM(base64, buildFoodPrompt(description))
}

/** Analyze food photo for quick record (total nutrients for the visible portion) */
export async function analyzeQuickRecordPhoto(imageFile: File, description?: string): Promise<LLMFoodResult> {
  const base64 = await fileToBase64(imageFile)
  return callLLM(base64, buildQuickRecordPrompt(description))
}

/** Same as analyzeFoodPhoto but accepts a base64 data URL directly (used when resuming after app close) */
export async function analyzeFoodPhotoFromDataURL(dataURL: string, description?: string): Promise<LLMFoodResult> {
  return callLLM(dataURL, buildFoodPrompt(description))
}

/** Same as analyzeQuickRecordPhoto but accepts a base64 data URL directly (used when resuming after app close) */
export async function analyzeQuickRecordPhotoFromDataURL(dataURL: string, description?: string): Promise<LLMFoodResult> {
  return callLLM(dataURL, buildQuickRecordPrompt(description))
}

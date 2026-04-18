import {
  ALL_NUTRIENT_KEYS,
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
} from "./types";

const NUTRIENT_SPEC = ALL_NUTRIENT_KEYS.map(
  (k) => `"${k}": number // ${NUTRIENT_LABELS[k]} (${NUTRIENT_UNITS[k]})`,
).join("\n");

export function buildFoodPrompt(description?: string): string {
  const descPart = description ? `用户描述：${description}\n` : "";
  return `你是一个专业的食物营养分析师。请根据图片${description ? "和用户描述" : ""}识别食物，并返回每100克该食物的营养成分数据。

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
- 只返回JSON，不要有任何其他文字`;
}

export function buildQuickRecordPrompt(description?: string): string {
  const descPart = description ? `用户描述：${description}\n` : "";
  return `你是一个专业的食物营养分析师。请根据图片${description ? "和用户描述" : ""}识别图中所有食物，并估算图中食物的总营养成分。

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
- 只返回JSON，不要有任何其他文字`;
}

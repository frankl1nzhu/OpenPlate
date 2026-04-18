import {
  ALL_NUTRIENT_KEYS,
  EMPTY_NUTRIENTS,
  type LLMFoodResult,
  type Nutrients,
} from "./types";

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const MODEL = "qwen3.6-flash";

export async function callQwenVision(
  apiKey: string,
  imageBase64: string,
  prompt: string,
): Promise<LLMFoodResult> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM返回格式异常，无法解析");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    name?: string;
    isCompleteProtein?: boolean;
    nutrients?: Record<string, number>;
  };

  const nutrients: Nutrients = { ...EMPTY_NUTRIENTS };
  for (const key of ALL_NUTRIENT_KEYS) {
    const val = parsed.nutrients?.[key];
    if (typeof val === "number" && !isNaN(val) && val >= 0) {
      nutrients[key] = Math.round(val * 10) / 10;
    }
  }

  return {
    name: parsed.name || "未识别食物",
    isCompleteProtein: !!parsed.isCompleteProtein,
    nutrients,
  };
}

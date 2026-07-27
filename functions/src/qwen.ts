import OpenAI from "openai";
import {
  ALL_NUTRIENT_KEYS,
  EMPTY_NUTRIENTS,
  type LLMFoodResult,
  type Nutrients,
} from "./types";

const BASE_URL = "https://ws-bwhyg6lccvwumx18.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";
const MODEL = "qwen3.7-max";

export async function callQwenVision(
  apiKey: string,
  imageBase64: string,
  prompt: string,
): Promise<LLMFoodResult> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: BASE_URL,
  });

  const completion = await client.chat.completions.create({
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
    extra_body: {
      enable_thinking: true,
    },
  } as any);

  const content = completion.choices?.[0]?.message?.content || "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM返回格式异常，无法解析: " + content);
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

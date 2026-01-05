import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { ProviderProcessor, ProviderConfig, ScenarioInput } from "./types";

function getImageBase64(imageName: string): string {
  const imagePath = path.join(process.cwd(), "client", "public", "scenarios", imageName);
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
}

function normalizeLabel(aiLabel: string): string {
  if (aiLabel.includes("Allowed")) return "Allowed";
  if (aiLabel.includes("Prohibited")) return "Prohibited";
  if (aiLabel.includes("Disturbing")) return "Disturbing";
  return "Unknown";
}

export const defaultProviderConfigs: Record<string, ProviderConfig> = {
  openai: {
    name: "openai",
    maxConcurrent: 2,
    cooldownMs: 500,
    isEnabled: true,
  },
  anthropic: {
    name: "anthropic",
    maxConcurrent: 1,
    cooldownMs: 1000,
    isEnabled: true,
  },
};

export function createOpenAIProcessor(): ProviderProcessor {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const openai = new OpenAI({ apiKey });

  return {
    name: "openai",
    processScenario: async (scenario: ScenarioInput, prompt: string, model: string) => {
      const imageBase64 = getImageBase64(scenario.image);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 20,
        temperature: 0,
      });

      const aiLabel = response.choices[0]?.message?.content?.trim() || "Unknown";
      return {
        aiLabel,
        normalizedLabel: normalizeLabel(aiLabel),
      };
    },
  };
}

export function createAnthropicProcessor(): ProviderProcessor {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }
  const anthropic = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    processScenario: async (scenario: ScenarioInput, prompt: string, model: string) => {
      const imageBase64 = getImageBase64(scenario.image);
      
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageBase64,
                },
              },
              { type: "text", text: prompt }
            ]
          }
        ],
      });

      const aiLabel = (response.content[0] as any)?.text?.trim() || "Unknown";
      return {
        aiLabel,
        normalizedLabel: normalizeLabel(aiLabel),
      };
    },
  };
}

export function getProviderFromModel(model: string): string {
  if (model.startsWith("claude")) return "anthropic";
  return "openai";
}

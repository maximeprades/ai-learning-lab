import type { Express } from "express";
import { type Server } from "http";
import OpenAI from "openai";

const scenarios = [
  { id: 1, text: "A Golden Retriever sleeping on a rug.", expected: "Allowed" },
  { id: 2, text: "A sign that says 'Puppies for Sale - $500' next to a box of pups.", expected: "Prohibited" },
  { id: 3, text: "A wild wolf howling in the snow.", expected: "Prohibited" },
  { id: 4, text: "A dog with a bandage on its paw at a vet clinic.", expected: "Disturbing" },
  { id: 5, text: "A dog wearing a lion's mane costume for Halloween.", expected: "Allowed" },
  { id: 6, text: "A cartoon drawing of a blue dog.", expected: "Allowed" },
  { id: 7, text: "A dog baring its teeth and growling at a mailman.", expected: "Prohibited" },
  { id: 8, text: "A person holding a 'Free to Good Home - Adopt Me!' sign with a dog.", expected: "Allowed" },
  { id: 9, text: "A delicious hot dog (sausage in a bun) on a plate with mustard.", expected: "Prohibited" },
  { id: 10, text: "A therapy dog sitting quietly on a hospital bed with a patient.", expected: "Disturbing" },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/scenarios", (_req, res) => {
    res.json(scenarios.map(s => ({ id: s.id, text: s.text })));
  });

  app.post("/api/run-test", async (req, res) => {
    try {
      const { moderationInstructions } = req.body;

      if (!moderationInstructions || typeof moderationInstructions !== "string") {
        return res.status(400).json({ error: "Moderation instructions are required" });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });

      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          const prompt = `You are a content moderation AI. You must classify content based on the following moderation rules:

${moderationInstructions}

The possible labels are:
- ✅ Allowed
- 🚫 Prohibited  
- ⚠️ Disturbing

Content to classify: "${scenario.text}"

Only output the label name exactly as shown above (including the emoji). Do not include any other text.`;

          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 20,
              temperature: 0,
            });

            const aiLabel = response.choices[0]?.message?.content?.trim() || "Unknown";
            
            const normalizedAiLabel = aiLabel.includes("Allowed") ? "Allowed" 
              : aiLabel.includes("Prohibited") ? "Prohibited"
              : aiLabel.includes("Disturbing") ? "Disturbing"
              : "Unknown";

            return {
              id: scenario.id,
              text: scenario.text,
              expected: scenario.expected,
              aiLabel: aiLabel,
              normalizedLabel: normalizedAiLabel,
              isCorrect: normalizedAiLabel === scenario.expected,
            };
          } catch (error) {
            console.error(`Error processing scenario ${scenario.id}:`, error);
            return {
              id: scenario.id,
              text: scenario.text,
              expected: scenario.expected,
              aiLabel: "Error",
              normalizedLabel: "Error",
              isCorrect: false,
            };
          }
        })
      );

      const correctCount = results.filter(r => r.isCorrect).length;
      
      res.json({
        results,
        score: correctCount,
        total: scenarios.length,
      });
    } catch (error) {
      console.error("Error running test:", error);
      res.status(500).json({ error: "Failed to run test" });
    }
  });

  return httpServer;
}

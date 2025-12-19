import type { Express } from "express";
import { type Server } from "http";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "teacher123";

const scenarios = [
  { id: 1, text: "A Golden Retriever sleeping on a rug.", expected: "Allowed", image: "1-golden-retriever-sleeping.png" },
  { id: 2, text: "A sign that says 'Puppies for Sale - $500' next to a box of pups.", expected: "Prohibited", image: "2-puppies-for-sale.png" },
  { id: 3, text: "A wild wolf howling in the snow.", expected: "Prohibited", image: "3-wolf-howling.png" },
  { id: 4, text: "A dog with a bandage on its paw at a vet clinic.", expected: "Disturbing", image: "4-dog-at-vet.png" },
  { id: 5, text: "A dog wearing a lion's mane costume for Halloween.", expected: "Allowed", image: "5-dog-lion-costume.png" },
  { id: 6, text: "A cartoon drawing of a blue dog.", expected: "Allowed", image: "6-cartoon-blue-dog.png" },
  { id: 7, text: "A dog baring its teeth and growling at a mailman.", expected: "Prohibited", image: "7-aggressive-dog.png" },
  { id: 8, text: "A person holding a 'Free to Good Home - Adopt Me!' sign with a dog.", expected: "Allowed", image: "8-adopt-me-sign.png" },
  { id: 9, text: "A delicious hot dog (sausage in a bun) on a plate with mustard.", expected: "Prohibited", image: "9-hot-dog.png" },
  { id: 10, text: "A therapy dog sitting quietly on a hospital bed with a patient.", expected: "Allowed", image: "10-therapy-dog.png" },
];

function getImageBase64(imageName: string): string {
  const imagePath = path.join(process.cwd(), "client", "public", "scenarios", imageName);
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
}

let wss: WebSocketServer;
const teacherClients = new Set<WebSocket>();

function broadcastToTeachers(data: any) {
  const message = JSON.stringify(data);
  teacherClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function broadcastStudentUpdate() {
  const students = await storage.getAllStudents();
  broadcastToTeachers({ type: "students_update", students });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "teacher_subscribe") {
          teacherClients.add(ws);
          const students = await storage.getAllStudents();
          ws.send(JSON.stringify({ type: "students_update", students }));
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });
    
    ws.on("close", () => {
      teacherClients.delete(ws);
    });
  });

  app.get("/api/scenarios", (_req, res) => {
    res.json(scenarios.map(s => ({ id: s.id, text: s.text })));
  });

  app.post("/api/verify-teacher", (req, res) => {
    const { password } = req.body;
    if (password === TEACHER_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  app.post("/api/student/login", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const student = await storage.getOrCreateStudent(email.toLowerCase().trim());
      await broadcastStudentUpdate();
      
      const versions = await storage.getPromptVersions(student.id);
      res.json({ 
        student,
        versions: versions.map(v => ({
          id: `v${v.versionNumber}`,
          versionNumber: v.versionNumber,
          text: v.text,
          score: v.score,
          timestamp: v.createdAt
        }))
      });
    } catch (error) {
      console.error("Student login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/teacher/students", async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ error: "Failed to get students" });
    }
  });

  app.delete("/api/teacher/students/:id", async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: "Invalid student ID" });
      }
      
      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      await storage.deleteStudent(studentId);
      await broadcastStudentUpdate();
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete student error:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  app.get("/api/app-lock", async (_req, res) => {
    try {
      const isLocked = await storage.isAppLocked();
      res.json({ isLocked });
    } catch (error) {
      console.error("Get lock status error:", error);
      res.json({ isLocked: false });
    }
  });

  app.post("/api/teacher/toggle-lock", async (req, res) => {
    try {
      const { locked } = req.body;
      await storage.setAppLocked(locked);
      res.json({ success: true, isLocked: locked });
    } catch (error) {
      console.error("Toggle lock error:", error);
      res.status(500).json({ error: "Failed to toggle lock" });
    }
  });

  app.post("/api/run-test", async (req, res) => {
    try {
      const { moderationInstructions, email } = req.body;

      if (!moderationInstructions || typeof moderationInstructions !== "string") {
        return res.status(400).json({ error: "Moderation instructions are required" });
      }

      let student = null;
      if (email) {
        student = await storage.getOrCreateStudent(email.toLowerCase().trim());
        await storage.setStudentRunningTest(email.toLowerCase().trim(), true);
        await broadcastStudentUpdate();
      }

      const isLocked = await storage.isAppLocked();
      if (isLocked && moderationInstructions.trim().toLowerCase() !== "test") {
        if (student && email) {
          await storage.setStudentRunningTest(email.toLowerCase().trim(), false);
          await broadcastStudentUpdate();
        }
        return res.status(403).json({ error: "The app is currently locked by the teacher. Please wait until it's unlocked to run tests." });
      }

      if (moderationInstructions.trim().toLowerCase() === "test") {
        const dummyLabels = ["✅ Allowed", "🚫 Prohibited", "⚠️ Disturbing"];
        const dummyResults = scenarios.map((scenario) => {
          const randomLabel = dummyLabels[Math.floor(Math.random() * 3)];
          const normalizedLabel = randomLabel.includes("Allowed") ? "Allowed" 
            : randomLabel.includes("Prohibited") ? "Prohibited"
            : "Disturbing";
          return {
            id: scenario.id,
            text: scenario.text,
            expected: scenario.expected,
            aiLabel: randomLabel,
            normalizedLabel: normalizedLabel,
            isCorrect: normalizedLabel === scenario.expected,
          };
        });

        const correctCount = dummyResults.filter(r => r.isCorrect).length;

        if (student && email) {
          const emailLower = email.toLowerCase().trim();
          await storage.setStudentRunningTest(emailLower, false);
          await broadcastStudentUpdate();
        }

        return res.json({
          results: dummyResults,
          score: correctCount,
          total: scenarios.length,
        });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });

      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          try {
            const imageBase64 = getImageBase64(scenario.image);
            
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `${moderationInstructions}

The possible labels are:
- ✅ Allowed
- 🚫 Prohibited  
- ⚠️ Disturbing

Also describe each image in a short 13 words maximum description.`
                    },
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

      if (student && email) {
        const emailLower = email.toLowerCase().trim();
        await storage.setStudentRunningTest(emailLower, false);
        await storage.updateStudentScore(emailLower, correctCount);
        
        const versions = await storage.getPromptVersions(student.id);
        const existingVersion = versions.find(v => v.text === moderationInstructions.trim());
        
        if (!existingVersion) {
          const newVersionNumber = versions.length + 1;
          await storage.savePromptVersion(student.id, newVersionNumber, moderationInstructions.trim(), correctCount);
          await storage.incrementPromptCount(emailLower);
        }
        
        await broadcastStudentUpdate();
      }
      
      res.json({
        results,
        score: correctCount,
        total: scenarios.length,
      });
    } catch (error) {
      console.error("Error running test:", error);
      
      const { email } = req.body;
      if (email) {
        await storage.setStudentRunningTest(email.toLowerCase().trim(), false);
        await broadcastStudentUpdate();
      }
      
      res.status(500).json({ error: "Failed to run test" });
    }
  });

  return httpServer;
}

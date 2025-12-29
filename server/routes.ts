import type { Express } from "express";
import { type Server } from "http";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "teacher123";

const studentRateLimits = new Map<string, number>();
const studentInFlight = new Set<string>();
const RATE_LIMIT_MS = 5000;

let scenariosCache: any[] | null = null;
let templateCache: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000;

async function getCachedScenarios() {
  const now = Date.now();
  if (scenariosCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return scenariosCache;
  }
  scenariosCache = await getActiveScenarios();
  cacheTimestamp = now;
  return scenariosCache;
}

async function getCachedTemplate() {
  const now = Date.now();
  if (templateCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return templateCache;
  }
  const templateData = await storage.getPromptTemplate();
  templateCache = templateData?.template || DEFAULT_PROMPT_TEMPLATE;
  return templateCache;
}

function invalidateCache() {
  scenariosCache = null;
  templateCache = null;
  cacheTimestamp = 0;
}

function checkRateLimit(email: string): { allowed: boolean; reason?: string } {
  if (studentInFlight.has(email)) {
    return { allowed: false, reason: "You already have a test in progress. Please wait for it to complete." };
  }
  const now = Date.now();
  const lastRequest = studentRateLimits.get(email);
  if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
    return { allowed: false, reason: "Please wait a few seconds before running another test." };
  }
  return { allowed: true };
}

function markInFlight(email: string) {
  studentRateLimits.set(email, Date.now());
  studentInFlight.add(email);
}

function clearInFlight(email: string) {
  studentInFlight.delete(email);
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

const scenarioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), "client", "public", "scenarios");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `scenario-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP images are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const DEFAULT_PROMPT_TEMPLATE = `{{STUDENT_PROMPT}}

The possible labels are:
- ✅ Allowed
- 🚫 Prohibited  
- ⚠️ Disturbing

Respond with ONLY the label.`;

const defaultScenarios = [
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

async function broadcastPRStudentUpdate() {
  const prStudents = await storage.getAllPRStudents();
  broadcastToTeachers({ type: "pr_students_update", prStudents });
}

async function initializeDefaults() {
  const template = await storage.getPromptTemplate();
  if (!template) {
    await storage.setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
  }
  
  const existingScenarios = await storage.getScenarios();
  if (existingScenarios.length === 0) {
    for (let i = 0; i < defaultScenarios.length; i++) {
      const s = defaultScenarios[i];
      await storage.createScenario(s.text, s.expected, s.image, i + 1);
    }
  }
}

async function getActiveScenarios() {
  const dbScenarios = await storage.getScenarios();
  if (dbScenarios.length > 0) {
    return dbScenarios.map(s => ({
      id: s.id,
      text: s.text,
      expected: s.expected,
      image: s.imagePath
    }));
  }
  return defaultScenarios;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await initializeDefaults();
  
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    (ws as any).isAlive = true;
    
    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });
    
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "teacher_subscribe") {
          teacherClients.add(ws);
          const students = await storage.getAllStudents();
          ws.send(JSON.stringify({ type: "students_update", students }));
          const prStudents = await storage.getAllPRStudents();
          ws.send(JSON.stringify({ type: "pr_students_update", prStudents }));
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });
    
    ws.on("close", () => {
      teacherClients.delete(ws);
    });
    
    ws.on("error", () => {
      teacherClients.delete(ws);
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        teacherClients.delete(ws);
        return ws.terminate();
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  app.get("/api/scenarios", async (_req, res) => {
    const scenarios = await getActiveScenarios();
    res.json(scenarios.map(s => ({ id: s.id, text: s.text, image: s.image, expected: s.expected })));
  });

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const allStudents = await storage.getAllStudents();
      const leaderboard = allStudents
        .map(s => ({
          email: s.email,
          score: s.highestScore,
          promptCount: s.promptCount,
          hasAttempted: (s.promptCount ?? 0) > 0
        }))
        .sort((a, b) => {
          if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
          return (b.promptCount ?? 0) - (a.promptCount ?? 0);
        });
      res.json(leaderboard);
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.post("/api/pr/login", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const student = await storage.getOrCreatePRStudent(email.toLowerCase().trim());
      await broadcastPRStudentUpdate();
      res.json({ student });
    } catch (error) {
      console.error("PR student login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/pr/submit-score", async (req, res) => {
    try {
      const { email, score } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      if (typeof score !== "number") {
        return res.status(400).json({ error: "Score is required" });
      }
      
      await storage.updatePRStudentScore(email.toLowerCase().trim(), score);
      await broadcastPRStudentUpdate();
      res.json({ success: true });
    } catch (error) {
      console.error("PR submit score error:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.get("/api/pr/leaderboard", async (_req, res) => {
    try {
      const students = await storage.getAllPRStudents();
      res.json(students);
    } catch (error) {
      console.error("Get PR leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.get("/api/teacher/pr-students", async (_req, res) => {
    try {
      const students = await storage.getAllPRStudents();
      res.json(students);
    } catch (error) {
      console.error("Get PR students error:", error);
      res.status(500).json({ error: "Failed to get students" });
    }
  });

  app.delete("/api/teacher/pr-students/:id", async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: "Invalid student ID" });
      }
      
      await storage.deletePRStudent(studentId);
      await broadcastPRStudentUpdate();
      res.json({ success: true });
    } catch (error) {
      console.error("Delete PR student error:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
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

  app.get("/api/teacher/prompt-template", async (_req, res) => {
    try {
      const template = await storage.getPromptTemplate();
      res.json({ 
        template: template?.template || DEFAULT_PROMPT_TEMPLATE,
        defaultTemplate: DEFAULT_PROMPT_TEMPLATE
      });
    } catch (error) {
      console.error("Get prompt template error:", error);
      res.status(500).json({ error: "Failed to get prompt template" });
    }
  });

  app.put("/api/teacher/prompt-template", async (req, res) => {
    try {
      const { template } = req.body;
      if (!template || typeof template !== "string") {
        return res.status(400).json({ error: "Template is required" });
      }
      if (!template.includes("{{STUDENT_PROMPT}}")) {
        return res.status(400).json({ error: "Template must include {{STUDENT_PROMPT}} placeholder" });
      }
      await storage.setPromptTemplate(template);
      invalidateCache();
      res.json({ success: true });
    } catch (error) {
      console.error("Update prompt template error:", error);
      res.status(500).json({ error: "Failed to update prompt template" });
    }
  });

  app.get("/api/teacher/scenarios", async (_req, res) => {
    try {
      const scenarios = await getActiveScenarios();
      res.json(scenarios);
    } catch (error) {
      console.error("Get scenarios error:", error);
      res.status(500).json({ error: "Failed to get scenarios" });
    }
  });

  app.post("/api/teacher/scenarios", scenarioUpload.single("image"), async (req, res) => {
    try {
      const { text, expected } = req.body;
      const file = req.file;
      
      if (!text || !expected || !file) {
        return res.status(400).json({ error: "Text, expected label, and image are required" });
      }
      
      if (!["Allowed", "Prohibited", "Disturbing"].includes(expected)) {
        return res.status(400).json({ error: "Expected must be Allowed, Prohibited, or Disturbing" });
      }
      
      const existingScenarios = await storage.getScenarios();
      const sortOrder = existingScenarios.length + 1;
      
      const scenario = await storage.createScenario(text, expected, file.filename, sortOrder);
      invalidateCache();
      res.json(scenario);
    } catch (error) {
      console.error("Create scenario error:", error);
      res.status(500).json({ error: "Failed to create scenario" });
    }
  });

  app.put("/api/teacher/scenarios/:id", scenarioUpload.single("image"), async (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      if (isNaN(scenarioId)) {
        return res.status(400).json({ error: "Invalid scenario ID" });
      }
      
      const existing = await storage.getScenario(scenarioId);
      if (!existing) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      
      const { text, expected } = req.body;
      const file = req.file;
      
      const updates: Partial<{ text: string; expected: string; imagePath: string }> = {};
      
      if (text) updates.text = text;
      if (expected) {
        if (!["Allowed", "Prohibited", "Disturbing"].includes(expected)) {
          return res.status(400).json({ error: "Expected must be Allowed, Prohibited, or Disturbing" });
        }
        updates.expected = expected;
      }
      if (file) {
        const oldImagePath = path.join(process.cwd(), "client", "public", "scenarios", existing.imagePath);
        if (fs.existsSync(oldImagePath) && !existing.imagePath.match(/^\d+-/)) {
          fs.unlinkSync(oldImagePath);
        }
        updates.imagePath = file.filename;
      }
      
      const scenario = await storage.updateScenario(scenarioId, updates);
      invalidateCache();
      res.json(scenario);
    } catch (error) {
      console.error("Update scenario error:", error);
      res.status(500).json({ error: "Failed to update scenario" });
    }
  });

  app.delete("/api/teacher/scenarios/:id", async (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      if (isNaN(scenarioId)) {
        return res.status(400).json({ error: "Invalid scenario ID" });
      }
      
      const existing = await storage.getScenario(scenarioId);
      if (!existing) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      
      const imagePath = path.join(process.cwd(), "client", "public", "scenarios", existing.imagePath);
      if (fs.existsSync(imagePath) && !existing.imagePath.match(/^\d+-/)) {
        fs.unlinkSync(imagePath);
      }
      
      await storage.deleteScenario(scenarioId);
      invalidateCache();
      res.json({ success: true });
    } catch (error) {
      console.error("Delete scenario error:", error);
      res.status(500).json({ error: "Failed to delete scenario" });
    }
  });

  app.post("/api/run-test", async (req, res) => {
    try {
      const { moderationInstructions, email, model = "gpt-4o-mini" } = req.body;

      if (!moderationInstructions || typeof moderationInstructions !== "string") {
        return res.status(400).json({ error: "Moderation instructions are required" });
      }

      const emailLower = email?.toLowerCase().trim();
      
      if (emailLower && moderationInstructions.trim().toLowerCase() !== "test") {
        const rateCheck = checkRateLimit(emailLower);
        if (!rateCheck.allowed) {
          return res.status(429).json({ error: rateCheck.reason });
        }
        markInFlight(emailLower);
      }

      let student = null;
      if (emailLower) {
        student = await storage.getOrCreateStudent(emailLower);
        await storage.setStudentRunningTest(emailLower, true);
        await broadcastStudentUpdate();
      }

      const isLocked = await storage.isAppLocked();
      if (isLocked && moderationInstructions.trim().toLowerCase() !== "test") {
        if (student && emailLower) {
          await storage.setStudentRunningTest(emailLower, false);
          clearInFlight(emailLower);
          await broadcastStudentUpdate();
        }
        return res.status(403).json({ error: "The app is currently locked by the teacher. Please wait until it's unlocked to run tests." });
      }

      const scenarios = await getCachedScenarios();
      const promptTemplate = await getCachedTemplate();
      const fullPrompt = promptTemplate.replace("{{STUDENT_PROMPT}}", moderationInstructions);

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

      const isAnthropicModel = model.startsWith("claude");
      
      if (isAnthropicModel) {
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
          if (emailLower) clearInFlight(emailLower);
          return res.status(500).json({ error: "Anthropic API key not configured" });
        }

        const anthropic = new Anthropic({ apiKey: anthropicApiKey });

        const results = await Promise.all(
          scenarios.map(async (scenario) => {
            try {
              const imageBase64 = getImageBase64(scenario.image);
              
              const response = await retryWithBackoff(() => anthropic.messages.create({
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
                      {
                        type: "text",
                        text: fullPrompt
                      }
                    ]
                  }
                ],
              }));

              const aiLabel = (response.content[0] as any)?.text?.trim() || "Unknown";
              
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

        if (student && emailLower) {
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
          clearInFlight(emailLower);
        }
        
        return res.json({
          results,
          score: correctCount,
          total: scenarios.length,
        });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        if (emailLower) clearInFlight(emailLower);
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey });

      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          try {
            const imageBase64 = getImageBase64(scenario.image);
            
            const response = await retryWithBackoff(() => openai.chat.completions.create({
              model: model,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: fullPrompt
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
            }));

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

      if (student && emailLower) {
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
        clearInFlight(emailLower);
      }
      
      res.json({
        results,
        score: correctCount,
        total: scenarios.length,
      });
    } catch (error: any) {
      console.error("Error running test:", error);
      if (req.body.email) {
        clearInFlight(req.body.email.toLowerCase().trim());
      }
      
      const { email } = req.body;
      if (email) {
        await storage.setStudentRunningTest(email.toLowerCase().trim(), false);
        await broadcastStudentUpdate();
      }
      
      // Check for insufficient credits/quota errors
      const errorMessage = error?.message?.toLowerCase() || "";
      const errorType = error?.error?.type || error?.type || "";
      const errorCode = error?.code || error?.error?.code || "";
      
      // Anthropic insufficient balance
      if (errorType === "insufficient_balance_error" || 
          errorMessage.includes("credit balance is too low") ||
          errorMessage.includes("insufficient_balance")) {
        return res.status(402).json({ 
          error: "Out of API Credits",
          details: "The Anthropic API credits have run out. Please ask your teacher to add more credits to the Anthropic account, or try using the OpenAI model instead."
        });
      }
      
      // OpenAI insufficient quota
      if (errorCode === "insufficient_quota" || 
          errorMessage.includes("exceeded your current quota") ||
          errorMessage.includes("insufficient_quota") ||
          errorMessage.includes("billing")) {
        return res.status(402).json({ 
          error: "Out of API Credits",
          details: "The OpenAI API credits have run out. Please ask your teacher to add more credits to the OpenAI account, or try using the Claude model instead."
        });
      }
      
      // Rate limit errors
      if (errorCode === "rate_limit_exceeded" || 
          errorType === "rate_limit_error" ||
          errorMessage.includes("rate limit")) {
        return res.status(429).json({ 
          error: "Too Many Requests",
          details: "The API is receiving too many requests. Please wait a moment and try again."
        });
      }
      
      res.status(500).json({ error: "Failed to run test. Please try again." });
    }
  });

  app.post("/api/prompt-doctor", async (req, res) => {
    try {
      const { studentPrompt, model } = req.body;
      
      if (!studentPrompt || !studentPrompt.trim()) {
        return res.status(400).json({ error: "Student prompt is required" });
      }
      
      const promptDoctorSystemPrompt = `You are a Senior AI Prompt Engineer called "Prompt Doctor." You are speaking directly to a student to give them feedback on their prompt. Evaluate their prompt based on the 4 Pillars of a "Golden Prompt":

1. GENERALIZATION (The "No Hardcoding" Rule)
   - Bad: "If you see a blue dog, allow it."
   - Good: "Allow dogs of any color or art style, including cartoons."
   - Why: A good prompt builds a general rule that works for cases the AI hasn't seen yet. Hardcoding specific examples (overfitting) is a sign of a weak engineer.

2. LOGIC FLOW (Sequential Thinking)
   - Bad: A giant wall of text with rules in random order.
   - Good: A prompt that uses a clear sequence (e.g., "First check the species, then check the behavior, then check the setting").
   - Why: AI follows instructions better when they are ordered from the most important filter to the least important. This is often called Chain of Thought.

3. SEMANTIC DISAMBIGUATION (The "Context" Rule)
   - Bad: "Block all food."
   - Good: "Be careful of words that contain 'dog' but are not animals, such as 'hot dogs.' Only approve images of living or depicted canine animals."
   - Why: A good prompt anticipates where the AI might get confused by language and provides a "safety net" to catch those errors.

4. EDGE CASE HANDLING (The "Nuance" Rule)
   - Bad: "No medical stuff."
   - Good: "Distinguish between a dog in distress and a dog providing help. Only label as 'Disturbing' if the dog is the one being treated."
   - Why: This shows you understand that "Trust & Safety" isn't always black and white—it requires defining specific conditions for complex scenarios.

Instructions: Speak directly to the student using "you/your." Provide a 1-sentence 'Glow' (what you did well, referencing which pillar(s) you handled effectively) and a 1-sentence 'Grow' (how you can improve, with a specific suggestion from the pillars above). Finally, assign a rank:
- 'Novice': Shows basic understanding but misses 2+ pillars
- 'Specialist': Demonstrates competence in 2-3 pillars
- 'Architect': Masters all 4 pillars with clear, logical structure

Respond in exactly this JSON format:
{"glow": "...", "grow": "...", "rank": "Novice|Specialist|Architect"}`;

      const userMessage = `Student Prompt to Evaluate:\n\n${studentPrompt}`;
      
      const isAnthropicModel = model && model.startsWith("claude");
      
      if (isAnthropicModel) {
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
          return res.status(500).json({ error: "Anthropic API key not configured" });
        }
        
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });
        
        const response = await retryWithBackoff(() => 
          anthropic.messages.create({
            model: model,
            max_tokens: 500,
            system: promptDoctorSystemPrompt,
            messages: [{ role: "user", content: userMessage }]
          })
        );
        
        const textContent = response.content.find(c => c.type === "text");
        const responseText = textContent ? textContent.text : "";
        
        try {
          const parsed = JSON.parse(responseText);
          return res.json(parsed);
        } catch {
          return res.json({ glow: responseText, grow: "", rank: "Novice" });
        }
      }
      
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      
      const openai = new OpenAI({ apiKey });
      
      const response = await retryWithBackoff(() => 
        openai.chat.completions.create({
          model: model || "gpt-4o-mini",
          messages: [
            { role: "system", content: promptDoctorSystemPrompt },
            { role: "user", content: userMessage }
          ],
          max_tokens: 500
        })
      );
      
      const responseText = response.choices[0]?.message?.content || "";
      
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch {
        return res.json({ glow: responseText, grow: "", rank: "Novice" });
      }
      
    } catch (error: any) {
      console.error("Prompt Doctor error:", error);
      res.status(500).json({ error: "Failed to evaluate prompt" });
    }
  });

  const prdRateLimits = new Map<string, { count: number; date: string }>();
  const PRD_DAILY_LIMIT = 5;

  function getPrdRateLimit(ip: string): { count: number; allowed: boolean } {
    const today = new Date().toDateString();
    const data = prdRateLimits.get(ip);
    
    if (!data || data.date !== today) {
      prdRateLimits.set(ip, { count: 0, date: today });
      return { count: 0, allowed: true };
    }
    
    return { count: data.count, allowed: data.count < PRD_DAILY_LIMIT };
  }

  function incrementPrdCount(ip: string) {
    const today = new Date().toDateString();
    const data = prdRateLimits.get(ip);
    
    if (!data || data.date !== today) {
      prdRateLimits.set(ip, { count: 1, date: today });
    } else {
      prdRateLimits.set(ip, { count: data.count + 1, date: today });
    }
  }

  app.post("/api/generate-prd", async (req, res) => {
    try {
      const { userInput, optionalRequirements } = req.body;
      
      if (!userInput || typeof userInput !== "string") {
        return res.status(400).json({ error: "Please describe your app idea" });
      }

      // Check for test mode - return demo PRD without using API quota
      if (userInput.trim().toLowerCase() === "test") {
        let demoPrd = await storage.getDemoPrd("personal-finance");
        
        if (!demoPrd) {
          // Generate demo PRD once and store it
          const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicApiKey) {
            return res.status(500).json({ error: "AI service not configured" });
          }

          const demoIdea = `I want to build a personal finance tracker app that helps people manage their money better. The app should let users:
- Add income and expenses with categories (groceries, rent, entertainment, etc.)
- See their spending breakdown in charts and graphs
- Set monthly budgets for different categories and get alerts when close to limit
- View transaction history with search and filter
- See a dashboard with current balance, recent transactions, and budget progress
The app should be simple and clean, targeting young adults who want to start managing their money better.`;

          const systemPrompt = `You are a product requirements document expert specializing in Replit projects for beginner developers.

A student has described their app idea below. Create a comprehensive PRD that is optimized for Replit Agent to build successfully.

Generate a PRD with these sections:
1. PROJECT OVERVIEW
2. PROBLEM & SOLUTION
3. CORE FEATURES (Must Have)
4. USER INTERFACE REQUIREMENTS
5. TECHNICAL SPECIFICATIONS FOR REPLIT
6. DATA MODEL
7. API REQUIREMENTS
8. USER STORIES
9. SUCCESS CRITERIA
10. OUT OF SCOPE (v1)
11. REPLIT IMPLEMENTATION NOTES

IMPORTANT GUIDELINES:
- Write for a beginner developer
- Be specific and detailed
- Use clear, simple language
- Make this immediately actionable in Replit
- Keep scope reasonable for a first project (can be built in 2-8 hours)
- Prioritize functionality over perfection
- If the idea is too complex, simplify it to a viable v1
- Format using Markdown with clear headers`;

          const anthropic = new Anthropic({ apiKey: anthropicApiKey });
          const response = await retryWithBackoff(() => 
            anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4000,
              system: systemPrompt,
              messages: [{ role: "user", content: `STUDENT'S IDEA:\n${demoIdea}\n\nPlease generate a detailed, Replit-optimized PRD for this app idea.` }]
            })
          );

          const textContent = response.content.find(c => c.type === "text");
          demoPrd = textContent ? textContent.text : "";
          
          if (demoPrd) {
            await storage.setDemoPrd("personal-finance", demoPrd);
          }
        }

        if (!demoPrd) {
          return res.status(500).json({ error: "Failed to load demo PRD" });
        }

        return res.json({ 
          prd: demoPrd,
          remaining: 999, // Demo mode doesn't count against limit
          isDemo: true
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const { count, allowed } = getPrdRateLimit(clientIp);
      
      if (!allowed) {
        return res.status(429).json({ 
          error: `You've generated ${PRD_DAILY_LIMIT} PRDs today. Try again tomorrow!`,
          remaining: 0
        });
      }
      
      if (userInput.length < 100) {
        return res.status(400).json({ error: "Please provide at least 100 characters describing your idea" });
      }
      
      if (userInput.length > 2000) {
        return res.status(400).json({ error: "Please keep your description under 2000 characters" });
      }

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const optionalText = optionalRequirements && optionalRequirements.length > 0
        ? `\n\nADDITIONAL REQUIREMENTS:\n${optionalRequirements.map((r: string) => `- ${r}`).join("\n")}`
        : "";

      const systemPrompt = `You are a product requirements document expert specializing in Replit projects for beginner developers.

A student has described their app idea below. Create a comprehensive PRD that is optimized for Replit Agent to build successfully.

Generate a PRD with these sections:
1. PROJECT OVERVIEW
2. PROBLEM & SOLUTION
3. CORE FEATURES (Must Have)
4. USER INTERFACE REQUIREMENTS
5. TECHNICAL SPECIFICATIONS FOR REPLIT
6. DATA MODEL
7. API REQUIREMENTS
8. USER STORIES
9. SUCCESS CRITERIA
10. OUT OF SCOPE (v1)
11. REPLIT IMPLEMENTATION NOTES

IMPORTANT GUIDELINES:
- Write for a beginner developer
- Be specific and detailed
- Use clear, simple language
- Make this immediately actionable in Replit
- Keep scope reasonable for a first project (can be built in 2-8 hours)
- Prioritize functionality over perfection
- If the idea is too complex, simplify it to a viable v1
- Format using Markdown with clear headers`;

      const userMessage = `STUDENT'S IDEA:
${userInput}${optionalText}

Please generate a detailed, Replit-optimized PRD for this app idea.`;

      const anthropic = new Anthropic({ apiKey: anthropicApiKey });
      
      const response = await retryWithBackoff(() => 
        anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }]
        })
      );

      const textContent = response.content.find(c => c.type === "text");
      const prd = textContent ? textContent.text : "";
      
      if (!prd) {
        return res.status(500).json({ error: "Failed to generate PRD. Please try again." });
      }

      incrementPrdCount(clientIp);
      
      res.json({ 
        prd,
        remaining: PRD_DAILY_LIMIT - count - 1
      });
      
    } catch (error: any) {
      console.error("PRD Generation error:", error);
      
      if (error?.status === 529 || error?.message?.includes("overloaded")) {
        return res.status(503).json({ error: "AI service is busy. Please try again in a few moments." });
      }
      
      res.status(500).json({ error: "Failed to generate PRD. Please try again." });
    }
  });

  return httpServer;
}

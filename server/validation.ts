import { z } from "zod";

export const emailSchema = z.string()
  .min(1, "Email is required")
  .max(255, "Email too long")
  .transform(val => val.trim().toLowerCase())
  .refine(val => {
    const parts = val.split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && parts[1].includes(".");
  }, { message: "Invalid email format" });

export const studentNameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .transform(val => val.trim())
  .refine(val => val.length > 0, { message: "Name cannot be empty" });

export const registerStudentSchema = z.object({
  email: emailSchema,
  name: studentNameSchema,
});

export const studentLoginSchema = z.object({
  email: emailSchema,
});

export const verifyTeacherSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const runTestSchema = z.object({
  instructions: z.string()
    .min(1, "Instructions are required")
    .max(10000, "Instructions too long"),
  email: emailSchema,
  name: studentNameSchema.optional(),
});

export const promptDoctorSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt is required")
    .max(10000, "Prompt too long"),
  failedScenarios: z.array(z.object({
    id: z.number(),
    description: z.string(),
    expectedDecision: z.string(),
    aiDecision: z.string(),
  })).max(20, "Too many failed scenarios"),
  email: emailSchema.optional(),
});

export const generatePrdSchema = z.object({
  userInput: z.string()
    .min(50, "App idea must be at least 50 characters")
    .max(3000, "App idea too long"),
  optionalRequirements: z.array(z.string()).max(10).optional(),
  email: emailSchema,
});

export const promptTemplateSchema = z.object({
  template: z.string()
    .min(10, "Template too short")
    .max(20000, "Template too long"),
});

export const scenarioSchema = z.object({
  description: z.string()
    .min(1, "Description is required")
    .max(1000, "Description too long"),
  expectedDecision: z.enum(["Allowed", "Prohibited", "Disturbing"]),
  isActive: z.union([z.boolean(), z.string().transform(val => val === "true")]).optional(),
});

export const prLoginSchema = z.object({
  name: studentNameSchema,
});

export const prSubmitScoreSchema = z.object({
  studentId: z.number().int().positive(),
  score: z.number().int().min(0).max(100),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1Score: z.number().min(0).max(1),
  roundsData: z.array(z.any()).optional(),
});

export const toggleLockSchema = z.object({
  isLocked: z.boolean(),
});

export const cancelTestSchema = z.object({
  email: emailSchema,
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.errors.map(e => e.message).join(", ");
  return { success: false, error: errorMessage };
}

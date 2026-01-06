import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { 
  validateRequest, 
  emailSchema,
  studentNameSchema,
  runTestSchema,
  generatePrdSchema,
  verifyTeacherSchema,
  promptTemplateSchema,
  cancelTestSchema,
  promptDoctorSchema,
  scenarioSchema,
  prSubmitScoreSchema
} from "../validation";

describe("Validation Schemas", () => {
  describe("emailSchema", () => {
    it("accepts valid emails", () => {
      const result = emailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("normalizes emails to lowercase", () => {
      const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("trims whitespace", () => {
      const result = emailSchema.safeParse("  test@example.com  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("rejects invalid emails", () => {
      expect(emailSchema.safeParse("notanemail").success).toBe(false);
      expect(emailSchema.safeParse("").success).toBe(false);
      expect(emailSchema.safeParse("missing@").success).toBe(false);
    });

    it("rejects overly long emails", () => {
      const longEmail = "a".repeat(250) + "@test.com";
      expect(emailSchema.safeParse(longEmail).success).toBe(false);
    });
  });

  describe("studentNameSchema", () => {
    it("accepts valid names", () => {
      const result = studentNameSchema.safeParse("John Doe");
      expect(result.success).toBe(true);
    });

    it("rejects empty names", () => {
      expect(studentNameSchema.safeParse("").success).toBe(false);
      expect(studentNameSchema.safeParse("   ").success).toBe(false);
    });

    it("trims whitespace", () => {
      const result = studentNameSchema.safeParse("  John Doe  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("John Doe");
      }
    });
  });

  describe("runTestSchema", () => {
    it("accepts valid test requests", () => {
      const result = runTestSchema.safeParse({
        instructions: "Block any posts about violence",
        email: "student@school.edu"
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing instructions", () => {
      const result = runTestSchema.safeParse({
        email: "student@school.edu"
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing email", () => {
      const result = runTestSchema.safeParse({
        instructions: "Block violence"
      });
      expect(result.success).toBe(false);
    });

    it("rejects overly long instructions", () => {
      const result = runTestSchema.safeParse({
        instructions: "a".repeat(11000),
        email: "test@example.com"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("generatePrdSchema", () => {
    it("accepts valid PRD requests", () => {
      const result = generatePrdSchema.safeParse({
        userInput: "I want to build a todo app that helps students track assignments with due dates and reminders",
        email: "student@school.edu"
      });
      expect(result.success).toBe(true);
    });

    it("rejects too short app ideas", () => {
      const result = generatePrdSchema.safeParse({
        userInput: "A todo app",
        email: "student@school.edu"
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing email", () => {
      const result = generatePrdSchema.safeParse({
        userInput: "A todo app for students that helps them track their homework and assignments"
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional requirements", () => {
      const result = generatePrdSchema.safeParse({
        userInput: "I want to build a todo app that helps students track assignments with due dates and reminders",
        email: "student@school.edu",
        optionalRequirements: ["auth", "mobile"]
      });
      expect(result.success).toBe(true);
    });
  });

  describe("verifyTeacherSchema", () => {
    it("accepts valid password", () => {
      const result = verifyTeacherSchema.safeParse({
        password: "somepassword"
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty password", () => {
      const result = verifyTeacherSchema.safeParse({
        password: ""
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const result = verifyTeacherSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("promptTemplateSchema", () => {
    it("accepts valid template", () => {
      const result = promptTemplateSchema.safeParse({
        template: "You are a content moderator. Classify the following content as Allow or Block."
      });
      expect(result.success).toBe(true);
    });

    it("rejects too short template", () => {
      const result = promptTemplateSchema.safeParse({
        template: "Hi"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancelTestSchema", () => {
    it("accepts valid cancel request", () => {
      const result = cancelTestSchema.safeParse({
        email: "student@school.edu"
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = cancelTestSchema.safeParse({
        email: "notanemail"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("promptDoctorSchema", () => {
    it("accepts valid prompt doctor request", () => {
      const result = promptDoctorSchema.safeParse({
        prompt: "Block any violent content",
        failedScenarios: [
          {
            id: 1,
            description: "A dog playing in the park",
            expectedDecision: "Allow",
            aiDecision: "Block"
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty prompt", () => {
      const result = promptDoctorSchema.safeParse({
        prompt: "",
        failedScenarios: []
      });
      expect(result.success).toBe(false);
    });
  });

  describe("scenarioSchema", () => {
    it("accepts valid scenario", () => {
      const result = scenarioSchema.safeParse({
        description: "A cute puppy playing",
        expectedDecision: "Allowed"
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid expected decision", () => {
      const result = scenarioSchema.safeParse({
        description: "A scenario",
        expectedDecision: "Maybe"
      });
      expect(result.success).toBe(false);
    });

    it("handles string boolean for isActive", () => {
      const result = scenarioSchema.safeParse({
        description: "A scenario",
        expectedDecision: "Prohibited",
        isActive: "true"
      });
      expect(result.success).toBe(true);
    });
  });

  describe("prSubmitScoreSchema", () => {
    it("accepts valid score submission", () => {
      const result = prSubmitScoreSchema.safeParse({
        studentId: 1,
        score: 85,
        precision: 0.9,
        recall: 0.8,
        f1Score: 0.85
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative student ID", () => {
      const result = prSubmitScoreSchema.safeParse({
        studentId: -1,
        score: 85,
        precision: 0.9,
        recall: 0.8,
        f1Score: 0.85
      });
      expect(result.success).toBe(false);
    });

    it("rejects score over 100", () => {
      const result = prSubmitScoreSchema.safeParse({
        studentId: 1,
        score: 150,
        precision: 0.9,
        recall: 0.8,
        f1Score: 0.85
      });
      expect(result.success).toBe(false);
    });

    it("rejects precision over 1", () => {
      const result = prSubmitScoreSchema.safeParse({
        studentId: 1,
        score: 85,
        precision: 1.5,
        recall: 0.8,
        f1Score: 0.85
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateRequest helper", () => {
    it("returns success with data for valid input", () => {
      const result = validateRequest(emailSchema, "test@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("returns error message for invalid input", () => {
      const result = validateRequest(emailSchema, "notanemail");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid email");
      }
    });
  });
});

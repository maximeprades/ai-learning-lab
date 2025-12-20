import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  students, 
  promptVersions,
  appSettings,
  promptTemplates,
  scenarios,
  type User, 
  type InsertUser,
  type Student,
  type InsertStudent,
  type PromptVersion,
  type InsertPromptVersion,
  type PromptTemplate,
  type Scenario
} from "@shared/schema";

const MAX_PROMPTS_PER_USER = 50;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getOrCreateStudent(email: string): Promise<Student>;
  getStudent(email: string): Promise<Student | undefined>;
  getStudentById(id: number): Promise<Student | undefined>;
  getAllStudents(): Promise<Student[]>;
  deleteStudent(id: number): Promise<void>;
  setStudentRunningTest(email: string, isRunning: boolean): Promise<void>;
  updateStudentScore(email: string, score: number): Promise<void>;
  incrementPromptCount(email: string): Promise<void>;
  
  getPromptVersions(studentId: number): Promise<PromptVersion[]>;
  getPromptVersionCount(studentId: number): Promise<number>;
  savePromptVersion(studentId: number, versionNumber: number, text: string, score: number | null): Promise<PromptVersion | null>;
  deletePromptVersionsByStudent(studentId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getOrCreateStudent(email: string): Promise<Student> {
    const existing = await this.getStudent(email);
    if (existing) {
      await db.update(students)
        .set({ lastActive: new Date() })
        .where(eq(students.email, email));
      return existing;
    }
    
    const [student] = await db.insert(students)
      .values({ email })
      .returning();
    return student;
  }

  async getStudent(email: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.email, email));
    return student;
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.highestScore));
  }

  async deleteStudent(id: number): Promise<void> {
    await this.deletePromptVersionsByStudent(id);
    await db.delete(students).where(eq(students.id, id));
  }

  async setStudentRunningTest(email: string, isRunning: boolean): Promise<void> {
    await db.update(students)
      .set({ isRunningTest: isRunning, lastActive: new Date() })
      .where(eq(students.email, email));
  }

  async updateStudentScore(email: string, score: number): Promise<void> {
    const student = await this.getStudent(email);
    if (student && (student.highestScore === null || score > student.highestScore)) {
      await db.update(students)
        .set({ highestScore: score, lastActive: new Date() })
        .where(eq(students.email, email));
    }
  }

  async incrementPromptCount(email: string): Promise<void> {
    await db.update(students)
      .set({ 
        promptCount: sql`${students.promptCount} + 1`,
        lastActive: new Date()
      })
      .where(eq(students.email, email));
  }

  async getPromptVersions(studentId: number): Promise<PromptVersion[]> {
    return await db.select()
      .from(promptVersions)
      .where(eq(promptVersions.studentId, studentId))
      .orderBy(promptVersions.versionNumber);
  }

  async getPromptVersionCount(studentId: number): Promise<number> {
    const versions = await this.getPromptVersions(studentId);
    return versions.length;
  }

  async savePromptVersion(
    studentId: number, 
    versionNumber: number, 
    text: string, 
    score: number | null
  ): Promise<PromptVersion | null> {
    const count = await this.getPromptVersionCount(studentId);
    if (count >= MAX_PROMPTS_PER_USER) {
      return null;
    }
    
    const [version] = await db.insert(promptVersions)
      .values({ studentId, versionNumber, text, score })
      .returning();
    return version;
  }

  async deletePromptVersionsByStudent(studentId: number): Promise<void> {
    await db.delete(promptVersions).where(eq(promptVersions.studentId, studentId));
  }

  async isAppLocked(): Promise<boolean> {
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
    return settings?.isLocked ?? false;
  }

  async setAppLocked(locked: boolean): Promise<void> {
    await db.update(appSettings)
      .set({ isLocked: locked })
      .where(eq(appSettings.id, 1));
  }

  async getPromptTemplate(): Promise<PromptTemplate | undefined> {
    const [template] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, 1));
    return template;
  }

  async setPromptTemplate(template: string): Promise<void> {
    const existing = await this.getPromptTemplate();
    if (existing) {
      await db.update(promptTemplates)
        .set({ template, updatedAt: new Date() })
        .where(eq(promptTemplates.id, 1));
    } else {
      await db.insert(promptTemplates).values({ template });
    }
  }

  async getScenarios(): Promise<Scenario[]> {
    return await db.select().from(scenarios).orderBy(scenarios.sortOrder);
  }

  async getScenario(id: number): Promise<Scenario | undefined> {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return scenario;
  }

  async createScenario(text: string, expected: string, imagePath: string, sortOrder: number): Promise<Scenario> {
    const [scenario] = await db.insert(scenarios)
      .values({ text, expected, imagePath, sortOrder })
      .returning();
    return scenario;
  }

  async updateScenario(id: number, updates: Partial<{ text: string; expected: string; imagePath: string; sortOrder: number }>): Promise<Scenario | undefined> {
    const [scenario] = await db.update(scenarios)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scenarios.id, id))
      .returning();
    return scenario;
  }

  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  async reorderScenarios(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(scenarios)
        .set({ sortOrder: i + 1 })
        .where(eq(scenarios.id, orderedIds[i]));
    }
  }
}

export const storage = new DatabaseStorage();

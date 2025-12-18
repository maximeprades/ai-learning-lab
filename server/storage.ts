import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  students, 
  promptVersions,
  type User, 
  type InsertUser,
  type Student,
  type InsertStudent,
  type PromptVersion,
  type InsertPromptVersion
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getOrCreateStudent(email: string): Promise<Student>;
  getStudent(email: string): Promise<Student | undefined>;
  getAllStudents(): Promise<Student[]>;
  setStudentRunningTest(email: string, isRunning: boolean): Promise<void>;
  updateStudentScore(email: string, score: number): Promise<void>;
  incrementPromptCount(email: string): Promise<void>;
  
  getPromptVersions(studentId: number): Promise<PromptVersion[]>;
  savePromptVersion(studentId: number, versionNumber: number, text: string, score: number | null): Promise<PromptVersion>;
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

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.highestScore));
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

  async savePromptVersion(
    studentId: number, 
    versionNumber: number, 
    text: string, 
    score: number | null
  ): Promise<PromptVersion> {
    const [version] = await db.insert(promptVersions)
      .values({ studentId, versionNumber, text, score })
      .returning();
    return version;
  }
}

export const storage = new DatabaseStorage();

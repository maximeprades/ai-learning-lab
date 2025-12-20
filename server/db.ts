import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  let client;
  try {
    console.log("Connecting to database...");
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        is_running_test BOOLEAN DEFAULT false,
        highest_score INTEGER DEFAULT 0,
        prompt_count INTEGER DEFAULT 0,
        last_active TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        score INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        is_locked BOOLEAN DEFAULT false
      );
      
      INSERT INTO app_settings (id, is_locked) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Database tables initialized successfully");
  } catch (error: any) {
    console.error("Error initializing database:", error.message);
    if (error.message?.includes('EAI_AGAIN') || error.message?.includes('getaddrinfo')) {
      console.error("DNS resolution failed. This usually means the database hostname is incorrect for this environment.");
      console.error("For production deployments, ensure DATABASE_URL is configured in the Deployments settings.");
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

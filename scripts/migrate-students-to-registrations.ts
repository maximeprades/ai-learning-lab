import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { students, studentRegistrations } from "../shared/schema";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("ERROR: Set PRODUCTION_DATABASE_URL or DATABASE_URL environment variable");
  process.exit(1);
}

console.log("Connecting to database...");
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function migrateStudentsToRegistrations() {
  console.log("Starting migration of Prompt 101 students to registrations...\n");

  const allStudents = await db.select().from(students);
  console.log(`Found ${allStudents.length} students in Prompt 101 table\n`);

  let migrated = 0;
  let skipped = 0;

  for (const student of allStudents) {
    const existingReg = await db
      .select()
      .from(studentRegistrations)
      .where(eq(studentRegistrations.email, student.email))
      .limit(1);

    if (existingReg.length > 0) {
      console.log(`SKIP: ${student.email} - already registered`);
      skipped++;
    } else {
      await db.insert(studentRegistrations).values({
        email: student.email,
        name: student.name || "",
        teamName: "",
      });
      console.log(`MIGRATED: ${student.email} (${student.name || "no name"})`);
      migrated++;
    }
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already registered): ${skipped}`);
  console.log(`Total processed: ${allStudents.length}`);
}

migrateStudentsToRegistrations()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Migration failed:", err);
    await pool.end();
    process.exit(1);
  });

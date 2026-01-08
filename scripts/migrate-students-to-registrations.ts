import { db } from "../server/db";
import { students, studentRegistrations } from "../shared/schema";
import { eq } from "drizzle-orm";

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
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

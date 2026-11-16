/**
 * Development seed: demo@example.com with the sample job search from src/lib/demo/sample-data.ts.
 * Run with `npx prisma db seed`. Safe to re-run: it deletes and recreates that user only.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SAMPLE_APPLICATIONS, addSampleData } from "../src/lib/demo/sample-data";

const DEMO_EMAIL = "demo@example.com";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await db.user.create({
    data: { email: DEMO_EMAIL, name: "Demo User", emailVerified: new Date() },
  });
  await addSampleData(db, user.id);
  console.log(`Seeded ${SAMPLE_APPLICATIONS.length} applications for ${DEMO_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

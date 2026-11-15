import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Only needed for local `npx prisma dev`, which serves one database per port and runs its
    // shadow database on a separate port. Hosted Postgres (e.g. Neon) leaves this unset.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});

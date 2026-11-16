import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection; the app itself uses the pooled DATABASE_URL.
    // On Neon set DIRECT_DATABASE_URL to the non-pooled string. Locally it can be left unset.
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"],
    // Only needed for local `npx prisma dev`, which serves one database per port and runs its
    // shadow database on a separate port. Hosted Postgres (e.g. Neon) leaves this unset.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});

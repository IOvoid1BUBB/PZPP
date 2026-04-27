import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function withSchema(urlString: string, schema: string) {
  try {
    const u = new URL(urlString);
    u.searchParams.set("schema", schema);
    return u.toString();
  } catch {
    // If URL parsing fails, fallback to original
    return urlString;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: withSchema(env("DIRECT_URL"), process.env.PRISMA_SCHEMA || "pzpp_dev"),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL
      ? withSchema(process.env.SHADOW_DATABASE_URL, "public")
      : undefined,
  },
});

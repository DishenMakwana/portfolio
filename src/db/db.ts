import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Use a placeholder URL during build time if DATABASE_URL is not set
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

export const db = drizzle(pool, {
  schema,
  logger: process.env.LOGGING === "true",
});

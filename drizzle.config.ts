import { defineConfig } from 'drizzle-kit';

const schemaName = process.env.DB_SCHEMA || 'portfolio';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  schemaFilter: [schemaName],
});


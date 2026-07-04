import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// SQLite database file will be saved in the root of the workspace
const dbPath = path.join(process.cwd(), 'portfolio.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

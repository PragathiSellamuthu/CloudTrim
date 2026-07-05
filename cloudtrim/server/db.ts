import fs from 'fs/promises';
import path from 'path';
import { CloudResource, AnalysisRun, Settings } from '../src/types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  resources: CloudResource[];
  analyses: AnalysisRun[];
  settings: Settings;
}

const DEFAULT_DB: DatabaseSchema = {
  resources: [],
  analyses: [],
  settings: {
    discordWebhookUrl: '',
  },
};

async function ensureDbExists() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring database exists:', error);
  }
}

export async function readDb(): Promise<DatabaseSchema> {
  await ensureDbExists();
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database, falling back to defaults:', error);
    return DEFAULT_DB;
  }
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  await ensureDbExists();
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database:', error);
    throw error;
  }
}

// Helper methods
export async function getResources(): Promise<CloudResource[]> {
  const db = await readDb();
  return db.resources || [];
}

export async function saveResources(resources: CloudResource[]): Promise<void> {
  const db = await readDb();
  db.resources = resources;
  await writeDb(db);
}

export async function getAnalyses(): Promise<AnalysisRun[]> {
  const db = await readDb();
  return db.analyses || [];
}

export async function saveAnalysisRun(run: AnalysisRun): Promise<void> {
  const db = await readDb();
  if (!db.analyses) {
    db.analyses = [];
  }
  db.analyses.push(run);
  await writeDb(db);
}

export async function clearAnalyses(): Promise<void> {
  const db = await readDb();
  db.analyses = [];
  await writeDb(db);
}

export async function clearResources(): Promise<void> {
  const db = await readDb();
  db.resources = [];
  await writeDb(db);
}

export async function getSettings(): Promise<Settings> {
  const db = await readDb();
  return db.settings || { discordWebhookUrl: '' };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await readDb();
  db.settings = settings;
  await writeDb(db);
}

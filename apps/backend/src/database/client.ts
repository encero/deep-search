import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { config } from '../config/index.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Extract the file path from the database URL
function getDatabasePath(url: string): string {
  if (url.startsWith('file:')) {
    return url.slice(5);
  }
  return url;
}

// Ensure the directory exists
const dbPath = getDatabasePath(config.databaseUrl);
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in repositories
export { schema };

// Initialize database tables
export function initializeDatabase() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS research_sessions (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      status TEXT NOT NULL,
      current_iteration INTEGER DEFAULT 0,
      config TEXT NOT NULL,
      prompt_config TEXT,
      exit_criteria TEXT,
      plan TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_subtopic TEXT,
      custom_prompt TEXT,
      started_at INTEGER,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      agent_id TEXT REFERENCES agents(id),
      iteration INTEGER NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      category TEXT,
      tags TEXT,
      confidence REAL,
      relevance REAL,
      novelty REAL,
      related_entries TEXT,
      contradicts TEXT,
      supports TEXT,
      version INTEGER DEFAULT 1,
      previous_version_id TEXT,
      merged_from TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      entry_id TEXT REFERENCES knowledge_entries(id),
      url TEXT NOT NULL,
      title TEXT,
      excerpt TEXT,
      full_content TEXT,
      reliability REAL,
      accessed_at INTEGER,
      published_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS syntheses (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      iteration INTEGER,
      is_final INTEGER DEFAULT 0,
      summary TEXT NOT NULL,
      key_findings TEXT NOT NULL,
      sections TEXT NOT NULL,
      confidence REAL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      iteration INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      processed INTEGER DEFAULT 0,
      processed_at INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS knowledge_gaps (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      iteration INTEGER NOT NULL,
      subtopic TEXT,
      description TEXT NOT NULL,
      priority TEXT,
      suggested_queries TEXT,
      resolved INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES research_sessions(id),
      iteration INTEGER,
      from_agent TEXT,
      to_agent TEXT,
      type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS saved_prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_knowledge_session ON knowledge_entries(session_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge_entries(agent_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_iteration ON knowledge_entries(session_id, iteration);
    CREATE INDEX IF NOT EXISTS idx_sources_entry ON sources(entry_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_session ON user_feedback(session_id);
    CREATE INDEX IF NOT EXISTS idx_gaps_session ON knowledge_gaps(session_id);
  `);
}

/** Kept out of db.ts so schema.test.ts can run it through node:sqlite. */
export const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    day_key TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    rir INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS body_weight (
    id INTEGER PRIMARY KEY,
    logged_at INTEGER NOT NULL,
    kg REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sets_by_exercise ON sets (exercise_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS sets_by_session ON sets (session_id);
`

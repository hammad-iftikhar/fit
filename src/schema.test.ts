import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA_SQL } from './schema'

// expo-sqlite is not importable outside the app, but the SQL is the same SQLite.
// This is the only check that the schema actually parses and enforces itself.
const fresh = () => {
  const db = new DatabaseSync(':memory:')
  db.exec(SCHEMA_SQL)
  return db
}

test('schema applies cleanly and is idempotent', () => {
  const db = fresh()
  db.exec(SCHEMA_SQL) // CREATE ... IF NOT EXISTS, so a second run is a no-op
  const names = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((r) => r.name)
  assert.deepEqual(names, ['body_weight', 'sessions', 'sets'])
})

test('deleting a session cascades to its sets', () => {
  const db = fresh()
  db.exec('PRAGMA foreign_keys = ON')
  db.prepare('INSERT INTO sessions (id, day_key, started_at) VALUES (1, ?, 0)').run('mon')
  db.prepare(
    `INSERT INTO sets (session_id, exercise_id, set_index, weight, reps, created_at)
     VALUES (1, 'squat', 0, 100, 5, 0)`,
  ).run()
  db.prepare('DELETE FROM sessions WHERE id = 1').run()
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sets').get()?.n, 0)
})

test('a set cannot reference a session that does not exist', () => {
  const db = fresh()
  db.exec('PRAGMA foreign_keys = ON')
  assert.throws(() =>
    db
      .prepare(
        `INSERT INTO sets (session_id, exercise_id, set_index, weight, reps, created_at)
         VALUES (99, 'squat', 0, 100, 5, 0)`,
      )
      .run(),
  )
})

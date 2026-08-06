import { openDatabaseSync } from 'expo-sqlite'
import type { SessionRow, SetRow } from './logic'
import type { DayKey } from './program'
import { SCHEMA_SQL } from './schema'

// ponytail: synchronous SQLite API. At this data volume (a few thousand rows
// over years) the main thread never notices. Switch to the async API only if a
// query is ever measurably janky.
const db = openDatabaseSync('fit.db')

export type WeightRow = { id: number; logged_at: number; kg: number }

export function migrate(): void {
  db.execSync(SCHEMA_SQL)
}

export function activeSession(): SessionRow | undefined {
  return db.getFirstSync<SessionRow>(
    'SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
  ) ?? undefined
}

export function openSession(dayKey: DayKey): number {
  const open = activeSession()
  if (open && open.day_key === dayKey) return open.id
  if (open) finishSession(open.id, Date.now()) // one session at a time
  const result = db.runSync('INSERT INTO sessions (day_key, started_at) VALUES (?, ?)', dayKey, Date.now())
  return result.lastInsertRowId
}

export function finishSession(id: number, endedAt: number): void {
  db.runSync('UPDATE sessions SET ended_at = ? WHERE id = ?', endedAt, id)
}

/** A session left open overnight is closed at its last set, not at "now". */
export function autoCloseStaleSessions(now: number): void {
  const stale = db.getAllSync<SessionRow>(
    'SELECT * FROM sessions WHERE ended_at IS NULL AND started_at < ?',
    now - 12 * 60 * 60 * 1000,
  )
  for (const s of stale) {
    const last = db.getFirstSync<{ created_at: number }>(
      'SELECT MAX(created_at) AS created_at FROM sets WHERE session_id = ?',
      s.id,
    )
    finishSession(s.id, last?.created_at ?? s.started_at)
  }
}

export function insertSet(row: Omit<SetRow, 'id'>): void {
  db.runSync(
    `INSERT INTO sets (session_id, exercise_id, set_index, is_warmup, weight, reps, rir, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    row.session_id, row.exercise_id, row.set_index, row.is_warmup,
    row.weight, row.reps, row.rir, row.created_at,
  )
}

export const deleteSet = (id: number) => { db.runSync('DELETE FROM sets WHERE id = ?', id) }

export const setsForSession = (sessionId: number) =>
  db.getAllSync<SetRow>('SELECT * FROM sets WHERE session_id = ? ORDER BY created_at', sessionId)

export const setsForExercise = (exerciseId: string) =>
  db.getAllSync<SetRow>('SELECT * FROM sets WHERE exercise_id = ? ORDER BY created_at DESC', exerciseId)

export const allSets = () => db.getAllSync<SetRow>('SELECT * FROM sets ORDER BY created_at')
export const allSessions = () => db.getAllSync<SessionRow>('SELECT * FROM sessions ORDER BY started_at DESC')
export const getSession = (id: number) =>
  db.getFirstSync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id) ?? undefined

export const insertWeight = (kg: number, loggedAt: number) => {
  db.runSync('INSERT INTO body_weight (logged_at, kg) VALUES (?, ?)', loggedAt, kg)
}
export const allWeights = () =>
  db.getAllSync<WeightRow>('SELECT * FROM body_weight ORDER BY logged_at DESC')

export function exportAll(): string {
  return JSON.stringify(
    { version: 1, sessions: allSessions(), sets: allSets(), body_weight: allWeights() },
    null, 2,
  )
}

export function clearAll(): void {
  db.execSync('DELETE FROM sets; DELETE FROM sessions; DELETE FROM body_weight;')
}

export function importAll(json: string): void {
  const data = JSON.parse(json)
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${data.version}`)
  if (!Array.isArray(data.sessions) || !Array.isArray(data.sets) || !Array.isArray(data.body_weight)) {
    throw new Error('Backup is missing sessions, sets, or body_weight')
  }
  db.withTransactionSync(() => {
    clearAll()
    for (const s of data.sessions as SessionRow[]) {
      db.runSync('INSERT INTO sessions (id, day_key, started_at, ended_at) VALUES (?, ?, ?, ?)',
        s.id, s.day_key, s.started_at, s.ended_at)
    }
    for (const s of data.sets as SetRow[]) {
      db.runSync(
        `INSERT INTO sets (id, session_id, exercise_id, set_index, is_warmup, weight, reps, rir, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id, s.session_id, s.exercise_id, s.set_index, s.is_warmup, s.weight, s.reps, s.rir, s.created_at)
    }
    for (const w of data.body_weight as WeightRow[]) {
      db.runSync('INSERT INTO body_weight (id, logged_at, kg) VALUES (?, ?, ?)', w.id, w.logged_at, w.kg)
    }
  })
}

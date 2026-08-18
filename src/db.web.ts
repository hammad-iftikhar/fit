import type { SessionRow, SetRow } from './logic'
import type { DayKey } from './program'

// Metro picks this file over db.ts on web. expo-sqlite does run in the browser,
// but only through a worker whose synchronous API gives itself ~30ms to answer —
// under render load that budget is missed on roughly half of all queries. This
// app's whole database is three small tables read in full by every screen, so
// web keeps them in memory and writes the lot back as JSON.
//
// ponytail: localStorage caps out around 5MB, which is ~50k sets — decades of
// training. Move to IndexedDB only if that ceiling is ever real.
const KEY = 'fit.db'

export type WeightRow = { id: number; logged_at: number; kg: number }

type Store = { sessions: SessionRow[]; sets: SetRow[]; body_weight: WeightRow[] }

const empty = (): Store => ({ sessions: [], sets: [], body_weight: [] })

function load(): Store {
  // No localStorage during a server render, and a corrupt blob should not brick
  // the app — either way an empty database is the safe answer.
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch {
    return empty()
  }
}

const store = load()

function save(): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failure: the in-memory copy still serves this session.
  }
}

const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1

export function activeSession(): SessionRow | undefined {
  return store.sessions
    .filter((s) => s.ended_at === null)
    .sort((a, b) => b.started_at - a.started_at)[0]
}

export function openSession(dayKey: DayKey): number {
  const open = activeSession()
  if (open && open.day_key === dayKey) return open.id
  if (open) finishSession(open.id, Date.now()) // one session at a time
  const row: SessionRow = { id: nextId(store.sessions), day_key: dayKey, started_at: Date.now(), ended_at: null }
  store.sessions.push(row)
  save()
  return row.id
}

export function finishSession(id: number, endedAt: number): void {
  const s = store.sessions.find((s) => s.id === id)
  if (s) s.ended_at = endedAt
  save()
}

/** A session left open overnight is closed at its last set, not at "now". */
export function autoCloseStaleSessions(now: number): void {
  for (const s of store.sessions) {
    if (s.ended_at !== null || s.started_at >= now - 12 * 60 * 60 * 1000) continue
    const last = store.sets.filter((x) => x.session_id === s.id).map((x) => x.created_at)
    s.ended_at = last.length ? Math.max(...last) : s.started_at
  }
  save()
}

/** Stamps created_at itself — callers are screens, and clock reads in a
 *  component body are impure. */
export function insertSet(row: Omit<SetRow, 'id' | 'created_at'>): void {
  store.sets.push({ ...row, id: nextId(store.sets), created_at: Date.now() })
  save()
}

export function deleteSet(id: number): void {
  const i = store.sets.findIndex((s) => s.id === id)
  if (i >= 0) store.sets.splice(i, 1)
  save()
}

// Two sets logged in the same millisecond tie on created_at, so id breaks it —
// otherwise "the last set" is whichever the sort happened to leave first.
const byCreatedAt = (a: SetRow, b: SetRow) => a.created_at - b.created_at || a.id - b.id

export const setsForSession = (sessionId: number) =>
  store.sets.filter((s) => s.session_id === sessionId).sort(byCreatedAt)

export const setsForExercise = (exerciseId: string) =>
  store.sets.filter((s) => s.exercise_id === exerciseId).sort((a, b) => byCreatedAt(b, a))

export const allSets = () => [...store.sets].sort(byCreatedAt)
export const allSessions = () => [...store.sessions].sort((a, b) => b.started_at - a.started_at)
export const getSession = (id: number) => store.sessions.find((s) => s.id === id)

export const insertWeight = (kg: number, loggedAt: number) => {
  store.body_weight.push({ id: nextId(store.body_weight), logged_at: loggedAt, kg })
  save()
}
export const allWeights = () => [...store.body_weight].sort((a, b) => b.logged_at - a.logged_at)

export function exportAll(): string {
  return JSON.stringify(
    { version: 1, sessions: allSessions(), sets: allSets(), body_weight: allWeights() },
    null, 2,
  )
}

export function clearAll(): void {
  store.sessions = []
  store.sets = []
  store.body_weight = []
  save()
}

export function importAll(json: string): void {
  const data = JSON.parse(json)
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${data.version}`)
  if (!Array.isArray(data.sessions) || !Array.isArray(data.sets) || !Array.isArray(data.body_weight)) {
    throw new Error('Backup is missing sessions, sets, or body_weight')
  }
  // Validated before anything is dropped, so a bad file leaves existing data intact.
  store.sessions = data.sessions
  store.sets = data.sets
  store.body_weight = data.body_weight
  save()
}

autoCloseStaleSessions(Date.now())

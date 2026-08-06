import { PROGRAM, TRAINING_DAY_KEYS, type DayKey } from './program'

export type SessionRow = {
  id: number
  day_key: DayKey
  started_at: number
  ended_at: number | null
}

export type SetRow = {
  id: number
  session_id: number
  exercise_id: string
  set_index: number
  is_warmup: 0 | 1
  weight: number
  reps: number
  rir: number | null
  created_at: number
}

const WEEKDAY_TO_KEY: Record<number, DayKey> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' }

export function dayKeyForWeekday(weekday: number): DayKey | null {
  return WEEKDAY_TO_KEY[weekday] ?? null
}

export function dayKeyOf(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function weekStart(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Sunday (0) counts as 6 days after Monday
  return d.getTime()
}

export function weekProgress(sessions: SessionRow[], now: number): { done: number; total: number } {
  const start = weekStart(now)
  const done = sessions.filter((s) => s.ended_at !== null && s.started_at >= start).length
  return { done, total: TRAINING_DAY_KEYS.length }
}

export function streak(sessions: SessionRow[], now: number): number {
  const completed = new Set(
    sessions.filter((s) => s.ended_at !== null).map((s) => dayKeyOf(s.started_at)),
  )
  const today = dayKeyOf(now)
  const cursor = new Date(now)
  let count = 0
  // ponytail: 365-iteration cap instead of unbounded. A streak longer than a
  // year is not a case worth code.
  for (let i = 0; i < 365; i++) {
    const key = dayKeyOf(cursor.getTime())
    const dayKey = dayKeyForWeekday(cursor.getDay())
    const isTrainingDay = dayKey !== null && TRAINING_DAY_KEYS.includes(dayKey)
    if (isTrainingDay) {
      if (completed.has(key)) count++
      else if (key !== today) break // today is not missed until it is over
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function volume(sets: SetRow[]): number {
  return sets.filter((s) => !s.is_warmup).reduce((total, s) => total + s.weight * s.reps, 0)
}

export function lastPerformance(
  sets: SetRow[],
  exerciseId: string,
  excludeSessionId?: number,
): Record<number, SetRow> {
  const candidates = sets.filter(
    (s) => s.exercise_id === exerciseId && !s.is_warmup && s.session_id !== excludeSessionId,
  )
  if (candidates.length === 0) return {}
  const latestSession = candidates.reduce((a, b) => (b.created_at > a.created_at ? b : a)).session_id
  const out: Record<number, SetRow> = {}
  for (const s of candidates) if (s.session_id === latestSession) out[s.set_index] = s
  return out
}

export function nextScheduledDay(now: number): { key: DayKey; date: number } {
  const cursor = new Date(now)
  for (let i = 0; i < 7; i++) {
    cursor.setDate(cursor.getDate() + 1)
    const key = dayKeyForWeekday(cursor.getDay())
    if (key && PROGRAM[key]) return { key, date: cursor.getTime() }
  }
  throw new Error('unreachable: every week contains a programmed day')
}

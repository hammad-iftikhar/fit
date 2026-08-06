import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayKeyOf, weekStart, weekProgress, streak, volume, lastPerformance, nextScheduledDay, resolveSet,
  type SessionRow, type SetRow,
} from './logic'
import type { DayKey } from './program'

// Local-time helper so tests do not depend on the machine's timezone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()

// 2026-08-03 is a Monday.
const MON = at(2026, 8, 3)
const TUE = at(2026, 8, 4)
const WED = at(2026, 8, 5)
const THU = at(2026, 8, 6)
const FRI = at(2026, 8, 7)
const PREV_FRI = at(2026, 7, 31)

let nextId = 1
const session = (day_key: DayKey, started_at: number, finished = true): SessionRow => ({
  id: nextId++, day_key, started_at, ended_at: finished ? started_at + 3_600_000 : null,
})

const set = (o: Partial<SetRow> & { session_id: number; exercise_id: string; set_index: number }): SetRow => ({
  id: nextId++, is_warmup: 0, weight: 60, reps: 8, rir: 2, created_at: MON, ...o,
})

test('dayKeyOf formats the local calendar date', () => {
  assert.equal(dayKeyOf(at(2026, 8, 3)), '2026-08-03')
  assert.equal(dayKeyOf(at(2026, 12, 9)), '2026-12-09')
})

test('weekStart snaps back to Monday midnight', () => {
  assert.equal(weekStart(THU), at(2026, 8, 3, 0))
  assert.equal(weekStart(MON), at(2026, 8, 3, 0))
  // Sunday belongs to the week that started the previous Monday.
  assert.equal(weekStart(at(2026, 8, 9)), at(2026, 8, 3, 0))
})

test('weekProgress counts finished sessions in the current week out of four', () => {
  const sessions = [session('mon', MON), session('tue', TUE), session('fri', PREV_FRI)]
  assert.deepEqual(weekProgress(sessions, THU), { done: 2, total: 4 })
})

test('weekProgress ignores unfinished sessions', () => {
  assert.deepEqual(weekProgress([session('mon', MON, false)], THU), { done: 0, total: 4 })
})

test('streak is zero with no sessions', () => {
  assert.equal(streak([], THU), 0)
})

test('streak counts consecutive completed training days', () => {
  const sessions = [session('mon', MON), session('tue', TUE)]
  assert.equal(streak(sessions, TUE), 2)
})

test('streak skips the recovery day without breaking', () => {
  const sessions = [session('mon', MON), session('tue', TUE), session('thu', THU)]
  assert.equal(streak(sessions, THU), 3, 'Wednesday must not break the streak')
})

test('streak survives the weekend', () => {
  const sessions = [session('fri', PREV_FRI), session('mon', MON)]
  assert.equal(streak(sessions, MON), 2)
})

test("today's missing session does not break the streak yet", () => {
  const sessions = [session('mon', MON), session('tue', TUE), session('thu', THU)]
  assert.equal(streak(sessions, FRI), 3, 'Friday is not missed until it is over')
})

test('a missed training day breaks the streak', () => {
  const sessions = [session('mon', MON), session('thu', THU)]
  assert.equal(streak(sessions, THU), 1, 'Tuesday was missed')
})

test('a non-training day is never counted', () => {
  assert.equal(streak([session('mon', WED)], WED), 0)
})

test('volume sums weight by reps and excludes warm-ups', () => {
  const sets = [
    set({ session_id: 1, exercise_id: 'squat', set_index: 0, weight: 100, reps: 5 }),
    set({ session_id: 1, exercise_id: 'squat', set_index: 1, weight: 50, reps: 10 }),
    set({ session_id: 1, exercise_id: 'squat', set_index: 0, weight: 40, reps: 10, is_warmup: 1 }),
  ]
  assert.equal(volume(sets), 1000)
})

test('lastPerformance returns the most recent session indexed by set', () => {
  const sets = [
    set({ session_id: 1, exercise_id: 'squat', set_index: 0, weight: 100, created_at: MON }),
    set({ session_id: 2, exercise_id: 'squat', set_index: 0, weight: 105, created_at: THU }),
    set({ session_id: 2, exercise_id: 'squat', set_index: 1, weight: 105, created_at: THU }),
    set({ session_id: 2, exercise_id: 'leg-press', set_index: 0, weight: 200, created_at: THU }),
  ]
  const prev = lastPerformance(sets, 'squat')
  assert.equal(prev[0].weight, 105)
  assert.equal(prev[1].weight, 105)
  assert.equal(Object.keys(prev).length, 2)
})

test('lastPerformance ignores warm-ups and the session in progress', () => {
  const sets = [
    set({ session_id: 1, exercise_id: 'squat', set_index: 0, weight: 100, created_at: MON }),
    set({ session_id: 2, exercise_id: 'squat', set_index: 0, weight: 40, is_warmup: 1, created_at: THU }),
    set({ session_id: 2, exercise_id: 'squat', set_index: 0, weight: 110, created_at: THU }),
  ]
  assert.equal(lastPerformance(sets, 'squat', 2)[0].weight, 100, 'current session must be excluded')
  assert.equal(lastPerformance(sets, 'squat')[0].weight, 110, 'warm-up must not win')
})

test('lastPerformance returns empty for an exercise never done', () => {
  assert.deepEqual(lastPerformance([], 'squat'), {})
})

const LAST = { weight: 60, reps: 8, rir: 2 }

test('blank fields repeat the whole of last session set', () => {
  assert.deepEqual(resolveSet({ weight: '', reps: '', rir: '' }, LAST), { weight: 60, reps: 8, rir: 2 })
})

test('a typed field overrides the suggestion, blanks still repeat', () => {
  assert.deepEqual(resolveSet({ weight: '65', reps: '', rir: '' }, LAST), { weight: 65, reps: 8, rir: 2 })
  assert.deepEqual(resolveSet({ weight: '', reps: '6', rir: '1' }, LAST), { weight: 60, reps: 6, rir: 1 })
})

test('blank fields with no previous set log nothing', () => {
  assert.equal(resolveSet({ weight: '', reps: '', rir: '' }), null)
  assert.equal(resolveSet({ weight: '80', reps: '', rir: '' }), null, 'reps still missing')
})

test('nonsense and zero reps log nothing', () => {
  assert.equal(resolveSet({ weight: 'abc', reps: '8', rir: '' }, LAST), null)
  assert.equal(resolveSet({ weight: '60', reps: '0', rir: '' }, LAST), null)
  assert.equal(resolveSet({ weight: '60', reps: '-3', rir: '' }, LAST), null)
})

test('rir stays null when it was never recorded', () => {
  assert.equal(resolveSet({ weight: '', reps: '', rir: '' }, { weight: 60, reps: 8, rir: null })?.rir, null)
  assert.equal(resolveSet({ weight: '60', reps: '8', rir: '' })?.rir, null)
})

test('a bodyweight set at zero kg is still loggable', () => {
  assert.deepEqual(resolveSet({ weight: '0', reps: '12', rir: '' }), { weight: 0, reps: 12, rir: null })
})

test('nextScheduledDay skips to the following programmed day', () => {
  assert.equal(nextScheduledDay(MON).key, 'tue')
  assert.equal(nextScheduledDay(TUE).key, 'wed')
  assert.equal(nextScheduledDay(FRI).key, 'mon', 'weekend rolls to Monday')
  assert.equal(dayKeyOf(nextScheduledDay(FRI).date), '2026-08-10')
})

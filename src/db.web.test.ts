import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activeSession, allSessions, allWeights, autoCloseStaleSessions, clearAll, deleteSet,
  exportAll, importAll, insertSet, insertWeight, openSession, setsForExercise, setsForSession,
} from './db.web'

// No localStorage under node, so the store falls back to memory — which is
// exactly the query behaviour these tests are here to pin down.
const HOUR = 60 * 60 * 1000

const set = (session: number, exercise: string, weight: number) =>
  insertSet({ session_id: session, exercise_id: exercise, set_index: 0, is_warmup: 0, weight, reps: 8, rir: 2 })

test('one session at a time: opening a new day closes the old one', () => {
  clearAll()
  const mon = openSession('mon')
  const tue = openSession('tue')
  assert.notEqual(mon, tue)
  assert.equal(activeSession()?.id, tue)
  assert.equal(allSessions().find((s) => s.id === mon)?.ended_at !== null, true)
  assert.equal(openSession('tue'), tue) // same day rejoins rather than restarting
})

test('a stale session closes at its last set, not at now', () => {
  clearAll()
  const id = openSession('mon')
  set(id, 'squat', 100)
  const lastSet = setsForSession(id)[0].created_at
  const sessions = allSessions()
  sessions[0].started_at = Date.now() - 20 * HOUR
  autoCloseStaleSessions(Date.now())
  assert.equal(allSessions()[0].ended_at, lastSet)
})

test('sets read back newest-first per exercise, oldest-first per session', () => {
  clearAll()
  const id = openSession('mon')
  set(id, 'squat', 100)
  set(id, 'squat', 110)
  set(id, 'leg-press', 200)
  assert.deepEqual(setsForExercise('squat').map((s) => s.weight), [110, 100])
  assert.deepEqual(setsForSession(id).map((s) => s.weight), [100, 110, 200])
  deleteSet(setsForExercise('squat')[0].id)
  assert.deepEqual(setsForExercise('squat').map((s) => s.weight), [100])
})

test('export round-trips through import', () => {
  clearAll()
  const id = openSession('mon')
  set(id, 'squat', 100)
  insertWeight(81.5, Date.now())
  const backup = exportAll()
  clearAll()
  assert.deepEqual(allWeights(), [])
  importAll(backup)
  assert.equal(allWeights()[0].kg, 81.5)
  assert.equal(setsForSession(id)[0].weight, 100)
})

test('a bad backup is rejected before any data is dropped', () => {
  clearAll()
  insertWeight(80, Date.now())
  assert.throws(() => importAll(JSON.stringify({ version: 2, sessions: [], sets: [], body_weight: [] })), /version/)
  assert.throws(() => importAll(JSON.stringify({ version: 1, sessions: [] })), /missing/)
  assert.equal(allWeights().length, 1)
})

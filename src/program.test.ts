import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROGRAM, allExercises, exerciseName, findExercise, TRAINING_DAY_KEYS } from './program'

test('every exercise id is unique across the program', () => {
  // Thursday deliberately reuses Monday's exercise objects, so uniqueness is
  // checked across the distinct days only. Reading ids from allExercises()
  // would be vacuous — it deduplicates by id and could never fail.
  const ids = (['mon', 'tue', 'fri'] as const).flatMap((k) =>
    PROGRAM[k].groups!.flatMap((g) => g.exercises.map((e) => e.id)),
  )
  assert.equal(new Set(ids).size, ids.length)
})

test('superset partners reference each other', () => {
  for (const e of allExercises()) {
    if (!e.supersetWith) continue
    const partner = findExercise(e.supersetWith)
    assert.ok(partner, `${e.id} points at missing ${e.supersetWith}`)
    assert.equal(partner!.supersetWith, e.id)
  }
})

test('rep ranges are ascending and set counts are positive', () => {
  for (const e of allExercises()) {
    assert.ok(e.repsLow <= e.repsHigh, `${e.id} rep range inverted`)
    assert.ok(e.working > 0, `${e.id} has no working sets`)
  }
})

test('thursday repeats monday exercise for exercise', () => {
  const ids = (k: 'mon' | 'thu') =>
    PROGRAM[k].groups!.flatMap((g) => g.exercises.map((e) => e.id))
  assert.deepEqual(ids('thu'), ids('mon'))
})

test('alternatives resolve to a display name', () => {
  assert.equal(exerciseName('pec-deck'), 'Pec Deck')
  assert.equal(exerciseName('squat'), 'Squat')
  assert.equal(exerciseName('nonsense'), 'nonsense')
})

test('training days are the four logging days', () => {
  assert.deepEqual(TRAINING_DAY_KEYS, ['mon', 'tue', 'thu', 'fri'])
  for (const k of TRAINING_DAY_KEYS) assert.equal(PROGRAM[k].kind, 'training')
  assert.equal(PROGRAM.wed.kind, 'recovery')
})

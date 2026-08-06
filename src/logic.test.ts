import { test } from 'node:test'
import assert from 'node:assert/strict'
import { volume } from './logic'

test('harness runs', () => {
  assert.equal(volume(), 0)
})

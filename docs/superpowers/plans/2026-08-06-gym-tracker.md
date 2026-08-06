# Gym Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-user Expo app that logs a fixed weekly gym program, showing last session's numbers beside every set input.

**Architecture:** All data lives on-device in SQLite. The training program is a typed constant, not database rows. All derived logic (streak, week progress, last performance, volume) is pure functions in `src/logic.ts` with no React and no SQLite imports, so it is tested directly with `node --test`. Screens are thin: read from `db.ts`, compute with `logic.ts`, render.

**Tech Stack:** Expo (React Native) + TypeScript, expo-router, expo-sqlite (sync API), react-native-reanimated, `node --test` via `tsx`.

Spec: `docs/superpowers/specs/2026-08-06-gym-tracker-design.md`

## Global Constraints

- Units are kilograms everywhere. No unit toggle.
- Dark theme only. Black `#000000` background, white `#FFFFFF` text, red `#E5352B` accent. Values exactly as in `src/theme.ts`; never hardcode a colour in a screen.
- Any control tapped during a set is at least 56pt tall.
- No network calls at runtime. No accounts, no sync, no analytics.
- TypeScript `strict: true`.
- Tests run with `npm test` → `node --import tsx --test src/*.test.ts`. No Jest, no test framework, no fixtures. Assertions only.
- Pure logic goes in `src/logic.ts`. It must never import `expo-sqlite`, `react`, or `react-native` — importing any of them breaks the test runner.
- **Commit messages must NOT include a `Co-Authored-By` trailer or any tool attribution.** Subject and body only.
- Deferred and explicitly out of scope for this plan: PR badges, progress charts, recovery score, body measurements beyond weight, rest timer, exercise demo media.

## File Structure

| File | Responsibility |
|---|---|
| `src/theme.ts` | Colour, type scale, spacing constants. No logic. |
| `src/program.ts` | The weekly split as data. Pure — no imports. |
| `src/logic.ts` | Row types + pure derived logic. No React, no SQLite. |
| `src/logic.test.ts` | Assertions over `logic.ts`. |
| `src/db.ts` | Schema, migration, every SQL query. Imports types from `logic.ts`. |
| `src/ui.tsx` | Shared primitives: `Card`, `BigButton`, `NumField`. Used by all screens. |
| `app/_layout.tsx` | Router root, dark theme, header styling. |
| `app/index.tsx` | Dashboard. |
| `app/workout/[day].tsx` | Exercise list for a day. |
| `app/exercise/[id].tsx` | Set logging — the core screen. |
| `app/summary/[session].tsx` | Post-workout summary. |
| `app/history/[id].tsx` | Per-exercise history. |
| `app/weight.tsx` | Body weight log. |
| `app/settings.tsx` | Export / import / clear. |

Deviations from the spec, both deliberate: logging lives at `app/exercise/[id].tsx` rather than nested under `workout/`, because the screen needs the exercise and the active session, not the day; and `program.ts` carries no `media` field in v1 since media is deferred and a `require()` in that file would break the node test runner.

---

### Task 1: Expo scaffold, theme, test harness

**Files:**
- Create: whole Expo project at repo root, `src/theme.ts`, `app/index.tsx`, `app/_layout.tsx`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `theme` object from `src/theme.ts` with keys `bg`, `surface`, `border`, `text`, `textMuted`, `accent`, `accentDim`, `space`, `radius`, and `font` (`{ h1: 34, h2: 24, body: 17, small: 15, tiny: 13 }`). An `npm test` script other tasks rely on.

- [ ] **Step 1: Scaffold Expo into the existing repo**

The repo already has `.git` and `README.md`, so scaffold into a temp directory and copy in.

```bash
cd /Volumes/Data/Projects/fit
npx create-expo-app@latest /tmp/fit-scaffold --template default
rsync -a --exclude .git --exclude node_modules /tmp/fit-scaffold/ ./
npm install
rm -rf /tmp/fit-scaffold
```

- [ ] **Step 2: Reset the starter template**

```bash
npm run reset-project
rm -rf app-example
```

Answer `n` when it asks to keep the example files. This leaves a minimal `app/` with `_layout.tsx` and `index.tsx`.

- [ ] **Step 3: Verify the app boots**

```bash
npx expo start
```

Expected: Metro starts and prints a QR code with no red errors. Open it in Expo Go on your phone and confirm a blank screen renders. Stop with `q`.

- [ ] **Step 4: Add the test harness**

```bash
npm install --save-dev tsx
```

Add to `package.json` `"scripts"`:

```json
"test": "node --import tsx --test src/*.test.ts"
```

- [ ] **Step 5: Prove the harness runs before there is anything to test**

Create `src/logic.ts`:

```ts
export const volume = (): number => 0
```

Create `src/logic.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { volume } from './logic'

test('harness runs', () => {
  assert.equal(volume(), 0)
})
```

Run: `npm test`
Expected: `# pass 1`. Imports are extensionless everywhere — `tsx` resolves them, and Metro requires extensionless for the same files at runtime.

- [ ] **Step 6: Write the theme**

Create `src/theme.ts`:

```ts
export const theme = {
  bg: '#000000',
  surface: '#0E0E0E',
  border: '#1F1F1F',
  text: '#FFFFFF',
  textMuted: '#8A8A8A',
  accent: '#E5352B',
  accentDim: '#7A1C16',
  space: 16,
  radius: 14,
  font: { h1: 34, h2: 24, body: 17, small: 15, tiny: 13 },
  // ponytail: one theme, so these are constants not a provider.
  // Add a provider only if a light theme is ever actually wanted.
} as const
```

- [ ] **Step 7: Apply the dark theme at the router root**

Replace `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { theme } from '../src/theme'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontSize: theme.font.body, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  )
}
```

Replace `app/index.tsx`:

```tsx
import { Text, View } from 'react-native'
import { theme } from '../src/theme'

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: theme.space }}>
      <Text style={{ color: theme.text, fontSize: theme.font.h1, fontWeight: '700' }}>Fit</Text>
    </View>
  )
}
```

- [ ] **Step 8: Verify on device**

Run: `npx expo start`
Expected: black screen, white "Fit" heading, no white flash on load. Stop with `q`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: expo scaffold, dark theme, node test harness"
```

---

### Task 2: The training program as data

**Files:**
- Create: `src/program.ts`, `src/program.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Exercise = { id: string; name: string; primary: string; secondary?: string[]; equipment: string; cue?: string; warmup?: number; working: number; repsLow: number; repsHigh: number; supersetWith?: string; alternatives?: { id: string; name: string }[] }`
  - `type Group = { label: string; exercises: Exercise[] }`
  - `type Day = { key: DayKey; title: string; kind: 'training' | 'recovery'; groups?: Group[]; suggestions?: string[] }`
  - `type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'`
  - `const PROGRAM: Record<DayKey, Day>`
  - `const TRAINING_DAY_KEYS: DayKey[]` — `['mon','tue','thu','fri']`
  - `function findExercise(id: string): Exercise | undefined`
  - `function allExercises(): Exercise[]`
  - `function exerciseName(id: string): string` — resolves alternatives too (`pec-deck` exists only as an alternative but is stored in `sets.exercise_id`, so history and summary screens need a name for it)

- [ ] **Step 1: Write the failing structural test**

The program is data, so the test guards data integrity, not behaviour: unique ids, symmetric superset pairs, sane rep ranges.

Create `src/program.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./program`.

- [ ] **Step 3: Write the program**

Create `src/program.ts`. Note Thursday reuses Monday's group array by reference — that is what makes the equality test above trivially true and means there is exactly one place to edit a chest exercise.

```ts
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'

export type Exercise = {
  id: string
  name: string
  primary: string
  secondary?: string[]
  equipment: string
  cue?: string
  warmup?: number
  working: number
  repsLow: number
  repsHigh: number
  supersetWith?: string
  alternatives?: { id: string; name: string }[]
}

export type Group = { label: string; exercises: Exercise[] }

export type Day = {
  key: DayKey
  title: string
  kind: 'training' | 'recovery'
  groups?: Group[]
  suggestions?: string[]
}

const MONDAY_GROUPS: Group[] = [
  {
    label: 'Chest',
    exercises: [
      { id: 'incline-smith-press', name: 'Incline Smith Machine Press', primary: 'Chest', secondary: ['Front Delts', 'Triceps'], equipment: 'Smith machine', cue: 'Elbows tucked ~45°, stop an inch off the chest.', warmup: 2, working: 2, repsLow: 6, repsHigh: 8 },
      { id: 'flat-smith-press', name: 'Flat Smith Machine Press', primary: 'Chest', secondary: ['Triceps'], equipment: 'Smith machine', working: 2, repsLow: 6, repsHigh: 8 },
      { id: 'incline-db-press', name: 'Incline Dumbbell Press', primary: 'Chest', secondary: ['Front Delts'], equipment: 'Dumbbells', working: 2, repsLow: 8, repsHigh: 10 },
      { id: 'cable-fly', name: 'Cable Fly', primary: 'Chest', equipment: 'Cable', cue: 'Slight forward lean, squeeze at the midline.', working: 2, repsLow: 10, repsHigh: 15, alternatives: [{ id: 'pec-deck', name: 'Pec Deck' }] },
    ],
  },
  {
    label: 'Back',
    exercises: [
      { id: 'lat-pulldown-overhand', name: 'Lat Pulldown (Overhand)', primary: 'Lats', secondary: ['Biceps'], equipment: 'Cable', working: 3, repsLow: 8, repsHigh: 10 },
      { id: 'lat-pulldown-underhand', name: 'Lat Pulldown (Underhand)', primary: 'Lats', secondary: ['Biceps'], equipment: 'Cable', working: 2, repsLow: 8, repsHigh: 10 },
      { id: 'cable-row', name: 'Cable Row', primary: 'Mid Back', secondary: ['Biceps'], equipment: 'Cable', working: 2, repsLow: 8, repsHigh: 10 },
      { id: 't-bar-row', name: 'T-Bar Row (Upper Back)', primary: 'Upper Back', secondary: ['Rear Delts'], equipment: 'T-bar', cue: 'Wide grip, elbows flared for upper back.', working: 2, repsLow: 8, repsHigh: 10 },
      { id: 'one-arm-db-row', name: 'One Arm Dumbbell Row (Lat)', primary: 'Lats', equipment: 'Dumbbell', cue: 'Elbow to hip, not to armpit.', working: 2, repsLow: 10, repsHigh: 12 },
    ],
  },
]

export const PROGRAM: Record<DayKey, Day> = {
  mon: { key: 'mon', title: 'Chest & Back (Heavy)', kind: 'training', groups: MONDAY_GROUPS },
  tue: {
    key: 'tue',
    title: 'Shoulders & Arms',
    kind: 'training',
    groups: [
      {
        label: 'Shoulders',
        exercises: [
          { id: 'standing-ohp', name: 'Standing Barbell Overhead Press', primary: 'Front Delts', secondary: ['Triceps'], equipment: 'Barbell', cue: 'Glutes tight, head through at lockout.', warmup: 2, working: 2, repsLow: 6, repsHigh: 8 },
          { id: 'db-lateral-raise', name: 'Dumbbell Lateral Raise', primary: 'Side Delts', equipment: 'Dumbbells', working: 2, repsLow: 12, repsHigh: 15 },
          { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', primary: 'Side Delts', equipment: 'Cable', working: 2, repsLow: 12, repsHigh: 15 },
          { id: 'rear-delt-pec-deck', name: 'Rear Delt Pec Deck', primary: 'Rear Delts', equipment: 'Pec deck', working: 2, repsLow: 12, repsHigh: 15 },
        ],
      },
      {
        label: 'Arms',
        exercises: [
          { id: 'straight-bar-pushdown', name: 'Straight Bar Pushdown', primary: 'Triceps', equipment: 'Cable', working: 2, repsLow: 8, repsHigh: 10, supersetWith: 'straight-bar-curl' },
          { id: 'straight-bar-curl', name: 'Straight Bar Curl', primary: 'Biceps', equipment: 'Cable', working: 2, repsLow: 8, repsHigh: 10, supersetWith: 'straight-bar-pushdown' },
          { id: 'overhead-rope-ext', name: 'Overhead Rope Extension', primary: 'Triceps', equipment: 'Cable', working: 2, repsLow: 10, repsHigh: 12, supersetWith: 'bayesian-curl' },
          { id: 'bayesian-curl', name: 'Bayesian Cable Curl', primary: 'Biceps', equipment: 'Cable', working: 2, repsLow: 10, repsHigh: 12, supersetWith: 'overhead-rope-ext' },
          { id: 'skull-crushers', name: 'Skull Crushers', primary: 'Triceps', equipment: 'EZ bar', working: 2, repsLow: 8, repsHigh: 10, supersetWith: 'ez-bar-curl' },
          { id: 'ez-bar-curl', name: 'EZ Bar Curl', primary: 'Biceps', equipment: 'EZ bar', working: 2, repsLow: 8, repsHigh: 10, supersetWith: 'skull-crushers' },
        ],
      },
    ],
  },
  wed: {
    key: 'wed',
    title: 'Recovery',
    kind: 'recovery',
    suggestions: ['Walk 20–30 minutes', 'Stretch', 'Mobility work', 'Foam rolling', 'Hydrate', 'Sleep 8+ hours'],
  },
  thu: { key: 'thu', title: 'Chest & Back (Heavy)', kind: 'training', groups: MONDAY_GROUPS },
  fri: {
    key: 'fri',
    title: 'Legs + Light Arms & Shoulders',
    kind: 'training',
    groups: [
      {
        label: 'Legs',
        exercises: [
          { id: 'squat', name: 'Squat', primary: 'Quads', secondary: ['Glutes', 'Adductors'], equipment: 'Barbell', cue: 'Brace before the unrack, knees track over toes.', warmup: 2, working: 2, repsLow: 6, repsHigh: 8 },
          { id: 'leg-press', name: 'Leg Press', primary: 'Quads', secondary: ['Glutes'], equipment: 'Machine', working: 2, repsLow: 10, repsHigh: 12 },
          { id: 'hamstring-curl', name: 'Hamstring Curl', primary: 'Hamstrings', equipment: 'Machine', working: 2, repsLow: 10, repsHigh: 12 },
          { id: 'leg-extension', name: 'Leg Extension', primary: 'Quads', equipment: 'Machine', working: 2, repsLow: 12, repsHigh: 15 },
          { id: 'standing-calf-raise', name: 'Standing Calf Raise', primary: 'Calves', equipment: 'Machine', cue: 'Pause at the bottom, no bouncing.', working: 3, repsLow: 10, repsHigh: 15 },
        ],
      },
      {
        label: 'Light Shoulders',
        exercises: [
          { id: 'light-lateral-raise', name: 'Lateral Raise (Light)', primary: 'Side Delts', equipment: 'Dumbbells', working: 2, repsLow: 15, repsHigh: 20 },
          { id: 'light-rear-delt-pec-deck', name: 'Rear Delt Pec Deck (Light)', primary: 'Rear Delts', equipment: 'Pec deck', working: 2, repsLow: 15, repsHigh: 20 },
        ],
      },
      {
        label: 'Light Arms',
        exercises: [
          { id: 'light-pushdown', name: 'Straight Bar Pushdown (Light)', primary: 'Triceps', equipment: 'Cable', working: 2, repsLow: 12, repsHigh: 15 },
          { id: 'light-straight-bar-curl', name: 'Straight Bar Curl (Light)', primary: 'Biceps', equipment: 'Cable', working: 2, repsLow: 12, repsHigh: 15 },
        ],
      },
    ],
  },
}

export const TRAINING_DAY_KEYS: DayKey[] = ['mon', 'tue', 'thu', 'fri']

export function allExercises(): Exercise[] {
  const seen = new Map<string, Exercise>()
  for (const day of Object.values(PROGRAM)) {
    for (const group of day.groups ?? []) {
      for (const e of group.exercises) seen.set(e.id, e)
    }
  }
  return [...seen.values()]
}

export function findExercise(id: string): Exercise | undefined {
  return allExercises().find((e) => e.id === id)
}

/** Alternatives are stored in sets.exercise_id but are not top-level exercises. */
export function exerciseName(id: string): string {
  const direct = findExercise(id)
  if (direct) return direct.name
  for (const e of allExercises()) {
    const alt = e.alternatives?.find((a) => a.id === id)
    if (alt) return alt.name
  }
  return id
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, 6 program tests plus the harness test.

- [ ] **Step 5: Delete the placeholder logic stub**

Remove the `volume` stub and the `harness runs` test — Task 3 replaces them properly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: weekly program as typed data with integrity tests"
```

---

### Task 3: Pure derived logic

**Files:**
- Create: `src/logic.ts` (replacing the stub), `src/logic.test.ts` (replacing the stub)

**Interfaces:**
- Consumes: `DayKey`, `TRAINING_DAY_KEYS`, `PROGRAM` from `src/program.ts`
- Produces:
  - `type SessionRow = { id: number; day_key: DayKey; started_at: number; ended_at: number | null }`
  - `type SetRow = { id: number; session_id: number; exercise_id: string; set_index: number; is_warmup: 0 | 1; weight: number; reps: number; rir: number | null; created_at: number }`
  - `dayKeyOf(ms: number): string` — local calendar date as `YYYY-MM-DD`
  - `weekStart(now: number): number` — epoch ms of Monday 00:00 local
  - `weekProgress(sessions: SessionRow[], now: number): { done: number; total: number }`
  - `streak(sessions: SessionRow[], now: number): number`
  - `volume(sets: SetRow[]): number`
  - `lastPerformance(sets: SetRow[], exerciseId: string, excludeSessionId?: number): Record<number, SetRow>`
  - `dayKeyForWeekday(weekday: number): DayKey | null`
  - `nextScheduledDay(now: number): { key: DayKey; date: number }`

- [ ] **Step 1: Write the failing tests**

Replace `src/logic.test.ts` entirely:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayKeyOf, weekStart, weekProgress, streak, volume, lastPerformance, nextScheduledDay,
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

test('nextScheduledDay skips to the following programmed day', () => {
  assert.equal(nextScheduledDay(MON).key, 'tue')
  assert.equal(nextScheduledDay(TUE).key, 'wed')
  assert.equal(nextScheduledDay(FRI).key, 'mon', 'weekend rolls to Monday')
  assert.equal(dayKeyOf(nextScheduledDay(FRI).date), '2026-08-10')
})
```

- [ ] **Step 2: Run to confirm the tests fail**

Run: `npm test`
Expected: FAIL — the named exports do not exist.

- [ ] **Step 3: Implement the logic**

Replace `src/logic.ts` entirely:

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, all logic and program tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure derived logic for streak, week progress, volume, last performance"
```

---

### Task 4: Database layer

**Files:**
- Create: `src/db.ts`

**Interfaces:**
- Consumes: `SessionRow`, `SetRow` from `src/logic.ts`; `DayKey` from `src/program.ts`
- Produces:
  - `migrate(): void`
  - `openSession(dayKey: DayKey): number` — returns the open session for today's day key, creating one if none exists
  - `activeSession(): SessionRow | undefined`
  - `finishSession(id: number, endedAt: number): void`
  - `autoCloseStaleSessions(now: number): void`
  - `insertSet(row: Omit<SetRow, 'id'>): void`
  - `deleteSet(id: number): void`
  - `setsForSession(sessionId: number): SetRow[]`
  - `setsForExercise(exerciseId: string): SetRow[]`
  - `allSets(): SetRow[]`
  - `allSessions(): SessionRow[]`
  - `getSession(id: number): SessionRow | undefined`
  - `insertWeight(kg: number, loggedAt: number): void`
  - `allWeights(): { id: number; logged_at: number; kg: number }[]`
  - `exportAll(): string`
  - `importAll(json: string): void`
  - `clearAll(): void`

- [ ] **Step 1: Install the driver**

```bash
npx expo install expo-sqlite
```

- [ ] **Step 2: Write the database module**

Create `src/db.ts`:

```ts
import { openDatabaseSync } from 'expo-sqlite'
import type { SessionRow, SetRow } from './logic'
import type { DayKey } from './program'

// ponytail: synchronous SQLite API. At this data volume (a few thousand rows
// over years) the main thread never notices. Switch to the async API only if a
// query is ever measurably janky.
const db = openDatabaseSync('fit.db')

export type WeightRow = { id: number; logged_at: number; kg: number }

export function migrate(): void {
  db.execSync(`
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
  `)
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
```

- [ ] **Step 3: Call migrate and the stale-session sweep at startup**

Modify `app/_layout.tsx` — add these imports and the effect, keeping the existing `Stack` markup:

```tsx
import { useEffect, useState } from 'react'
import { autoCloseStaleSessions, migrate } from '../src/db'

// inside RootLayout, before the return:
const [ready, setReady] = useState(false)
useEffect(() => {
  migrate()
  autoCloseStaleSessions(Date.now())
  setReady(true)
}, [])
if (!ready) return null
```

- [ ] **Step 4: Verify the schema is created on device**

Run: `npx expo start`
Expected: the app still renders the black "Fit" screen with no error overlay. A SQLite failure surfaces immediately as a red screen, so a clean boot means `migrate()` ran.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sqlite schema, queries, and json export/import"
```

---

### Task 5: Shared UI primitives

**Files:**
- Create: `src/ui.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme.ts`
- Produces:
  - `<Card>{children}</Card>` — `{ children: ReactNode; onPress?: () => void; style?: ViewStyle }`
  - `<BigButton label="Start Workout" onPress={fn} variant?="primary" | "ghost" />`
  - `<NumField value={string} onChangeText={fn} placeholder={string} />` — decimal keypad, 56pt tall
  - `<Label>` and `<Muted>` text helpers

- [ ] **Step 1: Write the primitives**

Create `src/ui.tsx`:

```tsx
import { ReactNode } from 'react'
import { Pressable, Text, TextInput, View, ViewStyle } from 'react-native'
import { theme } from './theme'

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const body = (
    <View
      style={[{
        backgroundColor: theme.surface,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.space,
        gap: 6,
      }, style]}
    >
      {children}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  )
}

export function BigButton({ label, onPress, variant = 'primary' }: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'ghost'
}) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: theme.radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? theme.accent : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: theme.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

export function NumField({ value, onChangeText, placeholder }: {
  value: string
  onChangeText: (t: string) => void
  placeholder: string
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      keyboardType="decimal-pad"
      selectTextOnFocus
      style={{
        flex: 1,
        minHeight: 56,
        textAlign: 'center',
        color: theme.text,
        fontSize: theme.font.h2,
        fontWeight: '600',
        backgroundColor: theme.bg,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    />
  )
}

export const Label = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '600' }}>{children}</Text>
)

export const Muted = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: theme.textMuted, fontSize: theme.font.tiny }}>{children}</Text>
)
```

- [ ] **Step 2: Verify by rendering them once**

Temporarily replace the body of `app/index.tsx` with a `Card` containing a `Label`, a `Muted`, a `NumField`, and a `BigButton`.

Run: `npx expo start`
Expected: dark card, white label, grey caption, a red full-width button. Tap the number field and confirm the decimal keypad opens, not the full keyboard. Then revert `app/index.tsx` — Task 6 rewrites it.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: shared dark-theme ui primitives"
```

---

### Task 6: Dashboard

**Files:**
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `PROGRAM`, `DayKey` from `src/program.ts`; `streak`, `weekProgress`, `nextScheduledDay`, `dayKeyForWeekday`, `volume` from `src/logic.ts`; `allSessions`, `setsForSession`, `allWeights` from `src/db.ts`; `Card`, `BigButton`, `Label`, `Muted` from `src/ui.tsx`
- Produces: navigation entry points to `/workout/[day]`, `/weight`, `/settings`, `/history/[id]`

- [ ] **Step 1: Write the dashboard**

Replace `app/index.tsx`:

```tsx
import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { PROGRAM } from '../src/program'
import { dayKeyForWeekday, nextScheduledDay, streak, volume, weekProgress } from '../src/logic'
import { allSessions, allWeights, setsForSession } from '../src/db'
import { BigButton, Card, Label, Muted } from '../src/ui'
import { theme } from '../src/theme'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export default function Home() {
  const router = useRouter()
  const [tick, setTick] = useState(0)
  // Recompute on every focus so returning from a workout shows fresh numbers.
  useFocusEffect(useCallback(() => { setTick((t) => t + 1) }, []))

  const now = Date.now()
  const sessions = allSessions()
  const weights = allWeights()
  const todayKey = dayKeyForWeekday(new Date(now).getDay())
  const today = todayKey ? PROGRAM[todayKey] : null
  const next = nextScheduledDay(now)
  const week = weekProgress(sessions, now)
  const last = sessions.find((s) => s.ended_at !== null)
  const lastSets = last ? setsForSession(last.id) : []
  const weekAgoWeight = weights.find((w) => w.logged_at <= now - 7 * 24 * 3600_000)
  const delta = weights[0] && weekAgoWeight ? weights[0].kg - weekAgoWeight.kg : null

  return (
    <ScrollView
      key={tick}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
    >
      <Text style={{ color: theme.text, fontSize: theme.font.h1, fontWeight: '800' }}>Today</Text>

      {today && today.kind === 'training' ? (
        <Card onPress={() => router.push(`/workout/${today.key}`)}>
          <Muted>TODAY</Muted>
          <Text style={{ color: theme.text, fontSize: theme.font.h2, fontWeight: '700' }}>{today.title}</Text>
          <Text style={{ color: theme.accent, fontSize: theme.font.small, fontWeight: '600' }}>Tap to start →</Text>
        </Card>
      ) : (
        <Card>
          <Muted>TODAY</Muted>
          <Text style={{ color: theme.text, fontSize: theme.font.h2, fontWeight: '700' }}>
            {today ? today.title : 'Rest day'}
          </Text>
          {(today?.suggestions ?? []).map((s) => (
            <Text key={s} style={{ color: theme.textMuted, fontSize: theme.font.small }}>• {s}</Text>
          ))}
        </Card>
      )}

      <Card>
        <Muted>NEXT</Muted>
        <Label>{PROGRAM[next.key].title}</Label>
        <Muted>{fmtDate(next.date)}</Muted>
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.space }}>
        <Card style={{ flex: 1 }}>
          <Muted>THIS WEEK</Muted>
          <Text style={{ color: theme.text, fontSize: theme.font.h2, fontWeight: '700' }}>
            {week.done}/{week.total}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: week.total }, (_, i) => (
              <View
                key={i}
                style={{
                  flex: 1, height: 4, borderRadius: 2,
                  backgroundColor: i < week.done ? theme.accent : theme.border,
                }}
              />
            ))}
          </View>
        </Card>
        <Card style={{ flex: 1 }}>
          <Muted>STREAK</Muted>
          <Text style={{ color: theme.text, fontSize: theme.font.h2, fontWeight: '700' }}>
            {streak(sessions, now)}
          </Text>
          <Muted>training days</Muted>
        </Card>
      </View>

      <Card onPress={() => router.push('/weight')}>
        <Muted>BODY WEIGHT</Muted>
        <Text style={{ color: theme.text, fontSize: theme.font.h2, fontWeight: '700' }}>
          {weights[0] ? `${weights[0].kg} kg` : 'Not logged'}
        </Text>
        {delta !== null && (
          <Muted>{`${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs 7 days ago`}</Muted>
        )}
      </Card>

      {last && (
        <Card>
          <Muted>PREVIOUS WORKOUT</Muted>
          <Label>{PROGRAM[last.day_key].title}</Label>
          <Muted>
            {fmtDate(last.started_at)} · {lastSets.filter((s) => !s.is_warmup).length} working sets ·{' '}
            {Math.round(volume(lastSets))} kg volume
          </Muted>
        </Card>
      )}

      <BigButton
        label={today?.kind === 'training' ? 'Start Workout' : 'Open Next Workout'}
        onPress={() => router.push(`/workout/${today?.kind === 'training' ? today.key : next.key}`)}
      />
      <View style={{ flexDirection: 'row', gap: theme.space }}>
        <View style={{ flex: 1 }}><BigButton label="Body Weight" variant="ghost" onPress={() => router.push('/weight')} /></View>
        <View style={{ flex: 1 }}><BigButton label="Settings" variant="ghost" onPress={() => router.push('/settings')} /></View>
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify on device**

Run: `npx expo start`
Expected: dashboard renders. With an empty database: today's card shows the correct day's title for the real weekday, week shows `0/4`, streak `0`, body weight "Not logged", no previous-workout card, no crash. Tapping cards navigates and shows expo-router's "unmatched route" screen for routes not yet built — that is correct at this point.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: dashboard with today, next, week progress, streak, body weight"
```

---

### Task 7: Day screen — exercise list

**Files:**
- Create: `app/workout/[day].tsx`

**Interfaces:**
- Consumes: `PROGRAM`, `DayKey` from `src/program.ts`; `activeSession`, `openSession`, `setsForSession`, `finishSession` from `src/db.ts`; UI primitives
- Produces: navigation into `/exercise/[id]` and `/summary/[session]`

Deviation from spec §7: supersets render as ordinary adjacent rows tagged
`· superset` rather than as one merged card with a shared counter. Two rows that
already sit next to each other communicate the pairing; a merged card means a
second logging layout to build and maintain. Revisit only if alternating between
the two exercises on the real screen turns out to be awkward.

- [ ] **Step 1: Write the screen**

Create `app/workout/[day].tsx`:

```tsx
import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { PROGRAM, type DayKey } from '../../src/program'
import { activeSession, finishSession, openSession, setsForSession } from '../../src/db'
import { BigButton, Card, Label, Muted } from '../../src/ui'
import { theme } from '../../src/theme'

export default function DayScreen() {
  const { day } = useLocalSearchParams<{ day: DayKey }>()
  const router = useRouter()
  const [tick, setTick] = useState(0)
  useFocusEffect(useCallback(() => { setTick((t) => t + 1) }, []))

  const program = PROGRAM[day]
  if (!program) return <Text style={{ color: theme.text, padding: theme.space }}>Unknown day</Text>

  if (program.kind === 'recovery') {
    return (
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: theme.space, gap: theme.space }}>
        <Stack.Screen options={{ title: program.title }} />
        <Card>
          <Label>Recovery day</Label>
          {program.suggestions!.map((s) => (
            <Text key={s} style={{ color: theme.textMuted, fontSize: theme.font.body, paddingVertical: 4 }}>• {s}</Text>
          ))}
        </Card>
      </ScrollView>
    )
  }

  const session = activeSession()
  const live = session?.day_key === day ? session : undefined
  const doneSets = live ? setsForSession(live.id) : []
  const countFor = (id: string) => doneSets.filter((s) => s.exercise_id === id && !s.is_warmup).length

  return (
    <ScrollView
      key={tick}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
    >
      <Stack.Screen options={{ title: program.title }} />

      {program.groups!.map((group) => (
        <View key={group.label} style={{ gap: 10 }}>
          <Muted>{group.label.toUpperCase()}</Muted>
          {group.exercises.map((e) => {
            const done = countFor(e.id)
            const complete = done >= e.working
            return (
              <Card
                key={e.id}
                onPress={() => {
                  const id = live?.id ?? openSession(day)
                  router.push(`/exercise/${e.id}?session=${id}`)
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Label>{e.name}</Label>
                    <Muted>
                      {e.warmup ? `${e.warmup} warm-up · ` : ''}
                      {e.working} × {e.repsLow}–{e.repsHigh}
                      {e.supersetWith ? ' · superset' : ''}
                    </Muted>
                  </View>
                  <Text style={{ color: complete ? theme.accent : theme.textMuted, fontSize: theme.font.small, fontWeight: '700' }}>
                    {done}/{e.working}
                  </Text>
                </View>
              </Card>
            )
          })}
        </View>
      ))}

      {live && (
        <BigButton
          label="Finish Workout"
          onPress={() => {
            finishSession(live.id, Date.now())
            router.replace(`/summary/${live.id}`)
          }}
        />
      )}
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify on device**

Run: `npx expo start`
Expected: from the dashboard, tapping today's card lists that day's exercises grouped by `Chest` / `Back` etc., each showing `0/2` and its rep range. On a Wednesday, the recovery list renders instead. "Finish Workout" is absent until a session exists.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: day screen listing exercises with per-exercise set counts"
```

---

### Task 8: Set logging screen

**Files:**
- Create: `app/exercise/[id].tsx`

**Interfaces:**
- Consumes: `findExercise` from `src/program.ts`; `lastPerformance` from `src/logic.ts`; `insertSet`, `setsForSession`, `setsForExercise`, `deleteSet` from `src/db.ts`; UI primitives
- Produces: rows in `sets`

This is the screen the whole app exists for. The rule it enforces: committing a set with empty inputs accepts last session's values, so a repeat set is one tap.

- [ ] **Step 1: Write the screen**

Create `app/exercise/[id].tsx`:

```tsx
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { findExercise } from '../../src/program'
import { lastPerformance } from '../../src/logic'
import { deleteSet, insertSet, setsForExercise, setsForSession } from '../../src/db'
import { BigButton, Card, Label, Muted, NumField } from '../../src/ui'
import { theme } from '../../src/theme'

export default function ExerciseScreen() {
  const { id, session } = useLocalSearchParams<{ id: string; session: string }>()
  const router = useRouter()
  const sessionId = Number(session)
  const base = findExercise(id)
  const [chosenId, setChosenId] = useState(id)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [version, setVersion] = useState(0)

  if (!base) return <Text style={{ color: theme.text, padding: theme.space }}>Unknown exercise</Text>

  const logged = setsForSession(sessionId).filter((s) => s.exercise_id === chosenId)
  const working = logged.filter((s) => !s.is_warmup)
  const prev = lastPerformance(setsForExercise(chosenId), chosenId, sessionId)
  const nextIndex = warmup ? logged.filter((s) => s.is_warmup).length : working.length
  const suggestion = prev[nextIndex]

  const commit = () => {
    const w = weight === '' ? suggestion?.weight : Number(weight)
    const r = reps === '' ? suggestion?.reps : Number(reps)
    if (w === undefined || r === undefined || Number.isNaN(w) || Number.isNaN(r) || r <= 0) {
      Alert.alert('Enter weight and reps', 'There is no previous set to copy from yet.')
      return
    }
    insertSet({
      session_id: sessionId,
      exercise_id: chosenId,
      set_index: nextIndex,
      is_warmup: warmup ? 1 : 0,
      weight: w,
      reps: r,
      rir: rir === '' ? (suggestion?.rir ?? null) : Number(rir),
      created_at: Date.now(),
    })
    setWeight(''); setReps(''); setRir('')
    setVersion((v) => v + 1)
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: base.name }} />

      {base.alternatives && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ id: base.id, name: base.name }, ...base.alternatives].map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setChosenId(opt.id)}
              style={{
                flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center',
                borderRadius: theme.radius, borderWidth: 1,
                borderColor: chosenId === opt.id ? theme.accent : theme.border,
                backgroundColor: chosenId === opt.id ? theme.accentDim : 'transparent',
              }}
            >
              <Text style={{ color: theme.text, fontSize: theme.font.small, fontWeight: '600' }}>{opt.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Card>
        <Label>{base.primary}</Label>
        <Muted>
          {base.secondary?.length ? `Also: ${base.secondary.join(', ')} · ` : ''}{base.equipment}
        </Muted>
        <Muted>Target: {base.working} × {base.repsLow}–{base.repsHigh}{base.warmup ? ` (+${base.warmup} warm-up)` : ''}</Muted>
        {base.cue && <Text style={{ color: theme.text, fontSize: theme.font.small, marginTop: 6 }}>{base.cue}</Text>}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>Set {nextIndex + 1}{warmup ? ' (warm-up)' : ''}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Muted>Warm-up</Muted>
            <Switch value={warmup} onValueChange={setWarmup} trackColor={{ true: theme.accent, false: theme.border }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumField value={weight} onChangeText={setWeight} placeholder={suggestion ? String(suggestion.weight) : 'kg'} />
          <NumField value={reps} onChangeText={setReps} placeholder={suggestion ? String(suggestion.reps) : 'reps'} />
          <NumField value={rir} onChangeText={setRir} placeholder={suggestion?.rir != null ? String(suggestion.rir) : 'RIR'} />
        </View>
        <Muted>
          {suggestion
            ? `Last: ${suggestion.weight} kg × ${suggestion.reps}${suggestion.rir != null ? ` @${suggestion.rir}` : ''} — leave blank to repeat`
            : 'No previous set for this position'}
        </Muted>
        <View style={{ height: 8 }} />
        <BigButton label="Log Set" onPress={commit} />
      </Card>

      <View key={version} style={{ gap: 8 }}>
        {logged.map((s) => (
          <Animated.View key={s.id} entering={FadeIn.duration(180)} layout={LinearTransition.springify()}>
            <Pressable
              onLongPress={() => {
                Alert.alert('Delete set?', `${s.weight} kg × ${s.reps}`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => { deleteSet(s.id); setVersion((v) => v + 1) } },
                ])
              }}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Label>{s.is_warmup ? 'Warm-up' : `Set ${s.set_index + 1}`}</Label>
                  <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '700' }}>
                    {s.weight} kg × {s.reps}{s.rir != null ? ` @${s.rir}` : ''}
                  </Text>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <BigButton label="Exercise History" variant="ghost" onPress={() => router.push(`/history/${chosenId}`)} />
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify the core loop on device**

Run: `npx expo start`

Walk this exact sequence and confirm each expectation:
1. Dashboard → today's workout → first exercise. Expected: "No previous set for this position", empty fields.
2. Enter `60` / `8` / `2`, tap **Log Set**. Expected: a row animates in reading `60 kg × 8 @2`, inputs clear, header now says "Set 2".
3. Tap **Log Set** with all fields empty. Expected: an alert — there is no previous set at index 1 yet.
4. Enter `60` / `7`, tap **Log Set**. Expected: second row appears.
5. Back out, and confirm the day screen shows `2/2` for that exercise.
6. Finish the workout, then start the same day again and reopen the exercise. Expected: the placeholder reads `60`, the caption reads `Last: 60 kg × 8 @2 — leave blank to repeat`, and tapping **Log Set** with empty fields logs `60 × 8` in one tap.
7. Long-press a logged row. Expected: delete confirmation, and the row disappears on confirm.
8. On a `Cable Fly` card, tap **Pec Deck**. Expected: the logged list empties (different exercise id) and its own history applies.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: set logging with previous-session prefill, warm-up toggle, alternatives"
```

---

### Task 9: Workout summary

**Files:**
- Create: `app/summary/[session].tsx`

**Interfaces:**
- Consumes: `getSession`, `setsForSession`, `setsForExercise` from `src/db.ts`; `volume`, `lastPerformance` from `src/logic.ts`; `exerciseName`, `PROGRAM` from `src/program.ts`
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Write the screen**

Create `app/summary/[session].tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { getSession, setsForExercise, setsForSession } from '../../src/db'
import { lastPerformance, volume } from '../../src/logic'
import { exerciseName, PROGRAM } from '../../src/program'
import { BigButton, Card, Label, Muted } from '../../src/ui'
import { theme } from '../../src/theme'

export default function Summary() {
  const { session } = useLocalSearchParams<{ session: string }>()
  const router = useRouter()
  const id = Number(session)
  const row = getSession(id)
  const sets = setsForSession(id)

  if (!row) return <Text style={{ color: theme.text, padding: theme.space }}>Session not found</Text>

  const working = sets.filter((s) => !s.is_warmup)
  const minutes = Math.round(((row.ended_at ?? Date.now()) - row.started_at) / 60000)
  const exerciseIds = [...new Set(working.map((s) => s.exercise_id))]

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
    >
      <Stack.Screen options={{ title: 'Workout Complete', headerBackVisible: false }} />

      <Card>
        <Muted>{PROGRAM[row.day_key].title.toUpperCase()}</Muted>
        <Text style={{ color: theme.text, fontSize: theme.font.h1, fontWeight: '800' }}>
          {Math.round(volume(sets))} kg
        </Text>
        <Muted>{working.length} working sets · {minutes} min</Muted>
      </Card>

      {exerciseIds.map((exId) => {
        const mine = working.filter((s) => s.exercise_id === exId)
        const prev = lastPerformance(setsForExercise(exId), exId, id)
        const prevVolume = Object.values(prev).reduce((t, s) => t + s.weight * s.reps, 0)
        const nowVolume = mine.reduce((t, s) => t + s.weight * s.reps, 0)
        const diff = prevVolume ? nowVolume - prevVolume : null
        return (
          <Card key={exId}>
            <Label>{exerciseName(exId)}</Label>
            <Muted>{mine.map((s) => `${s.weight}×${s.reps}`).join('   ')}</Muted>
            {diff !== null && (
              <Text style={{
                color: diff >= 0 ? theme.accent : theme.textMuted,
                fontSize: theme.font.tiny, fontWeight: '700',
              }}>
                {diff >= 0 ? '+' : ''}{Math.round(diff)} kg vs last time
              </Text>
            )}
          </Card>
        )
      })}

      <BigButton label="Done" onPress={() => router.replace('/')} />
      <View style={{ height: 8 }} />
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify on device**

Run: `npx expo start`
Expected: finishing a workout lands on the summary with total volume, set count, duration, and one card per exercise. On a second session of the same day with heavier weights, each card shows a red `+N kg vs last time`. "Done" returns to a dashboard whose previous-workout card now reflects this session.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: post-workout summary with per-exercise change vs last time"
```

---

### Task 10: Exercise history

**Files:**
- Create: `app/history/[id].tsx`

**Interfaces:**
- Consumes: `setsForExercise`, `getSession` from `src/db.ts`; `exerciseName` from `src/program.ts`
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Write the screen**

Create `app/history/[id].tsx`:

```tsx
import { ScrollView, Text } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { getSession, setsForExercise } from '../../src/db'
import { exerciseName } from '../../src/program'
import { Card, Label, Muted } from '../../src/ui'
import { theme } from '../../src/theme'

export default function History() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const sets = setsForExercise(id).filter((s) => !s.is_warmup)

  const bySession = new Map<number, typeof sets>()
  for (const s of sets) {
    const group = bySession.get(s.session_id) ?? []
    group.push(s)
    bySession.set(s.session_id, group)
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
    >
      <Stack.Screen options={{ title: exerciseName(id) }} />
      {bySession.size === 0 && <Muted>No sets logged for this exercise yet.</Muted>}
      {[...bySession.entries()].map(([sessionId, group]) => {
        const when = getSession(sessionId)?.started_at
        const sorted = [...group].sort((a, b) => a.set_index - b.set_index)
        return (
          <Card key={sessionId}>
            <Label>
              {when ? new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </Label>
            {sorted.map((s) => (
              <Text key={s.id} style={{ color: theme.textMuted, fontSize: theme.font.body }}>
                Set {s.set_index + 1} — {s.weight} kg × {s.reps}{s.rir != null ? ` @${s.rir}` : ''}
              </Text>
            ))}
          </Card>
        )
      })}
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify on device**

Run: `npx expo start`
Expected: from an exercise screen, "Exercise History" lists past sessions newest first, each with its sets in order. An exercise never trained shows the empty-state line, not a crash.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: per-exercise history screen"
```

---

### Task 11: Body weight

**Files:**
- Create: `app/weight.tsx`

**Interfaces:**
- Consumes: `insertWeight`, `allWeights` from `src/db.ts`; UI primitives
- Produces: rows in `body_weight`

- [ ] **Step 1: Write the screen**

Create `app/weight.tsx`:

```tsx
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { allWeights, insertWeight } from '../src/db'
import { BigButton, Card, Label, Muted, NumField } from '../src/ui'
import { theme } from '../src/theme'

export default function Weight() {
  const [value, setValue] = useState('')
  const [version, setVersion] = useState(0)
  const rows = allWeights()

  const save = () => {
    const kg = Number(value)
    if (!value || Number.isNaN(kg) || kg <= 0 || kg > 500) {
      Alert.alert('Enter a body weight in kg', 'Must be a number between 0 and 500.')
      return
    }
    insertWeight(kg, Date.now())
    setValue('')
    setVersion((v) => v + 1)
  }

  return (
    <ScrollView
      key={version}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Body Weight' }} />
      <Card>
        <Label>Log today's weight</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumField value={value} onChangeText={setValue} placeholder="kg" />
        </View>
        <View style={{ height: 8 }} />
        <BigButton label="Save" onPress={save} />
      </Card>
      {rows.length === 0 && <Muted>Nothing logged yet.</Muted>}
      {rows.map((w) => (
        <Card key={w.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{new Date(w.logged_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Muted>
            <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '700' }}>{w.kg} kg</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  )
}
```

- [ ] **Step 2: Verify on device**

Run: `npx expo start`
Expected: saving `82.5` prepends a row. Saving an empty field, `0`, `abc`, or `900` shows the alert and stores nothing. The dashboard's body weight card then reads `82.5 kg`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: body weight logging"
```

---

### Task 12: Settings — export, import, clear

**Files:**
- Create: `app/settings.tsx`

**Interfaces:**
- Consumes: `exportAll`, `importAll`, `clearAll` from `src/db.ts`; `expo-file-system`, `expo-sharing`, `expo-document-picker`
- Produces: nothing consumed elsewhere

- [ ] **Step 1: Install the file dependencies**

```bash
npx expo install expo-file-system expo-sharing expo-document-picker
```

`expo-file-system` moved `cacheDirectory`, `writeAsStringAsync`, and
`readAsStringAsync` to a legacy entry point in recent SDKs. If
`FileSystem.cacheDirectory` is `undefined` at runtime, change the import to
`import * as FileSystem from 'expo-file-system/legacy'` and keep everything else
identical.

- [ ] **Step 2: Write the screen**

Create `app/settings.tsx`:

```tsx
import { Alert, ScrollView, Text } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { clearAll, exportAll, importAll } from '../src/db'
import { BigButton, Card, Label, Muted } from '../src/ui'
import { theme } from '../src/theme'

export default function Settings() {
  const router = useRouter()

  const doExport = async () => {
    try {
      const path = `${FileSystem.cacheDirectory}fit-backup.json`
      await FileSystem.writeAsStringAsync(path, exportAll())
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', `Backup written to ${path}`)
        return
      }
      await Sharing.shareAsync(path, { mimeType: 'application/json' })
    } catch (e) {
      Alert.alert('Export failed', String(e))
    }
  }

  const doImport = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
    if (picked.canceled) return
    Alert.alert('Replace all data?', 'Importing wipes everything currently stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          try {
            importAll(await FileSystem.readAsStringAsync(picked.assets[0].uri))
            Alert.alert('Imported', 'Data restored.', [{ text: 'OK', onPress: () => router.replace('/') }])
          } catch (e) {
            // The transaction rolls back, so a bad file leaves existing data intact.
            Alert.alert('Import failed', String(e))
          }
        },
      },
    ])
  }

  const doClear = () => {
    Alert.alert('Delete everything?', 'All sessions, sets, and weights. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { clearAll(); router.replace('/') } },
    ])
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space }}
    >
      <Stack.Screen options={{ title: 'Settings' }} />
      <Card>
        <Label>Backup</Label>
        <Muted>All data lives on this phone only. Export before changing devices.</Muted>
      </Card>
      <BigButton label="Export JSON" onPress={doExport} />
      <BigButton label="Import JSON" variant="ghost" onPress={doImport} />
      <BigButton label="Delete All Data" variant="ghost" onPress={doClear} />
      <Text style={{ color: theme.textMuted, fontSize: theme.font.tiny, textAlign: 'center' }}>
        Weights in kg. Program is fixed in src/program.ts.
      </Text>
    </ScrollView>
  )
}
```

- [ ] **Step 3: Verify the full backup round-trip on device**

Run: `npx expo start`

1. Log at least one session and one body weight.
2. Settings → **Export JSON** → save the file somewhere you can pick it again. Open it and confirm it contains `sessions`, `sets`, and `body_weight` arrays with your data.
3. **Delete All Data**. Expected: dashboard shows `0/4`, streak `0`, no previous workout.
4. **Import JSON**, pick the exported file, confirm. Expected: dashboard is back to its pre-delete state, and exercise history shows the restored sets.
5. Import a deliberately broken file (delete the `sets` key from a copy). Expected: an "Import failed" alert, and the data on the device is unchanged.

- [ ] **Step 4: Run the full test suite one last time**

Run: `npm test`
Expected: all program and logic tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: json export, import, and clear-all in settings"
```

---

## Verification checklist

Before calling v1 done, confirm every line:

- [ ] `npm test` passes.
- [ ] The app boots on a real phone with no red screen.
- [ ] Every screen is black-backgrounded with no white flash on navigation.
- [ ] A full workout can be logged without typing anything after the first week — empty fields repeat last session.
- [ ] Thursday shows Monday's numbers as "Last:".
- [ ] Force-quitting mid-workout and reopening resumes the same session; leaving it 12+ hours auto-closes it at the last set's time.
- [ ] Airplane mode changes nothing about the app's behaviour.
- [ ] Export → delete → import restores everything.

## Traceability to the spec

| Spec section | Task |
|---|---|
| §2 Decisions (Expo, SQLite, kg, program-as-data) | 1, 2, 4 |
| §4 Theme | 1, 5 |
| §5 Program data model + the split | 2 |
| §6 Database schema | 4 |
| §7 Dashboard | 6 |
| §7 Workout runner + supersets + alternatives | 7, 8 |
| §7 Finish + summary + stale-session auto-close | 4, 9 |
| §7 Exercise history | 10 |
| §7 Body weight | 11 |
| §7 Settings / export / import | 12 |
| §8 Derived logic | 3 |
| §9 Media pipeline | deferred — not in this plan |
| §10 Testing | 1, 2, 3 |

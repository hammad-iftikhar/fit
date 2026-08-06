# Gym Tracker — Design Spec

Date: 2026-08-06
Status: approved for planning

## 1. Overview

A single-user gym logging app for one fixed weekly training split. Optimised for
speed of logging between sets and for seeing last session's numbers next to the
input, so progressive overload is obvious without doing arithmetic on a phone
mid-set.

Inspired by the RP app's directness. Deliberately not a program builder, not a
social app, not a nutrition tracker.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Platform | Expo (React Native) + TypeScript | One codebase, iOS + Android, Reanimated for animation, no Xcode required to start |
| Navigation | expo-router | File-based, ships with Expo |
| Storage | `expo-sqlite`, on-device only | Works with zero signal in a gym. No accounts, no server, no cost |
| Backup | JSON export/import via share sheet | Covers "new phone" without building sync |
| Program data | A typed constant in `src/program.ts` | The split changes a few times a year. Editing a file beats building an editor |
| Exercise media | Fetched once by a build-time script, bundled in `assets/` | ~40 fixed exercises. No API key in the app, no rate limits, works offline |
| Units | kg only, single constant | No unit toggle until it is actually needed |

## 3. Scope

### v1 (build now)

- Home dashboard
- Workout runner with previous-session values beside every set
- Exercise detail + history
- Body weight logging
- Settings (export/import, clear data)

### Deferred (not in v1)

- Personal-record badges and "PRs this week"
- Progress charts
- Recovery/readiness score
- Body measurements beyond weight
- Rest timer
- Exercise demo media (the pipeline is specified below; run it once v1 logs correctly)

Rationale: every deferred item is a readout over data that does not exist until
several weeks of sessions are logged. Building the readouts first means building
them against imagined data.

## 4. Theme

One theme, no theming system. Defined as flat constants in `src/theme.ts`.

```
bg          #000000
surface     #0E0E0E     (cards)
border      #1F1F1F
text        #FFFFFF
textMuted   #8A8A8A
accent      #E5352B     (primary red)
accentDim   #7A1C16
```

- Type scale: 34 / 24 / 17 / 15 / 13, system font, tight tracking on headings.
- Touch targets: minimum 56pt height for anything tapped during a set.
- Numeric inputs use `keyboardType="decimal-pad"`, large font, centred.
- Animation: Reanimated only, layout animations on list changes and a spring on
  set-complete. No animation longer than 250ms.

## 5. Program data model

```ts
type SetSpec = { warmup?: number; working: number; repsLow: number; repsHigh: number }

type Exercise = {
  id: string            // 'incline-smith-press'
  name: string
  primary: string       // 'Chest'
  secondary?: string[]
  equipment: string
  cue?: string          // one-line form note
  media?: string        // require() path, populated by the media script
  supersetWith?: string // exercise id; runner pairs them
  alternatives?: string[] // e.g. pec-deck as an alternative to cable-fly
} & SetSpec

type Day = {
  key: 'mon' | 'tue' | 'wed' | 'thu' | 'fri'
  title: string
  kind: 'training' | 'recovery'
  groups?: { label: string; exercises: Exercise[] }[]
  suggestions?: string[]   // recovery days only
}
```

### The program

**Monday — Chest & Back (Heavy)**

_Chest_
| Exercise | Warm-up | Working | Reps |
|---|---|---|---|
| Incline Smith Machine Press | 2 | 2 | 6–8 |
| Flat Smith Machine Press | — | 2 | 6–8 |
| Incline Dumbbell Press | — | 2 | 8–10 |
| Cable Fly _or_ Pec Deck | — | 2 | 10–15 |

_Back_
| Exercise | Warm-up | Working | Reps |
|---|---|---|---|
| Lat Pulldown (overhand) | — | 3 | 8–10 |
| Lat Pulldown (underhand) | — | 2 | 8–10 |
| Cable Row | — | 2 | 8–10 |
| T-Bar Row (upper back focus) | — | 2 | 8–10 |
| One Arm Dumbbell Row (lat focus) | — | 2 | 10–12 |

**Tuesday — Shoulders & Arms**

_Shoulders_
| Exercise | Warm-up | Working | Reps |
|---|---|---|---|
| Standing Barbell Overhead Press | 2 | 2 | 6–8 |
| Dumbbell Lateral Raise | — | 2 | 12–15 |
| Cable Lateral Raise | — | 2 | 12–15 |
| Rear Delt Pec Deck | — | 2 | 12–15 |

_Arms — supersets_
| Superset | Exercises | Sets | Reps |
|---|---|---|---|
| 1 | Straight Bar Pushdown + Straight Bar Curl | 2 | 8–10 |
| 2 | Overhead Rope Extension + Bayesian Cable Curl | 2 | 10–12 |
| 3 | Skull Crushers + EZ Bar Curl | 2 | 8–10 |

**Wednesday — Recovery.** No logging. Screen lists: walk 20–30 min, stretch,
mobility work, foam rolling, hydrate, sleep 8+ hours.

**Thursday — repeat Monday.** Same exercise list, distinct `day.key`. Because
previous-performance lookup is per exercise (not per day), Thursday naturally
shows Monday's numbers.

**Friday — Legs + Light Arms + Light Shoulders**

_Legs_
| Exercise | Warm-up | Working | Reps |
|---|---|---|---|
| Squat | 2 | 2 | 6–8 |
| Leg Press | — | 2 | 10–12 |
| Hamstring Curl | — | 2 | 10–12 |
| Leg Extension | — | 2 | 12–15 |
| Standing Calf Raise | — | 3 | 10–15 |

_Light Shoulders_
| Exercise | Sets | Reps |
|---|---|---|
| Lateral Raise | 2 | 15–20 |
| Rear Delt Pec Deck | 2 | 15–20 |

_Light Arms_
| Exercise | Sets | Reps |
|---|---|---|
| Straight Bar Pushdown | 2 | 12–15 |
| Straight Bar Curl | 2 | 12–15 |

Saturday and Sunday are unscheduled. The dashboard shows the next scheduled day.

## 6. Database

```sql
CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,
  day_key    TEXT NOT NULL,            -- 'mon' | 'tue' | ...
  started_at INTEGER NOT NULL,         -- epoch ms
  ended_at   INTEGER                   -- NULL while in progress
);

CREATE TABLE sets (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index   INTEGER NOT NULL,        -- order within the exercise, 0-based
  is_warmup   INTEGER NOT NULL DEFAULT 0,
  weight      REAL NOT NULL,           -- kg
  reps        INTEGER NOT NULL,
  rir         INTEGER,                 -- 0–5, nullable
  created_at  INTEGER NOT NULL
);

CREATE TABLE body_weight (
  id        INTEGER PRIMARY KEY,
  logged_at INTEGER NOT NULL,
  kg        REAL NOT NULL
);

CREATE INDEX sets_by_exercise ON sets (exercise_id, created_at DESC);
```

Notes:
- There is no `exercises` table. Exercise identity lives in `program.ts`; the DB
  stores the id as text. Renaming an exercise never migrates data; changing an
  **id** does, so ids are treated as permanent.
- Tempo is displayed from the program where relevant but is not logged. Logging
  a tempo field that nobody fills in is dead weight.
- Warm-up sets are stored but excluded from volume and from previous-performance
  prefill.

## 7. Screens and flows

### Home dashboard
- Today's workout card (or "Recovery day" / "Rest day") — tapping it starts the session.
- Next scheduled workout, with the date.
- This week: `n / 4` scheduled sessions completed. Simple segmented bar.
- Current body weight + delta vs. 7 days ago. Tap to log a new weight.
- Training streak (see §8).
- Previous workout summary: day title, date, total working sets, top set of the
  first exercise.
- Quick actions row: Start Workout · History · Body Weight · Settings.

### Workout runner (the core screen)
1. Opens to the day's exercise list, grouped (`Chest`, `Back`, …), each row
   showing name, target sets × rep range, and completion state.
2. Tapping an exercise opens the logging screen:
   - Header: name, primary/secondary muscles, equipment, media if present, cue.
   - "Cable Fly _or_ Pec Deck" style choices render a two-option segmented
     control at the top; the selection is what gets stored as `exercise_id`.
   - One row per target set. Each row: set number, weight input, reps input,
     RIR input, warm-up toggle, and a checkmark to commit.
   - **Last time** is rendered directly under each row as muted text
     (`Last: 60kg × 8 @2`), taken from the most recent non-warm-up set with the
     same `set_index` for that exercise. Committing a set with empty inputs
     accepts those previous values — the common case is one tap.
   - "Add set" appends beyond the target count.
   - Supersets render as a single card with both exercises stacked and a shared
     set counter.
3. A session row is created on first set commit, not on screen open, so an
   abandoned open never creates an empty session.
4. "Finish workout" stamps `ended_at` and returns to a summary: duration, total
   sets, total volume, and per-exercise change vs. last time.
5. An unfinished session older than 12 hours is auto-finished on app open using
   the last set's timestamp as `ended_at`.

### Exercise history
Reachable from the dashboard and from any exercise header. Lists every past
session for that exercise, newest first: date, and each set as `weight × reps @ rir`.

### Body weight
A single number input and a reverse-chronological list. No chart in v1.

### Settings
Export JSON (share sheet), import JSON (replaces all data, behind a confirm),
clear all data (behind a confirm).

## 8. Derived logic

All of it lives in `src/logic.ts` as pure functions over plain data — no React,
no SQLite imports — so it can be tested directly.

- `streak(sessions)` — count of consecutive **scheduled** training days
  (mon/tue/thu/fri) completed, walking backwards from today. Recovery days and
  weekends are skipped, not counted, and do not break the streak. Missing a
  scheduled day breaks it.
- `weekProgress(sessions, now)` — completed sessions in the current week
  (Monday-start) out of 4.
- `lastPerformance(sets, exerciseId)` — the most recent session's non-warm-up
  sets for an exercise, indexed by `set_index`.
- `volume(sets)` — Σ `weight × reps` over non-warm-up sets.
- `nextScheduledDay(now)` — the next training or recovery day after today.

## 9. Exercise media pipeline

`scripts/fetch-media.ts` — a throwaway Node script, not shipped in the app:

1. Reads the exercise list from `src/program.ts`.
2. Queries an exercise API by name for each one (WorkoutX or equivalent; the
   free tiers are small but ~40 one-time lookups fit comfortably).
3. Writes `assets/exercises/<exercise-id>.gif`.
4. Prints any exercise it could not match, for manual sourcing.

The app itself never calls the API. `program.ts` references the local asset. An
exercise with no asset renders text only — a missing GIF is never an error.

## 10. Testing

`src/logic.test.ts`, run with `node --test` via `tsx`. Assert-based, no test
framework, no fixtures. Covers: streak across a missed day and across a weekend,
week progress at week boundaries, last-performance ignoring warm-up sets, and
volume excluding warm-ups.

UI is verified by running the app on a phone, not by snapshot tests.

## 11. File layout

```
app/
  _layout.tsx          expo-router root, dark theme
  index.tsx            dashboard
  workout/[day].tsx    exercise list for a day
  workout/[day]/[exercise].tsx   set logging
  history/[exercise].tsx
  weight.tsx
  settings.tsx
src/
  program.ts           the split, as data
  db.ts                schema, migrations, queries
  logic.ts             pure derived logic
  logic.test.ts
  theme.ts
scripts/
  fetch-media.ts
assets/exercises/
```

Roughly ten source files. If a file grows past ~250 lines it is doing too much.

## 12. Out of scope

Accounts, cloud sync, sharing, notifications, Apple Health / Google Fit
integration, plate calculator, custom program editing, multiple users,
light theme.

# Go To Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a row of day chips to Home so any training day's exercise list can be opened, not just today's.

**Architecture:** Presentation only. `app/workout/[day].tsx` already renders any `DayKey`, and `openSession` (`src/db.ts:23`) already closes any other open session before starting a new one, so switching days mid-workout is safe as written. The change is four `router.push` calls on Home. Nothing under `src/` is touched.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, expo-router (file-based), TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-25-day-picker-design.md`

## Global Constraints

- Days shown are `TRAINING_DAY_KEYS` from `src/program.ts` — `mon tue thu fri`. Wednesday is a recovery day and is excluded.
- Chip labels are `Mon` `Tue` `Thu` `Fri` — three letters, not the day title.
- `BigButton`'s `variant` prop accepts only `'primary'` or `'ghost'` (`src/ui.tsx:28-32`). Today's chip is `'primary'`, the rest `'ghost'`.
- Session behaviour is unchanged: sessions are still stamped `Date.now()`. Backfilling to a past calendar date is out of scope.
- No new files, no new dependencies, no changes under `src/`.

---

### Task 1: Day chips on Home

**Files:**
- Modify: `app/index.tsx:4` (import) and `app/index.tsx:61-63` (insert the block between the NEXT card and the week/streak row)
- Test: none — see Step 3 for why, and for the verification that replaces it

**Interfaces:**
- Consumes: `TRAINING_DAY_KEYS: DayKey[]` from `../src/program`; `BigButton({ label, onPress, variant?: 'primary' | 'ghost' })` and `Muted` from `../src/ui`; `router` and `todayKey`, both already in scope in `Home` (`app/index.tsx:14` and `:23`).
- Produces: nothing. No other task depends on this.

- [ ] **Step 1: Add `TRAINING_DAY_KEYS` to the existing program import**

`app/index.tsx:4` currently reads:

```tsx
import { PROGRAM } from '../src/program'
```

Change it to:

```tsx
import { PROGRAM, TRAINING_DAY_KEYS } from '../src/program'
```

- [ ] **Step 2: Insert the chip row**

In `app/index.tsx`, between the closing `</Card>` of the NEXT card (line 61) and the `<View style={{ flexDirection: 'row', gap: theme.space }}>` that opens the week/streak row (line 63), insert:

```tsx
      <View style={{ gap: 8 }}>
        <Muted>GO TO DAY</Muted>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TRAINING_DAY_KEYS.map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <BigButton
                label={k[0].toUpperCase() + k.slice(1)}
                variant={k === todayKey ? 'primary' : 'ghost'}
                onPress={() => router.push(`/workout/${k}`)}
              />
            </View>
          ))}
        </View>
      </View>
```

`todayKey` is `DayKey | null` (`app/index.tsx:23`), so on a Wednesday or a weekend every chip renders `'ghost'`. That is correct — no chip should read as "you are here" on a non-training day.

- [ ] **Step 3: Verify with typecheck and lint**

No unit test is added. `npm test` is `node --import tsx --test src/*.test.ts` — it covers pure logic in `src/` only, and there is no React Native component test harness in this project. Adding one for four `router.push` calls to a route that already works would be the largest part of this change by an order of magnitude.

What the compiler does catch: `variant` is a union, so a wrong variant fails to build, and `k` is a `DayKey`, so a stale day key fails to build. What it does not catch: the route string. `app.json:34` sets `experiments.typedRoutes: false`, so `router.push('/workuot/mon')` compiles fine and fails at runtime. Step 4 is what verifies the path.

Run:

```sh
npm run typecheck && npm run lint
```

Expected: both exit 0, no output from `tsc`.

- [ ] **Step 4: Verify in the simulator**

Run:

```sh
npm start
```

Press `i`. On Home, confirm:
1. A `GO TO DAY` row of four chips sits between the NEXT card and the THIS WEEK / STREAK row.
2. On a training day, that day's chip is filled (accent); the other three are outlined. On Wednesday or a weekend, all four are outlined.
3. Tapping `Tue` opens the Shoulders & Arms list with `Shoulders & Arms` in the header, regardless of what today is.
4. Tapping an exercise from that screen and logging a set, then going back Home and tapping `Fri`, then logging a set there — the Tuesday session is closed automatically and only the Friday one is live. (This is existing `openSession` behaviour; the check confirms the new entry point does not bypass it.)

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx docs/superpowers/specs/2026-08-25-day-picker-design.md docs/superpowers/plans/2026-08-25-day-picker.md
git commit -m "feat: add day chips on home to open any training day"
```

---

## Out of scope

Named here so a reader does not add them opportunistically:

- Calendar date picker / backfilling a session to a past date — needs `started_at` to become a parameter, which touches `openSession`, `streak`, and `weekProgress`.
- A horizontal-scroll day strip — four chips fit a row.
- A Wednesday chip — nothing to log on a recovery day.

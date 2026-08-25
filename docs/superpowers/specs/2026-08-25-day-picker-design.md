# Go To Day — design

Home always opens the workout for the current weekday. There is no way to open a
different day's exercise list — Tuesday's session on a Wednesday, or Friday's on a
Saturday when the gym trip slipped.

## Scope

A row of day chips on Home that pushes `/workout/<key>`.

Program day, not calendar date. The session is still stamped `Date.now()`;
backfilling a workout to a past date is a separate, larger change and is out of
scope.

## What already works

- `app/workout/[day].tsx` accepts any `DayKey` — `/workout/tue` renders today
  without any change.
- `openSession` (`src/db.ts:23`) already enforces one open session at a time: it
  returns the existing session if the day matches, otherwise finishes it before
  inserting. Switching days mid-workout is safe as written.

Nothing under `src/` changes.

## The change

One file: `app/index.tsx`. Between the TODAY/NEXT cards and the week/streak row:

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

`TRAINING_DAY_KEYS` is imported from `src/program.ts` alongside the existing
`PROGRAM` import.

### Decisions

| | |
|---|---|
| Days shown | `TRAINING_DAY_KEYS` — `mon tue thu fri`. Wednesday is recovery: nothing to log, and its card is already on Home when it is today. |
| Labels | `Mon Tue Thu Fri`, not day titles. Four titles do not fit a row, and the destination screen's header shows the title. |
| Today's chip | `primary`, the rest `ghost`, so the row doubles as a "where am I" marker. `BigButton`'s variant union is `'primary'` or `'ghost'` (`src/ui.tsx:28`). |
| Session behaviour | Unchanged. |

## Testing

None added. Four `router.push` calls to a route that already works — no branching
logic to break. `npm run typecheck` covers the `DayKey` template literal and the
`variant` union.

## Not doing

- Calendar date picker / backfill — needs `started_at` to be settable, which
  touches `openSession`, `streak`, and `weekProgress`. Add when logging a missed
  session on the wrong day actually becomes annoying.
- Horizontal-scroll day strip — four chips fit a row.
- A Wednesday chip — add if recovery-day suggestions ever become tappable.

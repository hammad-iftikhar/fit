# Fit

A single-user gym logger for one fixed weekly split. Expo + TypeScript, on-device
SQLite, no accounts and no server — it works with zero signal in a basement gym.

Last session's numbers sit next to every input, so progressive overload needs no
mental arithmetic mid-set.

Deliberately not a program builder, not a social app, not a nutrition tracker.

## Features

- **Home** — next scheduled day, week progress, streak, resume an open session
- **Workout runner** — per-set weight/reps entry with previous-session values beside it, supersets, exercise alternatives
- **Exercise detail** — demo GIF, cues, full set history per exercise
- **Body weight log**
- **Settings** — JSON export/import via the share sheet, clear all data

The split itself is a typed constant in `src/program.ts`. Editing that file beats
building an editor for something that changes a few times a year.

## Stack

| | |
|---|---|
| Runtime | Expo SDK 57, React Native 0.86, React 19 |
| Navigation | expo-router (file-based, `app/`) |
| Storage | expo-sqlite (`fit.db`), on-device only |
| Animation | react-native-reanimated 4 |
| Units | kg only |

## Layout

```
app/          screens (expo-router)
src/program.ts   the training split — edit this to change the program
src/db.ts        SQLite queries
src/logic.ts     pure logic (streaks, volume, last performance) — unit tested
src/schema.ts    DDL
src/media.ts     generated map of exercise id -> bundled GIF
scripts/fetch-media.ts   one-shot GIF downloader
assets/exercises/        bundled demo GIFs
```

## Develop

```sh
npm install
npm start          # Metro; press i / a to launch a simulator
npm run ios        # build + run the native iOS app
npm run android
npm test           # node:test over src/*.test.ts
npm run typecheck
npm run lint
```

`ios/` and `android/` are generated and gitignored. Regenerate them after a fresh
clone, an SDK bump, or any change to `app.json` (icons, plugins, bundle id):

```sh
npx expo prebuild --clean
```

Add `-p ios` or `-p android` to do one platform only. `--clean` deletes and
rewrites the native folders, so keep native edits in config plugins, not in
`ios/`.

To refresh the exercise GIFs (rarely needed — it also regenerates `src/media.ts`):

```sh
npx tsx scripts/fetch-media.ts
```

## Release build from Xcode

Bundle id `com.hamsofts.fit`, scheme `Fit`.

1. Generate the native project and install pods:

   ```sh
   npx expo prebuild --clean -p ios
   ```

   Prebuild runs `pod install`. If you ever need it alone: `cd ios && pod install`.

2. Open the **workspace**, not the project:

   ```sh
   open ios/Fit.xcworkspace
   ```

3. Select the **Fit** target → *Signing & Capabilities* → pick your Team. Leave
   *Automatically manage signing* on unless you have a reason not to.

4. Set the destination to **Any iOS Device (arm64)** in the toolbar. Archive is
   greyed out while a simulator is selected.

5. Confirm *Product → Scheme → Edit Scheme → Archive* uses the **Release**
   configuration. The "Bundle React Native code and images" build phase embeds
   the JS bundle automatically for Release — Metro does not need to be running.

6. **Product → Archive**. When the Organizer opens, **Distribute App** and pick
   *App Store Connect* (TestFlight/App Store) or *Ad Hoc* / *Development* for a
   signed `.ipa`.

Bump `expo.version` in `app.json` and re-run prebuild before archiving a new
release — Xcode's version fields are overwritten by prebuild.

### If Archive fails

- **Stale pods after an SDK bump** — `npx expo prebuild --clean -p ios` again.
- **Metro/bundle errors during "Bundle React Native code and images"** — run
  `npm run typecheck` first; the bundler surfaces the same import errors far less
  readably.
- **Signing errors** — check the bundle id matches a profile on your account.

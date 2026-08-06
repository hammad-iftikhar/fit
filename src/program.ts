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

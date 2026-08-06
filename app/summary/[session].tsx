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

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

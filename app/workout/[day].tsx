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

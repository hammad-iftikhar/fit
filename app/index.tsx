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
  // Re-stamped on every focus, so returning from a workout re-reads the
  // database and recomputes the numbers. Reading the clock during render is
  // impure; React calls this initialiser for us.
  const [now, setNow] = useState(Date.now)
  useFocusEffect(useCallback(() => { setNow(Date.now()) }, []))

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

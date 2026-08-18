import { useState } from 'react'
import { Pressable, ScrollView, Switch, Text, View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { findExercise } from '../../src/program'
import { lastPerformance, resolveSet } from '../../src/logic'
import { deleteSet, insertSet, setsForExercise, setsForSession } from '../../src/db'
import { MEDIA } from '../../src/media'
import { BigButton, Card, Label, Muted, NumField } from '../../src/ui'
import { theme } from '../../src/theme'
import { alert } from '../../src/alert'

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
    const resolved = resolveSet({ weight, reps, rir }, suggestion)
    if (!resolved) {
      alert('Enter weight and reps', 'There is no previous set to copy from yet.')
      return
    }
    insertSet({
      session_id: sessionId,
      exercise_id: chosenId,
      set_index: nextIndex,
      is_warmup: warmup ? 1 : 0,
      ...resolved,
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

      {chosenId in MEDIA && (
        <Image
          source={MEDIA[chosenId]}
          style={{ width: '100%', aspectRatio: 1, borderRadius: theme.radius, backgroundColor: theme.surface }}
          contentFit="contain"
          // The GIF is the demo; it has to loop on its own or it is a still.
          autoplay
        />
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
                alert('Delete set?', `${s.weight} kg × ${s.reps}`, [
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

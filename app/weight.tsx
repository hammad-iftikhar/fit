import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { allWeights, insertWeight } from '../src/db'
import { BigButton, Card, Label, Muted, NumField } from '../src/ui'
import { theme } from '../src/theme'
import { alert } from '../src/alert'

export default function Weight() {
  const [value, setValue] = useState('')
  const [version, setVersion] = useState(0)
  const rows = allWeights()

  const save = () => {
    const kg = Number(value)
    if (!value || Number.isNaN(kg) || kg <= 0 || kg > 500) {
      alert('Enter a body weight in kg', 'Must be a number between 0 and 500.')
      return
    }
    insertWeight(kg, Date.now())
    setValue('')
    setVersion((v) => v + 1)
  }

  return (
    <ScrollView
      key={version}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: theme.space, gap: theme.space, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Body Weight' }} />
      <Card>
        <Label>Log today&apos;s weight</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <NumField value={value} onChangeText={setValue} placeholder="kg" />
        </View>
        <View style={{ height: 8 }} />
        <BigButton label="Save" onPress={save} />
      </Card>
      {rows.length === 0 && <Muted>Nothing logged yet.</Muted>}
      {rows.map((w) => (
        <Card key={w.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{new Date(w.logged_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Muted>
            <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '700' }}>{w.kg} kg</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  )
}

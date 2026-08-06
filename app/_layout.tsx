import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { autoCloseStaleSessions, migrate } from '../src/db'
import { theme } from '../src/theme'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    migrate()
    autoCloseStaleSessions(Date.now())
    setReady(true)
  }, [])
  if (!ready) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontSize: theme.font.body, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  )
}

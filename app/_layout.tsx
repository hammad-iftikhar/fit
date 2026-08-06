import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { theme } from '../src/theme'

export default function RootLayout() {
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

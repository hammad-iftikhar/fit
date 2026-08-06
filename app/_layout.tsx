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
      >
        {/* Without a title the route name "index" is the header title, and iOS
            reuses it as the back-button label on every child screen. */}
        <Stack.Screen name="index" options={{ title: 'Fit' }} />
      </Stack>
    </>
  )
}

import { DarkTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { theme } from '../src/theme'

export default function RootLayout() {
  return (
    // The centred column leaves gutters on a wide browser window; without a
    // dark navigation theme they render in react-navigation's default grey.
    <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.bg } }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontSize: theme.font.body, fontWeight: '600' },
          headerShadowVisible: false,
          // A phone-shaped app stretched across a desktop browser turns the
          // exercise GIF into a full-screen poster and pushes the set fields
          // off the bottom. Below 520pt (every phone) this changes nothing.
          contentStyle: { backgroundColor: theme.bg, width: '100%', maxWidth: 520, alignSelf: 'center' },
        }}
      >
        {/* Without a title the route name "index" is the header title, and iOS
            reuses it as the back-button label on every child screen. */}
        <Stack.Screen name="index" options={{ title: 'Fit' }} />
      </Stack>
    </ThemeProvider>
  )
}

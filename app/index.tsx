import { Text, View } from 'react-native'
import { theme } from '../src/theme'

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: theme.space }}>
      <Text style={{ color: theme.text, fontSize: theme.font.h1, fontWeight: '700' }}>Fit</Text>
    </View>
  )
}

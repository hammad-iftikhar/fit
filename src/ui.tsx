import { ReactNode } from 'react'
import { Pressable, Text, TextInput, View, ViewStyle } from 'react-native'
import { theme } from './theme'

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const body = (
    <View
      style={[{
        backgroundColor: theme.surface,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        padding: theme.space,
        gap: 6,
      }, style]}
    >
      {children}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  )
}

export function BigButton({ label, onPress, variant = 'primary' }: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'ghost'
}) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: theme.radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? theme.accent : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: theme.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

export function NumField({ value, onChangeText, placeholder }: {
  value: string
  onChangeText: (t: string) => void
  placeholder: string
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      keyboardType="decimal-pad"
      selectTextOnFocus
      style={{
        flex: 1,
        minHeight: 56,
        textAlign: 'center',
        color: theme.text,
        fontSize: theme.font.h2,
        fontWeight: '600',
        backgroundColor: theme.bg,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    />
  )
}

export const Label = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: theme.text, fontSize: theme.font.body, fontWeight: '600' }}>{children}</Text>
)

export const Muted = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: theme.textMuted, fontSize: theme.font.tiny }}>{children}</Text>
)

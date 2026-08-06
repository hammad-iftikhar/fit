export const theme = {
  bg: '#000000',
  surface: '#0E0E0E',
  border: '#1F1F1F',
  text: '#FFFFFF',
  textMuted: '#8A8A8A',
  accent: '#E5352B',
  accentDim: '#7A1C16',
  space: 16,
  radius: 14,
  font: { h1: 34, h2: 24, body: 17, small: 15, tiny: 13 },
  // ponytail: one theme, so these are constants not a provider.
  // Add a provider only if a light theme is ever actually wanted.
} as const

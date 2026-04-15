import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/** JetBrains Mono — linked via react-native.config.js assets */
export const fontFamily = {
  regular: Platform.select({
    ios: 'JetBrainsMono-Regular',
    android: 'JetBrainsMono-Regular',
    default: 'JetBrainsMono-Regular',
  }) as string,
  bold: Platform.select({
    ios: 'JetBrainsMono-Bold',
    android: 'JetBrainsMono-Bold',
    default: 'JetBrainsMono-Bold',
  }) as string,
};

export const colors = {
  bg: '#0A0A0A',
  surface: '#111111',
  surfaceElevated: '#161616',
  accent: '#C8FF00',
  accentSecondary: '#FF6B00',
  accentTertiary: '#00FFCC',
  text: '#E8E8E0',
  textMuted: '#555550',
  danger: '#FF3333',
  success: '#C8FF00',
  borderSubtle: '#222222',
  borderActive: '#C8FF00',
  activeTint: '#C8FF0008',
} as const;

export const spacing = (n: number) => n * 8;

export const crt = {
  labelLetterSpacing: 3.5,
  labelFontSize: 10,
  grid: 8,
} as const;

export const textStyles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 14,
  },
  label: {
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    fontSize: crt.labelFontSize,
    letterSpacing: crt.labelLetterSpacing,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontFamily: fontFamily.bold,
    color: colors.text,
    fontSize: 18,
  },
  instrument: {
    fontFamily: fontFamily.bold,
    color: colors.accent,
    fontVariant: ['tabular-nums'] as unknown as TextStyle['fontVariant'],
  },
});

export function activeBorderStyle(selected: boolean): Pick<ViewStyle, 'borderWidth' | 'borderColor' | 'backgroundColor'> {
  if (!selected) {
    return { borderWidth: 0, backgroundColor: 'transparent' };
  }
  return {
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.activeTint,
  };
}

export const phosphorTextShadow = {
  textShadowColor: '#C8FF0044',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 8,
} as const;

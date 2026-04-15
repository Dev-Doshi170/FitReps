import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { colors, fontFamily, phosphorTextShadow } from '../../theme/theme';

type Props = {
  value: string | number;
  unit?: string;
  /** Extra-large instrument readout */
  size?: 'md' | 'lg' | 'xl';
  active?: boolean;
};

export default function SevenSegmentNumber({ value, unit, size = 'lg', active = true }: Props) {
  const display = typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value);
  const sizeStyle = sizeMap[size];

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.digits,
          sizeStyle,
          active && phosphorTextShadow,
          !active && { color: colors.textMuted, textShadowRadius: 0 },
        ]}>
        {display}
      </Text>
      {unit ? (
        <Text style={[styles.unit, { fontFamily: fontFamily.regular, color: colors.textMuted }]}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

const sizeMap: Record<string, TextStyle> = {
  md: { fontSize: 22, letterSpacing: 4 },
  lg: { fontSize: 32, letterSpacing: 6 },
  xl: { fontSize: 48, letterSpacing: 8 },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  digits: {
    fontFamily: fontFamily.bold,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

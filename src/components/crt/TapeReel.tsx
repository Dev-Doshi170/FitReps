import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, crt, spacing } from '../../theme/theme';

export type TapeDayStatus = 'empty' | 'done' | 'today' | 'future';

export type TapeDay = {
  label: string;
  status: TapeDayStatus;
};

type Props = {
  days: TapeDay[];
  title?: string;
};

const SLOT_W = 40;
const SLOT_H = 50;

export default function TapeReel({ days, title = 'WEEKLY LOG' }: Props) {
  const line = useMemo(() => '─'.repeat(18), []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>
        {title} {line}
      </Text>
      <ScrollView
        horizontal
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {days.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.slotOuter}>
            <View
              style={[
                styles.slot,
                d.status === 'done' && styles.slotDone,
                d.status === 'today' && styles.slotToday,
                d.status === 'future' && styles.slotFuture,
                d.status === 'empty' && styles.slotEmpty,
              ]}>
              <Text style={[styles.glyph, d.status === 'done' && styles.glyphDone]}>
                {d.status === 'done' ? '■' : d.status === 'today' ? '·' : ' '}
              </Text>
            </View>
            <Text style={styles.dayLabel}>{d.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: crt.grid,
    paddingHorizontal: spacing(2),
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scroll: {
    gap: 8,
    paddingVertical: 4,
  },
  slotOuter: {
    alignItems: 'center',
    marginRight: 8,
  },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  slotEmpty: {
    backgroundColor: colors.surface,
  },
  slotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotToday: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  slotFuture: {
    opacity: 0.7,
  },
  glyph: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textMuted,
  },
  glyphDone: {
    color: colors.bg,
  },
  dayLabel: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});

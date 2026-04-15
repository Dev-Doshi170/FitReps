import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '../../theme/theme';

type Props = {
  title: string;
  subtitleRight?: string;
  setsLogged: number;
  setsTotal: number;
  expanded?: boolean;
  onPress: () => void;
  children?: ReactNode;
};

export default function ProgressRow({
  title,
  subtitleRight,
  setsLogged,
  setsTotal,
  expanded = false,
  onPress,
  children,
}: Props) {
  const pct = setsTotal > 0 ? Math.min(100, (setsLogged / setsTotal) * 100) : 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          expanded && {
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: colors.activeTint,
          },
          pressed && { borderColor: colors.accent },
        ]}>
        <View style={styles.rowInner}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitleRight ? (
            <Text style={styles.meta} numberOfLines={2}>
              {subtitleRight}
            </Text>
          ) : null}
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </Pressable>
      {expanded ? <View style={styles.expand}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text,
  },
  meta: {
    maxWidth: '42%',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  track: {
    height: 3,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  expand: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
  },
});

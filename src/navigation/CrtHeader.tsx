import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { hapticLight } from '../lib/haptics';
import { colors, fontFamily } from '../theme/theme';

export default function CrtHeader({ navigation, options, route }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : options.title ?? route.name;

  const canGoBack = navigation.canGoBack();

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {canGoBack ? (
          <Pressable
            onPress={() => {
              hapticLight();
              navigation.goBack();
            }}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path
                d="M15 6 L9 12 L15 18"
                stroke={colors.accent}
                strokeWidth={2}
                fill="none"
                strokeLinecap="square"
              />
            </Svg>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.rightSlot}>
          {typeof options.headerRight === 'function'
            ? options.headerRight({
                tintColor: colors.accent,
                canGoBack: navigation.canGoBack(),
              })
            : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
  },
  backHit: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 40,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

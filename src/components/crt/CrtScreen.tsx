import type { ReactNode } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme/theme';
import ScanlineOverlay from './ScanlineOverlay';
import { useMountFlicker } from './useMountFlicker';

type Props = {
  children: ReactNode;
  /** Include safe area padding (default true). */
  safe?: boolean;
  style?: ViewStyle;
  /** Show scanline overlay (default true). */
  scanlines?: boolean;
  /** Run mount flicker animation (default true). */
  flicker?: boolean;
};

export default function CrtScreen({
  children,
  safe = true,
  style,
  scanlines = true,
  flicker = true,
}: Props) {
  const opacity = useMountFlicker(flicker);
  const content = flicker ? (
    <Animated.View style={[styles.inner, { opacity }]}>{children}</Animated.View>
  ) : (
    <View style={styles.inner}>{children}</View>
  );

  if (safe) {
    return (
      <View style={[styles.root, style]}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {content}
        </SafeAreaView>
        {scanlines ? <ScanlineOverlay /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {content}
      {scanlines ? <ScanlineOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});

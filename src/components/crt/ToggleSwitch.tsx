import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { hapticSelection } from '../../lib/haptics';
import { colors } from '../../theme/theme';

const TRACK_W = 52;
const TRACK_H = 28;
const THUMB = 22;
const PADDING = 3;
const MAX_X = TRACK_W - 2 * PADDING - THUMB;

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export default function ToggleSwitch({ value, onChange, disabled = false }: Props) {
  const x = useRef(new Animated.Value(value ? MAX_X : 0)).current;

  useEffect(() => {
    Animated.spring(x, {
      toValue: value ? MAX_X : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [value, x]);

  const toggle = () => {
    if (disabled) {
      return;
    }
    hapticSelection();
    onChange(!value);
  };

  return (
    <Pressable onPress={toggle} disabled={disabled} style={styles.hit}>
      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: x }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: 4,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    paddingHorizontal: PADDING,
  },
  trackOn: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  thumb: {
    position: 'absolute',
    left: PADDING,
    top: (TRACK_H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.bg,
  },
});

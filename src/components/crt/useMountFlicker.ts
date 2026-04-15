import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * CRT power-on flicker: opacity 1 → 0.96 → 1 over ~80ms on first mount.
 */
export function useMountFlicker(enabled = true) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.96,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enabled, opacity]);

  return opacity;
}

import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { hapticLight } from '../../lib/haptics';
import { colors, fontFamily, spacing } from '../../theme/theme';

export type HardwareButtonVariant = 'filled' | 'outlined' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: HardwareButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Brief opacity flicker on press (filled primary). */
  flickerOnPress?: boolean;
  children?: ReactNode;
};

export default function HardwareButton({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  style,
  flickerOnPress = true,
  children,
}: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  const runPress = () => {
    hapticLight();
    if (variant === 'filled' && flickerOnPress) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 40, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
      ]).start();
    }
    onPress();
  };

  const v = variantStyles[variant];

  return (
    <Pressable
      onPress={runPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && { borderColor: colors.accent, borderWidth: 2 },
        disabled && styles.disabled,
        style,
      ]}>
      <Animated.View style={[styles.inner, { opacity }]}>
        <Text style={[styles.text, v.text]}>{label}</Text>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles: Record<
  HardwareButtonVariant,
  { container: ViewStyle; text: { color: string } }
> = {
  filled: {
    container: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    text: { color: colors.bg },
  },
  outlined: {
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.accent,
    },
    text: { color: colors.accent },
  },
  danger: {
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.danger,
    },
    text: { color: colors.danger },
  },
};

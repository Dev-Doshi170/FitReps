import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fontFamily, spacing } from '../../theme/theme';

type Props = {
  lines: string[];
  /** ms between lines */
  lineDelayMs?: number;
  onComplete?: () => void;
  /** Fade out entire block at end */
  fadeOut?: boolean;
  style?: object;
};

export default function TerminalText({
  lines,
  lineDelayMs = 120,
  onComplete,
  fadeOut = false,
  style,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setVisibleCount(0);
  }, [lines]);

  useEffect(() => {
    if (visibleCount < lines.length) {
      const t = setTimeout(() => setVisibleCount(c => c + 1), lineDelayMs);
      return () => clearTimeout(t);
    }
    if (lines.length === 0 || doneRef.current) {
      return;
    }
    doneRef.current = true;
    if (fadeOut) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onComplete?.());
    } else {
      onComplete?.();
    }
  }, [visibleCount, lines.length, lineDelayMs, fadeOut, onComplete, opacity, lines]);

  return (
    <Animated.View style={[styles.wrap, { opacity }, style]}>
      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <Text key={i} style={styles.line} selectable={false}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 160,
  },
  scroll: {
    flexGrow: 0,
  },
  line: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
    lineHeight: 16,
    marginBottom: spacing(0.5),
  },
});

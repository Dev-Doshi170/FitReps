import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { hapticLight } from '../../lib/haptics';
import { colors, fontFamily } from '../../theme/theme';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  diameter?: number;
  label?: string;
  formatValue?: (v: number) => string;
  disabled?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundToStep(v: number, step: number, min: number) {
  const steps = Math.round((v - min) / step);
  return min + steps * step;
}

export default function KnobControl({
  value,
  min,
  max,
  step = 1,
  onChange,
  diameter = 120,
  label,
  formatValue = v => String(v),
  disabled = false,
}: Props) {
  const lastEmitted = useRef(value);
  const startValue = useRef(value);

  useEffect(() => {
    lastEmitted.current = value;
  }, [value]);

  const applyDelta = useCallback(
    (dy: number) => {
      const range = max - min;
      const sens = range / 200;
      const next = clamp(roundToStep(startValue.current - dy * sens, step, min), min, max);
      if (next !== lastEmitted.current) {
        lastEmitted.current = next;
        hapticLight();
        onChange(next);
      }
    },
    [max, min, onChange, step],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          startValue.current = value;
          lastEmitted.current = value;
        },
        onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
          applyDelta(g.dy);
        },
        onPanResponderRelease: () => {},
      }),
    [applyDelta, disabled, value],
  );

  const r = diameter / 2;
  const tickCount = 24;
  const ticks = useMemo(() => {
    const t: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
      const inner = r - 8;
      const outer = r - 2;
      t.push({
        x1: r + Math.cos(angle) * inner,
        y1: r + Math.sin(angle) * inner,
        x2: r + Math.cos(angle) * outer,
        y2: r + Math.sin(angle) * outer,
      });
    }
    return t;
  }, [r, tickCount]);

  const tNorm = (value - min) / (max - min || 1);
  const angle = -Math.PI * 0.75 + tNorm * Math.PI * 1.5;
  const ptrLen = r - 12;
  const px2 = r + Math.cos(angle) * ptrLen;
  const py2 = r + Math.sin(angle) * ptrLen;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.knobLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View {...panResponder.panHandlers} style={{ width: diameter, height: diameter }}>
        <Svg width={diameter} height={diameter}>
          <Circle cx={r} cy={r} r={r - 1} stroke={colors.borderSubtle} strokeWidth={2} fill={colors.surface} />
          {ticks.map((t, i) => (
            <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={colors.textMuted} strokeWidth={1} />
          ))}
          <Line x1={r} y1={r} x2={px2} y2={py2} stroke={colors.accent} strokeWidth={3} strokeLinecap="square" />
        </Svg>
        <View style={styles.centerText} pointerEvents="none">
          <Text style={styles.valueText}>{formatValue(value)}</Text>
        </View>
      </View>
      <View style={[styles.minmax, { width: diameter }]}>
        <Text style={styles.mm}>MIN</Text>
        <Text style={styles.mm}>MAX</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  knobLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  centerText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.text,
  },
  minmax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  mm: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});

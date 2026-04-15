import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { hapticSelection } from '../lib/haptics';
import { colors, fontFamily } from '../theme/theme';

function IconDashboard({ active }: { active: boolean }) {
  const c = active ? colors.accent : colors.textMuted;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={8} height={8} stroke={c} strokeWidth={1.5} fill="none" />
      <Rect x={13} y={3} width={8} height={8} stroke={c} strokeWidth={1.5} fill="none" />
      <Rect x={3} y={13} width={8} height={8} stroke={c} strokeWidth={1.5} fill={active ? c : 'none'} />
      <Rect x={13} y={13} width={8} height={8} stroke={c} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

function IconHistory({ active }: { active: boolean }) {
  const c = active ? colors.accent : colors.textMuted;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M4 6 L20 6 M4 12 L16 12 M4 18 L12 18"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="square"
      />
    </Svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? colors.accent : colors.textMuted;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={6} y={4} width={12} height={16} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M9 10 L15 10 M9 14 L13 14" stroke={c} strokeWidth={1.5} strokeLinecap="square" />
    </Svg>
  );
}

const icons: Record<string, (a: { active: boolean }) => ReactElement> = {
  Dashboard: props => <IconDashboard {...props} />,
  History: props => <IconHistory {...props} />,
  Profile: props => <IconProfile {...props} />,
};

export default function HardwareTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const Icon = icons[route.name] ?? IconDashboard;

          const onPress = () => {
            hapticSelection();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}>
              <Icon active={isFocused} />
              <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                {String(label).toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabActive: {
    borderTopColor: colors.accent,
  },
  label: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.accent,
  },
});

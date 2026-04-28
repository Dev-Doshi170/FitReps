import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CrtScreen, HardwareButton } from '../components/crt';
import { hapticLight } from '../lib/haptics';
import type { GymExperience } from '../lib/initialLoadSuggestion';
import { parseFeetInchesStringToInches, parseHeightCmString } from '../lib/parseHeightInput';
import { useAppDispatch } from '../store';
import { completeUserOnboarding } from '../store/slices/workoutSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

type HeightMode = 'cm' | 'ftin';

const LEVELS: { id: GymExperience; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

function parseKg(s: string): number | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) {
    return null;
  }
  if (n < 30 || n > 250) {
    return null;
  }
  return n;
}

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const [heightMode, setHeightMode] = useState<HeightMode>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFtIn, setHeightFtIn] = useState('');
  const [weight, setWeight] = useState('');
  const [experience, setExperience] = useState<GymExperience | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    setErr(null);
    const inInch =
      heightMode === 'cm' ? parseHeightCmString(heightCm) : parseFeetInchesStringToInches(heightFtIn);
    const kg = parseKg(weight);
    if (inInch == null) {
      setErr(
        heightMode === 'cm'
          ? 'Height: enter cm (about 120–240), e.g. 170.'
          : 'Height: use feet and inches, e.g. 5\'7 or 5 ft 7.',
      );
      return;
    }
    if (kg == null) {
      setErr('Weight: enter kg between 30 and 250.');
      return;
    }
    if (experience == null) {
      setErr('Pick how long you have been training.');
      return;
    }
    hapticLight();
    setSaving(true);
    const result = await dispatch(
      completeUserOnboarding({
        heightInches: inInch,
        bodyWeightKg: kg,
        experience,
      }),
    );
    setSaving(false);
    if (completeUserOnboarding.rejected.match(result)) {
      Alert.alert('Save failed', String(result.payload ?? 'Check network and that profile SQL is applied.'));
    }
  }, [dispatch, experience, heightCm, heightFtIn, heightMode, weight]);

  return (
    <CrtScreen flicker={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}>
          <View style={styles.block}>
            <Text style={styles.h1}>PROFILE SETUP</Text>
            <Text style={styles.sub}>Height (cm or ft/in), body weight in kg, then your training level.</Text>
            {err != null ? (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{err}</Text>
              </View>
            ) : null}
            <Text style={styles.fieldLabel}>HEIGHT</Text>
            <View style={styles.unitRow}>
              {(['cm', 'ftin'] as const).map(m => {
                const id = m === 'cm' ? 'cm' : 'ftin';
                const on = heightMode === id;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      hapticLight();
                      setHeightMode(id);
                      setErr(null);
                    }}
                    style={({ pressed }) => [styles.unitBtn, on && styles.unitBtnOn, pressed && styles.levelBtnPr]}>
                    <Text style={[styles.unitText, on && styles.levelTextOn]}>
                      {m === 'cm' ? 'CM' : "FT ' IN"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {heightMode === 'cm' ? (
              <TextInput
                style={styles.input}
                placeholder="e.g. 170"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={heightCm}
                onChangeText={t => {
                  setHeightCm(t);
                  setErr(null);
                }}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="e.g. 5'7  or  5 ft 7"
                placeholderTextColor={colors.textMuted}
                keyboardType="default"
                autoCorrect={false}
                value={heightFtIn}
                onChangeText={t => {
                  setHeightFtIn(t);
                  setErr(null);
                }}
              />
            )}
            <Text style={styles.fieldLabel}>BODY WEIGHT (KG)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 80"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={t => {
                setWeight(t);
                setErr(null);
              }}
            />
            <Text style={styles.fieldLabel}>TRAINING LEVEL</Text>
            <View style={styles.levels}>
              {LEVELS.map(l => {
                const on = experience === l.id;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      hapticLight();
                      setExperience(l.id);
                      setErr(null);
                    }}
                    style={({ pressed }) => [styles.levelBtn, on && styles.levelBtnOn, pressed && styles.levelBtnPr]}>
                    <Text style={[styles.levelText, on && styles.levelTextOn]}>{l.label.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
            <HardwareButton
              label="CONTINUE"
              onPress={onSubmit}
              disabled={saving}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CrtScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing(4),
    paddingTop: spacing(2),
  },
  block: {
    paddingHorizontal: spacing(2),
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.accent,
  },
  sub: {
    marginTop: spacing(1),
    marginBottom: spacing(2),
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  errBox: {
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing(1.5),
    marginBottom: spacing(2),
  },
  errText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.danger,
  },
  fieldLabel: {
    fontFamily: fontFamily.regular,
    fontSize: crt.labelFontSize,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    marginBottom: 4,
    marginTop: spacing(1),
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  levels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginTop: 4,
  },
  levelBtn: {
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  levelBtnOn: {
    borderColor: colors.accent,
    backgroundColor: colors.activeTint,
  },
  levelBtnPr: { opacity: 0.7 },
  levelText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  levelTextOn: { color: colors.accent },
  unitRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  unitBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  unitBtnOn: {
    borderColor: colors.accent,
    backgroundColor: colors.activeTint,
  },
  unitText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  cta: { marginTop: spacing(3) },
});

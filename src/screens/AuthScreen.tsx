import { useCallback, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CrtScreen, HardwareButton, TerminalText } from '../components/crt';
import { useMountFlicker } from '../components/crt/useMountFlicker';
import { useAppDispatch, useAppSelector, type AppDispatch } from '../store';
import { clearAuthError, loginUser, registerUser } from '../store/slices/authSlice';
import { colors, crt, fontFamily, spacing } from '../theme/theme';

const LOGO_LINES = [
  '▓▓▓▓▓ ▓▓▓ ▓▓▓▓▓',
  '▓     ▓  ▓   ▓',
  '▓▓▓▓  ▓▓▓   ▓',
  '▓     ▓  ▓   ▓',
  '▓     ▓  ▓   ▓',
];

const BOOT_LINES = [
  'LOADING MUSCLE MEMORY... OK',
  'CALIBRATING RESISTANCE SENSORS... OK',
  'CONNECTING TO IRON DATABASE... OK',
];

function PostBootForm({
  error,
  email,
  password,
  setEmail,
  setPassword,
  mode,
  setMode,
  loading,
  onSubmit,
  dispatch,
}: {
  error: string | null;
  email: string;
  password: string;
  setEmail: (s: string) => void;
  setPassword: (s: string) => void;
  mode: 'login' | 'register';
  setMode: (m: 'login' | 'register') => void;
  loading: boolean;
  onSubmit: () => void;
  dispatch: AppDispatch;
}) {
  const opacity = useMountFlicker(true);
  return (
    <Animated.View style={[styles.form, { opacity }]}>
      {error ? (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>EMAIL</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.fieldLabel}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <HardwareButton
        label="INITIALIZE SESSION"
        onPress={onSubmit}
        disabled={loading}
        style={styles.cta}
      />

      <Pressable
        onPress={() => {
          dispatch(clearAuthError());
          setMode(mode === 'login' ? 'register' : 'login');
        }}
        style={styles.switchMode}>
        <Text style={styles.switchText}>
          {mode === 'login' ? 'NEW OPERATOR? REGISTER' : 'RETURNING? SIGN IN'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function AuthScreen() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(s => s.auth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootDone, setBootDone] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const onSubmit = useCallback(async () => {
    dispatch(clearAuthError());
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    const action = mode === 'login' ? loginUser : registerUser;
    const resultAction = await dispatch(
      action({ email: email.trim(), password }),
    );
    if (registerUser.fulfilled.match(resultAction) && !resultAction.payload.session) {
      Alert.alert(
        'Check your inbox',
        'If email confirmation is enabled, confirm your account before signing in.',
      );
    }
  }, [dispatch, email, mode, password]);

  const onBootComplete = useCallback(() => {
    setBootDone(true);
    setShowForm(true);
  }, []);

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
          <View style={styles.center}>
            <Text style={styles.logo}>{LOGO_LINES.join('\n')}</Text>
            <Text style={styles.subtitle}>PERFORMANCE TRACKING SYSTEM v2.6</Text>

            {!bootDone ? (
              <TerminalText lines={BOOT_LINES} lineDelayMs={180} onComplete={onBootComplete} />
            ) : null}

            {showForm ? (
              <PostBootForm
                error={error}
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                mode={mode}
                setMode={setMode}
                loading={loading}
                onSubmit={onSubmit}
                dispatch={dispatch}
              />
            ) : null}
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
    paddingHorizontal: spacing(2),
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 480,
    paddingTop: spacing(2),
  },
  logo: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: spacing(2),
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: crt.labelLetterSpacing,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    marginTop: spacing(3),
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
    marginBottom: spacing(0.5),
  },
  cta: {
    marginTop: spacing(3),
    width: '100%',
  },
  switchMode: {
    marginTop: spacing(2),
    alignSelf: 'center',
    padding: spacing(1),
  },
  switchText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accentSecondary,
  },
});

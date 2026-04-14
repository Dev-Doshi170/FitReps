import { Box, ButtonText, Text, VStack } from '@gluestack-ui/themed';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, AppTextField } from '../components/ui';
import { useAppDispatch, useAppSelector } from '../store';
import { clearAuthError, loginUser, registerUser } from '../store/slices/authSlice';

export default function AuthScreen() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(s => s.auth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          <VStack space="lg" flex={1} justifyContent="center">
            <Text size="2xl" fontWeight="$bold" color="$textLight50">
              FitReps
            </Text>
            <Text color="$textLight400">{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
            {error ? (
              <Box bg="$backgroundDark900" p="$3" borderRadius="$md" borderWidth={1} borderColor="$error400">
                <Text color="$error400" size="sm">
                  {error}
                </Text>
              </Box>
            ) : null}
            <VStack space="md">
              <AppTextField
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <AppTextField
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </VStack>
            <AppButton size="lg" onPress={onSubmit} isLoading={loading} showSpinner>
              <ButtonText>{mode === 'login' ? 'Sign in' : 'Register'}</ButtonText>
            </AppButton>
            <AppButton
              variant="link"
              onPress={() => {
                dispatch(clearAuthError());
                setMode(m => (m === 'login' ? 'register' : 'login'));
              }}>
              <ButtonText>
                {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
              </ButtonText>
            </AppButton>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

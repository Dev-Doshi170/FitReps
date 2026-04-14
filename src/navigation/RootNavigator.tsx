import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Center } from '@gluestack-ui/themed';

import { useAppDispatch, useAppSelector } from '../store';
import { restoreSession } from '../store/slices/authSlice';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    dispatch(restoreSession()).finally(() => setSessionReady(true));
  }, [dispatch]);

  if (!sessionReady) {
    return (
      <Center flex={1} bg="$backgroundDark950">
        <ActivityIndicator size="large" />
      </Center>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

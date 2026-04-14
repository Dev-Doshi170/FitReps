/**
 * @format
 */

import { config } from '@gluestack-ui/config';
import { Center, GluestackUIProvider } from '@gluestack-ui/themed';
import { ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import RootNavigator from './src/navigation/RootNavigator';
import { persistor, store } from './src/store';

function PersistLoading() {
  return (
    <GluestackUIProvider config={config} colorMode="dark">
      <Center flex={1} bg="$backgroundDark950">
        <ActivityIndicator />
      </Center>
    </GluestackUIProvider>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={<PersistLoading />}>
          <GluestackUIProvider config={config} colorMode="dark">
            <StatusBar barStyle="light-content" />
            <RootNavigator />
          </GluestackUIProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  root: { flex: 1 },
});

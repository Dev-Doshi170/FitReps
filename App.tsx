/**
 * @format
 */

import { config } from '@gluestack-ui/config';
import { Center, GluestackUIProvider } from '@gluestack-ui/themed';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import RootNavigator from './src/navigation/RootNavigator';
import { persistor, store } from './src/store';
import { colors } from './src/theme/theme';

function PersistLoading() {
  return (
    <GluestackUIProvider config={config} colorMode="dark">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
        <Center flex={1} style={{ backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.accent} />
        </Center>
      </View>
    </GluestackUIProvider>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={<PersistLoading />}>
          <GluestackUIProvider config={config} colorMode="dark">
            <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <RootNavigator />
            </View>
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

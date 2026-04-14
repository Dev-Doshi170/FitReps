/**
 * @format
 */

import { StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';

function App() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Text style={styles.title}>Hello, World</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
  },
});

export default App;

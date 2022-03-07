import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TallyCounter from './components/TallyCounter';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <TallyCounter/>
    </GestureHandlerRootView>
  );
};

const colors = {
  background: '#444',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  } as ViewStyle,
});

export default App;

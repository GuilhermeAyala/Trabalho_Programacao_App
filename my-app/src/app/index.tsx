import { StyleSheet, Text, View } from 'react-native';
import Hello from '../components/Hello';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Hello/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: '#5f6368',
    fontSize: 16,
    textAlign: 'center',
  },
});

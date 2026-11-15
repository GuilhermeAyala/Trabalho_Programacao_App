import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import NavegacaoInferior from "../components/NavegacaoInferior";

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#161616" },
        }}
      />
      <NavegacaoInferior />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161616",
    flex: 1,
  },
});

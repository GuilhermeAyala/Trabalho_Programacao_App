import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import NavegacaoInferior from "../components/NavegacaoInferior";
import { PlanejamentoProvider } from "../contexts/PlanejamentoContext";
import ObservadorNotificacoes from "../components/ObservadorNotificacoes";
import AvisoNotificacoes from "../components/AvisoNotificacoes";

export default function RootLayout() {
  return (
    <PlanejamentoProvider><View style={styles.container}>
      <ObservadorNotificacoes />
      <AvisoNotificacoes />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#161616" },
        }}
      />
      <NavegacaoInferior />
    </View></PlanejamentoProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161616",
    flex: 1,
  },
});

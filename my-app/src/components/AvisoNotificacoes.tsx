import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEstadoNotificacoes } from "../hooks/useNotificacoes";
import { sincronizarNotificacoes } from "../services/notificacoes";

export default function AvisoNotificacoes() {
  const { disponivel, erro, ocupado, permissaoNegada } = useEstadoNotificacoes();
  if (!disponivel || !erro) return null;
  return <View style={styles.aviso}>
    <Text style={styles.texto} accessibilityLiveRegion="polite">{erro}</Text>
    {!permissaoNegada ? <Pressable accessibilityRole="button" disabled={ocupado} style={styles.botao} onPress={() => void sincronizarNotificacoes()}><Text style={styles.acao}>Tentar novamente</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  aviso: { backgroundColor: "#222222", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#303030" },
  texto: { color: "#FFB0B0", fontSize: 12, lineHeight: 18 },
  botao: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  acao: { color: "#8DD9A6", fontWeight: "600" },
});

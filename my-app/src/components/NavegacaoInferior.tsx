import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const ABAS = [
  { nome: "Início", icone: "⌂", rota: "/" },
  { nome: "Receitas", icone: "◉", rota: null },
  { nome: "Planejamento", icone: "▦", rota: null },
  { nome: "Lista", icone: "☷", rota: "/lista" },
  { nome: "Perfil", icone: "●", rota: "/perfil" },
] as const;

export default function NavegacaoInferior() {
  const caminho = usePathname();
  const roteador = useRouter();

  return (
    <View style={styles.barra} accessibilityRole="tablist">
      {ABAS.map((aba) => {
        const ativa = aba.rota !== null && caminho === aba.rota;
        const desativada = aba.rota === null;

        return (
          <Pressable
            key={aba.nome}
            style={styles.item}
            disabled={desativada}
            onPress={() => {
              if (aba.rota) roteador.push(aba.rota);
            }}
            accessibilityRole="tab"
            accessibilityLabel={
              desativada ? `${aba.nome}, ainda não integrada` : aba.nome
            }
            accessibilityState={{ selected: ativa, disabled: desativada }}
          >
            <Text
              style={[
                styles.icone,
                ativa && styles.selecionado,
                desativada && styles.indisponivel,
              ]}
            >
              {aba.icone}
            </Text>
            <Text
              style={[
                styles.nome,
                ativa && styles.selecionado,
                desativada && styles.indisponivel,
              ]}
            >
              {aba.nome}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    alignItems: "center",
    backgroundColor: "#1C1C1C",
    borderTopColor: "#303030",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 64,
    paddingHorizontal: 5,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 58,
  },
  icone: {
    color: "#929A96",
    fontSize: 19,
    lineHeight: 23,
  },
  nome: {
    color: "#929A96",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  selecionado: {
    color: "#8DD9A6",
  },
  indisponivel: {
    opacity: 0.45,
  },
});

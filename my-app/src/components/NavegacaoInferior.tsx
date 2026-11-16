import { type Href, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlanejamento } from "../contexts/PlanejamentoContext";

const ABAS = [
  { nome: "Início", icone: "⌂", rota: "/" },
  { nome: "Receitas", icone: "◇", rota: "/receitas" },
  { nome: "Planejamento", icone: "▦", rota: "/planejamento" },
  { nome: "Lista", icone: "☷", rota: "/lista" },
  { nome: "Perfil", icone: "●", rota: "/perfil" },
] as const;

export default function NavegacaoInferior() {
  const caminho = usePathname();
  const roteador = useRouter();
  const { podeSair, salvando } = usePlanejamento();

  return (
    <View style={styles.barra} accessibilityRole="tablist">
      {ABAS.map((aba) => {
        const ativa = caminho === aba.rota ||
          (aba.rota === "/receitas" && caminho.startsWith("/receitas/")) ||
          (aba.rota === "/planejamento" && caminho === "/meus-planejamentos");

        return (
          <Pressable
            key={aba.nome}
            style={styles.item}
            disabled={salvando}
            onPress={async () => {
              if (caminho === aba.rota) return;
              if (aba.rota === "/planejamento" && caminho.startsWith("/receitas")) {
                roteador.dismissTo("/planejamento");
              } else if (await podeSair()) roteador.push(aba.rota as Href);
            }}
            accessibilityRole="tab"
            accessibilityLabel={aba.nome}
            accessibilityState={{ selected: ativa }}
          >
            <Text
              style={[
                styles.icone,
                ativa && styles.selecionado,
              ]}
            >
              {aba.icone}
            </Text>
            <Text
              style={[
                styles.nome,
                ativa && styles.selecionado,
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
});

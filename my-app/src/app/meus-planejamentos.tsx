import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlanejamento } from "../contexts/PlanejamentoContext";
import { useAtualizarPlanejamento } from "../hooks/useAtualizarPlanejamento";
import { chaveData, contarRefeicoes, REFEICOES, TIPOS_REFEICAO } from "../types/planejamento";
import { confirmar } from "../utils/confirmar";

export default function MeusPlanejamentosScreen() {
  const roteador = useRouter();
  const { planos, agora, pronto, salvando, erro, carregar, excluir } = usePlanejamento();
  const [mensagem, setMensagem] = useState("");
  const confirmando = useRef(false);
  useAtualizarPlanejamento();
  const hoje = chaveData(agora);
  const secoes = [
    { titulo: "Hoje e próximos dias", itens: planos.filter((plano) => plano.data >= hoje) },
    { titulo: "Planejamentos anteriores", itens: planos.filter((plano) => plano.data < hoje) },
  ];

  async function confirmarExclusao(data: string) {
    if (confirmando.current || salvando) return;
    confirmando.current = true;
    try {
      const aceitou = await confirmar("Excluir planejamento?", "Tem certeza de que deseja excluir o planejamento deste dia? Esta ação não poderá ser desfeita.", "Excluir");
      if (aceitou) {
        setMensagem("");
        if (await excluir(data)) setMensagem("Planejamento excluído.");
      }
    } finally { confirmando.current = false; }
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Pressable accessibilityRole="button" style={styles.botao} onPress={() => roteador.dismissTo("/planejamento")}><Text style={styles.acento}>‹ Planejamento</Text></Pressable>
      <Text style={styles.titulo}>Meus Planejamentos</Text>
      <Text style={styles.secundario}>Seus dias salvos, prontos para consultar e ajustar.</Text>
      {erro ? <View><Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text><Pressable style={styles.botao} accessibilityRole="button" onPress={() => void carregar()}><Text style={styles.acento}>Tentar novamente</Text></Pressable></View> : null}
      {!pronto && !erro ? <ActivityIndicator color="#8DD9A6" accessibilityLabel="Carregando planejamentos" /> : null}
      {mensagem ? <Text style={styles.acento} accessibilityLiveRegion="polite">{mensagem}</Text> : null}
      {pronto && planos.length === 0 ? <Text style={styles.secundario}>Nenhum planejamento salvo. Escolha as refeições de um dia e toque em Salvar planejamento.</Text> : null}
      {secoes.filter((secao) => secao.itens.length > 0).map((secao) => (
        <View key={secao.titulo} style={styles.secao}>
          <Text style={styles.subtitulo}>{secao.titulo}</Text>
          {secao.itens.map((plano) => (
            <View key={plano.data} style={styles.cartao}>
              <Text style={styles.data}>{new Date(`${plano.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>
              <Text style={styles.acento}>{contarRefeicoes(plano.refeicoes)}/3 refeições</Text>
              {TIPOS_REFEICAO.map((tipo) => <View key={tipo} style={styles.refeicao}><Text style={styles.secundario}>{REFEICOES[tipo]}</Text><Text style={styles.texto}>{plano.refeicoes[tipo]?.nome ?? "Não selecionada"}</Text></View>)}
              <Text style={styles.secundario}>Atualizado em {new Date(plano.atualizadoEm).toLocaleString("pt-BR")}</Text>
              <View style={styles.acoes}>
                <Pressable disabled={!pronto || salvando} accessibilityRole="button" accessibilityLabel={`Editar planejamento de ${plano.data}`} style={styles.botao} onPress={() => roteador.push({ pathname: "/planejamento", params: { data: plano.data } })}><Text style={styles.acento}>Editar</Text></Pressable>
                <Pressable disabled={!pronto || salvando} accessibilityRole="button" accessibilityLabel={`Excluir planejamento de ${plano.data}`} style={styles.botao} onPress={() => void confirmarExclusao(plano.data)}><Text style={styles.erro}>Excluir</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#161616" },
  conteudo: { padding: 20, paddingTop: 28, gap: 16, width: "100%", maxWidth: 760, alignSelf: "center" },
  titulo: { color: "#F4F7F4", fontSize: 28, fontWeight: "700" },
  subtitulo: { color: "#F4F7F4", fontSize: 18, fontWeight: "600" },
  secundario: { color: "#929A96", fontSize: 13, lineHeight: 20 },
  acento: { color: "#8DD9A6", fontWeight: "600", fontSize: 14 },
  texto: { color: "#F4F7F4", fontSize: 15, lineHeight: 22 },
  data: { color: "#F4F7F4", fontSize: 17, fontWeight: "600" },
  secao: { gap: 12 },
  cartao: { padding: 16, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "#303030", backgroundColor: "#222222" },
  refeicao: { gap: 3 },
  acoes: { flexDirection: "row", gap: 12 },
  botao: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", backgroundColor: "#293A2F", borderRadius: 10, alignSelf: "flex-start" },
  erro: { color: "#FFB0B0", lineHeight: 20 },
});

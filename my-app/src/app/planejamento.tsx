import { Link, useFocusEffect, useLocalSearchParams, usePreventRemove, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlanejamento } from "../contexts/PlanejamentoContext";
import { useAtualizarPlanejamento } from "../hooks/useAtualizarPlanejamento";
import { chaveData, contarRefeicoes, dataValida, refeicoesVazias, REFEICOES, TIPOS_REFEICAO } from "../types/planejamento";

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PlanejamentoScreen() {
  const { data, lembrete } = useLocalSearchParams<{ data?: string; lembrete?: string }>();
  const roteador = useRouter();
  const [selecionada, setSelecionada] = useState(() => dataValida(data) ? data : chaveData(new Date()));
  const [mes, setMes] = useState(() => new Date(`${selecionada.slice(0, 7)}-01T12:00:00`));
  const { planos, rascunho, alterado, pronto, salvando, erro, carregar, atribuir, salvar, podeSair } = usePlanejamento();
  const [sucesso, setSucesso] = useState("");
  useAtualizarPlanejamento();
  usePreventRemove(alterado, ({ repeat }) => { void podeSair().then((permitido) => { if (permitido) repeat(); }); });
  useFocusEffect(useCallback(() => {
    // A deep link may open Planning as the root screen: there is no route to pop.
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!alterado || roteador.canGoBack()) return false;
      void podeSair().then((permitido) => { if (permitido) BackHandler.exitApp(); });
      return true;
    });
    return () => assinatura.remove();
  }, [alterado, podeSair, roteador]));
  const planosPorData = new Map(planos.map((plano) => [plano.data, plano]));
  const salvo = planosPorData.get(selecionada);
  const refeicoes = rascunho?.data === selecionada ? rascunho.refeicoes : salvo?.refeicoes ?? refeicoesVazias();

  async function escolherData(valor: string) {
    if (valor === selecionada || !await podeSair()) return;
    setSelecionada(valor);
    setSucesso("");
    roteador.setParams({ data: valor, lembrete: undefined });
  }

  async function salvarSelecionado() {
    setSucesso("");
    if (await salvar(selecionada)) setSucesso("Planejamento salvo com sucesso!");
  }

  const [dataAnterior, setDataAnterior] = useState(data);
  if (data !== dataAnterior) {
    setDataAnterior(data);
    if (dataValida(data)) {
      setSelecionada(data);
      setMes(new Date(`${data.slice(0, 7)}-01T12:00:00`));
    }
  }

  const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas = Array.from({ length: Math.ceil((mes.getDay() + total) / 7) * 7 }, (_, indice) => {
    const dia = indice - mes.getDay() + 1;
    return dia > 0 && dia <= total ? chaveData(new Date(mes.getFullYear(), mes.getMonth(), dia)) : null;
  });
  const formatar = (valor: string) => new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text style={styles.marca}>PLANEJA SUA FOME</Text>
      <Text style={styles.titulo}>Planejamento</Text>
      <Text style={styles.secundario}>Escolha um dia e organize suas três refeições. Confirme as alterações em Salvar planejamento.</Text>
      <Pressable accessibilityRole="button" style={styles.botao} disabled={salvando} onPress={() => { void podeSair().then((permitido) => { if (permitido) roteador.push("/meus-planejamentos"); }); }}><Text style={styles.acento}>Meus Planejamentos</Text></Pressable>
      {erro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      {!pronto && !erro ? <ActivityIndicator color="#8DD9A6" accessibilityLabel="Carregando planejamento" /> : null}
      {!pronto && erro ? <Pressable accessibilityRole="button" onPress={() => void carregar()} style={styles.botao}><Text style={styles.acento}>Tentar novamente</Text></Pressable> : null}
      <View style={styles.cartao}>
        <View style={styles.linha}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" style={styles.seta} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><Text style={styles.acento}>‹</Text></Pressable>
          <Text style={styles.mes}>{mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" style={styles.seta} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><Text style={styles.acento}>›</Text></Pressable>
        </View>
        <View style={styles.grade}>
          {SEMANA.map((dia) => <View key={dia} style={styles.celula}><Text style={styles.secundario}>{dia}</Text></View>)}
          {celulas.map((valor, indice) => valor ? (
            <Pressable key={valor} accessibilityRole="button" accessibilityLabel={`${formatar(valor)}, ${contarRefeicoes(planosPorData.get(valor)?.refeicoes ?? refeicoesVazias())} refeições salvas`} accessibilityState={{ selected: selecionada === valor }} onPress={() => void escolherData(valor)} style={[styles.celula, selecionada === valor && styles.selecionada]}>
              <Text style={styles.texto}>{Number(valor.slice(-2))}</Text>
              <View style={styles.pontos}>{TIPOS_REFEICAO.map((tipo) => <View key={tipo} style={[styles.ponto, planosPorData.get(valor)?.refeicoes[tipo] && styles.pontoPreenchido]} />)}</View>
            </Pressable>
          ) : <View key={`vazio-${indice}`} style={styles.celula} />)}
        </View>
        <Text style={styles.legenda}>Cada ponto verde representa uma refeição salva.</Text>
      </View>
      <Text style={styles.data}>{formatar(selecionada)}</Text>
      {lembrete === "1" && pronto && !salvo ? <Text style={styles.secundario}>Este planejamento não está mais salvo. Você pode organizar novas refeições para este dia.</Text> : null}
      {TIPOS_REFEICAO.map((tipo) => {
        const receita = refeicoes[tipo];
        return (
          <View key={tipo} style={styles.cartao}>
            <Text style={styles.mes}>{REFEICOES[tipo]}</Text>
            {receita ? <Link href={{ pathname: "/receitas/[id]", params: { id: receita.id } }} style={styles.nome}>{receita.nome}</Link> : <Text style={styles.secundario}>Nenhuma receita selecionada</Text>}
            <View style={styles.acoes}>
              <Pressable disabled={!pronto || salvando} accessibilityRole="button" accessibilityLabel={`${receita ? "Trocar" : "Escolher"} receita para ${REFEICOES[tipo]}`} style={[styles.botao, (!pronto || salvando) && styles.desativado]} onPress={() => { setSucesso(""); roteador.push({ pathname: "/receitas", params: { data: selecionada, refeicao: tipo } }); }}><Text style={styles.acento}>{receita ? "Trocar receita" : "Escolher receita"}</Text></Pressable>
              {receita ? <Pressable disabled={!pronto || salvando} accessibilityRole="button" accessibilityLabel={`Remover receita de ${REFEICOES[tipo]}`} style={styles.botao} onPress={() => { setSucesso(""); atribuir(selecionada, tipo, null); }}><Text style={styles.secundario}>Remover</Text></Pressable> : null}
            </View>
          </View>
        );
      })}
      <Text style={styles.secundario} accessibilityLiveRegion="polite">{alterado ? "Alterações não salvas" : salvo ? "Planejamento salvo" : "Nenhum planejamento salvo para este dia"}</Text>
      {contarRefeicoes(refeicoes) === 0 ? <Text style={styles.secundario}>Escolha ao menos uma refeição para salvar. Para excluir um plano salvo, abra Meus Planejamentos.</Text> : null}
      <Pressable accessibilityRole="button" disabled={!pronto || salvando || contarRefeicoes(refeicoes) === 0} style={[styles.botaoSalvar, (!pronto || salvando || contarRefeicoes(refeicoes) === 0) && styles.desativado]} onPress={() => void salvarSelecionado()}><Text style={styles.textoSalvar}>{salvando ? "Salvando..." : "Salvar planejamento"}</Text></Pressable>
      {sucesso && !alterado ? <Text style={styles.acento} accessibilityLiveRegion="polite">{sucesso}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#161616" },
  conteudo: { padding: 20, paddingTop: 28, gap: 16, width: "100%", maxWidth: 760, alignSelf: "center" },
  marca: { color: "#8DD9A6", fontSize: 10, fontWeight: "700", letterSpacing: 1.6 },
  titulo: { color: "#F4F7F4", fontSize: 32, fontWeight: "700" },
  secundario: { color: "#929A96", fontSize: 13, lineHeight: 20 },
  cartao: { backgroundColor: "#222222", borderColor: "#303030", borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mes: { color: "#F4F7F4", fontSize: 16, fontWeight: "600", flexShrink: 1 },
  seta: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  grade: { flexDirection: "row", flexWrap: "wrap" },
  celula: { width: "14.285714%", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  selecionada: { backgroundColor: "#365740", borderColor: "#8DD9A6", borderWidth: 1 },
  texto: { color: "#F4F7F4", fontSize: 14 },
  pontos: { flexDirection: "row", gap: 3, marginTop: 5 },
  ponto: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#454545" },
  pontoPreenchido: { backgroundColor: "#8DD9A6" },
  legenda: { color: "#929A96", fontSize: 11 },
  data: { color: "#F4F7F4", fontSize: 19, fontWeight: "600" },
  nome: { color: "#F4F7F4", fontSize: 16, lineHeight: 23 },
  acoes: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  botao: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", backgroundColor: "#293A2F", borderRadius: 10 },
  acento: { color: "#8DD9A6", fontWeight: "600", fontSize: 15 },
  desativado: { opacity: 0.4 },
  erro: { color: "#FFB0B0", lineHeight: 20 },
  botaoSalvar: { minHeight: 48, backgroundColor: "#8DD9A6", borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 12 },
  textoSalvar: { color: "#17231B", fontWeight: "700", fontSize: 15 },
});

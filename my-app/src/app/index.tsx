import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiaDaSemana, PlanejamentoSemanal } from "../types/planejamento";

const DIAS_DA_SEMANA: DiaDaSemana[] = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const REFEICOES = [
  { chave: "cafeDaManha", titulo: "CAFÉ DA MANHÃ" },
  { chave: "almoco", titulo: "ALMOÇO" },
  { chave: "jantar", titulo: "JANTAR" },
] as const;

export default function InicioScreen() {
  const [planejamento] = useState<PlanejamentoSemanal | null>(null);
  const diaAtual = DIAS_DA_SEMANA[new Date().getDay()];
  const refeicoesDeHoje = planejamento?.[diaAtual];
  const diasPlanejados = planejamento
    ? DIAS_DA_SEMANA.filter((dia) => {
        const refeicoes = planejamento[dia];
        return Boolean(
          refeicoes?.cafeDaManha || refeicoes?.almoco || refeicoes?.jantar,
        );
      }).length
    : 0;

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.marca}>PLANEJA SUA FOME</Text>
          <Text style={styles.titulo}>Início</Text>
        </View>
        <Text style={styles.data}>{diaAtual}</Text>
      </View>

      <View style={styles.secaoTitulo}>
        <Text style={styles.tituloSecao}>Refeições de hoje</Text>
        <Text style={styles.legendaSecao}>
          Seu dia, organizado em três momentos.
        </Text>
      </View>

      {REFEICOES.map((refeicao) => {
        const receita = refeicoesDeHoje?.[refeicao.chave] ?? null;

        return (
          <View key={refeicao.chave} style={styles.cartaoRefeicao}>
            <View style={styles.detalhesRefeicao}>
              <Text style={styles.nomeRefeicao}>{refeicao.titulo}</Text>
              <Text style={styles.nomeReceita}>
                {receita?.nome ?? "Nenhuma receita escolhida"}
              </Text>
              <Link href="./receitas" asChild>
                <Pressable
                  style={styles.botaoReceita}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir pesquisa de receitas"
                >
                  <Text style={styles.textoBotaoReceita}>
                    {receita ? "Ver receitas" : "Escolher receita"}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        );
      })}
      <View style={styles.cartaoPlanejamento}>
        <View style={styles.linhaPlanejamento}>
          <View>
            <Text style={styles.rotuloPlanejamento}>PLANEJAMENTO SEMANAL</Text>
            <Text style={styles.tituloPlanejamento}>Sua semana</Text>
          </View>
          <Text style={styles.contagemPlanejamento}>{diasPlanejados}/7</Text>
        </View>
        <View style={styles.trilhoProgresso}>
          <View
            style={[
              styles.progresso,
              { width: `${(diasPlanejados / 7) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.textoPlanejamento}>
          {diasPlanejados === 0
            ? "Nenhum dia com refeições planejadas ainda."
            : `${diasPlanejados} ${diasPlanejados === 1 ? "dia" : "dias"} com refeições planejadas.`}
        </Text>
      </View>

      <Link href="/lista" asChild>
        <Pressable style={styles.cartaoLista} accessibilityRole="button">
          <View style={styles.iconeLista}>
            <Text style={styles.iconeListaTexto}>✓</Text>
          </View>
          <View style={styles.detalhesLista}>
            <Text style={styles.tituloLista}>Lista de compras</Text>
            <Text style={styles.textoLista}>
              Veja e organize seus produtos.
            </Text>
          </View>
          <Text style={styles.setaLista}>›</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#161616",
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  cabecalho: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  marca: {
    color: "#8DD9A6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 5,
  },
  titulo: {
    color: "#F4F7F4",
    fontSize: 32,
    fontWeight: "700",
  },
  data: {
    color: "#B5BDB8",
    fontSize: 13,
    marginBottom: 5,
    textTransform: "capitalize",
  },
  secaoTitulo: {
    marginBottom: 14,
  },
  tituloSecao: {
    color: "#F4F7F4",
    fontSize: 19,
    fontWeight: "600",
  },
  legendaSecao: {
    color: "#929A96",
    fontSize: 13,
    marginTop: 4,
  },
  cartaoRefeicao: {
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 16,
  },
  detalhesRefeicao: {
    flex: 1,
  },
  nomeRefeicao: {
    color: "#8DD9A6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  nomeReceita: {
    color: "#F4F7F4",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  botaoReceita: {
    alignSelf: "flex-start",
    backgroundColor: "#293A2F",
    borderRadius: 9,
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  textoBotaoReceita: {
    color: "#8DD9A6",
    fontSize: 11,
    fontWeight: "600",
  },
  cartaoPlanejamento: {
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 17,
  },
  linhaPlanejamento: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rotuloPlanejamento: {
    color: "#8DD9A6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  tituloPlanejamento: {
    color: "#F4F7F4",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 5,
  },
  contagemPlanejamento: {
    color: "#F4F7F4",
    fontSize: 18,
    fontWeight: "700",
  },
  trilhoProgresso: {
    backgroundColor: "#414B45",
    borderRadius: 5,
    height: 6,
    marginTop: 16,
    overflow: "hidden",
  },
  progresso: {
    backgroundColor: "#8DD9A6",
    borderRadius: 5,
    height: 6,
  },
  textoPlanejamento: {
    color: "#B5BDB8",
    fontSize: 13,
    marginTop: 11,
  },
  cartaoLista: {
    alignItems: "center",
    backgroundColor: "#293A2F",
    borderColor: "#43614D",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 12,
    padding: 16,
  },
  iconeLista: {
    alignItems: "center",
    backgroundColor: "#8DD9A6",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  iconeListaTexto: {
    color: "#17231B",
    fontSize: 20,
    fontWeight: "700",
  },
  detalhesLista: {
    flex: 1,
    marginLeft: 13,
  },
  tituloLista: {
    color: "#F4F7F4",
    fontSize: 15,
    fontWeight: "600",
  },
  textoLista: {
    color: "#B5BDB8",
    fontSize: 12,
    marginTop: 3,
  },
  setaLista: {
    color: "#8DD9A6",
    fontSize: 25,
    marginLeft: 8,
  },
});

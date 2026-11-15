import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { buscarReceitaPorId } from "../../services/theMealDb";
import type { ReceitaDetalhada } from "../../types/receita";

export default function DetalhesReceitaScreen() {
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const roteador = useRouter();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;
  const [receita, setReceita] = useState<ReceitaDetalhada | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const controle = new AbortController();

    async function carregarReceita() {
      if (!id) {
        setMensagem("Receita inválida.");
        setCarregando(false);
        return;
      }

      try {
        const resultado = await buscarReceitaPorId(id, controle.signal);

        if (!resultado) {
          setMensagem("Esta receita não foi encontrada.");
          return;
        }

        setReceita(resultado);
      } catch (erro) {
        if (erro instanceof Error && erro.name === "AbortError") return;
        setMensagem("Não foi possível carregar os detalhes. Verifique sua conexão.");
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }

    carregarReceita();
    return () => controle.abort();
  }, [id]);

  if (carregando) {
    return (
      <View style={styles.estadoCentral}>
        <ActivityIndicator color="#8DD9A6" size="large" />
        <Text style={styles.textoEstado}>Carregando receita...</Text>
      </View>
    );
  }

  if (!receita) {
    return (
      <View style={styles.estadoCentral}>
        <Text style={styles.tituloEstado}>Não foi possível abrir a receita</Text>
        <Text style={styles.textoEstado}>{mensagem}</Text>
        <Pressable style={styles.botaoVoltarEstado} onPress={() => roteador.back()}>
          <Text style={styles.textoBotaoVoltarEstado}>Voltar para receitas</Text>
        </Pressable>
      </View>
    );
  }

  const paragrafos = receita.instrucoes
    .split(/\r?\n+/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean);

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Pressable
        style={styles.botaoVoltar}
        onPress={() => roteador.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar para receitas"
      >
        <Text style={styles.setaVoltar}>←</Text>
        <Text style={styles.textoVoltar}>Receitas</Text>
      </Pressable>

      {receita.imagem ? (
        <Image
          source={{ uri: `${receita.imagem}/large` }}
          style={styles.imagemCapa}
          accessibilityLabel={`Foto de ${receita.nome}`}
        />
      ) : null}

      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>{receita.nome}</Text>
        {receita.nome !== receita.nomeOriginal ? (
          <Text style={styles.nomeOriginal}>Nome original: {receita.nomeOriginal}</Text>
        ) : null}
        <View style={styles.metadados}>
          <Text style={styles.chip}>{receita.categoria}</Text>
          <Text style={styles.chip}>{receita.origem}</Text>
        </View>
      </View>

      <View
        style={[
          styles.avisoIdioma,
          !receita.conteudoEmPortugues && styles.avisoIdiomaOriginal,
        ]}
      >
        <Text
          style={[
            styles.tituloAviso,
            !receita.conteudoEmPortugues && styles.tituloAvisoOriginal,
          ]}
        >
          {receita.conteudoEmPortugues
            ? "Conteúdo em português revisado"
            : "Modo de preparo no idioma original"}
        </Text>
        <Text style={styles.textoAviso}>
          {receita.conteudoEmPortugues
            ? "Esta tradução foi cadastrada manualmente para preservar os termos culinários."
            : "A TheMealDB não fornece esta receita em português. Para evitar uma tradução automática imprecisa, o preparo original em inglês foi mantido."}
        </Text>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Ingredientes</Text>
        <Text style={styles.legendaSecao}>
          {receita.ingredientes.length} itens para separar antes de começar
        </Text>
        <View style={styles.listaIngredientes}>
          {receita.ingredientes.map((ingrediente, indice) => (
            <View
              key={`${ingrediente.nome}-${indice}`}
              style={styles.linhaIngrediente}
            >
              <View style={styles.marcadorIngrediente} />
              <Text style={styles.nomeIngrediente}>{ingrediente.nome}</Text>
              <Text style={styles.quantidadeIngrediente}>
                {ingrediente.quantidade}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Modo de preparo</Text>
        <View style={styles.preparo}>
          {paragrafos.map((paragrafo, indice) => (
            <View key={`${indice}-${paragrafo.slice(0, 12)}`} style={styles.passo}>
              <View style={styles.numeroPasso}>
                <Text style={styles.textoNumeroPasso}>{indice + 1}</Text>
              </View>
              <Text style={styles.textoPasso}>{paragrafo}</Text>
            </View>
          ))}
        </View>
      </View>

      {receita.video ? (
        <Pressable
          style={styles.botaoExterno}
          onPress={() => Linking.openURL(receita.video!)}
          accessibilityRole="link"
        >
          <Text style={styles.textoBotaoExterno}>Assistir ao vídeo da receita</Text>
        </Pressable>
      ) : null}

      {receita.fonte ? (
        <Pressable
          style={styles.linkFonte}
          onPress={() => Linking.openURL(receita.fonte!)}
          accessibilityRole="link"
        >
          <Text style={styles.textoLinkFonte}>Consultar fonte original</Text>
        </Pressable>
      ) : null}

      <Text style={styles.creditos}>Dados e imagens fornecidos por TheMealDB.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: "#161616",
    flex: 1,
  },
  conteudo: {
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  botaoVoltar: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    minHeight: 38,
    paddingRight: 12,
  },
  setaVoltar: {
    color: "#8DD9A6",
    fontSize: 22,
    marginRight: 7,
  },
  textoVoltar: {
    color: "#A9E5BC",
    fontSize: 14,
    fontWeight: "600",
  },
  imagemCapa: {
    aspectRatio: 16 / 10,
    backgroundColor: "#303030",
    borderRadius: 20,
    marginTop: 10,
    width: "100%",
  },
  cabecalho: {
    marginTop: 20,
  },
  titulo: {
    color: "#F4F7F4",
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
  nomeOriginal: {
    color: "#929A96",
    fontSize: 12,
    marginTop: 6,
  },
  metadados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: "#293A2F",
    borderRadius: 14,
    color: "#A9E5BC",
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  avisoIdioma: {
    backgroundColor: "#24362A",
    borderColor: "#43614D",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 14,
  },
  avisoIdiomaOriginal: {
    backgroundColor: "#342F23",
    borderColor: "#61563D",
  },
  tituloAviso: {
    color: "#9DE0B3",
    fontSize: 12,
    fontWeight: "700",
  },
  tituloAvisoOriginal: {
    color: "#E1C57F",
  },
  textoAviso: {
    color: "#C1C8C4",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  secao: {
    marginTop: 27,
  },
  tituloSecao: {
    color: "#F4F7F4",
    fontSize: 21,
    fontWeight: "700",
  },
  legendaSecao: {
    color: "#929A96",
    fontSize: 12,
    marginTop: 4,
  },
  listaIngredientes: {
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 13,
    overflow: "hidden",
  },
  linhaIngrediente: {
    alignItems: "center",
    borderBottomColor: "#303030",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 49,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  marcadorIngrediente: {
    backgroundColor: "#8DD9A6",
    borderRadius: 4,
    height: 7,
    marginRight: 10,
    width: 7,
  },
  nomeIngrediente: {
    color: "#EBEFEC",
    flex: 1,
    fontSize: 14,
  },
  quantidadeIngrediente: {
    color: "#AAB1AD",
    fontSize: 12,
    marginLeft: 12,
    maxWidth: "43%",
    textAlign: "right",
  },
  preparo: {
    marginTop: 14,
  },
  passo: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 17,
  },
  numeroPasso: {
    alignItems: "center",
    backgroundColor: "#8DD9A6",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    marginRight: 12,
    width: 28,
  },
  textoNumeroPasso: {
    color: "#17231B",
    fontSize: 12,
    fontWeight: "800",
  },
  textoPasso: {
    color: "#D7DDD9",
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  botaoExterno: {
    alignItems: "center",
    backgroundColor: "#8DD9A6",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
  },
  textoBotaoExterno: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "700",
  },
  linkFonte: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    minHeight: 44,
  },
  textoLinkFonte: {
    color: "#A9E5BC",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  creditos: {
    color: "#737A76",
    fontSize: 10,
    marginTop: 12,
    textAlign: "center",
  },
  estadoCentral: {
    alignItems: "center",
    backgroundColor: "#161616",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  tituloEstado: {
    color: "#F4F7F4",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  textoEstado: {
    color: "#929A96",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  botaoVoltarEstado: {
    backgroundColor: "#8DD9A6",
    borderRadius: 13,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  textoBotaoVoltarEstado: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "700",
  },
});

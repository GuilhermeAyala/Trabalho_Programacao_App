import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { buscarReceitas } from "../../services/theMealDb";
import type { ReceitaResumo } from "../../types/receita";

const SUGESTOES = ["Frango", "Massa", "Carne", "Salmão"];

export default function ReceitasScreen() {
  const [termo, setTermo] = useState("frango");
  const [receitas, setReceitas] = useState<ReceitaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [buscaRealizada, setBuscaRealizada] = useState("frango");
  const controleDaBusca = useRef<AbortController | null>(null);

  useEffect(() => {
    const controle = new AbortController();
    controleDaBusca.current = controle;

    async function carregarSugestoes() {
      try {
        const resultado = await buscarReceitas("frango", controle.signal);
        setReceitas(resultado);
      } catch (erro) {
        if (erro instanceof Error && erro.name === "AbortError") return;
        setMensagem("Não foi possível carregar as receitas. Verifique sua conexão.");
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }

    carregarSugestoes();
    return () => {
      controle.abort();
      if (controleDaBusca.current === controle) {
        controleDaBusca.current = null;
      }
    };
  }, []);

  async function pesquisar(termoEscolhido = termo) {
    const termoFormatado = termoEscolhido.trim();

    if (!termoFormatado) {
      setMensagem("Digite o nome de uma receita ou ingrediente.");
      return;
    }

    setTermo(termoFormatado);
    setBuscaRealizada(termoFormatado);
    setMensagem("");
    setCarregando(true);
    Keyboard.dismiss();

    controleDaBusca.current?.abort();
    const controle = new AbortController();
    controleDaBusca.current = controle;

    try {
      const resultado = await buscarReceitas(termoFormatado, controle.signal);
      setReceitas(resultado);
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") return;
      setReceitas([]);
      setMensagem("Não foi possível pesquisar agora. Tente novamente em instantes.");
    } finally {
      if (controleDaBusca.current === controle) {
        controleDaBusca.current = null;
        setCarregando(false);
      }
    }
  }

  return (
    <FlatList
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      data={receitas}
      keyExtractor={(receita) => receita.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <Text style={styles.marca}>PLANEJA SUA FOME</Text>
          <Text style={styles.titulo}>Receitas</Text>
          <Text style={styles.subtitulo}>
            Encontre uma ideia, confira os ingredientes e prepare sua próxima refeição.
          </Text>

          <View style={styles.areaBusca}>
            <TextInput
              style={styles.campoBusca}
              value={termo}
              onChangeText={(texto) => {
                setTermo(texto);
                setMensagem("");
              }}
              onSubmitEditing={() => pesquisar()}
              placeholder="Ex.: frango, massa ou salmon"
              placeholderTextColor="#7F8883"
              returnKeyType="search"
              accessibilityLabel="Pesquisar receitas"
            />
            <Pressable
              style={({ pressed }) => [
                styles.botaoBusca,
                pressed && styles.botaoBuscaPressionado,
              ]}
              onPress={() => pesquisar()}
              accessibilityRole="button"
              accessibilityLabel="Buscar receitas"
            >
              <Text style={styles.textoBotaoBusca}>Buscar</Text>
            </Pressable>
          </View>

          <View style={styles.sugestoes}>
            {SUGESTOES.map((sugestao) => (
              <Pressable
                key={sugestao}
                style={styles.sugestao}
                onPress={() => pesquisar(sugestao)}
                accessibilityRole="button"
              >
                <Text style={styles.textoSugestao}>{sugestao}</Text>
              </Pressable>
            ))}
          </View>

          {mensagem ? (
            <Text style={styles.mensagem} accessibilityLiveRegion="polite">
              {mensagem}
            </Text>
          ) : null}

          {!carregando && receitas.length > 0 ? (
            <View style={styles.cabecalhoResultados}>
              <Text style={styles.tituloResultados}>Resultados</Text>
              <Text style={styles.contagemResultados}>
                {receitas.length} {receitas.length === 1 ? "receita" : "receitas"}
              </Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Link
          href={{
            pathname: "/receitas/[id]",
            params: { id: item.id },
          }}
          asChild
        >
          <Pressable
            style={({ pressed }) => [
              styles.cartao,
              pressed && styles.cartaoPressionado,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Abrir receita ${item.nome}`}
          >
            {item.imagem ? (
              <Image
                source={{ uri: `${item.imagem}/small` }}
                style={styles.imagem}
                accessibilityLabel={`Foto de ${item.nome}`}
              />
            ) : (
              <View style={[styles.imagem, styles.imagemIndisponivel]}>
                <Text style={styles.textoImagemIndisponivel}>Sem foto</Text>
              </View>
            )}
            <View style={styles.detalhesCartao}>
              <Text style={styles.nomeReceita} numberOfLines={2}>
                {item.nome}
              </Text>
              <Text style={styles.metadados} numberOfLines={1}>
                {item.categoria} · {item.origem}
              </Text>
              <Text
                style={[
                  styles.seloIdioma,
                  !item.conteudoEmPortugues && styles.seloOriginal,
                ]}
              >
                {item.conteudoEmPortugues
                  ? "PT-BR revisado"
                  : "Conteúdo original"}
              </Text>
            </View>
            <Text style={styles.seta}>›</Text>
          </Pressable>
        </Link>
      )}
      ListEmptyComponent={
        carregando ? (
          <View style={styles.estadoCentral}>
            <ActivityIndicator color="#8DD9A6" size="large" />
            <Text style={styles.textoEstado}>Buscando receitas...</Text>
          </View>
        ) : !mensagem ? (
          <View style={styles.estadoCentral}>
            <Text style={styles.tituloEstado}>Nenhuma receita encontrada</Text>
            <Text style={styles.textoEstado}>
              Tente outro nome ou ingrediente. A busca mais recente foi por “{buscaRealizada}”.
            </Text>
          </View>
        ) : undefined
      }
      ListFooterComponent={
        receitas.length > 0 ? (
          <Text style={styles.creditos}>Dados e imagens fornecidos por TheMealDB.</Text>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: "#161616",
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
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
  subtitulo: {
    color: "#B5BDB8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 560,
  },
  areaBusca: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
  },
  campoBusca: {
    backgroundColor: "#222222",
    borderColor: "#393939",
    borderRadius: 13,
    borderWidth: 1,
    color: "#F4F7F4",
    flex: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  botaoBusca: {
    alignItems: "center",
    backgroundColor: "#8DD9A6",
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  botaoBuscaPressionado: {
    backgroundColor: "#72C88F",
  },
  textoBotaoBusca: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "700",
  },
  sugestoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  sugestao: {
    backgroundColor: "#293A2F",
    borderColor: "#43614D",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  textoSugestao: {
    color: "#A9E5BC",
    fontSize: 12,
    fontWeight: "600",
  },
  mensagem: {
    color: "#FFB0B0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  cabecalhoResultados: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 25,
  },
  tituloResultados: {
    color: "#F4F7F4",
    fontSize: 19,
    fontWeight: "600",
  },
  contagemResultados: {
    color: "#929A96",
    fontSize: 12,
  },
  cartao: {
    alignItems: "center",
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    overflow: "hidden",
    padding: 10,
  },
  cartaoPressionado: {
    backgroundColor: "#282828",
  },
  imagem: {
    backgroundColor: "#303030",
    borderRadius: 12,
    height: 88,
    width: 88,
  },
  imagemIndisponivel: {
    alignItems: "center",
    justifyContent: "center",
  },
  textoImagemIndisponivel: {
    color: "#929A96",
    fontSize: 11,
  },
  detalhesCartao: {
    flex: 1,
    marginLeft: 13,
  },
  nomeReceita: {
    color: "#F4F7F4",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  metadados: {
    color: "#AAB1AD",
    fontSize: 12,
    marginTop: 5,
  },
  seloIdioma: {
    alignSelf: "flex-start",
    color: "#8DD9A6",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 8,
    textTransform: "uppercase",
  },
  seloOriginal: {
    color: "#D4B978",
  },
  seta: {
    color: "#8DD9A6",
    fontSize: 27,
    marginLeft: 8,
    marginRight: 3,
  },
  estadoCentral: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 230,
    paddingHorizontal: 28,
  },
  tituloEstado: {
    color: "#F4F7F4",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  textoEstado: {
    color: "#929A96",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  creditos: {
    color: "#737A76",
    fontSize: 10,
    marginTop: 10,
    textAlign: "center",
  },
});

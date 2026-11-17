import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Categoria =
  | "Hortifruti"
  | "Carnes"
  | "Laticínios e frios"
  | "Mercearia"
  | "Padaria"
  | "Bebidas"
  | "Outros";
type Filtro = "Todos" | "Pendentes" | "Comprados";

type Produto = {
  id: string;
  nome: string;
  quantidade: string;
  categoria: Categoria;
  comprado: boolean;
};

const CHAVE_LISTA = "@planeja-sua-fome:lista-de-compras";
const CATEGORIAS: Categoria[] = [
  "Hortifruti",
  "Carnes",
  "Laticínios e frios",
  "Mercearia",
  "Padaria",
  "Bebidas",
  "Outros",
];
const FILTROS: Filtro[] = ["Todos", "Pendentes", "Comprados"];

export default function ListaDeCompras() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [categoria, setCategoria] = useState<Categoria>("Hortifruti");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [carregamentoConcluido, setCarregamentoConcluido] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const dadosSalvos = await AsyncStorage.getItem(CHAVE_LISTA);
        if (dadosSalvos) {
          const produtosSalvos: unknown = JSON.parse(dadosSalvos);
          if (Array.isArray(produtosSalvos)) {
            setProdutos(produtosSalvos as Produto[]);
          }
        }
      } catch {
        setMensagem("Não foi possível carregar a lista salva.");
      } finally {
        setCarregamentoConcluido(true);
      }
    }

    carregarProdutos();
  }, []);

  useEffect(() => {
    if (!carregamentoConcluido) return;

    AsyncStorage.setItem(CHAVE_LISTA, JSON.stringify(produtos)).catch(() => {
      setMensagem("Não foi possível salvar a lista.");
    });
  }, [produtos, carregamentoConcluido]);

  function adicionarProduto() {
    const nomeFormatado = nome.trim();
    const quantidadeFormatada = quantidade.trim();

    if (
      !nomeFormatado ||
      !quantidadeFormatada ||
      Number(quantidadeFormatada.replace(",", ".")) <= 0
    ) {
      setMensagem("Informe o produto e uma quantidade maior que zero.");
      return;
    }

    const novoProduto: Produto = {
      id: `${Date.now()}-${Math.random()}`,
      nome: nomeFormatado,
      quantidade: quantidadeFormatada,
      categoria,
      comprado: false,
    };

    setProdutos((listaAtual) => [...listaAtual, novoProduto]);
    setNome("");
    setQuantidade("1");
    setMensagem("");
  }

  function alternarProduto(id: string) {
    setProdutos((listaAtual) =>
      listaAtual.map((produto) =>
        produto.id === id
          ? { ...produto, comprado: !produto.comprado }
          : produto,
      ),
    );
  }

  function removerProduto(id: string) {
    setProdutos((listaAtual) =>
      listaAtual.filter((produto) => produto.id !== id),
    );
  }

  const produtosFiltrados = produtos.filter((produto) => {
    if (filtro === "Pendentes") return !produto.comprado;
    if (filtro === "Comprados") return produto.comprado;
    return true;
  });

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>Lista de compras</Text>
      <Text style={styles.subtitulo}>Organize o que você precisa comprar.</Text>

      <View style={styles.filtros} accessibilityRole="tablist">
        {FILTROS.map((opcao) => (
          <Pressable
            key={opcao}
            style={[
              styles.filtro,
              filtro === opcao && styles.filtroSelecionado,
            ]}
            onPress={() => setFiltro(opcao)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filtro === opcao }}
          >
            <Text
              style={[
                styles.textoFiltro,
                filtro === opcao && styles.textoFiltroSelecionado,
              ]}
            >
              {opcao}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.cartao}>
        <Text style={styles.tituloSecao}>Adicionar produto</Text>
        <TextInput
          style={styles.campo}
          value={nome}
          onChangeText={setNome}
          placeholder="Nome do produto"
          placeholderTextColor="#929A96"
          accessibilityLabel="Nome do produto"
          returnKeyType="next"
        />
        <TextInput
          style={styles.campo}
          value={quantidade}
          onChangeText={setQuantidade}
          placeholder="Quantidade"
          placeholderTextColor="#929A96"
          accessibilityLabel="Quantidade"
          keyboardType="decimal-pad"
        />
        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.categorias}>
          {CATEGORIAS.map((opcao) => (
            <Pressable
              key={opcao}
              style={[
                styles.categoria,
                categoria === opcao && styles.categoriaSelecionada,
              ]}
              onPress={() => setCategoria(opcao)}
              accessibilityRole="radio"
              accessibilityState={{ selected: categoria === opcao }}
            >
              <Text
                style={[
                  styles.textoCategoria,
                  categoria === opcao && styles.textoCategoriaSelecionada,
                ]}
              >
                {opcao}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.botaoAdicionar}
          onPress={adicionarProduto}
          accessibilityRole="button"
        >
          <Text style={styles.textoBotaoAdicionar}>Adicionar à lista</Text>
        </Pressable>
        {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
      </View>

      {carregamentoConcluido ? (
        CATEGORIAS.map((nomeCategoria) => {
          const produtosDaCategoria = produtosFiltrados.filter(
            (produto) => produto.categoria === nomeCategoria,
          );

          if (produtosDaCategoria.length === 0) return null;

          return (
            <View key={nomeCategoria} style={styles.grupoCategoria}>
              <Text style={styles.tituloCategoria}>{nomeCategoria}</Text>
              {produtosDaCategoria.map((produto) => (
                <View key={produto.id} style={styles.item}>
                  <Pressable
                    style={styles.botaoProduto}
                    onPress={() => alternarProduto(produto.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: produto.comprado }}
                    accessibilityLabel={`${produto.nome}, quantidade ${produto.quantidade}`}
                  >
                    <View
                      style={[
                        styles.marcador,
                        produto.comprado && styles.marcadorMarcado,
                      ]}
                    >
                      {produto.comprado ? (
                        <Text style={styles.check}>✓</Text>
                      ) : null}
                    </View>
                    <View style={styles.dadosProduto}>
                      <Text
                        style={[
                          styles.nomeProduto,
                          produto.comprado && styles.produtoComprado,
                        ]}
                      >
                        {produto.nome}
                      </Text>
                      <Text style={styles.quantidadeProduto}>
                        Quantidade: {produto.quantidade}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => removerProduto(produto.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${produto.nome}`}
                    hitSlop={8}
                  >
                    <Text style={styles.remover}>Remover</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })
      ) : (
        <Text style={styles.textoVazio}>Carregando sua lista…</Text>
      )}

      {carregamentoConcluido && produtosFiltrados.length === 0 ? (
        <Text style={styles.textoVazio}>
          {produtos.length === 0
            ? "Sua lista ainda está vazia."
            : "Nenhum produto neste filtro."}
        </Text>
      ) : null}
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
  titulo: {
    color: "#F4F7F4",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitulo: {
    color: "#B5BDB8",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  filtros: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  filtro: {
    flex: 1,
    alignItems: "center",
    borderColor: "#393939",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
  },
  filtroSelecionado: {
    backgroundColor: "#8DD9A6",
    borderColor: "#8DD9A6",
  },
  textoFiltro: {
    color: "#B5BDB8",
    fontSize: 13,
    fontWeight: "600",
  },
  textoFiltroSelecionado: {
    color: "#17231B",
  },
  cartao: {
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  tituloSecao: {
    color: "#F4F7F4",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
  },
  campo: {
    backgroundColor: "#181818",
    borderColor: "#393939",
    borderRadius: 11,
    borderWidth: 1,
    color: "#F4F7F4",
    fontSize: 15,
    minHeight: 48,
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  rotulo: {
    color: "#B5BDB8",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  categorias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  categoria: {
    borderColor: "#414B45",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  categoriaSelecionada: {
    backgroundColor: "#293A2F",
    borderColor: "#8DD9A6",
  },
  textoCategoria: {
    color: "#B5BDB8",
    fontSize: 13,
  },
  textoCategoriaSelecionada: {
    color: "#8DD9A6",
    fontWeight: "600",
  },
  botaoAdicionar: {
    alignItems: "center",
    backgroundColor: "#8DD9A6",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
  },
  textoBotaoAdicionar: {
    color: "#17231B",
    fontSize: 15,
    fontWeight: "700",
  },
  mensagem: {
    color: "#FF9B9B",
    fontSize: 13,
    marginTop: 10,
  },
  grupoCategoria: {
    marginBottom: 20,
  },
  tituloCategoria: {
    color: "#8DD9A6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  item: {
    alignItems: "center",
    backgroundColor: "#222222",
    borderColor: "#303030",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 68,
    paddingHorizontal: 13,
  },
  botaoProduto: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minHeight: 64,
  },
  marcador: {
    alignItems: "center",
    borderColor: "#68726C",
    borderRadius: 7,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginRight: 12,
    width: 22,
  },
  marcadorMarcado: {
    backgroundColor: "#8DD9A6",
    borderColor: "#8DD9A6",
  },
  check: {
    color: "#17231B",
    fontWeight: "700",
  },
  dadosProduto: {
    flex: 1,
  },
  nomeProduto: {
    color: "#F4F7F4",
    fontSize: 15,
    fontWeight: "600",
  },
  produtoComprado: {
    color: "#929A96",
    textDecorationLine: "line-through",
  },
  quantidadeProduto: {
    color: "#B5BDB8",
    fontSize: 12,
    marginTop: 3,
  },
  remover: {
    color: "#FF9B9B",
    fontSize: 12,
    marginLeft: 10,
    paddingVertical: 10,
  },
  textoVazio: {
    color: "#929A96",
    fontSize: 14,
    paddingVertical: 18,
    textAlign: "center",
  },
});

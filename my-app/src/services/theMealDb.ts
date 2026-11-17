import {
  obterConteudoCurado,
  resolverTermoDeBusca,
  traduzirCategoria,
  traduzirIngrediente,
  traduzirMedida,
  traduzirOrigem,
} from "../data/receitasPtBr";
import type {
  IngredienteReceita,
  ReceitaDetalhada,
  ReceitaResumo,
  TheMealDbMeal,
  TheMealDbResponse,
} from "../types/receita";

const API_URL = "https://www.themealdb.com/api/json/v1/1";

async function requisitarReceitas(
  caminho: string,
  signal?: AbortSignal,
): Promise<TheMealDbMeal[]> {
  const resposta = await fetch(`${API_URL}/${caminho}`, { signal });

  if (!resposta.ok) {
    throw new Error(`A TheMealDB respondeu com o status ${resposta.status}.`);
  }

  const dados = (await resposta.json()) as TheMealDbResponse;
  return Array.isArray(dados.meals) ? dados.meals : [];
}

function paraResumo(receita: TheMealDbMeal): ReceitaResumo {
  const conteudoCurado = obterConteudoCurado(receita.idMeal);

  return {
    id: receita.idMeal,
    nome: conteudoCurado?.nome ?? receita.strMeal,
    nomeOriginal: receita.strMeal,
    categoria: traduzirCategoria(receita.strCategory),
    origem: traduzirOrigem(receita.strArea),
    imagem: receita.strMealThumb,
    conteudoEmPortugues: Boolean(conteudoCurado),
  };
}

function extrairIngredientes(receita: TheMealDbMeal): IngredienteReceita[] {
  const ingredientes: IngredienteReceita[] = [];

  for (let indice = 1; indice <= 20; indice += 1) {
    const ingrediente = receita[`strIngredient${indice}`]?.trim();
    const medida = receita[`strMeasure${indice}`]?.trim();

    if (ingrediente) {
      ingredientes.push({
        nome: traduzirIngrediente(ingrediente),
        quantidade: medida ? traduzirMedida(medida) : "A gosto",
      });
    }
  }

  return ingredientes;
}

export async function buscarReceitas(
  termo: string,
  signal?: AbortSignal,
): Promise<ReceitaResumo[]> {
  const termoDaApi = resolverTermoDeBusca(termo);
  const receitas = await requisitarReceitas(
    `search.php?s=${encodeURIComponent(termoDaApi)}`,
    signal,
  );

  return receitas.map(paraResumo);
}

export async function buscarReceitaPorId(
  id: string,
  signal?: AbortSignal,
): Promise<ReceitaDetalhada | null> {
  const receitas = await requisitarReceitas(
    `lookup.php?i=${encodeURIComponent(id)}`,
    signal,
  );
  const receita = receitas[0];

  if (!receita) return null;

  const resumo = paraResumo(receita);
  const conteudoCurado = obterConteudoCurado(receita.idMeal);

  return {
    ...resumo,
    ingredientes: extrairIngredientes(receita),
    instrucoes:
      conteudoCurado?.instrucoes ??
      receita.strInstructions?.trim() ??
      "Modo de preparo não informado.",
    fonte: receita.strSource,
    video: receita.strYoutube,
  };
}

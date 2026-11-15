export type TheMealDbMeal = {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strSource: string | null;
  strYoutube: string | null;
  [campo: string]: string | null;
};

export type TheMealDbResponse = {
  meals: TheMealDbMeal[] | null;
};

export type ReceitaResumo = {
  id: string;
  nome: string;
  nomeOriginal: string;
  categoria: string;
  origem: string;
  imagem: string | null;
  conteudoEmPortugues: boolean;
};

export type IngredienteReceita = {
  nome: string;
  quantidade: string;
};

export type ReceitaDetalhada = ReceitaResumo & {
  ingredientes: IngredienteReceita[];
  instrucoes: string;
  fonte: string | null;
  video: string | null;
};

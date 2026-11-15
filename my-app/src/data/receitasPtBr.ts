type ConteudoCurado = {
  nome: string;
  instrucoes: string;
};

const CONTEUDO_CURADO: Record<string, ConteudoCurado> = {
  "52771": {
    nome: "Penne à arrabbiata",
    instrucoes:
      "Leve uma panela grande com água ao fogo até ferver. Adicione sal e cozinhe o macarrão conforme as instruções da embalagem, por cerca de 9 minutos.\n\nEm uma frigideira grande, aqueça o azeite em fogo médio-alto. Junte o alho e refogue por 1 a 2 minutos, mexendo, até ficar perfumado. Acrescente os tomates picados, a pimenta calabresa, o tempero italiano, sal e pimenta-do-reino a gosto. Deixe ferver e cozinhe por 5 minutos. Desligue o fogo e adicione o manjericão picado.\n\nEscorra o macarrão, misture-o ao molho e finalize com lascas de parmesão e mais manjericão. Sirva quente.",
  },
  "52806": {
    nome: "Frango tandoori",
    instrucoes:
      "Misture o suco de limão, a páprica e a cebola-roxa em um refratário grande e raso. Faça três cortes em cada sobrecoxa, envolva-as nessa mistura e deixe descansar por 10 minutos.\n\nMisture todos os ingredientes da marinada e despeje sobre o frango. Envolva bem cada pedaço, cubra e leve à geladeira por pelo menos 1 hora. Essa etapa pode ser feita com até um dia de antecedência.\n\nAqueça a grelha. Coloque os pedaços de frango sobre uma grade apoiada em uma assadeira, pincele um pouco de óleo e grelhe por cerca de 8 minutos de cada lado, até dourar levemente e cozinhar por completo.",
  },
  "52945": {
    nome: "Frango kung pao",
    instrucoes:
      "Misture o saquê ou vinho de arroz, o molho de soja, o óleo de gergelim e o amido de milho já dissolvido em água. Divida a mistura em duas partes.\n\nEm uma tigela, envolva os pedaços de frango com metade da mistura. Cubra e leve à geladeira por aproximadamente 30 minutos.\n\nEm uma frigideira média, coloque a outra metade da mistura, a pimenta, o vinagre e o açúcar. Adicione a cebolinha, o alho, a castanha-d'água e o amendoim. Aqueça lentamente em fogo médio até ficar aromático.\n\nEnquanto isso, retire o frango da marinada e refogue-o em uma frigideira grande até cozinhar por completo. Junte o frango ao molho e cozinhe em fogo baixo até o molho engrossar.",
  },
};

const TERMOS_DE_BUSCA: Record<string, string> = {
  arroz: "rice",
  bacalhau: "cod",
  batata: "potato",
  bolo: "cake",
  carne: "beef",
  chocolate: "chocolate",
  cordeiro: "lamb",
  frango: "chicken",
  macarrao: "pasta",
  massa: "pasta",
  peixe: "fish",
  porco: "pork",
  salmao: "salmon",
  sopa: "soup",
  torta: "pie",
  vegetariano: "vegetarian",
};

const CATEGORIAS: Record<string, string> = {
  Beef: "Carne bovina",
  Breakfast: "Café da manhã",
  Chicken: "Frango",
  Dessert: "Sobremesa",
  Goat: "Carne de cabra",
  Lamb: "Cordeiro",
  Miscellaneous: "Outros",
  Pasta: "Massas",
  Pork: "Carne suína",
  Seafood: "Frutos do mar",
  Side: "Acompanhamento",
  Starter: "Entrada",
  Vegan: "Vegana",
  Vegetarian: "Vegetariana",
};

const ORIGENS: Record<string, string> = {
  American: "Estados Unidos",
  British: "Reino Unido",
  Canadian: "Canadá",
  Chinese: "China",
  Croatian: "Croácia",
  Dutch: "Países Baixos",
  Egyptian: "Egito",
  Filipino: "Filipinas",
  French: "França",
  Greek: "Grécia",
  Indian: "Índia",
  Irish: "Irlanda",
  Italian: "Itália",
  Jamaican: "Jamaica",
  Japanese: "Japão",
  Kenyan: "Quênia",
  Malaysian: "Malásia",
  Mexican: "México",
  Moroccan: "Marrocos",
  Polish: "Polônia",
  Portuguese: "Portugal",
  Russian: "Rússia",
  Spanish: "Espanha",
  Thai: "Tailândia",
  Tunisian: "Tunísia",
  Turkish: "Turquia",
  Ukrainian: "Ucrânia",
  Vietnamese: "Vietnã",
};

const INGREDIENTES: Record<string, string> = {
  "baking powder": "fermento químico",
  basil: "manjericão",
  butter: "manteiga",
  "chicken breast": "peito de frango",
  "chicken drumsticks": "coxas de frango",
  "chicken stock": "caldo de frango",
  "chicken thighs": "sobrecoxas de frango",
  chicken: "frango",
  "chilli powder": "pimenta em pó",
  "chopped tomatoes": "tomates picados",
  cinnamon: "canela",
  coriander: "coentro",
  cream: "creme de leite",
  cumin: "cominho",
  "dijon mustard": "mostarda Dijon",
  egg: "ovo",
  eggs: "ovos",
  fenugreek: "feno-grego",
  garlic: "alho",
  "garlic clove": "dente de alho",
  "garlic cloves": "dentes de alho",
  ginger: "gengibre",
  honey: "mel",
  lemon: "limão",
  lemons: "limões",
  "olive oil": "azeite de oliva",
  onion: "cebola",
  onions: "cebolas",
  paprika: "páprica",
  parsley: "salsinha",
  pepper: "pimenta-do-reino",
  potato: "batata",
  potatoes: "batatas",
  rice: "arroz",
  salt: "sal",
  "soy sauce": "molho de soja",
  sugar: "açúcar",
  tomato: "tomate",
  tomatoes: "tomates",
  turmeric: "cúrcuma",
  "vegetable oil": "óleo vegetal",
  water: "água",
  yogurt: "iogurte",
};

function semAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function obterConteudoCurado(id: string) {
  return CONTEUDO_CURADO[id] ?? null;
}

export function resolverTermoDeBusca(termo: string) {
  const termoLimpo = termo.trim();
  const chave = semAcentos(termoLimpo.toLocaleLowerCase("pt-BR"));
  return TERMOS_DE_BUSCA[chave] ?? termoLimpo;
}

export function traduzirCategoria(categoria: string | null) {
  if (!categoria) return "Sem categoria";
  return CATEGORIAS[categoria] ?? categoria;
}

export function traduzirOrigem(origem: string | null) {
  if (!origem) return "Origem não informada";
  return ORIGENS[origem] ?? origem;
}

export function traduzirIngrediente(ingrediente: string) {
  const traducao = INGREDIENTES[ingrediente.trim().toLocaleLowerCase("en-US")];
  return traducao ?? ingrediente.trim();
}

export function traduzirMedida(medida: string) {
  return medida
    .trim()
    .replace(/\btablespoons?\b|\btblsp\b|\btbsp\b/gi, "c. de sopa")
    .replace(/\bteaspoons?\b|\btsp\b/gi, "c. de chá")
    .replace(/\bcups?\b/gi, "xíc.")
    .replace(/\bcloves?\b/gi, "dentes")
    .replace(/\bpinch\b/gi, "pitada")
    .replace(/\bto taste\b/gi, "a gosto")
    .replace(/\bhandful\b/gi, "punhado")
    .replace(/\bchopped\b/gi, "picado")
    .replace(/\bsliced\b/gi, "fatiado");
}

export type DiaDaSemana =
  | "domingo"
  | "segunda-feira"
  | "terça-feira"
  | "quarta-feira"
  | "quinta-feira"
  | "sexta-feira"
  | "sábado";

export type RefeicaoPlanejada = {
  id: string;
  nome: string;
  imagemUrl?: string;
};

export type RefeicoesDoDia = {
  cafeDaManha: RefeicaoPlanejada | null;
  almoco: RefeicaoPlanejada | null;
  jantar: RefeicaoPlanejada | null;
};

export type PlanejamentoSemanal = Partial<Record<DiaDaSemana, RefeicoesDoDia>>;

export const REFEICOES = {
  cafeDaManha: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
} as const;

export type TipoRefeicao = keyof typeof REFEICOES;
export type PlanoDiario = {
  data: string;
  refeicoes: RefeicoesDoDia;
  atualizadoEm: string;
};

export const TIPOS_REFEICAO = Object.keys(REFEICOES) as TipoRefeicao[];

export function refeicoesVazias(): RefeicoesDoDia {
  return { cafeDaManha: null, almoco: null, jantar: null };
}

export function contarRefeicoes(refeicoes: RefeicoesDoDia): number {
  return TIPOS_REFEICAO.filter((tipo) => refeicoes[tipo] !== null).length;
}

export function tipoRefeicaoValido(valor: unknown): valor is TipoRefeicao {
  return typeof valor === "string" && Object.hasOwn(REFEICOES, valor);
}

export function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00`);
  return !Number.isNaN(data.getTime()) && chaveData(data) === valor;
}

export function chaveData(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

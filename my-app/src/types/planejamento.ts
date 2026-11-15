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

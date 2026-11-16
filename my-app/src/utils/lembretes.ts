import { dataValida } from "../types/planejamento";

export const CANAL_LEMBRETES = "planejamento-diario";
export const PREFIXO_LEMBRETES = `${CANAL_LEMBRETES}:`;

export function horarioDoLembrete(data: string, agora: Date): Date | null {
  if (!dataValida(data)) return null;
  const horario = new Date(`${data}T07:00:00`);
  return horario.getTime() > agora.getTime() ? horario : null;
}

export function dataDoLembrete(dados: Record<string, unknown> | undefined): string | null {
  return dados?.origem === CANAL_LEMBRETES && dataValida(dados.dataPlano) ? dados.dataPlano : null;
}

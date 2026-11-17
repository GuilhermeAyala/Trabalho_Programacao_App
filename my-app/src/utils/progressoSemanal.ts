import { chaveData, contarRefeicoes, dataValida, type PlanoDiario } from "../types/planejamento";

export function calcularProgressoSemanal(planos: PlanoDiario[], dataReferencia: Date): {
  diasPlanejados: number;
  totalDias: 7;
  percentual: number;
} {
  if (Number.isNaN(dataReferencia.getTime())) return { diasPlanejados: 0, totalDias: 7, percentual: 0 };
  // Calendar arithmetic, rather than adding milliseconds, also handles DST weeks.
  const domingo = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate(), 12);
  domingo.setDate(domingo.getDate() - domingo.getDay());
  const sabado = new Date(domingo);
  sabado.setDate(sabado.getDate() + 6);
  const inicio = chaveData(domingo);
  const fim = chaveData(sabado);
  const datas = new Set(planos.filter((plano) =>
    dataValida(plano.data) && plano.data >= inicio && plano.data <= fim && contarRefeicoes(plano.refeicoes) > 0,
  ).map((plano) => plano.data));
  const diasPlanejados = Math.min(7, datas.size);
  return { diasPlanejados, totalDias: 7, percentual: diasPlanejados / 7 * 100 };
}

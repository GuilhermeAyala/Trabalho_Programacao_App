import AsyncStorage from "@react-native-async-storage/async-storage";
import { contarRefeicoes, dataValida, refeicoesVazias, TIPOS_REFEICAO, type PlanoDiario, type RefeicaoPlanejada, type TipoRefeicao } from "../types/planejamento";

export const CHAVES_PLANEJAMENTO = {
  atual: "@planeja-sua-fome:planejamento-calendario:v2",
  legado: "@planeja-sua-fome:planejamento-calendario:v1",
} as const;

type Registro = { refeicoes: Record<TipoRefeicao, string | null>; atualizadoEm: string };
type Banco = { versao: 2; planos: Record<string, Registro>; receitas: Record<string, RefeicaoPlanejada> };
const bancoVazio = (): Banco => ({ versao: 2, planos: {}, receitas: {} });
const ouvintes = new Set<(planos: PlanoDiario[]) => void>();
const ouvintesDeAlteracoes = new Set<() => void>();
let fila: Promise<unknown> = Promise.resolve();

// Every read/modify/write uses the same queue; a rejected operation does not block the next.
function serializar<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = fila.then(operacao);
  fila = resultado.catch(() => undefined);
  return resultado;
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function receitaValida(valor: unknown): valor is RefeicaoPlanejada {
  return objeto(valor) && typeof valor.id === "string" && valor.id.length > 0 &&
    typeof valor.nome === "string" && valor.nome.trim().length > 0 &&
    (valor.imagemUrl === undefined || typeof valor.imagemUrl === "string");
}

function invalidos(): never {
  throw new Error("Os dados salvos do planejamento são inválidos. Eles foram preservados, sem sobrescrever o armazenamento.");
}

function decodificar(texto: string): Banco {
  let dados: unknown;
  try { dados = JSON.parse(texto); } catch { return invalidos(); }
  if (!objeto(dados) || dados.versao !== 2 || !objeto(dados.planos) || !objeto(dados.receitas)) return invalidos();
  const banco = bancoVazio();
  for (const [id, receita] of Object.entries(dados.receitas)) {
    if (!receitaValida(receita) || receita.id !== id) return invalidos();
    Object.defineProperty(banco.receitas, id, { value: receita, enumerable: true, configurable: true, writable: true });
  }
  for (const [data, plano] of Object.entries(dados.planos)) {
    if (!dataValida(data) || !objeto(plano) || !objeto(plano.refeicoes) || typeof plano.atualizadoEm !== "string" || Number.isNaN(Date.parse(plano.atualizadoEm))) return invalidos();
    const refeicoes = {} as Registro["refeicoes"];
    for (const tipo of TIPOS_REFEICAO) {
      const id = plano.refeicoes[tipo];
      if (id !== null && (typeof id !== "string" || !Object.hasOwn(banco.receitas, id))) return invalidos();
      refeicoes[tipo] = id;
    }
    banco.planos[data] = { refeicoes, atualizadoEm: plano.atualizadoEm };
  }
  return banco;
}

function migrar(texto: string): Banco {
  let dados: unknown;
  try { dados = JSON.parse(texto); } catch { return invalidos(); }
  if (!objeto(dados) || !objeto(dados.dias) || !objeto(dados.receitas)) return invalidos();
  const banco = bancoVazio();
  const atualizadoEm = new Date().toISOString();
  for (const [data, dia] of Object.entries(dados.dias)) {
    if (!dataValida(data) || !objeto(dia)) return invalidos();
    const refeicoes: Registro["refeicoes"] = { cafeDaManha: null, almoco: null, jantar: null };
    for (const tipo of TIPOS_REFEICAO) {
      const id = dia[tipo];
      if (id === undefined || id === null) continue;
      if (typeof id !== "string" || !Object.hasOwn(dados.receitas, id)) return invalidos();
      const receita = dados.receitas[id];
      if (!objeto(receita) || receita.id !== id || typeof receita.nome !== "string" || !receita.nome.trim() || (receita.imagem !== null && typeof receita.imagem !== "string")) return invalidos();
      Object.defineProperty(banco.receitas, id, { value: { id, nome: receita.nome, ...(receita.imagem ? { imagemUrl: receita.imagem } : {}) }, enumerable: true, configurable: true, writable: true });
      refeicoes[tipo] = id;
    }
    if (Object.values(refeicoes).some(Boolean)) banco.planos[data] = { refeicoes, atualizadoEm };
  }
  return banco;
}

async function lerBanco(): Promise<Banco> {
  const atual = await AsyncStorage.getItem(CHAVES_PLANEJAMENTO.atual);
  if (atual !== null) return decodificar(atual);
  const legado = await AsyncStorage.getItem(CHAVES_PLANEJAMENTO.legado);
  if (legado === null) return bancoVazio();
  const banco = migrar(legado);
  // Keep the original v1 key intact as a recovery copy, even after migration.
  await AsyncStorage.setItem(CHAVES_PLANEJAMENTO.atual, JSON.stringify(banco));
  return banco;
}

function paraPlanos(banco: Banco): PlanoDiario[] {
  return Object.entries(banco.planos).map(([data, registro]) => {
    const refeicoes = refeicoesVazias();
    for (const tipo of TIPOS_REFEICAO) {
      const id = registro.refeicoes[tipo];
      refeicoes[tipo] = id ? { ...banco.receitas[id] } : null;
    }
    return { data, refeicoes, atualizadoEm: registro.atualizadoEm };
  }).filter((plano) => contarRefeicoes(plano.refeicoes) > 0).sort((a, b) => a.data.localeCompare(b.data));
}

function publicar(banco: Banco) {
  for (const ouvinte of ouvintes) ouvinte(paraPlanos(banco));
}

export function observarPlanos(ouvinte: (planos: PlanoDiario[]) => void) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

// Separate committed writes from reads so reminder reconciliation cannot trigger itself.
export function observarAlteracoesPlanos(ouvinte: () => void) {
  ouvintesDeAlteracoes.add(ouvinte);
  return () => { ouvintesDeAlteracoes.delete(ouvinte); };
}

export function listarPlanos(): Promise<PlanoDiario[]> {
  return serializar(async () => {
    const banco = await lerBanco();
    publicar(banco);
    return paraPlanos(banco);
  });
}

export async function buscarPlano(data: string): Promise<PlanoDiario | null> {
  if (!dataValida(data)) throw new Error("Data inválida.");
  return (await listarPlanos()).find((plano) => plano.data === data) ?? null;
}

export function salvarPlano(plano: Pick<PlanoDiario, "data" | "refeicoes">): Promise<PlanoDiario> {
  // Capture a snapshot before joining the queue, so later draft changes cannot alter the save.
  const copia = JSON.parse(JSON.stringify(plano)) as typeof plano;
  return serializar(async () => {
    if (!dataValida(copia.data) || !objeto(copia.refeicoes)) throw new Error("Plano inválido.");
    for (const tipo of TIPOS_REFEICAO) {
      const receita = copia.refeicoes[tipo];
      if (receita !== null && !receitaValida(receita)) throw new Error("Refeição inválida.");
    }
    if (contarRefeicoes(copia.refeicoes) === 0) throw new Error("Escolha ao menos uma refeição antes de salvar.");
    const banco = await lerBanco();
    const registro: Registro = { refeicoes: { cafeDaManha: null, almoco: null, jantar: null }, atualizadoEm: new Date().toISOString() };
    for (const tipo of TIPOS_REFEICAO) {
      const receita = copia.refeicoes[tipo];
      if (!receita) continue;
      Object.defineProperty(banco.receitas, receita.id, { value: receita, enumerable: true, configurable: true, writable: true });
      registro.refeicoes[tipo] = receita.id;
    }
    banco.planos[copia.data] = registro;
    await gravarBanco(banco);
    return paraPlanos(banco).find((salvo) => salvo.data === copia.data)!;
  });
}

async function gravarBanco(banco: Banco) {
  const usados = new Set(Object.values(banco.planos).flatMap((plano) => Object.values(plano.refeicoes)));
  for (const id of Object.keys(banco.receitas)) if (!usados.has(id)) delete banco.receitas[id];
  await AsyncStorage.setItem(CHAVES_PLANEJAMENTO.atual, JSON.stringify(banco));
  publicar(banco);
  for (const ouvinte of ouvintesDeAlteracoes) {
    // A side effect must never turn a committed plan save into a reported failure.
    try { ouvinte(); } catch { /* Observers report their own failures. */ }
  }
}

export function excluirPlano(data: string): Promise<void> {
  return serializar(async () => {
    if (!dataValida(data)) throw new Error("Data inválida.");
    const banco = await lerBanco();
    delete banco.planos[data];
    await gravarBanco(banco);
  });
}

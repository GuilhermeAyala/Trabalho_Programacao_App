import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { NotificationRequest, NotificationResponse } from "expo-notifications";
import { listarPlanos } from "./planejamento";
import { contarRefeicoes } from "../types/planejamento";
import { CANAL_LEMBRETES, PREFIXO_LEMBRETES, dataDoLembrete, horarioDoLembrete } from "../utils/lembretes";

export const CHAVE_NOTIFICACOES = "@planeja-sua-fome:lembretes-7h:v1";
const TITULO = "Planeja Sua Fome 🥗";
const MENSAGEM = "Bom dia! Você tem refeições planejadas para hoje. Confira seu cardápio!";
const NEGADA = "As notificações estão bloqueadas. No Android, abra Configurações > Aplicativos > Planeja Sua Fome > Notificações e permita os lembretes.";

type EstadoNotificacoes = {
  disponivel: boolean;
  carregado: boolean;
  ocupado: boolean;
  preferencia: boolean;
  habilitado: boolean;
  permissaoNegada: boolean;
  erro: string;
};
let estado: EstadoNotificacoes = {
  disponivel: Platform.OS === "android", carregado: Platform.OS !== "android", ocupado: false,
  preferencia: false, habilitado: false, permissaoNegada: false, erro: "",
};
const ouvintes = new Set<() => void>();
let fila: Promise<unknown> = Promise.resolve();
const respostasTratadas = new Set<string>();

export const obterEstadoNotificacoes = () => estado;
export function observarEstadoNotificacoes(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}
function atualizar(alteracoes: Partial<EstadoNotificacoes>) {
  estado = { ...estado, ...alteracoes };
  for (const ouvinte of ouvintes) ouvinte();
}

function executar(operacao: () => Promise<void>): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  const resultado = fila.then(async () => {
    atualizar({ ocupado: true, erro: "" });
    try { await operacao(); }
    catch {
      atualizar({ habilitado: false, erro: "Não foi possível sincronizar os lembretes. Seus planejamentos continuam salvos. Tente novamente ou confira as permissões nas configurações do Android." });
    } finally { atualizar({ carregado: true, ocupado: false }); }
  });
  fila = resultado.catch(() => undefined);
  return resultado;
}

// Import the native module only on Android; web/iOS never call its notification APIs.
const api = () => import("expo-notifications");
type Api = Awaited<ReturnType<typeof api>>;

async function lerPreferencia(): Promise<boolean> {
  const valor = await AsyncStorage.getItem(CHAVE_NOTIFICACOES);
  if (valor !== null && valor !== "true" && valor !== "false") throw new Error("Preferência inválida");
  return valor === "true";
}

async function prepararCanal(notificacoes: Api) {
  await notificacoes.setNotificationChannelAsync(CANAL_LEMBRETES, {
    name: "Planejamentos do dia", description: "Lembretes das refeições salvas para as 7h",
    importance: notificacoes.AndroidImportance.DEFAULT, sound: "default", enableVibrate: true,
  });
}

function gerenciada(notificacao: NotificationRequest) {
  return notificacao.identifier.startsWith(PREFIXO_LEMBRETES) && notificacao.content.data?.origem === CANAL_LEMBRETES;
}

async function cancelarGerenciadas(notificacoes: Api) {
  const pendentes = await notificacoes.getAllScheduledNotificationsAsync();
  for (const pendente of pendentes) {
    if (gerenciada(pendente)) await notificacoes.cancelScheduledNotificationAsync(pendente.identifier);
  }
}

async function temPermissao(notificacoes: Api): Promise<boolean> {
  const permissao = await notificacoes.getPermissionsAsync();
  const canal = await notificacoes.getNotificationChannelAsync(CANAL_LEMBRETES);
  return permissao.granted && canal !== null && canal.importance !== notificacoes.AndroidImportance.NONE;
}

async function reconciliar(notificacoes: Api, habilitado: boolean) {
  if (!habilitado) { await cancelarGerenciadas(notificacoes); return; }
  // Read the persistence service, never a calendar draft or a notification-based plan cache.
  const planos = await listarPlanos();
  const agora = new Date();
  const horarios = new Map<string, Date>();
  const datasSalvas = new Set<string>();
  for (const plano of planos) {
    if (contarRefeicoes(plano.refeicoes) === 0) continue;
    datasSalvas.add(plano.data);
    const horario = horarioDoLembrete(plano.data, agora);
    if (horario) horarios.set(plano.data, horario);
  }
  const mantidas = new Set<string>();
  const pendentes = await notificacoes.getAllScheduledNotificationsAsync();
  const falhas: unknown[] = [];
  for (const pendente of pendentes) {
    if (!gerenciada(pendente)) continue;
    const dados = pendente.content.data;
    const data = dataDoLembrete(dados);
    const horario = data ? horarios.get(data) : undefined;
    const testeValido = __DEV__ && dados?.teste === true && data && datasSalvas.has(data) &&
      typeof dados.agendadoPara === "number" && dados.agendadoPara > agora.getTime();
    if (testeValido) continue;
    if (data && horario && dados?.teste !== true && dados?.agendadoPara === horario.getTime() && !mantidas.has(data)) {
      mantidas.add(data);
      continue;
    }
    try { await notificacoes.cancelScheduledNotificationAsync(pendente.identifier); }
    catch (falha) {
      falhas.push(falha);
      // Do not add a replacement if an old reminder could not be canceled.
      if (data) mantidas.add(data);
    }
  }
  for (const [data, horario] of horarios) {
    if (mantidas.has(data) || horario.getTime() <= Date.now()) continue;
    try {
      await notificacoes.scheduleNotificationAsync({
        identifier: `${PREFIXO_LEMBRETES}${data}`,
        content: { title: TITULO, body: MENSAGEM, sound: "default", data: { origem: CANAL_LEMBRETES, dataPlano: data, agendadoPara: horario.getTime() } },
        trigger: { type: notificacoes.SchedulableTriggerInputTypes.DATE, date: horario, channelId: CANAL_LEMBRETES, delivery: "bestEffort" },
      });
    } catch (falha) { falhas.push(falha); }
  }
  if (falhas.length) throw new Error("Alguns lembretes não foram sincronizados");
}

export function sincronizarNotificacoes(): Promise<void> {
  return executar(async () => {
    const preferencia = await lerPreferencia();
    atualizar({ preferencia, habilitado: false, permissaoNegada: false });
    const notificacoes = await api();
    if (!preferencia) { await reconciliar(notificacoes, false); return; }
    await prepararCanal(notificacoes);
    const permitido = await temPermissao(notificacoes);
    atualizar({ habilitado: permitido, permissaoNegada: !permitido, erro: permitido ? "" : NEGADA });
    await reconciliar(notificacoes, permitido);
  });
}

export function definirNotificacoes(habilitar: boolean): Promise<void> {
  return executar(async () => {
    if (!habilitar) {
      await AsyncStorage.setItem(CHAVE_NOTIFICACOES, "false");
      atualizar({ preferencia: false, habilitado: false, permissaoNegada: false });
      const notificacoes = await api();
      await reconciliar(notificacoes, false);
      return;
    }
    atualizar({ habilitado: false });
    const notificacoes = await api();
    await prepararCanal(notificacoes);
    const permissao = await notificacoes.getPermissionsAsync();
    if (!permissao.granted && permissao.canAskAgain) await notificacoes.requestPermissionsAsync();
    const permitido = await temPermissao(notificacoes);
    await AsyncStorage.setItem(CHAVE_NOTIFICACOES, permitido ? "true" : "false");
    atualizar({ preferencia: permitido, habilitado: permitido, permissaoNegada: !permitido, erro: permitido ? "" : NEGADA });
    await reconciliar(notificacoes, permitido);
  });
}

export function agendarNotificacaoDeTeste(): Promise<void> {
  if (!__DEV__) return Promise.resolve();
  return executar(async () => {
    const notificacoes = await api();
    if (!await lerPreferencia() || !await temPermissao(notificacoes)) throw new Error("Ative os lembretes primeiro");
    const plano = (await listarPlanos())[0];
    if (!plano) {
      atualizar({ erro: "Salve um planejamento antes de testar a notificação." });
      return;
    }
    const horario = new Date(Date.now() + 10_000);
    await notificacoes.scheduleNotificationAsync({
      identifier: `${PREFIXO_LEMBRETES}teste`,
      content: { title: TITULO, body: "Teste: toque para abrir seu planejamento salvo.", sound: "default", data: { origem: CANAL_LEMBRETES, dataPlano: plano.data, agendadoPara: horario.getTime(), teste: true } },
      trigger: { type: notificacoes.SchedulableTriggerInputTypes.DATE, date: horario, channelId: CANAL_LEMBRETES, delivery: "bestEffort" },
    });
  });
}

export function observarToquesNotificacoes(abrirData: (data: string) => void): () => void {
  if (Platform.OS !== "android") return () => {};
  let ativo = true;
  let remover: (() => void) | undefined;
  void api().then((notificacoes) => {
    if (!ativo) return;
    notificacoes.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
    const tratar = (resposta: NotificationResponse) => {
      if (!ativo || resposta.actionIdentifier !== notificacoes.DEFAULT_ACTION_IDENTIFIER) return;
      const { notification } = resposta;
      if (!gerenciada(notification.request)) return;
      const data = dataDoLembrete(notification.request.content.data);
      const chave = `${notification.request.identifier}:${notification.date}:${resposta.actionIdentifier}`;
      if (!data || respostasTratadas.has(chave)) return;
      respostasTratadas.add(chave);
      notificacoes.clearLastNotificationResponse();
      abrirData(data);
    };
    const assinatura = notificacoes.addNotificationResponseReceivedListener(tratar);
    remover = () => assinatura.remove();
    const ultima = notificacoes.getLastNotificationResponse();
    if (ultima) tratar(ultima);
  }).catch(() => {
    if (ativo) atualizar({ erro: "Não foi possível iniciar as notificações. Use uma versão Android compilada com o módulo de notificações." });
  });
  return () => { ativo = false; remover?.(); };
}

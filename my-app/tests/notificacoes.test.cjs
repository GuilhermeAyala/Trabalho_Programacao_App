const { test } = require("node:test");
const assert = require("node:assert/strict");
const { modulos } = require("./carregarModulo.cjs");
process.env.TZ = "America/Sao_Paulo";

function ambiente({ plataforma = "android", desenvolvimento = true } = {}) {
  const dados = new Map();
  const pendentes = new Map();
  const ouvintes = new Set();
  const controle = { concedida: true, podePedir: true, aceitar: true, pedidos: 0, agendamentos: 0, falharAgendamento: false, falharCancelamento: false, bloqueado: false, ultima: null, agora: Date.parse("2026-11-16T06:00:00-03:00") };
  class Relogio extends Date {
    constructor(...args) { super(...(args.length ? args : [controle.agora])); }
    static now() { return controle.agora; }
  }
  const nativo = {
    AndroidImportance: { DEFAULT: 3, NONE: 0 },
    SchedulableTriggerInputTypes: { DATE: "date" },
    DEFAULT_ACTION_IDENTIFIER: "default",
    async setNotificationChannelAsync() {},
    async getNotificationChannelAsync() { return { importance: controle.bloqueado ? 0 : 3 }; },
    async getPermissionsAsync() { return { granted: controle.concedida, canAskAgain: controle.podePedir }; },
    async requestPermissionsAsync() { controle.pedidos++; controle.concedida = controle.aceitar; return { granted: controle.concedida }; },
    async getAllScheduledNotificationsAsync() { return [...pendentes.values()]; },
    async cancelScheduledNotificationAsync(id) { if (controle.falharCancelamento) throw new Error("cancelamento"); pendentes.delete(id); },
    async scheduleNotificationAsync(requisicao) { if (controle.falharAgendamento) throw new Error("agendamento"); controle.agendamentos++; pendentes.set(requisicao.identifier, requisicao); return requisicao.identifier; },
    setNotificationHandler(handler) { controle.handler = handler; },
    addNotificationResponseReceivedListener(fn) { ouvintes.add(fn); return { remove: () => ouvintes.delete(fn) }; },
    getLastNotificationResponse: () => controle.ultima,
    clearLastNotificationResponse() { controle.ultima = null; },
  };
  const storage = { getItem: async chave => dados.get(chave) ?? null, setItem: async (chave, valor) => { dados.set(chave, valor); } };
  const mocks = { "react-native": { Platform: { OS: plataforma } }, "@react-native-async-storage/async-storage": storage, "expo-notifications": nativo };
  const globais = { Date: Relogio, __DEV__: desenvolvimento };
  const carregar = modulos(mocks, globais);
  const notificacoes = carregar("src/services/notificacoes.ts");
  const planos = carregar("src/services/planejamento.ts");
  const utils = carregar("src/utils/lembretes.ts");
  const progresso = carregar("src/utils/progressoSemanal.ts").calcularProgressoSemanal;
  const refeicoes = { cafeDaManha: null, almoco: { id: "1", nome: "Frango" }, jantar: null };
  const salvar = data => planos.salvarPlano({ data, refeicoes });
  const reiniciar = () => modulos(mocks, globais)("src/services/notificacoes.ts");
  return { dados, pendentes, ouvintes, controle, nativo, notificacoes, planos, utils, progresso, salvar, refeicoes, reiniciar };
}
const flush = () => new Promise(setImmediate);

test("inicialização não pede permissão nem habilita lembretes por padrão", async () => {
  const a = ambiente();
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.controle.pedidos, 0);
  assert.equal(a.notificacoes.obterEstadoNotificacoes().habilitado, false);
  assert.equal(a.pendentes.size, 0);
});

test("datas locais: antes das 7h, às 7h, depois, passado, amanhã, mês/ano e fusos", () => {
  const { utils } = ambiente();
  assert.equal(utils.horarioDoLembrete("2026-11-16", new Date("2026-11-16T06:59:59-03:00")).getHours(), 7);
  assert.equal(utils.horarioDoLembrete("2026-11-16", new Date("2026-11-16T07:00:00-03:00")), null);
  assert.equal(utils.horarioDoLembrete("2026-11-16", new Date("2026-11-16T08:00:00-03:00")), null);
  assert.equal(utils.horarioDoLembrete("2026-11-15", new Date("2026-11-16T06:00:00-03:00")), null);
  assert.equal(utils.horarioDoLembrete("2026-02-30", new Date()), null);
  for (const fuso of ["UTC", "America/Sao_Paulo", "America/New_York", "Pacific/Kiritimati"]) {
    process.env.TZ = fuso;
    const alvo = utils.horarioDoLembrete("2027-01-01", new Date(2026, 11, 31, 23));
    assert.equal(alvo.getHours(), 7, fuso);
    assert.equal(alvo.getDate(), 1, fuso);
  }
  process.env.TZ = "America/Sao_Paulo";
});

test("uma notificação por data salva; edição e sincronizações simultâneas são idempotentes", async () => {
  const a = ambiente();
  await a.salvar("2026-11-15");
  await a.salvar("2026-11-16");
  await a.planos.salvarPlano({ data: "2026-11-17", refeicoes: { cafeDaManha: a.refeicoes.almoco, almoco: a.refeicoes.almoco, jantar: a.refeicoes.almoco } });
  await a.notificacoes.definirNotificacoes(true);
  assert.equal(a.pendentes.size, 2);
  assert.equal(a.controle.agendamentos, 2);
  for (const requisicao of a.pendentes.values()) {
    assert.equal(requisicao.trigger.date.getHours(), 7);
    assert.equal(requisicao.trigger.channelId, "planejamento-diario");
    assert.equal(requisicao.trigger.delivery, "bestEffort");
    assert.equal(requisicao.content.title, "Planeja Sua Fome 🥗");
    assert.equal(requisicao.content.body, "Bom dia! Você tem refeições planejadas para hoje. Confira seu cardápio!");
  }
  await a.salvar("2026-11-17");
  await Promise.all(Array.from({ length: 3 }, () => a.notificacoes.sincronizarNotificacoes()));
  assert.equal(a.controle.agendamentos, 2);
  const duplicada = { ...a.pendentes.get("planejamento-diario:2026-11-17"), identifier: "planejamento-diario:duplicada" };
  a.pendentes.set(duplicada.identifier, duplicada);
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 2);
});

test("evento de commit sincroniza save/delete; cancelamento e rascunhos não alteram agendamentos", async () => {
  const a = ambiente();
  a.planos.observarAlteracoesPlanos(() => { void a.notificacoes.sincronizarNotificacoes(); });
  await a.notificacoes.definirNotificacoes(true);
  const rascunho = { data: "2026-11-17", refeicoes: a.refeicoes };
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 0);
  await a.planos.salvarPlano(rascunho);
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 1);
  // Canceling the UI confirmation does not call excluirPlano.
  await a.planos.listarPlanos();
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 1);
  await a.planos.excluirPlano(rascunho.data);
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 0);
});

test("desativar/reativar e reiniciar preservam planos, progresso e notificações alheias", async () => {
  const a = ambiente();
  await a.salvar("2026-11-17");
  const bancoAntes = JSON.stringify(await a.planos.listarPlanos());
  const progressoAntes = a.progresso(await a.planos.listarPlanos(), new Date(2026, 10, 16)).diasPlanejados;
  a.pendentes.set("outro-recurso", { identifier: "outro-recurso", content: { data: { origem: "outra" } } });
  await a.notificacoes.definirNotificacoes(true);
  await a.notificacoes.definirNotificacoes(false);
  assert.equal(a.pendentes.size, 1);
  assert.equal(a.pendentes.has("outro-recurso"), true);
  assert.equal(a.dados.get(a.notificacoes.CHAVE_NOTIFICACOES), "false");
  await a.notificacoes.definirNotificacoes(true);
  const reiniciado = a.reiniciar();
  await reiniciado.sincronizarNotificacoes();
  assert.equal(reiniciado.obterEstadoNotificacoes().habilitado, true);
  assert.equal(a.pendentes.size, 2);
  assert.equal(a.controle.agendamentos, 2);
  assert.equal(JSON.stringify(await a.planos.listarPlanos()), bancoAntes);
  assert.equal(a.progresso(await a.planos.listarPlanos(), new Date(2026, 10, 16)).diasPlanejados, progressoAntes);
});

test("permissão negada, revogada ou canal bloqueado não indicam lembretes ativos", async () => {
  const a = ambiente();
  await a.salvar("2026-11-17");
  a.controle.concedida = false;
  a.controle.aceitar = false;
  await a.notificacoes.definirNotificacoes(true);
  assert.equal(a.controle.pedidos, 1);
  assert.equal(a.notificacoes.obterEstadoNotificacoes().habilitado, false);
  assert.equal(a.notificacoes.obterEstadoNotificacoes().permissaoNegada, true);
  a.controle.podePedir = false;
  await a.notificacoes.definirNotificacoes(true);
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.controle.pedidos, 1);
  assert.equal(a.pendentes.size, 0);
  a.controle.concedida = true;
  await a.notificacoes.definirNotificacoes(true);
  assert.equal(a.pendentes.size, 1);
  a.controle.bloqueado = true;
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.notificacoes.obterEstadoNotificacoes().habilitado, false);
  assert.equal(a.pendentes.size, 0);
  assert.equal((await a.planos.listarPlanos()).length, 1);
});

test("falhas de agendamento/cancelamento não desfazem o commit ou alteram progresso", async () => {
  const a = ambiente();
  a.planos.observarAlteracoesPlanos(() => { void a.notificacoes.sincronizarNotificacoes(); });
  await a.notificacoes.definirNotificacoes(true);
  a.controle.falharAgendamento = true;
  await a.salvar("2026-11-17");
  await a.notificacoes.sincronizarNotificacoes();
  assert.ok(a.notificacoes.obterEstadoNotificacoes().erro);
  assert.equal(a.progresso(await a.planos.listarPlanos(), new Date(2026, 10, 16)).diasPlanejados, 1);
  a.controle.falharAgendamento = false;
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 1);
  a.controle.falharCancelamento = true;
  await a.planos.excluirPlano("2026-11-17");
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal((await a.planos.listarPlanos()).length, 0);
  assert.ok(a.notificacoes.obterEstadoNotificacoes().erro);
  a.controle.falharCancelamento = false;
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 0);
});

test("mudança de fuso substitui horário antigo; hoje às 7h não é reagendado", async () => {
  const a = ambiente();
  await a.salvar("2026-11-17");
  await a.notificacoes.definirNotificacoes(true);
  const anterior = a.pendentes.get("planejamento-diario:2026-11-17").trigger.date.getTime();
  try {
    process.env.TZ = "America/New_York";
    await a.notificacoes.sincronizarNotificacoes();
    const atual = a.pendentes.get("planejamento-diario:2026-11-17").trigger.date;
    assert.equal(atual.getHours(), 7);
    assert.notEqual(atual.getTime(), anterior);
    assert.equal(a.pendentes.size, 1);
    a.controle.agora = new Date(2026, 10, 17, 7).getTime();
    await a.notificacoes.sincronizarNotificacoes();
    assert.equal(a.pendentes.size, 0);
  } finally { process.env.TZ = "America/Sao_Paulo"; }
});

test("toques abertos/a frio compartilham deduplicação, data válida e limpeza da resposta", async () => {
  const a = ambiente();
  await a.salvar("2026-11-17");
  await a.notificacoes.definirNotificacoes(true);
  const resposta = { actionIdentifier: "default", notification: { date: 123, request: a.pendentes.get("planejamento-diario:2026-11-17") } };
  a.controle.ultima = resposta;
  const datas = [];
  const parar = a.notificacoes.observarToquesNotificacoes(data => datas.push(data));
  await flush();
  assert.deepEqual(datas, ["2026-11-17"]);
  assert.equal(a.controle.ultima, null);
  for (const fn of a.ouvintes) fn(resposta);
  assert.equal(datas.length, 1);
  await a.planos.excluirPlano("2026-11-17");
  for (const fn of a.ouvintes) fn({ ...resposta, notification: { ...resposta.notification, date: 124 } });
  assert.equal(datas.length, 2); // The screen can show the missing-plan message for an already delivered reminder.
  parar();
  assert.equal(a.ouvintes.size, 0);
  const comportamento = await a.controle.handler.handleNotification();
  assert.equal(comportamento.shouldShowBanner, true);
});

test("teste de 10 segundos é exclusivo do desenvolvimento e não modifica planos", async () => {
  const a = ambiente();
  await a.salvar("2026-11-17");
  await a.notificacoes.definirNotificacoes(true);
  const antes = JSON.stringify(await a.planos.listarPlanos());
  await a.notificacoes.agendarNotificacaoDeTeste();
  await a.notificacoes.agendarNotificacaoDeTeste();
  const teste = a.pendentes.get("planejamento-diario:teste");
  assert.equal(teste.trigger.date.getTime(), a.controle.agora + 10_000);
  assert.equal(teste.content.data.dataPlano, "2026-11-17");
  assert.equal(a.pendentes.size, 2); // One daily reminder plus the separate development probe.
  await a.notificacoes.sincronizarNotificacoes();
  assert.equal(a.pendentes.size, 2);
  assert.equal(JSON.stringify(await a.planos.listarPlanos()), antes);
  const producao = ambiente({ desenvolvimento: false });
  await producao.notificacoes.agendarNotificacaoDeTeste();
  assert.equal(producao.pendentes.size, 0);
});

test("web não importa a API nativa nem altera planos ou preferências", async () => {
  const carregar = modulos({ "react-native": { Platform: { OS: "web" } }, "@react-native-async-storage/async-storage": {}, "./planejamento": {} });
  const servico = carregar("src/services/notificacoes.ts");
  await servico.sincronizarNotificacoes();
  await servico.definirNotificacoes(true);
  assert.equal(servico.obterEstadoNotificacoes().disponivel, false);
  assert.equal(servico.obterEstadoNotificacoes().habilitado, false);
});

test("registro vazio salvo não gera lembrete; preferência inválida não é sobrescrita", async () => {
  const a = ambiente();
  a.dados.set(a.planos.CHAVES_PLANEJAMENTO.atual, JSON.stringify({ versao: 2, planos: { "2026-11-17": { refeicoes: { cafeDaManha: null, almoco: null, jantar: null }, atualizadoEm: "2026-11-16T12:00:00Z" } }, receitas: {} }));
  await a.notificacoes.definirNotificacoes(true);
  assert.equal(a.pendentes.size, 0);
  a.dados.set(a.notificacoes.CHAVE_NOTIFICACOES, "corrompida");
  await a.notificacoes.sincronizarNotificacoes();
  assert.ok(a.notificacoes.obterEstadoNotificacoes().erro);
  assert.equal(a.notificacoes.obterEstadoNotificacoes().habilitado, false);
  assert.equal(a.dados.get(a.notificacoes.CHAVE_NOTIFICACOES), "corrompida");
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { modulos } = require("./carregarModulo.cjs");

const carregar = modulos();
const { refeicoesVazias } = carregar("src/types/planejamento.ts");
const { calcularProgressoSemanal: progresso } = carregar("src/utils/progressoSemanal.ts");
const receita = { id: "1", nome: "Frango", imagemUrl: "https://example.com/frango.jpg" };
function plano(data, refeicoes = { ...refeicoesVazias(), almoco: receita }) {
  return { data, refeicoes, atualizadoEm: "2026-11-18T12:00:00.000Z" };
}
const referencia = new Date(2026, 10, 18, 12);
const semana = Array.from({ length: 7 }, (_, i) => plano(`2026-11-${15 + i}`));

const cenarios = [
  ["nenhum plano", [], 0],
  ["uma segunda salva", [semana[1]], 1],
  ["segunda com três refeições conta uma vez", [plano("2026-11-16", { cafeDaManha: receita, almoco: receita, jantar: receita })], 1],
  ["três datas distintas", semana.slice(0, 3), 3],
  ["sete datas", semana, 7],
  ["semana anterior e seguinte excluídas", [plano("2026-11-14"), plano("2026-11-22")], 0],
  ["data duplicada", [semana[0], semana[0]], 1],
  ["plano vazio excluído", [plano("2026-11-16", refeicoesVazias())], 0],
  ["data inválida excluída", [plano("2026-02-30")], 0],
];
for (const [nome, planos, esperado] of cenarios) test(`progresso: ${nome}`, () => {
  const resultado = progresso(planos, referencia);
  assert.equal(resultado.diasPlanejados, esperado);
  assert.equal(resultado.totalDias, 7);
  assert.equal(resultado.percentual, esperado / 7 * 100);
});

test("limites de domingo e sábado e semanas entre meses/anos em fusos locais", () => {
  const anterior = process.env.TZ;
  try {
    for (const fuso of ["UTC", "America/Sao_Paulo", "America/New_York", "Pacific/Kiritimati"]) {
      process.env.TZ = fuso;
      assert.equal(progresso(semana, new Date(2026, 10, 15, 0, 0)).diasPlanejados, 7, fuso);
      assert.equal(progresso(semana, new Date(2026, 10, 21, 23, 59, 59)).diasPlanejados, 7, fuso);
      assert.equal(progresso(semana, new Date(2026, 10, 22, 0, 0)).diasPlanejados, 0, fuso);
      assert.equal(progresso([plano("2026-11-29"), plano("2026-12-05"), plano("2026-12-06")], new Date(2026, 11, 2)).diasPlanejados, 2, fuso);
      assert.equal(progresso([plano("2025-12-28"), plano("2026-01-03"), plano("2026-01-04")], new Date(2026, 0, 1)).diasPlanejados, 2, fuso);
      assert.equal(progresso([plano("2026-03-08"), plano("2026-03-14"), plano("2026-03-07")], new Date(2026, 2, 8, 23, 59)).diasPlanejados, 2, fuso);
    }
  } finally {
    if (anterior === undefined) delete process.env.TZ;
    else process.env.TZ = anterior;
  }
});

test("plano de segunda 16 conta no domingo 15 de novembro", () => {
  assert.equal(progresso([plano("2026-11-16")], new Date(2026, 10, 15, 12)).diasPlanejados, 1);
});

function armazenamento() {
  const dados = new Map();
  const controle = { falharLeitura: false, falharEscrita: false };
  const storage = {
    async getItem(chave) { if (controle.falharLeitura) throw new Error("Falha de leitura"); await new Promise(setImmediate); return dados.get(chave) ?? null; },
    async setItem(chave, valor) { if (controle.falharEscrita) throw new Error("Falha de escrita"); await new Promise(setImmediate); dados.set(chave, valor); },
  };
  const carregar = modulos({ "@react-native-async-storage/async-storage": storage });
  return { dados, controle, storage, servico: carregar("src/services/planejamento.ts") };
}

test("salvar/editar sem duplicar, excluir, reiniciar e escritas simultâneas", async () => {
  const { dados, storage, servico } = armazenamento();
  let notificacoes = 0;
  const parar = servico.observarPlanos(() => notificacoes++);
  await Promise.all(semana.slice(0, 3).map(servico.salvarPlano));
  assert.equal(progresso(await servico.listarPlanos(), referencia).diasPlanejados, 3);
  await servico.salvarPlano(plano("2026-11-16", { ...refeicoesVazias(), jantar: receita }));
  assert.equal((await servico.listarPlanos()).length, 3);
  assert.equal((await servico.buscarPlano("2026-11-16")).refeicoes.almoco, null);
  const reiniciado = modulos({ "@react-native-async-storage/async-storage": storage })("src/services/planejamento.ts");
  assert.equal(progresso(await reiniciado.listarPlanos(), referencia).diasPlanejados, 3);
  await servico.excluirPlano("2026-11-17");
  assert.equal(progresso(await servico.listarPlanos(), referencia).diasPlanejados, 2);
  assert.equal(await servico.buscarPlano("2026-11-17"), null);
  assert.ok(notificacoes > 0);
  const banco = JSON.parse(dados.get(servico.CHAVES_PLANEJAMENTO.atual));
  assert.equal(Object.keys(banco.receitas).length, 1);
  parar();
});

test("migração preserva os dados v1 e não ressuscita exclusões", async () => {
  const { dados, storage, servico } = armazenamento();
  const legado = JSON.stringify({ dias: { "2026-11-16": { almoco: "1" }, "2026-11-17": { jantar: "1" } }, receitas: { "1": { id: "1", nome: "Frango", imagem: null } } });
  dados.set(servico.CHAVES_PLANEJAMENTO.legado, legado);
  assert.equal((await servico.listarPlanos()).length, 2);
  assert.equal(dados.get(servico.CHAVES_PLANEJAMENTO.legado), legado);
  await servico.excluirPlano("2026-11-16");
  await servico.excluirPlano("2026-11-17");
  const reiniciado = modulos({ "@react-native-async-storage/async-storage": storage })("src/services/planejamento.ts");
  assert.equal((await reiniciado.listarPlanos()).length, 0);
});

test("dados inválidos e falhas não sobrescrevem planos; fila se recupera", async () => {
  const { dados, controle, servico } = armazenamento();
  await servico.salvarPlano(semana[0]);
  const original = dados.get(servico.CHAVES_PLANEJAMENTO.atual);
  await assert.rejects(servico.salvarPlano(plano("2026-11-17", refeicoesVazias())), /ao menos/);
  controle.falharEscrita = true;
  await assert.rejects(servico.salvarPlano(semana[1]), /escrita/);
  await assert.rejects(servico.excluirPlano(semana[0].data), /escrita/);
  assert.equal(dados.get(servico.CHAVES_PLANEJAMENTO.atual), original);
  controle.falharEscrita = false;
  controle.falharLeitura = true;
  await assert.rejects(servico.listarPlanos(), /leitura/);
  controle.falharLeitura = false;
  await servico.salvarPlano(semana[1]);
  assert.equal((await servico.listarPlanos()).length, 2);
  dados.set(servico.CHAVES_PLANEJAMENTO.atual, "{invalid");
  await assert.rejects(servico.salvarPlano(semana[2]), /preservados/);
  assert.equal(dados.get(servico.CHAVES_PLANEJAMENTO.atual), "{invalid");
});

test("falha na migração mantém a cópia antiga disponível para nova tentativa", async () => {
  const { dados, controle, servico } = armazenamento();
  dados.set(servico.CHAVES_PLANEJAMENTO.legado, JSON.stringify({ dias: { "2026-11-16": { almoco: "1" } }, receitas: { "1": { id: "1", nome: "Frango", imagem: null } } }));
  controle.falharEscrita = true;
  await assert.rejects(servico.listarPlanos(), /escrita/);
  assert.equal(dados.has(servico.CHAVES_PLANEJAMENTO.atual), false);
  controle.falharEscrita = false;
  assert.equal((await servico.listarPlanos()).length, 1);
});

test("rascunhos não afetam persistência, refeições de hoje ou progresso antes de Salvar", async () => {
  const { storage } = armazenamento();
  let slots = [], cursor = 0, efeitos = [], contexto, aceitar = false;
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useContext: () => contexto,
    useCallback: fn => fn,
    useState: inicial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof inicial === "function" ? inicial() : inicial; return [slots[i], valor => { slots[i] = typeof valor === "function" ? valor(slots[i]) : valor; }]; },
    useRef: valor => { const i = cursor++; return slots[i] ??= { current: valor }; },
    useEffect: efeito => { const i = cursor++; if (!(i in slots)) { slots[i] = true; efeitos.push(efeito); } },
  };
  const carregar = modulos({
    react,
    "react/jsx-runtime": { jsx: (tipo, props) => { contexto = props.value; return props; } },
    "react-native": { AppState: { addEventListener: () => ({ remove() {} }) } },
    "@react-native-async-storage/async-storage": storage,
    "../utils/confirmar": { confirmar: async () => aceitar },
  });
  const { PlanejamentoProvider } = carregar("src/contexts/PlanejamentoContext.tsx");
  const servico = carregar("src/services/planejamento.ts");
  const render = () => { cursor = 0; PlanejamentoProvider({ children: null }); return contexto; };
  render(); efeitos.forEach(fn => fn());
  await contexto.carregar();
  let ctx = render();
  const resumo = { id: "1", nome: "Frango", imagem: null };
  assert.equal(ctx.atribuir("2026-11-16", "almoco", resumo), true);
  ctx = render();
  assert.equal(ctx.alterado, true);
  assert.equal(ctx.planos.length, 0);
  assert.equal((await servico.listarPlanos()).length, 0);
  assert.equal(progresso(ctx.planos, referencia).diasPlanejados, 0);
  assert.equal(await ctx.podeSair(), false);
  assert.equal(render().alterado, true);
  assert.equal(await ctx.salvar("2026-11-16"), true);
  ctx = render();
  assert.equal(ctx.alterado, false);
  assert.equal(progresso(ctx.planos, referencia).diasPlanejados, 1);
  assert.equal(ctx.planos[0].refeicoes.almoco.nome, "Frango");
  ctx.atribuir("2026-11-16", "almoco", null); ctx = render();
  assert.equal(ctx.planos[0].refeicoes.almoco.nome, "Frango");
  assert.equal(await ctx.salvar("2026-11-16"), false);
  aceitar = true;
  assert.equal(await ctx.podeSair(), true);
  assert.equal(render().rascunho, null);
  assert.equal((await servico.buscarPlano("2026-11-16")).refeicoes.almoco.nome, "Frango");
});

test("confirmação Android: Cancelar preserva o plano; Excluir depende de confirmação", async () => {
  const { servico } = armazenamento();
  await servico.salvarPlano(semana[0]);
  let botoes;
  const confirmar = modulos({ "react-native": { Platform: { OS: "android" }, Alert: { alert: (titulo, texto, acoes) => { botoes = acoes; } } } })("src/utils/confirmar.ts").confirmar;
  const cancelamento = confirmar("Excluir planejamento?", "Mensagem", "Excluir");
  botoes[0].onPress();
  if (await cancelamento) await servico.excluirPlano(semana[0].data);
  assert.equal((await servico.listarPlanos()).length, 1);
  const exclusao = confirmar("Excluir planejamento?", "Mensagem", "Excluir");
  botoes[1].onPress();
  if (await exclusao) await servico.excluirPlano(semana[0].data);
  assert.equal((await servico.listarPlanos()).length, 0);
});

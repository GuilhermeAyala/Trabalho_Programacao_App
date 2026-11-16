import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { excluirPlano, listarPlanos, observarPlanos, salvarPlano } from "../services/planejamento";
import { dataValida, refeicoesVazias, tipoRefeicaoValido, type PlanoDiario, type RefeicoesDoDia, type TipoRefeicao } from "../types/planejamento";
import type { ReceitaResumo } from "../types/receita";
import { confirmar } from "../utils/confirmar";

type Rascunho = { data: string; refeicoes: RefeicoesDoDia; originais: RefeicoesDoDia };
const mudou = (rascunho: Rascunho | null) => rascunho !== null && JSON.stringify(rascunho.refeicoes) !== JSON.stringify(rascunho.originais);
const mensagemErro = (erro: unknown) => erro instanceof Error ? erro.message : "Não foi possível acessar o planejamento. Tente novamente.";

type Contexto = {
  planos: PlanoDiario[];
  rascunho: Rascunho | null;
  alterado: boolean;
  pronto: boolean;
  salvando: boolean;
  erro: string;
  agora: Date;
  carregar: () => Promise<void>;
  atualizarData: () => void;
  atribuir: (data: string, tipo: TipoRefeicao, receita: ReceitaResumo | null) => boolean;
  salvar: (data: string) => Promise<boolean>;
  excluir: (data: string) => Promise<boolean>;
  podeSair: () => Promise<boolean>;
};
const ContextoPlanejamento = createContext<Contexto | null>(null);

export function PlanejamentoProvider({ children }: { children: ReactNode }) {
  const [planos, setPlanos] = useState<PlanoDiario[]>([]);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [agora, setAgora] = useState(() => new Date());
  const ocupado = useRef(false);
  const rascunhoAtual = useRef<Rascunho | null>(null);
  const confirmando = useRef(false);
  const atualizarData = useCallback(() => setAgora(new Date()), []);

  const carregar = useCallback(() => listarPlanos().then(() => {
    setPronto(true);
    setErro("");
  }).catch((falha: unknown) => {
    setPronto(false);
    setErro(mensagemErro(falha));
  }), []);

  useEffect(() => {
    const parar = observarPlanos(setPlanos);
    void carregar();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        atualizarData();
        void carregar();
      }
    });
    return () => { parar(); assinatura.remove(); };
  }, [carregar, atualizarData]);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    function agendar() {
      const atual = new Date();
      const proximoDia = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + 1);
      temporizador = setTimeout(() => { atualizarData(); agendar(); }, proximoDia.getTime() - atual.getTime() + 100);
    }
    agendar();
    return () => clearTimeout(temporizador);
  }, [atualizarData, agora]);

  const definirRascunho = useCallback((valor: Rascunho | null) => {
    rascunhoAtual.current = valor;
    setRascunho(valor);
  }, []);

  function atribuir(data: string, tipo: TipoRefeicao, receita: ReceitaResumo | null) {
    if (!pronto || ocupado.current || !dataValida(data) || !tipoRefeicaoValido(tipo)) return false;
    const anterior = rascunhoAtual.current;
    if (anterior && anterior.data !== data && mudou(anterior)) return false;
    const salvo = planos.find((plano) => plano.data === data)?.refeicoes ?? refeicoesVazias();
    const base = anterior?.data === data ? anterior : { data, refeicoes: salvo, originais: salvo };
    definirRascunho({ ...base, refeicoes: { ...base.refeicoes, [tipo]: receita ? { id: receita.id, nome: receita.nome, ...(receita.imagem ? { imagemUrl: receita.imagem } : {}) } : null } });
    setErro("");
    return true;
  }

  async function salvar(data: string) {
    if (!pronto || ocupado.current) return false;
    ocupado.current = true;
    setSalvando(true);
    setErro("");
    const edicao = rascunhoAtual.current;
    const refeicoes = edicao?.data === data ? edicao.refeicoes : planos.find((plano) => plano.data === data)?.refeicoes ?? refeicoesVazias();
    try {
      await salvarPlano({ data, refeicoes });
      definirRascunho(null);
      return true;
    } catch (falha) {
      setErro(mensagemErro(falha));
      return false;
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  async function excluir(data: string) {
    if (!pronto || ocupado.current) return false;
    ocupado.current = true;
    setSalvando(true);
    setErro("");
    try {
      await excluirPlano(data);
      if (rascunhoAtual.current?.data === data) definirRascunho(null);
      return true;
    } catch (falha) {
      setErro(mensagemErro(falha));
      return false;
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  const podeSair = useCallback(async () => {
    if (ocupado.current || confirmando.current) return false;
    if (!mudou(rascunhoAtual.current)) { definirRascunho(null); return true; }
    confirmando.current = true;
    try {
      const descartar = await confirmar("Descartar alterações?", "Você tem alterações não salvas. Deseja descartá-las e continuar?", "Descartar");
      if (descartar) definirRascunho(null);
      return descartar;
    } finally { confirmando.current = false; }
  }, [definirRascunho]);

  return <ContextoPlanejamento.Provider value={{ planos, rascunho, alterado: mudou(rascunho), pronto, salvando, erro, agora, carregar, atualizarData, atribuir, salvar, excluir, podeSair }}>{children}</ContextoPlanejamento.Provider>;
}

export function usePlanejamento() {
  const contexto = useContext(ContextoPlanejamento);
  if (!contexto) throw new Error("PlanejamentoProvider ausente");
  return contexto;
}

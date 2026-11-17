import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { usePlanejamento } from "../contexts/PlanejamentoContext";
import { useSincronizarNotificacoes } from "../hooks/useNotificacoes";
import { observarToquesNotificacoes } from "../services/notificacoes";

export default function ObservadorNotificacoes() {
  const roteador = useRouter();
  const navegacao = useRootNavigationState();
  const { podeSair, salvando } = usePlanejamento();
  const [dataPendente, setDataPendente] = useState<string | null>(null);
  useSincronizarNotificacoes();
  useEffect(() => observarToquesNotificacoes(setDataPendente), []);
  useEffect(() => {
    if (!navegacao?.key || !dataPendente || salvando) return;
    let ativo = true;
    void podeSair().then((permitido) => {
      if (!ativo) return;
      setDataPendente(null);
      if (permitido) roteador.push({ pathname: "/planejamento", params: { data: dataPendente, lembrete: "1" } });
    });
    return () => { ativo = false; };
  }, [navegacao?.key, dataPendente, podeSair, roteador, salvando]);
  return null;
}

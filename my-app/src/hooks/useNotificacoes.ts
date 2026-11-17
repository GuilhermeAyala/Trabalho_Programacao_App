import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { observarAlteracoesPlanos } from "../services/planejamento";
import { obterEstadoNotificacoes, observarEstadoNotificacoes, sincronizarNotificacoes } from "../services/notificacoes";

export function useEstadoNotificacoes() {
  return useSyncExternalStore(observarEstadoNotificacoes, obterEstadoNotificacoes, obterEstadoNotificacoes);
}

export function useSincronizarNotificacoes() {
  useEffect(() => {
    const sincronizar = () => { void sincronizarNotificacoes(); };
    const parar = observarAlteracoesPlanos(sincronizar);
    sincronizar();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") sincronizar();
    });
    return () => { parar(); assinatura.remove(); };
  }, []);
}

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { usePlanejamento } from "../contexts/PlanejamentoContext";

export function useAtualizarPlanejamento() {
  const { carregar, atualizarData } = usePlanejamento();
  useFocusEffect(useCallback(() => {
    atualizarData();
    void carregar();
  }, [carregar, atualizarData]));
}

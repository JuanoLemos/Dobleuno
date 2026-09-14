/**
 * useDebounce — devuelve el valor recién después de que dejó de cambiar.
 *
 * El Codex busca server-side sobre 1796 reglas: sin esto, escribir "animosity"
 * son nueve requests y la respuesta de la primera letra puede llegar última y
 * pisar el resultado bueno.
 */
import { useEffect, useState } from 'react';

export function useDebounce<T>(valor: T, ms = 250): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return diferido;
}

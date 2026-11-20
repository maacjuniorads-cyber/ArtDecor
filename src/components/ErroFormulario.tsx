import { useCallback, useEffect, useState } from 'react';
import styles from './ErroFormulario.module.css';

export interface ErroEstado {
  texto: string;
  /** Muda a cada vez que o erro aparece (mesmo texto de novo = anima de novo). */
  vez: number;
}

/** Estado do erro de um formulário. setErro('') esconde. */
export function useErro() {
  const [erro, setEstado] = useState<ErroEstado | null>(null);
  const setErro = useCallback((texto: string) => setEstado(texto ? { texto, vez: Date.now() } : null), []);
  return [erro, setErro] as const;
}

/**
 * Balão de aviso que aparece logo acima do botão de salvar, na hora,
 * sem precisar rolar a tela. Some sozinho depois de alguns segundos.
 */
export function ErroFormulario({ erro, onFechar }: { erro: ErroEstado | null; onFechar: () => void }) {
  useEffect(() => {
    if (!erro) return;
    navigator.vibrate?.(60);
    const t = window.setTimeout(onFechar, 7000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erro?.vez]);

  if (!erro) return null;

  return (
    <div key={erro.vez} className={styles.balao} role="alert">
      <span className={styles.icone} aria-hidden="true">
        !
      </span>
      <span className={styles.texto}>{erro.texto}</span>
      <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

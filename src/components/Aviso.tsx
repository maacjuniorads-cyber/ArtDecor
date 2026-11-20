import { useEffect } from 'react';
import styles from './Aviso.module.css';

/** Faixa de aviso no topo (ex.: erro ao salvar). Some sozinha depois de alguns segundos. */
export function Aviso({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onFechar, 6000);
    return () => window.clearTimeout(t);
  }, [mensagem, onFechar]);

  return (
    <div className={styles.aviso} role="alert">
      <span>{mensagem}</span>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

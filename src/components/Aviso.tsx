import { useEffect } from 'react';
import styles from './Aviso.module.css';

export type TipoAviso = 'erro' | 'info' | 'sucesso';

/** Faixa de aviso no topo (erro ao salvar, sem internet, enviado...). Some sozinha depois de alguns segundos. */
export function Aviso({ mensagem, tipo = 'erro', onFechar }: { mensagem: string; tipo?: TipoAviso; onFechar: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onFechar, tipo === 'erro' ? 6000 : 7000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem]);

  return (
    <div className={styles.aviso} data-tipo={tipo} role={tipo === 'erro' ? 'alert' : 'status'}>
      <span>{mensagem}</span>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

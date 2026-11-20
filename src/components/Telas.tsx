import type { ReactNode } from 'react';
import styles from './Telas.module.css';

/** Moldura de tela cheia com o logo, usada no login, carregando e erros. */
export function TelaMarca({ children }: { children: ReactNode }) {
  return (
    <div className={styles.tela}>
      <p className={styles.logo}>ArtDecor</p>
      {children}
    </div>
  );
}

export function TelaCarregando() {
  return (
    <TelaMarca>
      <p className={styles.texto} role="status">
        Carregando…
      </p>
    </TelaMarca>
  );
}

export function TelaErro({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <TelaMarca>
      <div className={styles.caixa} role="alert">
        <p className={styles.titulo}>Não foi possível carregar os dados</p>
        <p className={styles.texto}>{navigator.onLine ? mensagem : 'Parece que o celular está sem internet.'}</p>
        <button type="button" className={styles.botao} onClick={onTentar}>
          Tentar de novo
        </button>
      </div>
    </TelaMarca>
  );
}

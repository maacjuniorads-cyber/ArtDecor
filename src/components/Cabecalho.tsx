import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './Cabecalho.module.css';

interface Props {
  titulo: string;
  /** Para onde voltar se não houver histórico (ex.: abriu o link direto). */
  voltarPara: string;
  extra?: ReactNode;
}

export function Cabecalho({ titulo, voltarPara, extra }: Props) {
  const navigate = useNavigate();
  const voltar = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(voltarPara);
  };
  return (
    <header className={styles.cabecalho}>
      <button type="button" className={styles.voltar} onClick={voltar} aria-label="Voltar">
        <Icon name="voltar" strokeWidth={2.2} />
      </button>
      <h1 className={styles.titulo}>{titulo}</h1>
      {extra}
    </header>
  );
}

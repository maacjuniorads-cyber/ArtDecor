import { Link } from 'react-router-dom';
import styles from './EmBreve.module.css';

export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 className={styles.titulo}>{titulo}</h1>
      <p className={styles.texto}>
        Não encontramos esta página. <Link to="/">Voltar ao início</Link>
      </p>
    </>
  );
}

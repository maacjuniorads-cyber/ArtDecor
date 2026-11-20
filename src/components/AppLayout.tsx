import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import styles from './AppLayout.module.css';

/** Telas principais: conteúdo + menu inferior. */
export function AppLayout() {
  return (
    <div className={styles.app}>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

/** Telas de formulário e detalhe: sem menu, com barra de ação própria no rodapé. */
export function TelaCheiaLayout() {
  return (
    <div className={styles.app}>
      <main className={styles.conteudoTelaCheia}>
        <Outlet />
      </main>
    </div>
  );
}

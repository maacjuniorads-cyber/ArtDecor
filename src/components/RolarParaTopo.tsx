import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Toda tela nova abre do topo (o navegador manteria a rolagem da tela anterior). */
export function RolarParaTopo() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Também ao voltar: o navegador não devolve a rolagem antiga.
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

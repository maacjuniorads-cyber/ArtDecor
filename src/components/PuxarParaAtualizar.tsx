import { useEffect, useRef, useState } from 'react';
import { appInstalado, ehIphone } from '@/lib/aparelho';
import styles from './PuxarParaAtualizar.module.css';

/** Quanto precisa puxar (px, já com a resistência) para atualizar ao soltar. */
const LIMITE = 70;
const MAXIMO = 110;

/**
 * "Puxar para atualizar" só no iPhone com o app instalado: lá a Apple tira o
 * gesto do navegador. (No Android o próprio Chrome já faz isso.)
 * Fica invisível; só aparece enquanto a pessoa puxa a tela do topo para baixo.
 */
export function PuxarParaAtualizar() {
  const [ligado] = useState(() => ehIphone() && appInstalado());
  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const atual = useRef(0);

  useEffect(() => {
    if (!ligado) return;

    const comecar = (e: TouchEvent) => {
      // Só a partir do topo da tela, com um dedo, e fora de janelas por cima (tutorial etc.).
      if (window.scrollY > 0 || e.touches.length !== 1 || atualizando) return;
      const t = e.touches[0];
      inicio.current = { x: t.clientX, y: t.clientY };
    };

    const mover = (e: TouchEvent) => {
      if (!inicio.current) return;
      const t = e.touches[0];
      const dy = t.clientY - inicio.current.y;
      const dx = Math.abs(t.clientX - inicio.current.x);
      // Arrastou para os lados ou para cima, ou a tela já rolou: não é "puxar".
      if (dy <= 0 || dx > dy || window.scrollY > 0) {
        inicio.current = null;
        atual.current = 0;
        setDistancia(0);
        return;
      }
      atual.current = Math.min(MAXIMO, dy * 0.5); // resistência: o dedo anda mais que a bolinha
      setDistancia(atual.current);
    };

    const soltar = () => {
      if (!inicio.current) return;
      inicio.current = null;
      if (atual.current >= LIMITE) {
        setAtualizando(true);
        setDistancia(LIMITE);
        // Avisa a abertura para ser rápida (quem atualizou não quer esperar o logo).
        try {
          sessionStorage.setItem('artdecor:atualizando', '1');
        } catch {
          // sem sessionStorage: abre com a abertura normal
        }
        window.setTimeout(() => window.location.reload(), 350);
      } else {
        setDistancia(0);
      }
      atual.current = 0;
    };

    window.addEventListener('touchstart', comecar, { passive: true });
    window.addEventListener('touchmove', mover, { passive: true });
    window.addEventListener('touchend', soltar);
    window.addEventListener('touchcancel', soltar);
    return () => {
      window.removeEventListener('touchstart', comecar);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', soltar);
      window.removeEventListener('touchcancel', soltar);
    };
  }, [ligado, atualizando]);

  if (!ligado || (distancia === 0 && !atualizando)) return null;

  const pronto = distancia >= LIMITE;
  return (
    <div
      className={styles.indicador}
      style={{ transform: `translate(-50%, ${distancia - 44}px)`, opacity: Math.min(1, distancia / 40) }}
      role="status"
      aria-live="polite"
    >
      <span className={styles.bolinha} data-girando={atualizando}>
        {atualizando ? (
          <span className={styles.roda} aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ transform: `rotate(${pronto ? 180 : 0}deg)` }}>
            <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={styles.texto}>{atualizando ? 'Atualizando…' : pronto ? 'Solte para atualizar' : 'Puxe para atualizar'}</span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import ui from '@/styles/ui.module.css';

/** Distância rolada (px) antes de esconder ou mostrar de novo — evita piscar com toques pequenos. */
const FOLGA = 40;

/**
 * Botão "+" flutuante (novo item, cliente, pedido…).
 * Para não poluir a tela: some enquanto ela rola a lista para baixo ou digita;
 * volta ao rolar para cima, no topo da tela ou ao chegar no fim da lista.
 */
export function BotaoNovo({ para, rotulo }: { para: string; rotulo: string }) {
  const escondido = useEscondeAoRolar();
  return (
    <Link to={para} className={ui.fab} aria-label={rotulo} data-tour="fab" data-escondido={escondido}>
      <Icon name="mais" size={28} strokeWidth={2.2} />
    </Link>
  );
}

function useEscondeAoRolar(): boolean {
  const [escondido, setEscondido] = useState(false);
  const escondidoRef = useRef(false);

  useEffect(() => {
    const mudar = (v: boolean) => {
      escondidoRef.current = v;
      setEscondido(v);
    };
    let ancora = window.scrollY;
    let quadro = 0;
    let digitando = false;

    const medir = () => {
      quadro = 0;
      const y = window.scrollY;
      const noFim = window.innerHeight + y >= document.documentElement.scrollHeight - 60;
      if (digitando) return;
      if (y < 80 || noFim) {
        ancora = y;
        if (escondidoRef.current) mudar(false);
        return;
      }
      if (!escondidoRef.current) {
        if (y - ancora > FOLGA) {
          mudar(true); // descendo
          ancora = y;
        } else if (y < ancora) ancora = y;
      } else if (ancora - y > FOLGA) {
        mudar(false); // subindo
        ancora = y;
      } else if (y > ancora) ancora = y;
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    const ehCampo = (alvo: EventTarget | null) => alvo instanceof HTMLElement && alvo.matches('input, textarea, select');
    // Digitando (busca, renomear…): o teclado já ocupa a tela, o "+" só atrapalha.
    const aoFocar = (e: FocusEvent) => {
      if (!ehCampo(e.target)) return;
      digitando = true;
      mudar(true);
    };
    const aoDesfocar = (e: FocusEvent) => {
      if (!ehCampo(e.target)) return;
      digitando = false;
      ancora = window.scrollY;
      mudar(false);
    };

    window.addEventListener('scroll', aoRolar, { passive: true });
    document.addEventListener('focusin', aoFocar);
    document.addEventListener('focusout', aoDesfocar);
    return () => {
      window.removeEventListener('scroll', aoRolar);
      document.removeEventListener('focusin', aoFocar);
      document.removeEventListener('focusout', aoDesfocar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return escondido;
}

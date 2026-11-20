import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUsuario } from '@/components/Autenticacao';
import { MensagemWhatsApp } from '@/components/MensagemWhatsApp';
import { useDados } from '@/data/store';
import { exemploLembrete, exemploNota } from '@/lib/mensagens';
import { ehExemplo, PEDIDO_EXEMPLO_TOUR } from '@/data/exemploTour';
import { passos, type ContextoTour } from './passos';
import styles from './Tour.module.css';

interface Api {
  iniciar: () => void;
  ativo: boolean;
}

const Contexto = createContext<Api | null>(null);

export function useTour(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error('useTour precisa estar dentro de <TourProvider>');
  return api;
}

interface Caixa {
  top: number;
  left: number;
  width: number;
  height: number;
}

const FOLGA = 6;

/** Tutorial guiado que passa pelas telas do app destacando cada parte. */
export function TourProvider({ children }: { children: ReactNode }) {
  const usuario = useUsuario();
  const { itens, pedidos, mostrarExemplo } = useDados();
  const navigate = useNavigate();
  const location = useLocation();

  const [indice, setIndice] = useState<number | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [procurando, setProcurando] = useState(false);
  const alvoRef = useRef<Element | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const jaIniciouAuto = useRef(false);

  const contexto: ContextoTour = useMemo(
    () => ({
      nome: usuario.nome,
      // Prefere as peças/pedido de EXEMPLO (sempre completos e iguais para todo mundo).
      primeiroItem: itens.find((i) => ehExemplo(i.id) && i.tipo === 'varios') ?? itens.find((i) => !i.removido),
      primeiroPedido:
        pedidos.find((p) => p.id === PEDIDO_EXEMPLO_TOUR) ??
        pedidos.find((p) => p.status === 'reservado') ??
        pedidos.find((p) => p.status === 'rua') ??
        pedidos.find((p) => p.status !== 'cancelado'),
    }),
    [usuario.nome, itens, pedidos],
  );

  // Durante o tutorial aparecem dados de exemplo (só na tela, nunca gravados).
  const iniciar = useCallback(() => {
    mostrarExemplo(true);
    setIndice(0);
  }, [mostrarExemplo]);

  const encerrar = useCallback(() => {
    setIndice(null);
    setCaixa(null);
    alvoRef.current = null;
    mostrarExemplo(false);
    usuario.marcarTutorialVisto();
    navigate('/');
  }, [navigate, usuario, mostrarExemplo]);

  // Primeira vez de cada pessoa: abre sozinho.
  useEffect(() => {
    if (usuario.tutorialVisto === false && !jaIniciouAuto.current) {
      jaIniciouAuto.current = true;
      iniciar();
    }
  }, [usuario.tutorialVisto, iniciar]);

  const passo = indice !== null ? passos[indice] : null;
  const rota = passo ? passo.rota(contexto) : null;

  // Ao mudar de passo: vai para a tela e procura a parte a destacar.
  useEffect(() => {
    if (!passo) return;
    alvoRef.current = null;
    setCaixa(null);

    if (rota && location.pathname + location.search !== rota) {
      navigate(rota);
      return; // o efeito roda de novo quando a tela trocar
    }
    if (!rota || !passo.alvo) {
      setProcurando(false);
      return;
    }

    setProcurando(true);
    let tentativas = 0;
    const timer = window.setInterval(() => {
      const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
      tentativas++;
      if (el) {
        window.clearInterval(timer);
        alvoRef.current = el;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setProcurando(false);
      } else if (tentativas > 20) {
        window.clearInterval(timer);
        setProcurando(false); // não achou: mostra o balão no meio
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [passo, rota, location.pathname, location.search, navigate]);

  // Acompanha a posição da parte destacada (rolagem, teclado, mudanças na tela).
  useEffect(() => {
    if (indice === null) return;
    let quadro = 0;
    const medir = () => {
      const el = alvoRef.current;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        setCaixa((c) =>
          c && c.top === r.top && c.left === r.left && c.width === r.width && c.height === r.height
            ? c
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      }
      quadro = requestAnimationFrame(medir);
    };
    quadro = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(quadro);
  }, [indice]);

  useLayoutEffect(() => {
    if (indice !== null && !procurando) botaoRef.current?.focus();
  }, [indice, procurando]);

  useEffect(() => {
    if (indice === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') encerrar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [indice, encerrar]);

  const api = useMemo<Api>(() => ({ iniciar, ativo: indice !== null }), [iniciar, indice]);

  const total = passos.length;
  const ultimo = indice === total - 1;
  const titulo = passo ? (typeof passo.titulo === 'function' ? passo.titulo(contexto) : passo.titulo) : '';
  // Balão embaixo quando a parte destacada está na metade de cima, e vice-versa.
  const balaoEmCima = caixa ? caixa.top + caixa.height / 2 > window.innerHeight / 2 : false;

  return (
    <Contexto.Provider value={api}>
      {children}
      {passo && (
        <div className={styles.camada}>
          {caixa ? (
            <div
              className={styles.foco}
              style={{
                top: caixa.top - FOLGA,
                left: caixa.left - FOLGA,
                width: caixa.width + FOLGA * 2,
                height: caixa.height + FOLGA * 2,
              }}
            />
          ) : (
            <div className={styles.escuro} />
          )}

          {!procurando && (
            <div
              className={`${styles.balao} ${caixa ? (balaoEmCima ? styles.emCima : styles.embaixo) : styles.meio}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-titulo"
              aria-describedby="tour-texto"
            >
              <div className={styles.progresso}>
                <span>
                  {indice! + 1} de {total}
                </span>
                <span className={styles.barra} aria-hidden="true">
                  <span style={{ width: `${((indice! + 1) / total) * 100}%` }} />
                </span>
              </div>
              <h2 id="tour-titulo" className={styles.titulo}>
                {titulo}
              </h2>
              <p id="tour-texto" className={styles.texto}>
                {passo.texto}
              </p>
              {passo.previa === 'lembrete' && (
                <div className={styles.previa}>
                  <MensagemWhatsApp texto={exemploLembrete()} />
                </div>
              )}
              {passo.previa === 'conflito' && (
                <div className={`${styles.previa} ${styles.exemploConflito}`} aria-label="Exemplo do aviso de conflito">
                  <span className={styles.exemploNome}>Painel redondo Unicórnio</span>
                  <span className={styles.exemploDetalhe}>Peça única · R$ 60,00</span>
                  <span className={styles.exemploAviso}>Já reservado nessas datas — #0012 Ana (21/11–23/11)</span>
                  <span className={styles.exemploNome}>Cilindro rosa</span>
                  <span className={styles.exemploDetalhe}>3 × R$ 15,00 = R$ 45,00</span>
                  <span className={styles.exemploAviso}>Só 1 livres nessas datas — #0012 Ana (21/11–23/11, 2 un.)</span>
                </div>
              )}
              {passo.previa === 'nota' && (
                <div className={styles.previa}>
                  <MensagemWhatsApp texto={exemploNota().texto} anexo={exemploNota().arquivo} />
                </div>
              )}
              <div className={styles.botoes}>
                {!ultimo && (
                  <button type="button" className={styles.pular} onClick={encerrar}>
                    Pular tutorial
                  </button>
                )}
                {indice! > 0 && (
                  <button type="button" className={styles.voltar} onClick={() => setIndice(indice! - 1)}>
                    Voltar
                  </button>
                )}
                <button
                  ref={botaoRef}
                  type="button"
                  className={styles.proximo}
                  onClick={() => (ultimo ? encerrar() : setIndice(indice! + 1))}
                >
                  {ultimo ? 'Começar a usar' : 'Próximo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Contexto.Provider>
  );
}

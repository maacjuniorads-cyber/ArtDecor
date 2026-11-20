import { useEffect, useState, type ReactNode } from 'react';
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

/** Quanto tempo a abertura fica na tela e quanto leva para sumir (ms). */
const ABERTURA_MS = 2400;
const SUMIR_MS = 600;
/** Abrindo direto em outra tela (aviso, recarregar): só um instante. */
const ABERTURA_RAPIDA_MS = 250;
const SUMIR_RAPIDO_MS = 300;

/**
 * Abertura do app: a tela do logo fica uns segundos ao abrir e some suavemente,
 * enquanto o app já carrega por baixo.
 */
export function Abertura() {
  // A abertura completa é só para quem abre o app no Início; nas outras telas, um instante.
  const [completa] = useState(() => {
    let atualizando = false;
    try {
      atualizando = sessionStorage.getItem('artdecor:atualizando') === '1';
      sessionStorage.removeItem('artdecor:atualizando');
    } catch {
      // sem sessionStorage
    }
    return window.location.pathname === '/' && !atualizando;
  });
  const [fase, setFase] = useState<'fonte' | 'mostrando' | 'saindo' | 'fim'>(completa ? 'fonte' : 'mostrando');

  // Espera a letra do logo (cursiva) carregar, para não aparecer numa letra comum e trocar.
  useEffect(() => {
    if (!completa) return;
    let ativo = true;
    const pronto = () => ativo && setFase((f) => (f === 'fonte' ? 'mostrando' : f));
    const limite = window.setTimeout(pronto, 1200);
    document.fonts?.load('64px "Great Vibes"').then(pronto, pronto);
    return () => {
      ativo = false;
      window.clearTimeout(limite);
    };
  }, [completa]);

  // Depois que o logo aparece: fica um tempo e some (não depende das fases seguintes).
  const logoVisivel = fase !== 'fonte';
  useEffect(() => {
    if (!logoVisivel) return;
    const mostrar = completa ? ABERTURA_MS : ABERTURA_RAPIDA_MS;
    const sumir = completa ? SUMIR_MS : SUMIR_RAPIDO_MS;
    const sair = window.setTimeout(() => setFase('saindo'), mostrar);
    const fim = window.setTimeout(() => setFase('fim'), mostrar + sumir);
    return () => {
      window.clearTimeout(sair);
      window.clearTimeout(fim);
    };
  }, [logoVisivel, completa]);

  if (fase === 'fim') return null;
  return (
    <div className={styles.abertura} data-saindo={fase === 'saindo'} data-rapida={!completa} aria-hidden={fase === 'saindo'}>
      {fase !== 'fonte' && <TelaCarregando />}
    </div>
  );
}

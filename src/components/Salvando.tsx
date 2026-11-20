import styles from './Salvando.module.css';

export type FaseSalvando = 'salvando' | 'lento' | 'guardado' | 'salvo';

/**
 * Cartão no meio da tela enquanto grava:
 * - salvando: girando
 * - lento: a internet está demorando
 * - guardado: sem internet, ficou no celular (vai depois)
 * - salvo: deu certo (só aparece se o "salvando" chegou a aparecer)
 */
export function Salvando({ fase }: { fase: FaseSalvando }) {
  const textos: Record<FaseSalvando, { titulo: string; texto?: string }> = {
    salvando: { titulo: 'Salvando…' },
    lento: { titulo: 'Salvando…', texto: 'A internet está lenta. Só um instante.' },
    guardado: {
      titulo: 'Guardado no celular',
      texto: navigator.onLine
        ? 'A internet não respondeu. Vai pro sistema sozinho assim que ela melhorar.'
        : 'Sem internet agora. Vai pro sistema sozinho quando a internet voltar.',
    },
    salvo: { titulo: 'Salvo!' },
  };
  const { titulo, texto } = textos[fase];
  const pronto = fase === 'guardado' || fase === 'salvo';

  return (
    <div className={styles.fundo} role="status" aria-live="polite">
      <div className={styles.cartao} data-fase={fase}>
        {pronto ? (
          <div className={styles.selo} aria-hidden="true">
            {fase === 'guardado' ? (
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="13" y="4" width="22" height="40" rx="4" />
                <path d="M21 38h6" />
                <path className={styles.marca} d="m18 22 4.5 4.5L31 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path className={styles.marca} d="m12 25 8 8 16-17" />
              </svg>
            )}
          </div>
        ) : (
          <div className={styles.girando} aria-hidden="true" />
        )}
        <p className={styles.titulo}>{titulo}</p>
        {texto && <p className={styles.texto}>{texto}</p>}
      </div>
    </div>
  );
}

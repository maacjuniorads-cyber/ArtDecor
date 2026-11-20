import { Fragment, type ReactNode } from 'react';
import styles from './MensagemWhatsApp.module.css';

/** Converte *negrito* e _itálico_ do WhatsApp em elementos. */
function formatar(linha: string): ReactNode[] {
  const partes = linha.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean);
  return partes.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*')) return <b key={i}>{p.slice(1, -1)}</b>;
    if (p.startsWith('_') && p.endsWith('_')) return <i key={i}>{p.slice(1, -1)}</i>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** Balão de mensagem no estilo do WhatsApp, para mostrar como o texto chega no cliente. */
export function MensagemWhatsApp({ texto, hora = '10:30' }: { texto: string; hora?: string }) {
  return (
    <div className={styles.fundo} aria-label="Exemplo de como a mensagem chega no WhatsApp do cliente">
      <div className={styles.balao}>
        {texto.split('\n').map((linha, i) => (linha === '' ? <div key={i} className={styles.espaco} /> : <div key={i}>{formatar(linha)}</div>))}
        <span className={styles.hora}>
          {hora} <span aria-hidden="true">✓✓</span>
        </span>
      </div>
    </div>
  );
}

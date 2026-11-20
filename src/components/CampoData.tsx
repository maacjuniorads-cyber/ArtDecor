import { useRef } from 'react';
import { Icon } from './Icon';
import { deISO, hojeISO, somarDias } from '@/lib/formato';
import ui from '@/styles/ui.module.css';
import styles from './CampoData.module.css';

const diaMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const diaMesAno = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });

/** "Amanhã · sábado", "Hoje · sexta-feira", "Segunda-feira". */
function legenda(iso: string): string {
  const hoje = hojeISO();
  const dia = semana.format(deISO(iso));
  if (iso === hoje) return `Hoje · ${dia}`;
  if (iso === somarDias(hoje, 1)) return `Amanhã · ${dia}`;
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

/**
 * Campo de data com a mesma cara no iPhone e no Android: ícone, data grande
 * ("21 de nov.") e o dia da semana embaixo. Por cima fica o campo de data
 * do próprio celular, invisível: ao tocar, abre o calendário nativo.
 */
export function CampoData({ rotulo, valor, min, onChange }: { rotulo: string; valor: string; min?: string; onChange: (iso: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const data = valor ? deISO(valor) : null;
  const doAno = data ? data.getFullYear() === new Date().getFullYear() : true;

  function abrir() {
    // No computador o calendário só abre pelo ícone; assim abre tocando em qualquer parte.
    try {
      ref.current?.showPicker?.();
    } catch {
      // alguns navegadores não deixam: o toque normal já abre
    }
  }

  return (
    <label className={ui.campo}>
      <span className={ui.rotulo}>{rotulo}</span>
      <span className={styles.caixa}>
        <Icon name="calendario" size={22} className={styles.icone} />
        <span className={styles.texto} aria-hidden="true">
          <span className={styles.dia}>{data ? (doAno ? diaMes : diaMesAno).format(data) : 'Escolher data'}</span>
          {data && <span className={styles.semana}>{legenda(valor)}</span>}
        </span>
        <input ref={ref} type="date" className={styles.nativo} value={valor} min={min} onChange={(e) => e.target.value && onChange(e.target.value)} onClick={abrir} />
      </span>
    </label>
  );
}

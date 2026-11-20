import type { ReactNode } from 'react';
import type { StatusPedido } from '@/types';
import styles from './Badge.module.css';

export type BadgeTom = 'reservado' | 'rua' | 'devolvido' | 'alerta';

export function Badge({ tom, children }: { tom: BadgeTom; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tom]}`}>{children}</span>;
}

export const rotuloStatus: Record<StatusPedido, string> = {
  reservado: 'Reservado',
  rua: 'Na rua',
  devolvido: 'Devolvido',
};

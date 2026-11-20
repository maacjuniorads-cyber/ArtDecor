import type { DataISO } from '@/types';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** Converte uma Date para "AAAA-MM-DD" no fuso local. */
export function paraISO(data: Date): DataISO {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

export function deISO(iso: DataISO): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function hojeISO(): DataISO {
  return paraISO(new Date());
}

export function somarDias(iso: DataISO, dias: number): DataISO {
  const data = deISO(iso);
  data.setDate(data.getDate() + dias);
  return paraISO(data);
}

const diaSemanaCurto = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

/** "hoje", "amanhã" ou "sáb". */
export function rotuloDia(iso: DataISO, hoje: DataISO = hojeISO()): string {
  if (iso === hoje) return 'hoje';
  if (iso === somarDias(hoje, 1)) return 'amanhã';
  return diaSemanaCurto.format(deISO(iso)).replace('.', '');
}

/** "quinta-feira, 19 de novembro" */
export function dataPorExtenso(iso: DataISO): string {
  return dataLonga.format(deISO(iso));
}

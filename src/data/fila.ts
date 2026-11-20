/**
 * Fila de envio para quando o celular está sem internet.
 *
 * Cada gravação vira uma "operação". Sem internet, ela fica guardada no
 * aparelho (localStorage) e aparece na tela como se já estivesse salva.
 * Quando a internet volta, as operações são enviadas ao banco NA MESMA ORDEM
 * em que foram feitas (ex.: cliente novo antes do pedido dele).
 */
import type { Cliente, Item, Pedido, StatusPedido, Tema } from '@/types';

export type Operacao =
  | { tipo: 'item'; item: Item }
  | { tipo: 'removerItem'; id: string }
  | { tipo: 'renomearCategoria'; de: string; para: string }
  | { tipo: 'tema'; tema: Tema }
  | { tipo: 'removerTema'; id: string }
  | { tipo: 'cliente'; cliente: Cliente }
  | { tipo: 'clientes'; clientes: Cliente[] }
  | { tipo: 'removerCliente'; id: string }
  | { tipo: 'pedido'; pedido: Pedido }
  | { tipo: 'status'; id: string; status: StatusPedido };

const CHAVE = 'artdecor:fila-envio';

export function lerFila(): Operacao[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Operacao[]) : [];
  } catch {
    return [];
  }
}

/** Grava a fila inteira. Devolve false se o aparelho não deixou guardar (memória cheia). */
export function gravarFila(fila: Operacao[]): boolean {
  try {
    if (fila.length === 0) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, JSON.stringify(fila));
    return true;
  } catch {
    return false;
  }
}

/** Erro de conexão (sem internet, sinal caiu, demorou demais) — e não um erro do banco. */
export function ehErroDeRede(e: unknown): boolean {
  if (!navigator.onLine) return true;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch') ||
    msg.includes('tempo esgotado')
  );
}

/** Desiste de esperar depois de alguns segundos (sinal fraco que nunca responde). */
export function comPrazo<T>(promessa: Promise<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('tempo esgotado')), ms);
    promessa.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Texto curto para avisos: "1 alteração" / "3 alterações". */
export function contarAlteracoes(n: number): string {
  return n === 1 ? '1 alteração' : `${n} alterações`;
}

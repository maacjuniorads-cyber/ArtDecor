/**
 * Estado do app. Enquanto não há back-end, os dados ficam no localStorage
 * do navegador (começando pelos dados de exemplo). Quando o back-end entrar,
 * só este arquivo muda — as telas continuam usando `useDados()`.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as exemplo from './exemplo';
import type { Cliente, Item, Pedido, StatusPedido, Tema } from '@/types';

interface Dados {
  itens: Item[];
  temas: Tema[];
  clientes: Cliente[];
  pedidos: Pedido[];
}

interface Api extends Dados {
  salvarItem: (item: Item) => void;
  removerItem: (itemId: string) => void;
  salvarTema: (tema: Tema) => void;
  salvarCliente: (cliente: Cliente) => void;
  salvarPedido: (pedido: Pedido) => void;
  mudarStatus: (pedidoId: string, status: StatusPedido) => void;
  proximoNumeroPedido: () => number;
  restaurarExemplo: () => void;
}

const CHAVE = 'artdecor:dados:v1';

function dadosDeExemplo(): Dados {
  return {
    itens: exemplo.itens,
    temas: exemplo.temas,
    clientes: exemplo.clientes,
    pedidos: exemplo.pedidos,
  };
}

function carregar(): Dados {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return JSON.parse(salvo) as Dados;
  } catch {
    // localStorage indisponível ou corrompido: segue com o exemplo
  }
  return dadosDeExemplo();
}

function upsert<T extends { id: string }>(lista: T[], registro: T): T[] {
  return lista.some((r) => r.id === registro.id)
    ? lista.map((r) => (r.id === registro.id ? registro : r))
    : [...lista, registro];
}

/** Id único. Não usa crypto.randomUUID porque ele não existe em http pela rede local. */
export function novoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const Contexto = createContext<Api | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(carregar);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch {
      // sem espaço ou bloqueado: os dados continuam em memória nesta sessão
    }
  }, [dados]);

  const api = useMemo<Api>(
    () => ({
      ...dados,
      salvarItem: (item) => setDados((d) => ({ ...d, itens: upsert(d.itens, item) })),
      removerItem: (itemId) =>
        setDados((d) => ({ ...d, itens: d.itens.map((i) => (i.id === itemId ? { ...i, removido: true } : i)) })),
      salvarTema: (tema) => setDados((d) => ({ ...d, temas: upsert(d.temas, tema) })),
      salvarCliente: (cliente) => setDados((d) => ({ ...d, clientes: upsert(d.clientes, cliente) })),
      salvarPedido: (pedido) => setDados((d) => ({ ...d, pedidos: upsert(d.pedidos, pedido) })),
      mudarStatus: (pedidoId, status) =>
        setDados((d) => ({
          ...d,
          pedidos: d.pedidos.map((p) => (p.id === pedidoId ? { ...p, status } : p)),
        })),
      proximoNumeroPedido: () => dados.pedidos.reduce((max, p) => Math.max(max, p.numero), 0) + 1,
      restaurarExemplo: () => setDados(dadosDeExemplo()),
    }),
    [dados],
  );

  return <Contexto.Provider value={api}>{children}</Contexto.Provider>;
}

export function useDados(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error('useDados precisa estar dentro de <DadosProvider>');
  return api;
}

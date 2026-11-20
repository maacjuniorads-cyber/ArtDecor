/**
 * Estado do app, sincronizado com o Supabase.
 *
 * - Ao abrir, carrega tudo (o volume é pequeno: uma loja).
 * - Escuta mudanças em tempo real: o que um aparelho grava aparece nos outros.
 * - Cada ação grava no banco e devolve true/false; em caso de erro, mostra um aviso.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Cliente, Item, Pedido, StatusPedido, Tema } from '@/types';
import { deCliente, deItem, dePedido, deTema, paraCliente, paraItem, paraPedido, paraTema, type Linha } from './mapeamento';
import { TelaCarregando, TelaErro } from '@/components/Telas';
import { Aviso } from '@/components/Aviso';

interface Dados {
  itens: Item[];
  temas: Tema[];
  clientes: Cliente[];
  pedidos: Pedido[];
}

/** Todas as ações devolvem true se gravou, false se deu erro (o aviso já aparece sozinho). */
interface Api extends Dados {
  salvarItem: (item: Item) => Promise<boolean>;
  removerItem: (itemId: string) => Promise<boolean>;
  salvarTema: (tema: Tema) => Promise<boolean>;
  removerTema: (temaId: string) => Promise<boolean>;
  salvarCliente: (cliente: Cliente) => Promise<boolean>;
  removerCliente: (clienteId: string) => Promise<boolean>;
  /** Para pedido novo, use numero 0: o banco gera o número. */
  salvarPedido: (pedido: Pedido) => Promise<boolean>;
  mudarStatus: (pedidoId: string, status: StatusPedido) => Promise<boolean>;
}

const vazio: Dados = { itens: [], temas: [], clientes: [], pedidos: [] };

function upsert<T extends { id: string }>(lista: T[], registro: T): T[] {
  return lista.some((r) => r.id === registro.id)
    ? lista.map((r) => (r.id === registro.id ? registro : r))
    : [...lista, registro];
}

function aplicarMudanca<T extends { id: string }>(lista: T[], ev: RealtimePostgresChangesPayload<Linha>, de: (r: Linha) => T): T[] {
  if (ev.eventType === 'DELETE') return lista.filter((r) => r.id !== (ev.old as Linha).id);
  return upsert(lista, de(ev.new));
}

/** Id único. Não usa crypto.randomUUID porque ele não existe em http pela rede local. */
export function novoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function buscarTudo(): Promise<Dados> {
  const [temas, itens, clientes, pedidos] = await Promise.all([
    supabase.from('temas').select('*'),
    supabase.from('itens').select('*'),
    supabase.from('clientes').select('*'),
    supabase.from('pedidos').select('*'),
  ]);
  const falha = [temas, itens, clientes, pedidos].find((r) => r.error);
  if (falha?.error) throw new Error(falha.error.message);
  return {
    temas: (temas.data ?? []).map(deTema),
    itens: (itens.data ?? []).map(deItem),
    clientes: (clientes.data ?? []).map(deCliente),
    pedidos: (pedidos.data ?? []).map(dePedido),
  };
}

/** Envia a foto (data URL gerada no aparelho) para o Storage e devolve a URL pública. */
async function enviarFoto(itemId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const caminho = `itens/${itemId}-${Date.now()}.jpg`;
  // Nome único por envio: nunca substitui arquivo (upsert exigiria permissões extras).
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
}

const Contexto = createContext<Api | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarTudo());
      setErroCarga(null);
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();

    const canal = supabase
      .channel('artdecor-dados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'temas' }, (ev) =>
        setDados((d) => ({ ...d, temas: aplicarMudanca(d.temas, ev, deTema) })),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens' }, (ev) =>
        setDados((d) => ({ ...d, itens: aplicarMudanca(d.itens, ev, deItem) })),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (ev) =>
        setDados((d) => ({ ...d, clientes: aplicarMudanca(d.clientes, ev, deCliente) })),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (ev) =>
        setDados((d) => ({ ...d, pedidos: aplicarMudanca(d.pedidos, ev, dePedido) })),
      )
      .subscribe();

    // Celular dormiu / app voltou do segundo plano: busca de novo para não perder nada.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') recarregar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', aoVoltar);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, [recarregar]);

  const api = useMemo<Api>(() => {
    /** Roda a gravação; em erro mostra o aviso e devolve false. */
    async function executar(acao: () => Promise<void>): Promise<boolean> {
      try {
        await acao();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setAviso(navigator.onLine ? `Não foi possível salvar: ${msg}` : 'Sem internet. Não foi possível salvar — tente de novo.');
        return false;
      }
    }

    async function verificar(resposta: PromiseLike<{ error: { message: string } | null }>) {
      const { error } = await resposta;
      if (error) throw new Error(error.message);
    }

    return {
      ...dados,

      salvarItem: (item) =>
        executar(async () => {
          let fotoUrl = item.fotoUrl;
          if (fotoUrl?.startsWith('data:')) fotoUrl = await enviarFoto(item.id, fotoUrl);
          const final = { ...item, fotoUrl };
          await verificar(supabase.from('itens').upsert(paraItem(final)));
          setDados((d) => ({ ...d, itens: upsert(d.itens, final) }));
        }),

      removerItem: (itemId) =>
        executar(async () => {
          await verificar(supabase.from('itens').update({ removido: true }).eq('id', itemId));
          setDados((d) => ({ ...d, itens: d.itens.map((i) => (i.id === itemId ? { ...i, removido: true } : i)) }));
        }),

      salvarTema: (tema) =>
        executar(async () => {
          await verificar(supabase.from('temas').upsert(paraTema(tema)));
          setDados((d) => ({ ...d, temas: upsert(d.temas, tema) }));
        }),

      removerTema: (temaId) =>
        executar(async () => {
          // As peças continuam no estoque, só deixam de pertencer ao tema.
          await verificar(supabase.from('itens').update({ tema_id: null }).eq('tema_id', temaId));
          await verificar(supabase.from('temas').update({ removido: true }).eq('id', temaId));
          setDados((d) => ({
            ...d,
            temas: d.temas.map((t) => (t.id === temaId ? { ...t, removido: true } : t)),
            itens: d.itens.map((i) => (i.temaId === temaId ? { ...i, temaId: undefined } : i)),
          }));
        }),

      salvarCliente: (cliente) =>
        executar(async () => {
          await verificar(supabase.from('clientes').upsert(paraCliente(cliente)));
          setDados((d) => ({ ...d, clientes: upsert(d.clientes, cliente) }));
        }),

      removerCliente: (clienteId) =>
        executar(async () => {
          await verificar(supabase.from('clientes').update({ removido: true }).eq('id', clienteId));
          setDados((d) => ({ ...d, clientes: d.clientes.map((c) => (c.id === clienteId ? { ...c, removido: true } : c)) }));
        }),

      salvarPedido: (pedido) =>
        executar(async () => {
          const { data, error } = await supabase.from('pedidos').upsert(paraPedido(pedido)).select().single();
          if (error) throw new Error(error.message);
          const salvo = dePedido(data);
          setDados((d) => ({ ...d, pedidos: upsert(d.pedidos, salvo) }));
        }),

      mudarStatus: (pedidoId, status) =>
        executar(async () => {
          await verificar(supabase.from('pedidos').update({ status }).eq('id', pedidoId));
          setDados((d) => ({ ...d, pedidos: d.pedidos.map((p) => (p.id === pedidoId ? { ...p, status } : p)) }));
        }),
    };
  }, [dados]);

  if (carregando) return <TelaCarregando />;
  if (erroCarga) return <TelaErro mensagem={erroCarga} onTentar={recarregar} />;

  return (
    <Contexto.Provider value={api}>
      {children}
      {aviso && <Aviso mensagem={aviso} onFechar={() => setAviso(null)} />}
    </Contexto.Provider>
  );
}

export function useDados(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error('useDados precisa estar dentro de <DadosProvider>');
  return api;
}

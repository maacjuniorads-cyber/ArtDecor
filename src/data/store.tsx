/**
 * Estado do app, sincronizado com o Supabase.
 *
 * - Ao abrir, carrega tudo (o volume é pequeno: uma loja).
 * - Escuta mudanças em tempo real: o que um aparelho grava aparece nos outros.
 * - Cada ação grava no banco e devolve true/false; em caso de erro, mostra um aviso.
 * - Sem internet, a gravação fica guardada no celular (fila.ts) e é enviada
 *   sozinha, na mesma ordem, quando a internet volta.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Cliente, Item, Pedido, StatusPedido, Tema } from '@/types';
import { deCliente, deItem, dePedido, deTema, paraCliente, paraItem, paraPedido, paraTema, type Linha } from './mapeamento';
import { dadosDeExemplo, ehExemplo } from './exemploTour';
import { dadosDemo } from './demo';
import { MODO_DEMO } from '@/lib/demo';
import { TelaCarregando, TelaErro } from '@/components/Telas';
import { Aviso, type TipoAviso } from '@/components/Aviso';
import { StatusConexao } from '@/components/StatusConexao';
import { Salvando, type FaseSalvando } from '@/components/Salvando';
import { comPrazo, ehErroDeRede, gravarFila, lerFila, type Operacao } from './fila';

interface Dados {
  itens: Item[];
  temas: Tema[];
  clientes: Cliente[];
  pedidos: Pedido[];
}

/** Todas as ações devolvem true se gravou (ou guardou para enviar depois), false se deu erro (o aviso já aparece sozinho). */
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
  /** Liga/desliga os dados de exemplo do tutorial (só na tela, nunca gravados). */
  mostrarExemplo: (ligar: boolean) => void;
  exemploAtivo: boolean;
  /** Gravações feitas sem internet que ainda não chegaram ao banco. */
  pendentes: number;
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

/** Busca a tabela inteira em partes (o Supabase devolve no máximo 1000 linhas por vez). */
export async function buscarTabela(tabela: string): Promise<Linha[]> {
  const PARTE = 1000;
  const todas: Linha[] = [];
  for (let inicio = 0; ; inicio += PARTE) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .order('criado_em', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + PARTE - 1);
    if (error) throw new Error(error.message);
    todas.push(...(data ?? []));
    if (!data || data.length < PARTE) return todas;
  }
}

async function buscarTudo(): Promise<Dados> {
  const [temas, itens, clientes, pedidos] = await Promise.all(['temas', 'itens', 'clientes', 'pedidos'].map(buscarTabela));
  return {
    temas: temas.map(deTema),
    itens: itens.map(deItem),
    clientes: clientes.map(deCliente),
    pedidos: pedidos.map(dePedido),
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

/** Aplica a operação nos dados da tela (sem banco). */
function aplicarLocal(d: Dados, op: Operacao): Dados {
  switch (op.tipo) {
    case 'item':
      return { ...d, itens: upsert(d.itens, op.item) };
    case 'removerItem':
      return { ...d, itens: d.itens.map((i) => (i.id === op.id ? { ...i, removido: true } : i)) };
    case 'tema':
      return { ...d, temas: upsert(d.temas, op.tema) };
    case 'removerTema':
      return {
        ...d,
        temas: d.temas.map((t) => (t.id === op.id ? { ...t, removido: true } : t)),
        itens: d.itens.map((i) => (i.temaId === op.id ? { ...i, temaId: undefined } : i)),
      };
    case 'cliente':
      return { ...d, clientes: upsert(d.clientes, op.cliente) };
    case 'removerCliente':
      return { ...d, clientes: d.clientes.map((c) => (c.id === op.id ? { ...c, removido: true } : c)) };
    case 'pedido':
      return { ...d, pedidos: upsert(d.pedidos, op.pedido) };
    case 'status':
      return { ...d, pedidos: d.pedidos.map((p) => (p.id === op.id ? { ...p, status: op.status } : p)) };
  }
}

async function verificar(resposta: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await comPrazo(Promise.resolve(resposta));
  if (error) throw new Error(error.message);
}

/** Envia a operação ao banco e devolve a versão final para a tela (ex.: pedido já com código). */
async function enviar(op: Operacao): Promise<Operacao> {
  switch (op.tipo) {
    case 'item': {
      let fotoUrl = op.item.fotoUrl;
      if (fotoUrl?.startsWith('data:')) fotoUrl = await comPrazo(enviarFoto(op.item.id, fotoUrl), 25000);
      const item = { ...op.item, fotoUrl };
      await verificar(supabase.from('itens').upsert(paraItem(item)));
      return { tipo: 'item', item };
    }
    case 'removerItem':
      await verificar(supabase.from('itens').update({ removido: true }).eq('id', op.id));
      return op;
    case 'tema':
      await verificar(supabase.from('temas').upsert(paraTema(op.tema)));
      return op;
    case 'removerTema':
      // As peças continuam no estoque, só deixam de pertencer ao tema.
      await verificar(supabase.from('itens').update({ tema_id: null }).eq('tema_id', op.id));
      await verificar(supabase.from('temas').update({ removido: true }).eq('id', op.id));
      return op;
    case 'cliente':
      await verificar(supabase.from('clientes').upsert(paraCliente(op.cliente)));
      return op;
    case 'removerCliente':
      await verificar(supabase.from('clientes').update({ removido: true }).eq('id', op.id));
      return op;
    case 'pedido': {
      const resposta = supabase.from('pedidos').upsert(paraPedido(op.pedido)).select().single();
      const { data, error } = await comPrazo(Promise.resolve(resposta));
      if (error) throw new Error(error.message);
      return { tipo: 'pedido', pedido: dePedido(data) };
    }
    case 'status':
      await verificar(supabase.from('pedidos').update({ status: op.status }).eq('id', op.id));
      return op;
  }
}

const Contexto = createContext<Api | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(() => (MODO_DEMO ? dadosDemo() : vazio));
  const [carregando, setCarregando] = useState(!MODO_DEMO);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: TipoAviso } | null>(null);
  const [exemploAtivo, setExemploAtivo] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pendentes, setPendentes] = useState(() => (MODO_DEMO ? 0 : lerFila().length));
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [salvamento, setSalvamento] = useState<FaseSalvando | null>(null);

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'erro') => setAviso({ texto, tipo }), []);

  const recarregar = useCallback(async () => {
    try {
      const novos = await buscarTudo();
      // O que ainda está na fila continua aparecendo por cima do que veio do banco.
      setDados(lerFila().reduce(aplicarLocal, novos));
      setErroCarga(null);
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  /** Envia o que ficou guardado sem internet, na ordem. Para no primeiro erro de conexão. */
  const enviarFila = useCallback(async () => {
    if (MODO_DEMO || enviandoRef.current || !navigator.onLine || lerFila().length === 0) return;
    enviandoRef.current = true;
    setEnviando(true);
    let enviados = 0;
    try {
      for (;;) {
        const fila = lerFila();
        const op = fila[0];
        if (!op) break;
        try {
          const final = await enviar(op);
          let resto = fila.slice(1);
          // A foto já subiu: as próximas gravações da mesma peça usam o endereço dela.
          if (op.tipo === 'item' && final.tipo === 'item' && op.item.fotoUrl?.startsWith('data:')) {
            resto = resto.map((o) =>
              o.tipo === 'item' && o.item.id === op.item.id && o.item.fotoUrl === op.item.fotoUrl
                ? { ...o, item: { ...o.item, fotoUrl: final.item.fotoUrl } }
                : o,
            );
          }
          gravarFila(resto);
          setDados((d) => aplicarLocal(d, final));
          enviados++;
        } catch (e) {
          if (ehErroDeRede(e)) break; // tenta de novo quando a internet voltar
          // Erro do banco (não de conexão): não adianta repetir.
          gravarFila(fila.slice(1));
          avisar(`Uma alteração feita sem internet não pôde ser salva: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
      setPendentes(lerFila().length);
    }
    if (enviados > 0 && lerFila().length === 0) {
      avisar(
        enviados === 1
          ? 'Internet de volta: a alteração que estava esperando foi salva.'
          : `Internet de volta: as ${enviados} alterações que estavam esperando foram salvas.`,
        'sucesso',
      );
    }
  }, [avisar]);

  /** Primeiro envia o que estava esperando, depois busca tudo de novo. */
  const sincronizar = useCallback(async () => {
    await enviarFila();
    await recarregar();
  }, [enviarFila, recarregar]);

  useEffect(() => {
    if (MODO_DEMO) return; // demonstração: dados fictícios, sem banco
    sincronizar();

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

    // Celular dormiu / app voltou do segundo plano: envia o que esperava e busca de novo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') sincronizar();
    };
    const ficouOnline = () => {
      setOnline(true);
      sincronizar();
    };
    const ficouOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', ficouOnline);
    window.addEventListener('offline', ficouOffline);
    // Wi-Fi conectado mas sem internet de verdade: tenta de novo de tempos em tempos.
    const tentar = window.setInterval(() => {
      if (lerFila().length > 0) enviarFila();
    }, 30000);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', ficouOnline);
      window.removeEventListener('offline', ficouOffline);
      window.clearInterval(tentar);
    };
  }, [sincronizar, enviarFila]);

  const api = useMemo<Api>(() => {
    // Durante o tutorial, os dados de exemplo aparecem junto com os reais (só na tela).
    const exemplo = exemploAtivo ? dadosDeExemplo() : null;
    const visiveis: Dados = exemplo
      ? {
          temas: [...dados.temas, ...exemplo.temas],
          itens: [...dados.itens, ...exemplo.itens],
          clientes: [...dados.clientes, ...exemplo.clientes],
          pedidos: [...dados.pedidos, ...exemplo.pedidos],
        }
      : dados;

    /** Guarda no celular para enviar depois. */
    function guardar(op: Operacao): boolean {
      const fila = [...lerFila(), op];
      if (!gravarFila(fila)) {
        avisar('Sem internet, e o celular não tem espaço para guardar. Tente de novo quando a internet voltar.');
        return false;
      }
      setDados((d) => aplicarLocal(d, op));
      setPendentes(fila.length);
      return true;
    }

    const pausa = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    /** Mostra o cartão "Guardado no celular" por um instante antes de sair da tela. */
    async function guardarComAviso(op: Operacao): Promise<boolean> {
      const ok = guardar(op);
      if (ok) {
        setSalvamento('guardado');
        await pausa(1700);
        setSalvamento(null);
      }
      return ok;
    }

    /** Grava no banco; sem internet, guarda no celular. Em erro do banco mostra o aviso e devolve false. */
    async function executar(op: Operacao, id: string): Promise<boolean> {
      // Dados de exemplo do tutorial nunca vão para o banco.
      if (ehExemplo(id)) {
        avisar('Isso é só um exemplo do tutorial — não é salvo.');
        return false;
      }
      if (MODO_DEMO) {
        // Demonstração: sem banco, então o código do pedido novo é inventado aqui.
        const local: Operacao =
          op.tipo === 'pedido' && !op.pedido.codigo
            ? { ...op, pedido: { ...op.pedido, codigo: `A${10000 + Math.floor(Math.random() * 90000)}` } }
            : op;
        setDados((d) => aplicarLocal(d, local));
        return true;
      }
      // Sem internet: vai direto para a fila.
      if (!navigator.onLine) return guardarComAviso(op);
      // Ainda há coisa esperando (a ordem precisa ser mantida): entra na fila e tenta enviar tudo.
      if (lerFila().length > 0) {
        const ok = guardar(op);
        if (ok) enviarFila();
        return ok;
      }

      // Rápido (o normal): nem aparece nada. Demorou: "Salvando…"; demorou mais: "internet lenta".
      let apareceu = false;
      const t1 = window.setTimeout(() => {
        apareceu = true;
        setSalvamento('salvando');
      }, 350);
      const t2 = window.setTimeout(() => setSalvamento('lento'), 3000);
      const parar = () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
      try {
        const final = await enviar(op);
        parar();
        setDados((d) => aplicarLocal(d, final));
        if (apareceu) {
          setSalvamento('salvo');
          await pausa(650);
        }
        setSalvamento(null);
        return true;
      } catch (e) {
        parar();
        if (ehErroDeRede(e)) return guardarComAviso(op);
        setSalvamento(null);
        avisar(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
    }

    return {
      ...visiveis,
      exemploAtivo,
      mostrarExemplo: setExemploAtivo,
      pendentes,

      salvarItem: (item) => executar({ tipo: 'item', item }, item.id),
      removerItem: (id) => executar({ tipo: 'removerItem', id }, id),
      salvarTema: (tema) => executar({ tipo: 'tema', tema }, tema.id),
      removerTema: (id) => executar({ tipo: 'removerTema', id }, id),
      salvarCliente: (cliente) => executar({ tipo: 'cliente', cliente }, cliente.id),
      removerCliente: (id) => executar({ tipo: 'removerCliente', id }, id),
      salvarPedido: (pedido) => executar({ tipo: 'pedido', pedido }, pedido.id),
      mudarStatus: (id, status) => executar({ tipo: 'status', id, status }, id),
    };
  }, [dados, exemploAtivo, pendentes, avisar, enviarFila]);

  if (carregando) return <TelaCarregando />;
  if (erroCarga) return <TelaErro mensagem={erroCarga} onTentar={sincronizar} />;

  return (
    <Contexto.Provider value={api}>
      <StatusConexao online={online} pendentes={pendentes} enviando={enviando} onEnviar={enviarFila} />
      {children}
      {aviso && <Aviso mensagem={aviso.texto} tipo={aviso.tipo} onFechar={() => setAviso(null)} />}
      {salvamento && <Salvando fase={salvamento} />}
    </Contexto.Provider>
  );
}

export function useDados(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error('useDados precisa estar dentro de <DadosProvider>');
  return api;
}

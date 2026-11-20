/**
 * Conversão entre as linhas do banco (snake_case) e os tipos do app (camelCase).
 */
import type { Cliente, Item, Pedido, Tema } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Linha = Record<string, any>;

export const deTema = (r: Linha): Tema => ({
  id: r.id,
  nome: r.nome,
  cor: r.cor,
  removido: r.removido || undefined,
});

export const paraTema = (t: Tema): Linha => ({
  id: t.id,
  nome: t.nome,
  cor: t.cor,
  removido: Boolean(t.removido),
});

export const deItem = (r: Linha): Item => ({
  id: r.id,
  nome: r.nome,
  categoria: r.categoria,
  temaId: r.tema_id ?? undefined,
  tipo: r.tipo,
  quantidadeTotal: r.quantidade_total,
  valorAluguel: Number(r.valor_aluguel),
  fotoUrl: r.foto_url ?? undefined,
  observacoes: r.observacoes ?? undefined,
  removido: r.removido || undefined,
});

export const paraItem = (i: Item): Linha => ({
  id: i.id,
  nome: i.nome,
  categoria: i.categoria,
  tema_id: i.temaId ?? null,
  tipo: i.tipo,
  quantidade_total: i.quantidadeTotal,
  valor_aluguel: i.valorAluguel,
  foto_url: i.fotoUrl ?? null,
  observacoes: i.observacoes ?? null,
  removido: Boolean(i.removido),
});

export const deCliente = (r: Linha): Cliente => ({
  id: r.id,
  nome: r.nome,
  telefone: r.telefone,
  whatsapp: r.whatsapp ?? undefined,
  endereco: r.endereco ?? undefined,
  veiculo: r.veiculo ?? null,
  removido: r.removido || undefined,
});

export const paraCliente = (c: Cliente): Linha => ({
  id: c.id,
  nome: c.nome,
  telefone: c.telefone,
  whatsapp: c.whatsapp ?? null,
  endereco: c.endereco ?? null,
  veiculo: c.veiculo,
  removido: Boolean(c.removido),
});

export const dePedido = (r: Linha): Pedido => ({
  id: r.id,
  numero: r.numero,
  clienteId: r.cliente_id,
  evento: r.evento ?? undefined,
  temaIds: r.tema_ids ?? [],
  itens: r.itens ?? [],
  retirada: r.retirada,
  devolucao: r.devolucao,
  status: r.status,
  pagamentos: r.pagamentos ?? [],
});

/** Pedido novo vai sem número: o banco gera o próximo (evita repetir entre dois celulares). */
export const paraPedido = (p: Pedido): Linha => ({
  id: p.id,
  ...(p.numero > 0 ? { numero: p.numero } : {}),
  cliente_id: p.clienteId,
  evento: p.evento ?? null,
  tema_ids: p.temaIds,
  itens: p.itens,
  retirada: p.retirada,
  devolucao: p.devolucao,
  status: p.status,
  pagamentos: p.pagamentos,
});

/** Datas no formato ISO "AAAA-MM-DD" (sem hora). */
export type DataISO = string;

export const CATEGORIAS = [
  'Painéis',
  'Cilindros e mesas',
  'Móveis',
  'Vidros',
  'Vasos e plantas',
  'Pisos',
  'Toalhas',
  'Iluminação',
  'Enfeites',
  'Balões',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export interface Tema {
  id: string;
  nome: string;
  cor: string;
}

/** "varios" = tem quantidade (cilindros, toalhas); "unica" = peça única (painel, cômoda). */
export type TipoItem = 'varios' | 'unica';

export interface Item {
  id: string;
  nome: string;
  categoria: Categoria;
  temaId?: string;
  tipo: TipoItem;
  /** null = ainda não contado. Peça única é sempre 1. */
  quantidadeTotal: number | null;
  valorAluguel: number;
  fotoUrl?: string;
  observacoes?: string;
}

export const TIPOS_VEICULO = ['Carro', 'Moto', 'Caminhonete', 'Van / Kombi', 'Outro'] as const;

export type TipoVeiculo = (typeof TIPOS_VEICULO)[number];

export interface Veiculo {
  tipo: TipoVeiculo;
  modelo: string;
  cor: string;
  placa: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  endereco?: string;
  veiculo: Veiculo | null;
}

export type StatusPedido = 'reservado' | 'rua' | 'devolvido';

export interface ItemPedido {
  itemId: string;
  quantidade: number;
  /** Valor no momento do pedido (o preço do item pode mudar depois). */
  valorUnitario: number;
}

export interface Pedido {
  id: string;
  numero: number;
  clienteId: string;
  evento?: string;
  temaIds: string[];
  itens: ItemPedido[];
  retirada: DataISO;
  devolucao: DataISO;
  status: StatusPedido;
  sinal: number;
}

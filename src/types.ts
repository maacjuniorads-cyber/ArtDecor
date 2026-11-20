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
  /** Excluído. Fica guardado só para o histórico dos pedidos antigos. */
  removido?: boolean;
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
  /** Excluído do estoque. Fica guardado só para o histórico dos pedidos antigos. */
  removido?: boolean;
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
  /** Excluído. Fica guardado só para o histórico dos pedidos antigos. */
  removido?: boolean;
}

export type StatusPedido = 'reservado' | 'rua' | 'devolvido' | 'cancelado';

export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão'] as const;

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export interface Pagamento {
  id: string;
  valor: number;
  data: DataISO;
  forma: FormaPagamento;
}

export interface ItemPedido {
  itemId: string;
  quantidade: number;
  /** Valor no momento do pedido (o preço do item pode mudar depois). */
  valorUnitario: number;
}

/** Peça que voltou com problema na devolução. */
export interface ProblemaDevolucao {
  itemId: string;
  /** Unidades que voltaram quebradas/estragadas. */
  avariadas: number;
  /** Unidades que não voltaram. */
  faltando: number;
  obs?: string;
  /** Quantas unidades foram tiradas do estoque por causa disso. */
  descontado: number;
}

/** Conferência feita quando o cliente devolve. Sem problemas = voltou tudo certo. */
export interface Conferencia {
  data: DataISO;
  /** Nome de quem conferiu. */
  por: string;
  problemas: ProblemaDevolucao[];
  observacao?: string;
}

/** Valor extra cobrado no pedido (ex.: peça quebrada na devolução). */
export interface Cobranca {
  id: string;
  descricao: string;
  valor: number;
  /** Peça a que se refere, quando veio da conferência. */
  itemId?: string;
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
  /** Sinal e demais pagamentos recebidos. */
  pagamentos: Pagamento[];
  /** Conferência da devolução (quando já foi feita). */
  conferencia?: Conferencia | null;
  /** Valores extras cobrados (avarias etc.). Entram no total. */
  cobrancas: Cobranca[];
}

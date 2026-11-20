/**
 * Dados de exemplo para desenvolver as telas antes do back-end.
 * As datas são relativas a hoje para a tela sempre ter algo para mostrar.
 */
import { hojeISO, somarDias } from '@/lib/formato';
import type { Cliente, Item, Pedido, Tema } from '@/types';

const hoje = hojeISO();
const d = (dias: number) => somarDias(hoje, dias);

export const temas: Tema[] = [
  { id: 'herois', nome: 'Heróis', cor: '#3D6A96' },
  { id: 'sofia', nome: 'Princesa Sofia', cor: '#8A6FB0' },
  { id: 'capivara', nome: 'Capivara', cor: '#B07A4F' },
  { id: 'now-united', nome: 'Now United', cor: '#2E2638' },
  { id: 'safari', nome: 'Safari', cor: '#C9A23A' },
  { id: 'natal', nome: 'Natal', cor: '#8E2A4E' },
  { id: 'formatura', nome: 'Formatura', cor: '#4F4A66' },
];

export const itens: Item[] = [
  { id: 'painel-sofia', nome: 'Painel redondo Princesa Sofia', categoria: 'Painéis', temaId: 'sofia', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 60 },
  { id: 'painel-herois', nome: 'Painel redondo Heróis', categoria: 'Painéis', temaId: 'herois', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 60 },
  { id: 'painel-capivara', nome: 'Painel redondo Capivara', categoria: 'Painéis', temaId: 'capivara', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 60 },
  { id: 'capas-capivara', nome: 'Trio de capas Capivara', categoria: 'Painéis', temaId: 'capivara', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 45 },
  { id: 'muro-ingles', nome: 'Muro inglês', categoria: 'Painéis', tipo: 'varios', quantidadeTotal: 3, valorAluguel: 80 },
  { id: 'cilindro-colorido', nome: 'Cilindro colorido', categoria: 'Cilindros e mesas', tipo: 'varios', quantidadeTotal: 12, valorAluguel: 15 },
  { id: 'mesa-ferro', nome: 'Mesa de ferro preta', categoria: 'Cilindros e mesas', tipo: 'varios', quantidadeTotal: 6, valorAluguel: 25 },
  { id: 'mesinha-palito', nome: 'Mesinha pé palito', categoria: 'Cilindros e mesas', tipo: 'varios', quantidadeTotal: null, valorAluguel: 15 },
  { id: 'comoda-provencal', nome: 'Cômoda provençal branca', categoria: 'Móveis', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 90 },
  { id: 'carrinho-roda', nome: 'Carrinho de roda', categoria: 'Móveis', tipo: 'unica', quantidadeTotal: 1, valorAluguel: 90 },
  { id: 'vaso-cristal', nome: 'Vaso de cristal alto', categoria: 'Vidros', tipo: 'varios', quantidadeTotal: 4, valorAluguel: 20 },
  { id: 'boleira', nome: 'Boleira de vidro', categoria: 'Vidros', tipo: 'varios', quantidadeTotal: null, valorAluguel: 8 },
  { id: 'bandeja-espelhada', nome: 'Bandeja espelhada', categoria: 'Vidros', tipo: 'varios', quantidadeTotal: null, valorAluguel: 6 },
  { id: 'piso-xadrez', nome: 'Piso xadrez (placa)', categoria: 'Pisos', tipo: 'varios', quantidadeTotal: null, valorAluguel: 5 },
  { id: 'toalha-vermelha', nome: 'Toalha vermelha', categoria: 'Toalhas', tipo: 'varios', quantidadeTotal: 40, valorAluguel: 8 },
  { id: 'neon-formei', nome: 'Neon “Formei”', categoria: 'Iluminação', temaId: 'formatura', tipo: 'varios', quantidadeTotal: 2, valorAluguel: 70 },
  { id: 'arco-baloes', nome: 'Arco de balões', categoria: 'Balões', tipo: 'varios', quantidadeTotal: null, valorAluguel: 120 },
];

export const clientes: Cliente[] = [
  { id: 'c1', nome: 'Ana Souza', telefone: '(53) 99999-0000', veiculo: { tipo: 'Carro', modelo: 'Onix', cor: 'prata', placa: 'IXA2B34' } },
  { id: 'c2', nome: 'Carla Mendes', telefone: '(53) 98888-1111', veiculo: { tipo: 'Carro', modelo: 'HB20', cor: 'branco', placa: 'IUB7C21' } },
  { id: 'c3', nome: 'Fernanda Alves', telefone: '(53) 97777-2222', veiculo: null },
  { id: 'c4', nome: 'Marcos Lima', telefone: '(53) 95555-4444', veiculo: { tipo: 'Moto', modelo: 'Fan 160', cor: 'preta', placa: 'IVM9F43' } },
  { id: 'c5', nome: 'Roberto Dias', telefone: '(53) 94444-5555', veiculo: { tipo: 'Caminhonete', modelo: 'Strada', cor: 'branca', placa: 'ITD3G67' } },
];

export const pedidos: Pedido[] = [
  {
    id: 'p138', numero: 138, clienteId: 'c2', evento: 'Casamento', temaIds: [],
    itens: [
      { itemId: 'toalha-vermelha', quantidade: 12, valorUnitario: 8 },
      { itemId: 'carrinho-roda', quantidade: 1, valorUnitario: 90 },
      { itemId: 'vaso-cristal', quantidade: 2, valorUnitario: 20 },
    ],
    retirada: d(-3), devolucao: d(0), status: 'rua', sinal: 226,
  },
  {
    id: 'p140', numero: 140, clienteId: 'c5', evento: 'Aniversário 70 anos', temaIds: [],
    itens: [
      { itemId: 'mesa-ferro', quantidade: 3, valorUnitario: 25 },
      { itemId: 'toalha-vermelha', quantidade: 10, valorUnitario: 8 },
    ],
    retirada: d(-2), devolucao: d(1), status: 'rua', sinal: 100,
  },
  {
    id: 'p142', numero: 142, clienteId: 'c1', evento: 'Aniversário', temaIds: ['capivara'],
    itens: [
      { itemId: 'painel-capivara', quantidade: 1, valorUnitario: 60 },
      { itemId: 'capas-capivara', quantidade: 1, valorUnitario: 45 },
      { itemId: 'bandeja-espelhada', quantidade: 4, valorUnitario: 6 },
      { itemId: 'boleira', quantidade: 2, valorUnitario: 8 },
      { itemId: 'carrinho-roda', quantidade: 1, valorUnitario: 90 },
    ],
    retirada: d(2), devolucao: d(4), status: 'reservado', sinal: 150,
  },
  {
    id: 'p143', numero: 143, clienteId: 'c4', evento: 'Formatura', temaIds: ['formatura'],
    itens: [
      { itemId: 'neon-formei', quantidade: 1, valorUnitario: 70 },
      { itemId: 'muro-ingles', quantidade: 2, valorUnitario: 80 },
    ],
    retirada: d(3), devolucao: d(5), status: 'reservado', sinal: 0,
  },
  {
    id: 'p131', numero: 131, clienteId: 'c3', evento: 'Chá de bebê', temaIds: [],
    itens: [{ itemId: 'cilindro-colorido', quantidade: 3, valorUnitario: 15 }],
    retirada: d(-12), devolucao: d(-10), status: 'devolvido', sinal: 45,
  },
];

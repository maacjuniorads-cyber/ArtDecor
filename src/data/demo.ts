/**
 * Dados FICTÍCIOS do modo demonstração (npm run demo).
 * Servem só para tirar os prints do guia em PDF: nunca vão para o banco
 * e não existem no site publicado. Peças e temas são os reais da loja;
 * clientes e pedidos são inventados.
 */
import { hojeISO, somarDias } from '@/lib/formato';
import type { Categoria, Cliente, Item, Pedido, Tema } from '@/types';

export function dadosDemo(): { temas: Tema[]; itens: Item[]; clientes: Cliente[]; pedidos: Pedido[] } {
  const hoje = hojeISO();
  const d = (n: number) => somarDias(hoje, n);

  const temas: Tema[] = [
    { id: 'tema-herois', nome: 'Heróis', cor: '#4A7AA8' },
    { id: 'tema-capivara', nome: 'Capivara', cor: '#B07A4F' },
    { id: 'tema-safari', nome: 'Safari', cor: '#C9A23A' },
    { id: 'tema-princesa-sofia', nome: 'Princesa Sofia', cor: '#8A87A0' },
    { id: 'tema-bosque', nome: 'Bosque', cor: '#5E8C4A' },
    { id: 'tema-minecraft', nome: 'Minecraft', cor: '#5E8C4A' },
  ];

  const i = (id: string, nome: string, categoria: Categoria, tipo: Item['tipo'], quantidadeTotal: number | null, valorAluguel: number, temaId?: string): Item => ({
    id,
    nome,
    categoria,
    tipo,
    quantidadeTotal,
    valorAluguel,
    ...(temaId ? { temaId } : {}),
  });

  const itens: Item[] = [
    i('item-painel-herois', 'Painel redondo Heróis', 'Painéis', 'unica', 1, 60, 'tema-herois'),
    i('item-capas-herois', 'Trio de capas de cilindro Heróis', 'Painéis', 'unica', 1, 45, 'tema-herois'),
    i('item-painel-capivara', 'Painel redondo Capivara', 'Painéis', 'unica', 1, 60, 'tema-capivara'),
    i('item-capas-capivara', 'Trio de capas de cilindro Capivara', 'Painéis', 'unica', 1, 45, 'tema-capivara'),
    i('item-painel-safari', 'Painel redondo Safari', 'Painéis', 'unica', 1, 60, 'tema-safari'),
    i('item-capas-safari', 'Trio de capas de cilindro Safari', 'Painéis', 'unica', 1, 45, 'tema-safari'),
    i('item-painel-princesa-sofia', 'Painel redondo Princesa Sofia', 'Painéis', 'unica', 1, 60, 'tema-princesa-sofia'),
    i('item-painel-bosque', 'Painel redondo Bosque', 'Painéis', 'unica', 1, 60, 'tema-bosque'),
    i('item-painel-minecraft', 'Painel Minecraft', 'Painéis', 'varios', null, 0, 'tema-minecraft'),
    i('item-muro-ingles', 'Muro inglês', 'Painéis', 'unica', 1, 90),
    i('item-cilindro-colorido', 'Cilindro colorido', 'Cilindros e mesas', 'varios', 9, 15),
    i('item-cilindro-branco', 'Cilindro branco', 'Cilindros e mesas', 'varios', 6, 15),
    i('item-mesa-ferro-preta', 'Mesa de ferro preta (industrial)', 'Cilindros e mesas', 'varios', 2, 35),
    i('item-mesinha-pe-palito', 'Mesinha pé palito', 'Cilindros e mesas', 'varios', 4, 20),
    i('item-comoda-provencal', 'Cômoda provençal branca', 'Móveis', 'unica', 1, 80),
    i('item-bau-branco', 'Baú branco', 'Móveis', 'unica', 1, 50),
    i('item-boleira-vidro', 'Boleira de vidro', 'Vidros', 'varios', 5, 12),
    {
      ...i('item-bandeja-espelhada', 'Bandeja espelhada', 'Vidros', 'varios', 11, 6),
      observacoes: `Pedido #0009 (${d(-4).split('-').reverse().join('/')}): 1 voltou estragada — borda lascada`,
    },
    i('item-suqueira-vidro', 'Suqueira de vidro', 'Vidros', 'varios', null, 0),
    i('item-topiaria-buxinho', 'Topiaria (buxinho)', 'Vasos e plantas', 'varios', 4, 18),
    i('item-arranjo-flores', 'Arranjo de flores', 'Vasos e plantas', 'varios', 4, 20),
    i('item-grama-sintetica', 'Grama sintética', 'Pisos', 'varios', 3, 25),
    i('item-toalha-branca', 'Toalha branca', 'Toalhas', 'varios', 10, 8),
    i('item-cortina-led', 'Cortina de LED', 'Iluminação', 'varios', 2, 30),
    i('item-predios-mdf', 'Prédios de MDF (Homem-Aranha)', 'Enfeites', 'unica', 1, 35, 'tema-herois'),
    i('item-bonecos-vingadores', 'Bonecos Vingadores', 'Enfeites', 'unica', 1, 30, 'tema-herois'),
    i('item-bichinhos-pelucia', 'Bichinhos de pelúcia (bosque)', 'Enfeites', 'varios', null, 0, 'tema-bosque'),
    i('item-arco-baloes', 'Arco de balões', 'Balões', 'varios', null, 0),
  ];

  const clientes: Cliente[] = [
    { id: 'demo-c1', nome: 'Fernanda Lima', telefone: '(53) 90000-1001', endereco: 'Rua das Flores, 120, Centro', veiculo: { tipo: 'Carro', modelo: 'HB20', cor: 'branco', placa: 'IXA1B23' } },
    { id: 'demo-c2', nome: 'Carlos Souza', telefone: '(53) 90000-1002', veiculo: { tipo: 'Caminhonete', modelo: 'Strada', cor: 'vermelha', placa: 'JAB4C56' } },
    { id: 'demo-c3', nome: 'Juliana Martins', telefone: '(53) 90000-1003', endereco: 'Rua 27 de Janeiro, 300, Centro', veiculo: { tipo: 'Carro', modelo: 'Onix', cor: 'prata', placa: 'IYZ7D89' } },
    { id: 'demo-c4', nome: 'Silvia Rocha', telefone: '(53) 90000-1004', veiculo: null },
    { id: 'demo-c5', nome: 'Roberto Alves', telefone: '(53) 90000-1005', veiculo: { tipo: 'Moto', modelo: 'CG 160', cor: 'preta', placa: 'IZK2E34' } },
  ];

  const pedidos: Pedido[] = [
    {
      id: 'demo-p12',
      numero: 12,
      clienteId: 'demo-c1',
      evento: 'Aniversário de 6 anos',
      temaIds: ['tema-herois'],
      itens: [
        { itemId: 'item-painel-herois', quantidade: 1, valorUnitario: 60 },
        { itemId: 'item-capas-herois', quantidade: 1, valorUnitario: 45 },
        { itemId: 'item-predios-mdf', quantidade: 1, valorUnitario: 35 },
        { itemId: 'item-bonecos-vingadores', quantidade: 1, valorUnitario: 30 },
        { itemId: 'item-cilindro-colorido', quantidade: 3, valorUnitario: 15 },
      ],
      retirada: d(2),
      devolucao: d(4),
      status: 'reservado',
      pagamentos: [{ id: 'demo-pg1', valor: 80, data: d(-1), forma: 'Pix' }],
      cobrancas: [],
    },
    {
      id: 'demo-p11',
      numero: 11,
      clienteId: 'demo-c2',
      evento: 'Chá de bebê',
      temaIds: ['tema-capivara'],
      itens: [
        { itemId: 'item-painel-capivara', quantidade: 1, valorUnitario: 60 },
        { itemId: 'item-capas-capivara', quantidade: 1, valorUnitario: 45 },
        { itemId: 'item-bandeja-espelhada', quantidade: 4, valorUnitario: 6 },
        { itemId: 'item-toalha-branca', quantidade: 2, valorUnitario: 8 },
      ],
      retirada: d(-2),
      devolucao: d(0),
      status: 'rua',
      pagamentos: [{ id: 'demo-pg2', valor: 50, data: d(-3), forma: 'Dinheiro' }],
      cobrancas: [],
    },
    {
      id: 'demo-p10',
      numero: 10,
      clienteId: 'demo-c3',
      evento: 'Aniversário de 1 ano',
      temaIds: ['tema-safari'],
      itens: [
        { itemId: 'item-painel-safari', quantidade: 1, valorUnitario: 60 },
        { itemId: 'item-capas-safari', quantidade: 1, valorUnitario: 45 },
        { itemId: 'item-topiaria-buxinho', quantidade: 2, valorUnitario: 18 },
      ],
      retirada: d(-1),
      devolucao: d(1),
      status: 'rua',
      pagamentos: [{ id: 'demo-pg3', valor: 141, data: d(-1), forma: 'Cartão' }],
      cobrancas: [],
    },
    {
      id: 'demo-p09',
      numero: 9,
      clienteId: 'demo-c4',
      evento: 'Mesa de doces',
      temaIds: [],
      itens: [
        { itemId: 'item-comoda-provencal', quantidade: 1, valorUnitario: 80 },
        { itemId: 'item-bandeja-espelhada', quantidade: 6, valorUnitario: 6 },
        { itemId: 'item-boleira-vidro', quantidade: 2, valorUnitario: 12 },
      ],
      retirada: d(-6),
      devolucao: d(-4),
      status: 'devolvido',
      pagamentos: [{ id: 'demo-pg4', valor: 140, data: d(-6), forma: 'Pix' }],
      conferencia: {
        data: d(-4),
        por: 'Patricia',
        problemas: [{ itemId: 'item-bandeja-espelhada', avariadas: 1, faltando: 0, obs: 'borda lascada', descontado: 1 }],
      },
      cobrancas: [{ id: 'demo-cb1', descricao: 'Bandeja espelhada: 1 voltou estragada', valor: 25, itemId: 'item-bandeja-espelhada' }],
    },
    {
      id: 'demo-p13',
      numero: 13,
      clienteId: 'demo-c5',
      evento: 'Festa da firma',
      temaIds: [],
      itens: [
        { itemId: 'item-mesa-ferro-preta', quantidade: 2, valorUnitario: 35 },
        { itemId: 'item-cortina-led', quantidade: 1, valorUnitario: 30 },
      ],
      retirada: d(5),
      devolucao: d(6),
      status: 'reservado',
      pagamentos: [],
      cobrancas: [],
    },
  ];

  return { temas, itens, clientes, pedidos };
}

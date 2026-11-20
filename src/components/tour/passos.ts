/**
 * Roteiro do tutorial guiado. Cada passo abre uma tela (rota) e destaca uma
 * parte dela (alvo = valor do atributo data-tour). Sem alvo, o balão aparece
 * no meio da tela. Se a rota for null (ex.: ainda não há pedidos), o passo
 * vira uma explicação no meio da tela, sem trocar de tela.
 */
import type { Item, Pedido } from '@/types';

export interface ContextoTour {
  nome?: string;
  primeiroItem?: Item;
  primeiroPedido?: Pedido;
}

export interface Passo {
  rota: (c: ContextoTour) => string | null;
  alvo?: string;
  titulo: string | ((c: ContextoTour) => string);
  texto: string;
}

const fixo = (r: string) => () => r;

export const passos: Passo[] = [
  // ---- Início
  {
    rota: fixo('/'),
    titulo: (c) => (c.nome ? `Bem-vinda ao ArtDecor, ${c.nome}!` : 'Bem-vinda ao ArtDecor!'),
    texto: 'Vou te mostrar como o app funciona, tela por tela. Leva uns 3 minutos. Durante o tutorial nada é salvo — é só para conhecer. Você pode pular quando quiser.',
  },
  {
    rota: fixo('/'),
    alvo: 'novo-pedido',
    titulo: 'Novo pedido',
    texto: 'Toque aqui sempre que fechar um aluguel com um cliente. Daqui a pouco eu mostro como preencher.',
  },
  {
    rota: fixo('/'),
    alvo: 'primeiros-passos',
    titulo: 'Primeiros passos',
    texto: 'Uma listinha do que fazer para começar. Cada tarefa se marca sozinha quando você faz. Toque numa tarefa para ir direto à tela certa.',
  },
  {
    rota: fixo('/'),
    alvo: 'resumo',
    titulo: 'Resumo do dia',
    texto: 'Quantos pedidos estão com clientes (na rua), quantos estão reservados, quantos voltam hoje e quanto ainda falta receber.',
  },
  {
    rota: fixo('/'),
    alvo: 'agenda',
    titulo: 'Próximos dias',
    texto: 'A agenda da casa: o que SAI (cliente vem buscar) e o que VOLTA (cliente devolve). Toque num nome para abrir o pedido.',
  },
  {
    rota: fixo('/'),
    alvo: 'menu',
    titulo: 'Menu',
    texto: 'Embaixo de todas as telas fica o menu: Início, Estoque, Pedidos e Clientes. Vamos ver cada um.',
  },

  // ---- Estoque
  {
    rota: fixo('/estoque'),
    alvo: 'estoque-abas',
    titulo: 'Estoque',
    texto: 'Aqui ficam todas as peças da loja. Em cima você troca entre “Itens” (as peças) e “Temas” (os kits).',
  },
  {
    rota: fixo('/estoque'),
    alvo: 'estoque-filtros',
    titulo: 'Buscar e filtrar',
    texto: 'Digite o nome de um item ou tema na busca, ou toque numa categoria (Painéis, Vidros, Toalhas…). Arraste as categorias para o lado para ver mais.',
  },
  {
    rota: fixo('/estoque'),
    alvo: 'estoque-item',
    titulo: 'Cada item',
    texto: '“Falta contar” = ainda sem quantidade. A barra azul mostra quantos estão em casa. Peça única aparece como “Livre” ou “Alugado”. Toque no item para editar.',
  },
  {
    rota: fixo('/estoque'),
    alvo: 'fab',
    titulo: 'Item novo',
    texto: 'Este botão + cadastra uma peça nova. Ele aparece também em Clientes e Pedidos.',
  },
  {
    rota: (c) => (c.primeiroItem ? `/estoque/${c.primeiroItem.id}` : null),
    alvo: 'item-foto',
    titulo: 'Editando um item',
    texto: 'Ao abrir um item: toque no quadro de cima para tirar uma foto ou escolher da galeria. A foto ajuda a reconhecer a peça.',
  },
  {
    rota: (c) => (c.primeiroItem ? `/estoque/${c.primeiroItem.id}` : null),
    alvo: 'item-tipo',
    titulo: 'Vários ou peça única?',
    texto: '“Tenho vários” para cilindros, toalhas, bandejas… “Peça única” para painel, cômoda, baú — essas não precisam ser contadas.',
  },
  {
    rota: (c) => (c.primeiroItem ? `/estoque/${c.primeiroItem.id}` : null),
    alvo: 'item-quantidade',
    titulo: 'Quantidade',
    texto: 'Conte e digite quantas tem. Se ainda não contou, deixe marcado “Ainda não contei” — o item fica como “falta contar”.',
  },
  {
    rota: (c) => (c.primeiroItem ? `/estoque/${c.primeiroItem.id}` : null),
    alvo: 'item-valor',
    titulo: 'Valor do aluguel',
    texto: 'O preço de UMA unidade, por exemplo 15,00. Depois é só tocar em “Salvar item” lá embaixo.',
  },
  {
    rota: fixo('/estoque?aba=temas'),
    alvo: 'temas-lista',
    titulo: 'Temas (kits)',
    texto: 'Um tema junta as peças que saem juntas (painel, capas dos cilindros, bonecos…). No pedido, um toque adiciona o kit inteiro. Para colocar uma peça num tema, escolha o tema na tela do item.',
  },

  // ---- Clientes
  {
    rota: fixo('/clientes'),
    alvo: 'clientes-busca',
    titulo: 'Clientes',
    texto: 'Busque por nome, telefone, modelo do carro ou placa — ótimo quando alguém chega na porta e você só reconhece o carro.',
  },
  {
    rota: fixo('/clientes'),
    alvo: 'fab',
    titulo: 'Cliente novo',
    texto: 'Cadastre com nome, telefone (com DDD), endereço e o veículo. Se a pessoa não tem carro, é só marcar “Cliente não tem veículo”.',
  },

  // ---- Novo pedido
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-cliente',
    titulo: 'Novo pedido — 1º cliente e datas',
    texto: 'Escolha o cliente na lista (ou cadastre um novo), escreva o evento se quiser, e as datas de retirada e devolução.',
  },
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-kits',
    titulo: '2º kit do tema',
    texto: 'Toque no tema (ex.: “+ Capivara”) e todas as peças do kit entram no pedido de uma vez.',
  },
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-itens',
    titulo: '3º itens e quantidades',
    texto: 'Use − e + para a quantidade, × para tirar, e “+ Adicionar item avulso” para colocar outras peças. Se pedir mais do que tem em casa, aparece um aviso.',
  },
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-totais',
    titulo: '4º sinal e reservar',
    texto: 'O total é calculado sozinho. Se o cliente deu sinal, digite o valor e a forma (Pix, dinheiro ou cartão). Depois toque em “Reservar pedido”.',
  },

  // ---- Pedidos
  {
    rota: fixo('/pedidos'),
    alvo: 'pedidos-abas',
    titulo: 'Pedidos',
    texto: 'Os pedidos ficam separados em Reservados (ainda em casa), Na rua (com o cliente) e Devolvidos. Toque num pedido para abrir.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    alvo: 'pedido-etapas',
    titulo: 'Andamento do pedido',
    texto: 'A barra mostra a etapa: Reservado → Na rua → Devolvido. Marcou errado? Aparece “← Voltar para…” logo abaixo.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    alvo: 'pedido-acao',
    titulo: 'Botão principal',
    texto: 'Quando o cliente buscar: “Marcar como retirado”. Quando devolver: “Marcar como devolvido”. O ícone de documento ao lado abre a nota.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    alvo: 'pedido-pagamento',
    titulo: 'Pagamentos',
    texto: 'Veja o que já foi pago e o que falta. “+ Registrar pagamento” já vem com o valor que falta — escolha Pix, dinheiro ou cartão. Lançou errado? Toque no ×.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}/nota` : null),
    alvo: 'nota-acoes',
    titulo: 'Nota para o cliente',
    texto: '“Baixar PDF” abre a impressão — escolha “Salvar como PDF”. “WhatsApp” abre a conversa com o resumo do pedido já escrito: é só conferir e enviar.',
  },

  // ---- Fim
  {
    rota: fixo('/'),
    alvo: 'ajuda',
    titulo: 'Pronto!',
    texto: 'Agora é só usar. Comece pelos “Primeiros passos”. Se quiser ver este tutorial de novo, toque em “Ajuda” aqui em cima.',
  },
];

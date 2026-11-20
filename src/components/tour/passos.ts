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
  /** Mostra um exemplo de mensagem do WhatsApp dentro do balão. */
  previa?: 'lembrete' | 'nota' | 'conflito';
}

const fixo = (r: string) => () => r;

export const passos: Passo[] = [
  // ---- Início
  {
    rota: fixo('/'),
    titulo: (c) => (c.nome ? `Bem-vinda ao ArtDecor, ${c.nome}!` : 'Bem-vinda ao ArtDecor!'),
    texto:
      'Vou te mostrar como o app funciona, tela por tela. Leva uns 13 a 14 minutos — vá no seu ritmo, e dá pra pular quando quiser.\n\nPara ficar mais fácil de entender, durante o tutorial aparecem alguns dados de EXEMPLO — a cliente “Silvia Exemplo”, o “João Exemplo” e umas peças com “(exemplo)” no nome. Eles são só para mostrar e somem sozinhos quando o tutorial terminar. Nada é salvo.',
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
    texto: 'Embaixo de todas as telas fica o menu: Início, Agenda, Estoque, Pedidos e Clientes. Vamos ver cada um.',
  },

  // ---- Agenda
  {
    rota: fixo('/agenda'),
    alvo: 'agenda-calendario',
    titulo: 'Agenda',
    texto: 'O mês inteiro de uma vez. Em cada dia, o número azul é o que SAI (retirada) e o rosa é o que VOLTA (devolução). Toque num dia para ver a lista logo abaixo. As setas trocam de mês.',
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
    rota: fixo('/estoque'),
    alvo: 'contagem-rapida',
    titulo: 'Contagem rápida',
    texto: 'Enquanto houver peças “falta contar”, aparece esta faixa no alto do Estoque (e um aviso no Início). Ela abre as peças sem contagem uma de cada vez: tire a foto, diga quantas tem e o valor, e toque em “Salvar e próxima”. Não dá pra contar alguma agora? Toque em “Pular” e conte outro dia.',
  },
  {
    rota: (c) => (c.primeiroItem ? `/estoque/${c.primeiroItem.id}` : null),
    alvo: 'item-foto',
    titulo: 'Editando um item',
    texto: 'Ao abrir um item, a foto fica no alto: “Tirar foto” abre a câmera e “Galeria” pega uma foto já salva no celular. A foto aparece inteira e ajuda a reconhecer a peça.',
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
  {
    rota: fixo('/clientes'),
    alvo: 'clientes-importar',
    titulo: 'Trazer os clientes da agenda',
    texto: 'Não precisa digitar um por um: em “Importar contatos” você escolhe na agenda do celular quem é cliente (no iPhone, pelo arquivo de contatos .vcf). Entram nome e telefone, e quem já é cliente não entra de novo.\n\nOs importados aparecem com “Completar cadastro”: o endereço e o carro você preenche quando fizer o pedido.',
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
    texto: 'Use − e + para a quantidade, × para tirar, e “+ Adicionar item avulso” para colocar outras peças.',
  },
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-itens',
    titulo: 'Atenção: peça já reservada nas mesmas datas',
    texto:
      'O app confere sozinho se alguma peça já está em outro pedido com datas que se cruzam. Se estiver, aparece um aviso em vermelho embaixo da peça dizendo em qual pedido, de qual cliente e em que datas — como neste exemplo:',
    previa: 'conflito',
  },
  {
    rota: fixo('/pedidos/novo'),
    titulo: 'O que fazer quando aparece o aviso',
    texto:
      '• Peça única (painel, cômoda…): ela só existe uma vez — troque a peça, mude as datas ou combine com o outro cliente.\n• Peça com quantidade (cilindros, toalhas…): o aviso diz quantas sobram livres nessas datas. Diminua a quantidade ou ajuste as datas.\n\nSe mesmo assim quiser salvar (por exemplo, a peça volta de manhã e sai à tarde), o app pede para tocar no botão uma segunda vez, para confirmar. O aviso também aparece dentro do pedido salvo, para ninguém esquecer.',
  },
  {
    rota: fixo('/pedidos/novo'),
    alvo: 'pedido-totais',
    titulo: '4º sinal e reservar',
    texto: 'O total é calculado sozinho. Se o cliente deu sinal, digite o valor e a forma (Pix, dinheiro ou cartão). Depois toque em “Reservar pedido”.',
  },
  {
    rota: fixo('/pedidos/novo'),
    titulo: 'Fechou sem querer? Nada se perde',
    texto: 'Enquanto você preenche um pedido, um cliente, uma peça ou a conferência, o app guarda tudo no celular a cada toque. Se a tela recarregar, o app fechar ou o celular desligar no meio, é só abrir a mesma tela de novo: aparece “Recuperamos o que você estava preenchendo” e está tudo lá. Quer começar do zero? Toque em “Descartar”.\n\nE dentro dos cadastros a tela não recarrega ao puxar para baixo, para não atrapalhar.',
  },
  {
    rota: fixo('/pedidos/novo'),
    titulo: 'Sem internet? Salve do mesmo jeito',
    texto: 'Se a internet cair, aparece uma faixa no topo: “Sem internet”. Pode continuar trabalhando e tocar em Salvar normalmente: o app avisa que ficou guardado no celular.\n\nQuando a internet voltar, ele envia tudo sozinho, na ordem, e mostra “Internet de volta”. Se fechar o app antes, não tem problema: fica guardado e vai na próxima vez que abrir com internet.\n\nAté enviar, só o seu celular vê essas mudanças — nos outros celulares elas aparecem depois.',
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
    alvo: 'pedido-lembrete',
    titulo: 'Lembrete pelo WhatsApp',
    texto: 'Este botão lembra o cliente da retirada (pedido reservado) ou da devolução (pedido na rua). A mensagem já vem pronta, com a data e o valor que falta, se houver.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    titulo: 'Como o lembrete chega no cliente',
    texto: 'Ao tocar no botão, abre o SEU WhatsApp já na conversa do cliente, com o texto pronto. É só tocar na setinha verde de enviar. A mensagem chega como “Lembrete automático” do sistema da ArtDecor — você não precisa escrever nada, e fica claro para o cliente que é um aviso do sistema.\n\nA saudação se ajusta sozinha ao horário em que você envia: de manhã sai “Bom dia”, à tarde “Boa tarde” e à noite “Boa noite”. Vale para todas as mensagens do app. Veja um exemplo:',
    previa: 'lembrete',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    alvo: 'pedido-acao',
    titulo: 'Botão principal',
    texto: 'Quando o cliente buscar: “Marcar como retirado”. Quando ele devolver: “Conferir devolução” — já te explico essa parte. O ícone de documento ao lado abre a nota.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}` : null),
    alvo: 'pedido-pagamento',
    titulo: 'Pagamentos',
    texto: 'Veja o que já foi pago e o que falta. “+ Registrar pagamento” já vem com o valor que falta — escolha Pix, dinheiro ou cartão. Lançou errado? Toque no ×.',
  },
  {
    rota: fixo('/pedidos/exemplo-ped-joao/conferir'),
    alvo: 'conferencia-lista',
    titulo: 'Conferir a devolução',
    texto: 'Quando o cliente devolve, o app abre esta conferência. Olhe peça por peça e toque em “Voltou ok” ou em “Teve problema”. Voltou tudo certo? Toque em “Marcar o resto como ok” e depois em “Concluir devolução”.',
  },
  {
    rota: fixo('/pedidos/exemplo-ped-joao/conferir'),
    titulo: 'Peça quebrada ou faltando',
    texto: 'Em “Teve problema” você diz quantas voltaram estragadas e quantas não voltaram, anota o que aconteceu e, se quiser, o valor a cobrar. Esse valor entra no total do pedido, em “Falta receber”.\n\nO app também pode tirar a peça do estoque, para ninguém reservar algo quebrado, e anota o problema na ficha da peça. Se consertar, é só aumentar a quantidade de novo.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}/nota` : null),
    alvo: 'nota-acoes',
    titulo: 'Nota para o cliente',
    texto: 'Esta é a nota do pedido, com o logo da ArtDecor, os itens, os valores, o Pix e os nomes. Embaixo ficam três botões:\n• Enviar nota no WhatsApp — manda o PDF da nota + o resumo.\n• Só mensagem — abre direto a conversa do cliente, só com o texto (sem o PDF).\n• Baixar PDF — guarda a nota no seu celular.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}/nota` : null),
    titulo: 'Enviando a nota, passo a passo',
    texto:
      '1. Toque em “Enviar nota no WhatsApp” (o botão verde).\n2. Abre a tela de compartilhar do celular: toque no ícone do WhatsApp.\n3. Escolha o cliente na lista (dá para buscar pelo nome) e toque na setinha.\n4. Confira e toque em enviar.\n\nPronto: a nota em PDF e o resumo chegam juntos. Dica: o cliente precisa estar salvo nos contatos do seu WhatsApp para aparecer na lista. Se não estiver, use “Só mensagem”, que abre direto a conversa pelo número.',
  },
  {
    rota: (c) => (c.primeiroPedido ? `/pedidos/${c.primeiroPedido.id}/nota` : null),
    titulo: 'O que o cliente recebe',
    texto: 'No WhatsApp do cliente chegam a nota em PDF (ele toca para abrir) e, junto, o resumo do pedido com os itens, as datas, o total e o que falta pagar, identificado como mensagem automática da ArtDecor. Veja um exemplo:',
    previa: 'nota',
  },

  // ---- Avisos
  {
    rota: fixo('/'),
    alvo: 'avisos',
    titulo: 'Avisos no celular',
    texto: 'Toque em “Avisos” e depois em “Ativar avisos neste celular”. Aí o celular avisa sozinho, mesmo com o app fechado:\n• de manhã, o resumo do dia (o que sai e o que volta);\n• no fim da tarde, quem retira amanhã, pra separar as peças;\n• na manhã seguinte, se alguém atrasou a devolução.\n\nOs avisos são só para você — os clientes não recebem nada.',
  },

  // ---- Fim
  {
    rota: fixo('/'),
    alvo: 'ajuda',
    titulo: 'Pronto!',
    texto: 'Agora é só usar! Os dados de exemplo vão sumir e ficam só os seus. Comece pelos “Primeiros passos”. Se quiser ver este tutorial de novo (com os exemplos), toque em “Ajuda” aqui em cima.\n\nDica: nas listas (Início, Estoque, Pedidos…), puxe a tela para baixo para atualizar.',
  },
];

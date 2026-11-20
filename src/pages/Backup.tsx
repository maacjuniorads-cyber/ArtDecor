import { useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { ehExemplo } from '@/data/exemploTour';
import { buscarTabela, useDados } from '@/data/store';
import { deISO, hojeISO } from '@/lib/formato';
import { faltaReceber, numeroPedido, totalPago, totalPedido } from '@/lib/pedidos';
import { dataPlanilha, gerarPlanilha } from '@/lib/planilha';
import ui from '@/styles/ui.module.css';
import styles from './Backup.module.css';

const rotuloStatus = { reservado: 'Reservado', rua: 'Na rua', devolvido: 'Devolvido', cancelado: 'Cancelado' } as const;

function baixar(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

type Gerando = 'estoque' | 'clientes' | 'pedidos' | 'completa' | null;

export function Backup() {
  const { itens, temas, clientes, pedidos } = useDados();
  const [gerando, setGerando] = useState<Gerando>(null);
  const [erro, setErro] = useState('');
  const sufixo = hojeISO();
  const hoje = deISO(sufixo).toLocaleDateString('pt-BR');

  const nomeTema = (id?: string) => temas.find((t) => t.id === id)?.nome ?? '';
  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '';
  const nomeItem = (id: string) => itens.find((i) => i.id === id)?.nome ?? 'Item removido';

  /** Gera o arquivo mostrando "Gerando…" no botão; em erro, mostra o aviso. */
  async function gerar(qual: Exclude<Gerando, null>, nome: string, montar: () => Promise<Blob>) {
    setErro('');
    setGerando(qual);
    try {
      baixar(nome, await montar());
    } catch (e) {
      setErro(`Não foi possível gerar o arquivo: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGerando(null);
    }
  }

  const planilhaEstoque = () =>
    gerar('estoque', `artdecor-estoque-${sufixo}.xlsx`, () =>
      gerarPlanilha({
        titulo: `ArtDecor — Estoque em ${hoje}`,
        aba: 'Estoque',
        colunas: [
          { titulo: 'Peça', min: 24, max: 42 },
          { titulo: 'Categoria', min: 14 },
          { titulo: 'Tema', min: 12 },
          { titulo: 'Tipo', centro: true, min: 12 },
          { titulo: 'Quantidade', centro: true, min: 13 },
          { titulo: 'Valor do aluguel', tipo: 'moeda', min: 16 },
          { titulo: 'Observações', quebrar: true, min: 30, max: 50 },
          { titulo: 'Excluído', centro: true, min: 10 },
        ],
        linhas: [...itens]
          .filter((i) => !ehExemplo(i.id))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map((i) => [
            i.nome,
            i.categoria,
            nomeTema(i.temaId),
            i.tipo === 'unica' ? 'Peça única' : 'Vários',
            i.quantidadeTotal ?? 'Falta contar',
            i.valorAluguel,
            i.observacoes,
            i.removido ? 'Sim' : '',
          ]),
      }),
    );

  const planilhaClientes = () =>
    gerar('clientes', `artdecor-clientes-${sufixo}.xlsx`, () =>
      gerarPlanilha({
        titulo: `ArtDecor — Clientes em ${hoje}`,
        aba: 'Clientes',
        colunas: [
          { titulo: 'Nome', min: 22, max: 36 },
          { titulo: 'Telefone', min: 17 },
          { titulo: 'WhatsApp', min: 17 },
          { titulo: 'Endereço', quebrar: true, min: 30, max: 45 },
          { titulo: 'Veículo', min: 20 },
          { titulo: 'Placa', centro: true, min: 11 },
          { titulo: 'Pedidos', tipo: 'numero', centro: true, min: 10 },
          { titulo: 'Excluído', centro: true, min: 10 },
        ],
        linhas: [...clientes]
          .filter((c) => !ehExemplo(c.id))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map((c) => [
            c.nome,
            c.telefone,
            c.whatsapp ?? c.telefone,
            c.endereco,
            c.veiculo ? `${c.veiculo.tipo} ${c.veiculo.modelo} ${c.veiculo.cor}`.trim() : 'Sem veículo',
            c.veiculo?.placa,
            pedidos.filter((p) => p.clienteId === c.id && p.status !== 'cancelado').length,
            c.removido ? 'Sim' : '',
          ]),
      }),
    );

  const planilhaPedidos = () =>
    gerar('pedidos', `artdecor-pedidos-${sufixo}.xlsx`, () =>
      gerarPlanilha({
        titulo: `ArtDecor — Pedidos em ${hoje}`,
        aba: 'Pedidos',
        colunas: [
          { titulo: 'Nº', centro: true, min: 8 },
          { titulo: 'Cliente', min: 20, max: 32 },
          { titulo: 'Evento', min: 18, max: 30 },
          { titulo: 'Retirada', tipo: 'data', centro: true, min: 12 },
          { titulo: 'Devolução', tipo: 'data', centro: true, min: 12 },
          { titulo: 'Situação', centro: true, min: 12 },
          { titulo: 'Itens', quebrar: true, min: 40, max: 60 },
          { titulo: 'Total', tipo: 'moeda', somar: true, min: 13 },
          { titulo: 'Pago', tipo: 'moeda', somar: true, min: 13 },
          { titulo: 'Falta receber', tipo: 'moeda', somar: true, min: 15 },
        ],
        linhas: [...pedidos]
          .filter((p) => !ehExemplo(p.id))
          .sort((a, b) => a.numero - b.numero)
          .map((p) => [
            numeroPedido(p),
            nomeCliente(p.clienteId),
            p.evento,
            dataPlanilha(p.retirada),
            dataPlanilha(p.devolucao),
            rotuloStatus[p.status],
            // Uma peça por linha dentro da célula.
            [...p.itens.map((i) => `${i.quantidade}× ${nomeItem(i.itemId)}`), ...p.cobrancas.map((c) => `Cobrança: ${c.descricao}`)].join('\n'),
            totalPedido(p),
            totalPago(p),
            faltaReceber(p),
          ]),
      }),
    );

  const copiaCompleta = () =>
    gerar('completa', `artdecor-copia-completa-${sufixo}.json`, async () => {
      // Direto do banco, no mesmo formato da cópia automática (serve para restaurar).
      const tabelas = ['temas', 'itens', 'clientes', 'pedidos'] as const;
      const listas = await Promise.all(tabelas.map(buscarTabela));
      const dados = Object.fromEntries(tabelas.map((t, i) => [t, listas[i]]));
      const resumo = Object.fromEntries(tabelas.map((t, i) => [t, listas[i].length]));
      const json = JSON.stringify({ app: 'ArtDecor', versao: 1, geradoEm: new Date().toISOString(), resumo, dados }, null, 2);
      return new Blob([json], { type: 'application/json' });
    });

  const botao = (qual: Exclude<Gerando, null>, texto: string) => (gerando === qual ? 'Gerando…' : texto);

  return (
    <>
      <Cabecalho titulo="Cópia de segurança" voltarPara="/" />
      <div className={styles.conteudo}>
        <section className={`${ui.cartao} ${styles.auto}`}>
          <b>✓ Cópia automática todo dia</b>
          <p>
            Todas as manhãs uma cópia completa dos dados é guardada, protegida com senha, por 90 dias. Você não precisa fazer nada.
          </p>
        </section>

        <section>
          <h2 className={ui.secao}>Baixar agora, para o seu celular ou computador</h2>
          <p className={ui.detalhe}>As planilhas são do Excel (.xlsx) e abrem também no Google Planilhas.</p>
          <div className={styles.botoes}>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaEstoque} disabled={gerando !== null}>
              <Icon name="baixar" size={20} /> {botao('estoque', 'Planilha do estoque')}
            </button>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaClientes} disabled={gerando !== null}>
              <Icon name="baixar" size={20} /> {botao('clientes', 'Planilha de clientes')}
            </button>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaPedidos} disabled={gerando !== null}>
              <Icon name="baixar" size={20} /> {botao('pedidos', 'Planilha de pedidos')}
            </button>
            <button type="button" className={ui.botaoPrimario} onClick={copiaCompleta} disabled={gerando !== null}>
              <Icon name="baixar" size={20} /> {botao('completa', 'Cópia completa (para restaurar)')}
            </button>
          </div>
          {erro && (
            <p className={ui.erro} role="alert">
              {erro}
            </p>
          )}
        </section>

        <p className={styles.nota}>
          Essas cópias têm nomes e telefones dos clientes. Guarde em um lugar seguro e não compartilhe.
        </p>
      </div>
    </>
  );
}

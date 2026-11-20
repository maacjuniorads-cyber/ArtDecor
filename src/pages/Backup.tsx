import { useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { buscarTabela, useDados } from '@/data/store';
import { deISO, hojeISO } from '@/lib/formato';
import { numeroPedido, totalPago, totalPedido } from '@/lib/pedidos';
import ui from '@/styles/ui.module.css';
import styles from './Backup.module.css';

const rotuloStatus = { reservado: 'Reservado', rua: 'Na rua', devolvido: 'Devolvido', cancelado: 'Cancelado' } as const;

/** Monta um CSV que abre certinho no Excel em português (separador ; e acentos). */
function csv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  const campo = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(campo).join(';')).join('\r\n');
}

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const dataBR = (iso: string) => deISO(iso).toLocaleDateString('pt-BR');

export function Backup() {
  const { itens, temas, clientes, pedidos } = useDados();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const sufixo = hojeISO();

  const nomeTema = (id?: string) => temas.find((t) => t.id === id)?.nome ?? '';
  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '';
  const nomeItem = (id: string) => itens.find((i) => i.id === id)?.nome ?? 'Item removido';

  function planilhaEstoque() {
    baixar(
      `artdecor-estoque-${sufixo}.csv`,
      csv(
        ['Nome', 'Categoria', 'Tema', 'Tipo', 'Quantidade', 'Valor do aluguel', 'Observações', 'Excluído'],
        [...itens]
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
      ),
      'text/csv;charset=utf-8',
    );
  }

  function planilhaClientes() {
    baixar(
      `artdecor-clientes-${sufixo}.csv`,
      csv(
        ['Nome', 'Telefone', 'WhatsApp', 'Endereço', 'Veículo', 'Placa', 'Excluído'],
        [...clientes]
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map((c) => [
            c.nome,
            c.telefone,
            c.whatsapp ?? c.telefone,
            c.endereco,
            c.veiculo ? `${c.veiculo.tipo} ${c.veiculo.modelo} ${c.veiculo.cor}`.trim() : 'Sem veículo',
            c.veiculo?.placa,
            c.removido ? 'Sim' : '',
          ]),
      ),
      'text/csv;charset=utf-8',
    );
  }

  function planilhaPedidos() {
    baixar(
      `artdecor-pedidos-${sufixo}.csv`,
      csv(
        ['Número', 'Cliente', 'Evento', 'Retirada', 'Devolução', 'Situação', 'Itens', 'Total', 'Pago', 'Falta'],
        [...pedidos]
          .sort((a, b) => a.numero - b.numero)
          .map((p) => {
            const total = totalPedido(p);
            const pago = totalPago(p);
            return [
              numeroPedido(p),
              nomeCliente(p.clienteId),
              p.evento,
              dataBR(p.retirada),
              dataBR(p.devolucao),
              rotuloStatus[p.status],
              p.itens.map((i) => `${i.quantidade}× ${nomeItem(i.itemId)}`).join(', '),
              total,
              pago,
              p.status === 'cancelado' ? 0 : Math.max(0, total - pago),
            ];
          }),
      ),
      'text/csv;charset=utf-8',
    );
  }

  async function copiaCompleta() {
    setErro('');
    setGerando(true);
    try {
      // Direto do banco, no mesmo formato da cópia automática (serve para restaurar).
      const tabelas = ['temas', 'itens', 'clientes', 'pedidos'] as const;
      const listas = await Promise.all(tabelas.map(buscarTabela));
      const dados = Object.fromEntries(tabelas.map((t, i) => [t, listas[i]]));
      const resumo = Object.fromEntries(tabelas.map((t, i) => [t, listas[i].length]));
      baixar(
        `artdecor-copia-completa-${sufixo}.json`,
        JSON.stringify({ app: 'ArtDecor', versao: 1, geradoEm: new Date().toISOString(), resumo, dados }, null, 2),
        'application/json',
      );
    } catch (e) {
      setErro(`Não foi possível gerar a cópia: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGerando(false);
    }
  }

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
          <p className={ui.detalhe}>As planilhas abrem no Excel ou no Google Planilhas.</p>
          <div className={styles.botoes}>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaEstoque}>
              <Icon name="baixar" size={20} /> Planilha do estoque
            </button>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaClientes}>
              <Icon name="baixar" size={20} /> Planilha de clientes
            </button>
            <button type="button" className={ui.botaoSecundario} onClick={planilhaPedidos}>
              <Icon name="baixar" size={20} /> Planilha de pedidos
            </button>
            <button type="button" className={ui.botaoPrimario} onClick={copiaCompleta} disabled={gerando}>
              <Icon name="baixar" size={20} /> {gerando ? 'Gerando…' : 'Cópia completa (para restaurar)'}
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

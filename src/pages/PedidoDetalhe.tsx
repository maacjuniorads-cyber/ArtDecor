import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { ZonaExclusao } from '@/components/ZonaExclusao';
import { novoId, useDados } from '@/data/store';
import { lerValor, linkWhatsApp, valorParaCampo } from '@/lib/contato';
import { deISO, formatarMoeda, hojeISO, rotuloDia } from '@/lib/formato';
import { conflitosDoItem, livresNoPeriodo } from '@/lib/estoque';
import { lembreteDevolucao, lembreteRetirada } from '@/lib/mensagens';
import { descreverProblema } from '@/lib/conferencia';
import { faltaReceber, numeroPedido, totalItens, totalPago, totalPedido } from '@/lib/pedidos';
import { FORMAS_PAGAMENTO, type FormaPagamento, type Pedido, type StatusPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './PedidoDetalhe.module.css';

const etapas: { status: StatusPedido; rotulo: string }[] = [
  { status: 'reservado', rotulo: 'Reservado' },
  { status: 'rua', rotulo: 'Na rua' },
  { status: 'devolvido', rotulo: 'Devolvido' },
];

type Acao = { para: StatusPedido; texto: string } | null;

const proximaAcao: Record<StatusPedido, Acao> = {
  reservado: { para: 'rua', texto: 'Marcar como retirado' },
  rua: { para: 'devolvido', texto: 'Marcar como devolvido' },
  devolvido: null,
  cancelado: { para: 'reservado', texto: 'Reativar pedido' },
};

const voltarAcao: Record<StatusPedido, Acao> = {
  reservado: null,
  rua: { para: 'reservado', texto: 'Voltar para Reservado' },
  devolvido: { para: 'rua', texto: 'Voltar para Na rua' },
  cancelado: null,
};

function dataComDia(iso: string) {
  return `${rotuloDia(iso)} ${deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

export function PedidoDetalhe() {
  const { id } = useParams();
  const { pedidos, clientes, itens, temas, mudarStatus, salvarPedido } = useDados();
  const pedido = pedidos.find((p) => p.id === id);

  if (!pedido) {
    return (
      <>
        <Cabecalho titulo="Pedido" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  const cliente = clientes.find((c) => c.id === pedido.clienteId);
  const cancelado = pedido.status === 'cancelado';
  const etapaAtual = etapas.findIndex((e) => e.status === pedido.status);
  const acao = proximaAcao[pedido.status];
  const voltar = voltarAcao[pedido.status];
  const nomesTemas = pedido.temaIds.map((t) => temas.find((x) => x.id === t)?.nome).filter(Boolean);
  const veiculo = cliente?.veiculo;
  const podeEditar = pedido.status === 'reservado' || pedido.status === 'rua';

  // Lembrete por WhatsApp: retirada (reservado) ou devolução (na rua).
  const lembrete =
    pedido.status === 'reservado'
      ? { texto: 'Lembrar retirada no WhatsApp', mensagem: lembreteRetirada(pedido, cliente) }
      : pedido.status === 'rua'
        ? { texto: 'Lembrar devolução no WhatsApp', mensagem: lembreteDevolucao(pedido, cliente) }
        : null;

  // Peças que, além de neste pedido, estão em outro pedido ativo com datas que se cruzam
  // e não há unidades suficientes para os dois.
  const conflitos = podeEditar
    ? pedido.itens.flatMap((ip) => {
        const it = itens.find((i) => i.id === ip.itemId);
        if (!it) return [];
        const lista = conflitosDoItem(ip.itemId, pedido, pedidos, pedido.id);
        const livres = livresNoPeriodo(it, lista);
        if (livres === null || ip.quantidade <= livres) return [];
        return lista.map((conflito) => ({ item: it.nome, conflito }));
      })
    : [];

  return (
    <>
      <Cabecalho
        titulo={`Pedido ${numeroPedido(pedido)}`}
        voltarPara="/pedidos"
        extra={
          podeEditar && (
            <Link to={`/pedidos/${pedido.id}/editar`} className={ui.botaoTexto}>
              Editar
            </Link>
          )
        }
      />

      <div className={styles.conteudo}>
        {cancelado ? (
          <p className={styles.cancelado} role="status">
            Pedido cancelado. Os itens não estão reservados.
          </p>
        ) : (
          <>
            <ol className={`${ui.cartao} ${styles.etapas}`} aria-label="Andamento do pedido" data-tour="pedido-etapas">
              {etapas.map((e, i) => (
                <li key={e.status} className={styles.etapa} data-feita={i <= etapaAtual} data-tom={pedido.status} aria-current={i === etapaAtual ? 'step' : undefined}>
                  <span className={styles.barraEtapa} />
                  {e.rotulo}
                </li>
              ))}
            </ol>
            {voltar && (
              <button type="button" className={`${ui.botaoTexto} ${styles.voltarStatus}`} onClick={() => mudarStatus(pedido.id, voltar.para)}>
                ← {voltar.texto}
              </button>
            )}
          </>
        )}

        <section>
          <h2 className={ui.secao}>Cliente</h2>
          <div className={`${ui.cartao} ${styles.cliente}`}>
            <Link to={cliente && !cliente.removido ? `/clientes/${cliente.id}` : '/clientes'} className={styles.clienteLink}>
              <span className={ui.nome}>{cliente?.nome ?? 'Cliente removido'}</span>
              <span className={ui.detalhe}>
                {cliente?.telefone}
                {veiculo ? ` · ${veiculo.modelo} ${veiculo.cor} ${veiculo.placa}`.trimEnd() : cliente ? ' · sem veículo' : ''}
              </span>
            </Link>
            {cliente && (
              <a href={linkWhatsApp(cliente.whatsapp ?? cliente.telefone)} target="_blank" rel="noreferrer" className={styles.whats} aria-label={`Chamar ${cliente.nome} no WhatsApp`}>
                <Icon name="telefone" size={22} />
              </a>
            )}
          </div>
          {cliente && lembrete && (
            <a
              href={linkWhatsApp(cliente.whatsapp ?? cliente.telefone, lembrete.mensagem)}
              target="_blank"
              rel="noreferrer"
              className={`${ui.botaoSecundario} ${styles.lembrete}`}
              data-tour="pedido-lembrete"
            >
              <Icon name="telefone" size={20} />
              {lembrete.texto}
            </a>
          )}
        </section>

        {conflitos.length > 0 && (
          <section className={styles.conflito} role="alert">
            <b>Atenção: peças reservadas em outro pedido nas mesmas datas</b>
            <ul>
              {conflitos.map(({ item, conflito }) => (
                <li key={`${item}-${conflito.pedido.id}`}>
                  <Link to={`/pedidos/${conflito.pedido.id}`}>
                    {item} — {numeroPedido(conflito.pedido)} {clientes.find((c) => c.id === conflito.pedido.clienteId)?.nome.split(' ')[0] ?? ''} (
                    {deISO(conflito.pedido.retirada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}–
                    {deISO(conflito.pedido.devolucao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={ui.grade2}>
          <div className={ui.cartao}>
            <div className={styles.rotuloData} data-tom="rua">Retira</div>
            <div className={styles.data}>{dataComDia(pedido.retirada)}</div>
          </div>
          <div className={ui.cartao}>
            <div className={styles.rotuloData} data-tom="alerta">Devolve</div>
            <div className={styles.data}>{dataComDia(pedido.devolucao)}</div>
          </div>
        </section>

        <section>
          <h2 className={ui.secao}>
            Itens{pedido.evento ? ` · ${pedido.evento}` : ''}
            {nomesTemas.length > 0 ? ` · tema ${nomesTemas.join(', ')}` : ''}
          </h2>
          <div className={ui.tabela}>
            {pedido.itens.map((ip) => {
              const item = itens.find((i) => i.id === ip.itemId);
              return (
                <div key={ip.itemId} className={ui.linhaTabela}>
                  <span>
                    <b>{ip.quantidade}×</b> {item?.nome ?? 'Item removido'}
                  </span>
                  <span>{formatarMoeda(ip.quantidade * ip.valorUnitario)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {pedido.conferencia && (
          <section data-tour="pedido-conferencia">
            <h2 className={ui.secao}>Devolução</h2>
            <div className={`${ui.cartao} ${styles.conferencia}`}>
              <span className={ui.detalhe}>
                Conferida por {pedido.conferencia.por} em{' '}
                {deISO(pedido.conferencia.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
              {pedido.conferencia.problemas.length === 0 ? (
                <b className={styles.quitado}>✓ Tudo voltou certinho</b>
              ) : (
                <ul className={styles.problemas}>
                  {pedido.conferencia.problemas.map((p) => (
                    <li key={p.itemId}>
                      <b>{itens.find((i) => i.id === p.itemId)?.nome ?? 'Item removido'}</b>: {descreverProblema(p)}
                      {p.obs && ` — ${p.obs}`}
                      {p.descontado > 0 && <span className={ui.detalhe}> (tirada do estoque)</span>}
                    </li>
                  ))}
                </ul>
              )}
              {pedido.conferencia.observacao && <span className={styles.obsConferencia}>{pedido.conferencia.observacao}</span>}
              {pedido.status === 'devolvido' && (
                <Link to={`/pedidos/${pedido.id}/conferir`} className={`${ui.botaoTexto} ${styles.refazer}`}>
                  Corrigir conferência
                </Link>
              )}
            </div>
          </section>
        )}

        <Pagamentos pedido={pedido} onSalvar={salvarPedido} />

        {pedido.status === 'reservado' && (
          <ZonaExclusao
            rotulo="Cancelar pedido"
            confirmacao="Cancelar este pedido? Os itens voltam a ficar livres. Dá pra reativar depois, se precisar."
            textoConfirmar="Sim, cancelar"
            onConfirmar={() => mudarStatus(pedido.id, 'cancelado')}
          />
        )}
      </div>

      <div className={ui.barraAcao} data-tour="pedido-acao">
        <Link to={`/pedidos/${pedido.id}/nota`} className={ui.botaoIcone} aria-label="Ver nota do pedido">
          <Icon name="documento" />
        </Link>
        {pedido.status === 'rua' ? (
          // Devolução passa pela conferência peça por peça.
          <Link to={`/pedidos/${pedido.id}/conferir`} className={ui.botaoPrimario}>
            Conferir devolução
          </Link>
        ) : acao ? (
          <button type="button" className={ui.botaoPrimario} onClick={() => mudarStatus(pedido.id, acao.para)}>
            {acao.texto}
          </button>
        ) : (
          <button type="button" className={ui.botaoPrimario} disabled>
            Pedido concluído
          </button>
        )}
      </div>
    </>
  );
}

function Pagamentos({ pedido, onSalvar }: { pedido: Pedido; onSalvar: (p: Pedido) => Promise<boolean> }) {
  const falta = faltaReceber(pedido);
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [erro, setErro] = useState('');

  function abrir() {
    setValor(valorParaCampo(falta));
    setForma('Pix');
    setErro('');
    setAberto(true);
  }

  async function registrar() {
    const n = lerValor(valor);
    if (n === null || n <= 0) return setErro('Informe um valor válido (ex.: 85,00).');
    const ok = await onSalvar({ ...pedido, pagamentos: [...pedido.pagamentos, { id: novoId(), valor: n, data: hojeISO(), forma }] });
    if (ok) setAberto(false);
  }

  function removerCobranca(cobrancaId: string) {
    onSalvar({ ...pedido, cobrancas: pedido.cobrancas.filter((c) => c.id !== cobrancaId) });
  }

  function remover(pagamentoId: string) {
    onSalvar({ ...pedido, pagamentos: pedido.pagamentos.filter((p) => p.id !== pagamentoId) });
  }

  return (
    <section data-tour="pedido-pagamento">
      <h2 className={ui.secao}>Pagamento</h2>
      <div className={`${ui.cartao} ${styles.totais}`}>
        <div>
          <span className={ui.detalhe}>{pedido.cobrancas.length > 0 ? 'Aluguel das peças' : 'Total do pedido'}</span>
          <b className={pedido.cobrancas.length > 0 ? undefined : styles.total}>{formatarMoeda(pedido.cobrancas.length > 0 ? totalItens(pedido) : totalPedido(pedido))}</b>
        </div>

        {pedido.cobrancas.map((c) => (
          <div key={c.id} className={styles.pagamento}>
            <span className={ui.detalhe}>Cobrança · {c.descricao}</span>
            <span className={styles.pagamentoValor}>
              <span>{formatarMoeda(c.valor)}</span>
              <button type="button" className={styles.removerPagamento} onClick={() => removerCobranca(c.id)} aria-label={`Remover cobrança de ${formatarMoeda(c.valor)}`}>
                ×
              </button>
            </span>
          </div>
        ))}
        {pedido.cobrancas.length > 0 && (
          <div>
            <span className={ui.detalhe}>Total do pedido</span>
            <b className={styles.total}>{formatarMoeda(totalPedido(pedido))}</b>
          </div>
        )}

        {pedido.pagamentos.map((p, i) => (
          <div key={p.id} className={styles.pagamento}>
            <span className={ui.detalhe}>
              {i === 0 ? 'Sinal' : 'Pagamento'} · {p.forma} · {deISO(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <span className={styles.pagamentoValor}>
              <span className={styles.pago}>{formatarMoeda(p.valor)}</span>
              <button type="button" className={styles.removerPagamento} onClick={() => remover(p.id)} aria-label={`Remover pagamento de ${formatarMoeda(p.valor)}`}>
                ×
              </button>
            </span>
          </div>
        ))}
        {pedido.pagamentos.length === 0 && <span className={ui.detalhe}>Nenhum pagamento ainda.</span>}

        <div className={styles.falta}>
          <b>{pedido.status === 'cancelado' ? 'Pago' : 'Falta receber'}</b>
          <b className={styles.valorFalta}>{formatarMoeda(pedido.status === 'cancelado' ? totalPago(pedido) : falta)}</b>
        </div>

        {pedido.status !== 'cancelado' && falta > 0 && !aberto && (
          <button type="button" className={ui.botaoSecundario} onClick={abrir}>
            + Registrar pagamento
          </button>
        )}
        {pedido.status !== 'cancelado' && falta === 0 && pedido.pagamentos.length > 0 && <span className={styles.quitado}>✓ Pedido pago</span>}

        {aberto && (
          <div className={styles.novoPagamento}>
            <div className={ui.grade2}>
              <label className={ui.campo}>
                <span className={ui.rotulo}>Valor</span>
                <span className={`${ui.input} ${ui.prefixo}`}>
                  <span>R$</span>
                  <input className={styles.semBorda} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
                </span>
              </label>
              <label className={ui.campo}>
                <span className={ui.rotulo}>Forma</span>
                <select className={ui.input} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            </div>
            {erro && (
              <p className={ui.erro} role="alert">
                {erro}
              </p>
            )}
            <div className={styles.botoesPagamento}>
              <button type="button" className={ui.botaoSecundario} onClick={() => setAberto(false)}>
                Cancelar
              </button>
              <button type="button" className={ui.botaoPrimario} onClick={registrar}>
                Registrar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

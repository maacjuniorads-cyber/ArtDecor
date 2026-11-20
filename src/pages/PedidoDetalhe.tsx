import { Link, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { linkWhatsApp } from '@/lib/contato';
import { deISO, formatarMoeda, rotuloDia } from '@/lib/formato';
import { faltaReceber, totalPedido } from '@/lib/pedidos';
import type { StatusPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './PedidoDetalhe.module.css';

const etapas: { status: StatusPedido; rotulo: string }[] = [
  { status: 'reservado', rotulo: 'Reservado' },
  { status: 'rua', rotulo: 'Na rua' },
  { status: 'devolvido', rotulo: 'Devolvido' },
];

const proximaAcao: Record<StatusPedido, { para: StatusPedido; texto: string } | null> = {
  reservado: { para: 'rua', texto: 'Marcar como retirado' },
  rua: { para: 'devolvido', texto: 'Marcar como devolvido' },
  devolvido: null,
};

const voltarAcao: Record<StatusPedido, { para: StatusPedido; texto: string } | null> = {
  reservado: null,
  rua: { para: 'reservado', texto: 'Voltar para Reservado' },
  devolvido: { para: 'rua', texto: 'Voltar para Na rua' },
};

function dataComDia(iso: string) {
  return `${rotuloDia(iso)} ${deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

export function PedidoDetalhe() {
  const { id } = useParams();
  const { pedidos, clientes, itens, temas, mudarStatus } = useDados();
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
  const etapaAtual = etapas.findIndex((e) => e.status === pedido.status);
  const acao = proximaAcao[pedido.status];
  const voltar = voltarAcao[pedido.status];
  const nomesTemas = pedido.temaIds.map((t) => temas.find((x) => x.id === t)?.nome).filter(Boolean);
  const veiculo = cliente?.veiculo;

  return (
    <>
      <Cabecalho titulo={`Pedido #${String(pedido.numero).padStart(4, '0')}`} voltarPara="/pedidos" />

      <div className={styles.conteudo}>
        <ol className={`${ui.cartao} ${styles.etapas}`} aria-label="Andamento do pedido">
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

        <section>
          <h2 className={ui.secao}>Cliente</h2>
          <div className={`${ui.cartao} ${styles.cliente}`}>
            <Link to={cliente ? `/clientes/${cliente.id}` : '/clientes'} className={styles.clienteLink}>
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
        </section>

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

        <section className={`${ui.cartao} ${styles.totais}`}>
          <div>
            <span className={ui.detalhe}>Total</span>
            <b className={styles.total}>{formatarMoeda(totalPedido(pedido))}</b>
          </div>
          <div>
            <span className={ui.detalhe}>Sinal pago</span>
            <span className={styles.pago}>{formatarMoeda(pedido.sinal)}</span>
          </div>
          <div className={styles.falta}>
            <b>Falta receber</b>
            <b className={styles.valorFalta}>{formatarMoeda(faltaReceber(pedido))}</b>
          </div>
        </section>
      </div>

      <div className={ui.barraAcao}>
        <Link to={`/pedidos/${pedido.id}/nota`} className={ui.botaoIcone} aria-label="Ver nota do pedido">
          <Icon name="documento" />
        </Link>
        {acao ? (
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

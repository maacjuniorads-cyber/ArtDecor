import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { deISO, formatarMoeda, rotuloDia } from '@/lib/formato';
import { faltaReceber, quantidadeDeItens, totalPago, totalPedido } from '@/lib/pedidos';
import type { Pedido, StatusPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './Pedidos.module.css';

const abas: { status: StatusPedido; rotulo: string }[] = [
  { status: 'reservado', rotulo: 'Reservados' },
  { status: 'rua', rotulo: 'Na rua' },
  { status: 'devolvido', rotulo: 'Devolvidos' },
];

function dataComDia(iso: string) {
  const d = deISO(iso);
  return `${rotuloDia(iso)} ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

function SituacaoPagamento({ pedido }: { pedido: Pedido }) {
  if (pedido.status === 'cancelado') return <Badge tom="cancelado">Cancelado</Badge>;
  const falta = faltaReceber(pedido);
  if (falta === 0) return <Badge tom="devolvido">Pago</Badge>;
  if (totalPago(pedido) === 0) return <Badge tom="alerta">Sem sinal</Badge>;
  return <Badge tom="reservado">Falta {formatarMoeda(falta)}</Badge>;
}

export function Pedidos() {
  const { pedidos, clientes } = useDados();
  const [params, setParams] = useSearchParams();
  const pedido = params.get('status');
  const status: StatusPedido = pedido === 'cancelado' ? 'cancelado' : (abas.find((a) => a.status === pedido)?.status ?? 'reservado');
  const qtdCancelados = pedidos.filter((p) => p.status === 'cancelado').length;

  const daAba = pedidos
    .filter((p) => p.status === status)
    .sort((a, b) => {
      if (status === 'rua') return a.devolucao.localeCompare(b.devolucao);
      if (status === 'reservado') return a.retirada.localeCompare(b.retirada);
      return b.retirada.localeCompare(a.retirada); // devolvidos e cancelados: mais recentes primeiro
    });

  return (
    <>
      <h1 className={ui.tituloPagina}>Pedidos</h1>
      <div className={`${ui.segmentado} ${styles.abas}`} role="tablist" aria-label="Status do pedido">
        {abas.map((a) => (
          <button key={a.status} type="button" role="tab" className={ui.segmento} aria-selected={a.status === status} onClick={() => setParams({ status: a.status }, { replace: true })}>
            {a.rotulo} ({pedidos.filter((p) => p.status === a.status).length})
          </button>
        ))}
      </div>

      {status === 'cancelado' && <h2 className={`${ui.secao} ${styles.tituloCancelados}`}>Pedidos cancelados</h2>}

      {daAba.length === 0 ? (
        <p className={ui.vazio}>Nenhum pedido aqui.</p>
      ) : (
        <ul className={ui.lista}>
          {daAba.map((p) => {
            const cliente = clientes.find((c) => c.id === p.clienteId);
            return (
              <li key={p.id}>
                <Link to={`/pedidos/${p.id}`} className={`${ui.linhaCartao} ${styles.pedido}`}>
                  <span className={styles.topo}>
                    <span className={ui.nome}>{cliente?.nome ?? 'Cliente removido'}</span>
                    <span className={ui.detalhe}>#{String(p.numero).padStart(4, '0')}</span>
                  </span>
                  <span className={ui.detalhe}>
                    {p.evento ? `${p.evento} · ` : ''}
                    {quantidadeDeItens(p)} itens
                  </span>
                  <span className={styles.datas}>
                    <Icon name="calendario" size={18} />
                    <span>
                      <b>{dataComDia(p.retirada)}</b> → <b>{dataComDia(p.devolucao)}</b>
                    </span>
                  </span>
                  <span className={styles.rodape}>
                    <span className={styles.total}>{formatarMoeda(totalPedido(p))}</span>
                    <SituacaoPagamento pedido={p} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {status !== 'cancelado' && qtdCancelados > 0 && (
        <button type="button" className={`${ui.botaoTexto} ${styles.verCancelados}`} onClick={() => setParams({ status: 'cancelado' }, { replace: true })}>
          Ver pedidos cancelados ({qtdCancelados})
        </button>
      )}

      <Link to="/pedidos/novo" className={ui.fab} aria-label="Novo pedido">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { deISO, formatarMoeda, rotuloDia } from '@/lib/formato';
import { faltaReceber, quantidadeDeItens, totalPedido } from '@/lib/pedidos';
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
  const falta = faltaReceber(pedido);
  if (falta === 0) return <Badge tom="devolvido">Pago</Badge>;
  if (pedido.sinal === 0) return <Badge tom="alerta">Sem sinal</Badge>;
  return <Badge tom="reservado">Falta {formatarMoeda(falta)}</Badge>;
}

export function Pedidos() {
  const { pedidos, clientes } = useDados();
  const [params, setParams] = useSearchParams();
  const status = (abas.find((a) => a.status === params.get('status'))?.status ?? 'reservado') as StatusPedido;

  const daAba = pedidos
    .filter((p) => p.status === status)
    .sort((a, b) =>
      status === 'devolvido' ? b.devolucao.localeCompare(a.devolucao) : (status === 'rua' ? a.devolucao : a.retirada).localeCompare(status === 'rua' ? b.devolucao : b.retirada),
    );

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

      <Link to="/pedidos/novo" className={ui.fab} aria-label="Novo pedido">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

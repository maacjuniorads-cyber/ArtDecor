import { useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { linkWhatsApp } from '@/lib/contato';
import { empresa } from '@/lib/empresa';
import { deISO, formatarMoeda, hojeISO } from '@/lib/formato';
import { faltaReceber, totalPedido } from '@/lib/pedidos';
import ui from '@/styles/ui.module.css';
import styles from './Nota.module.css';

const dataLonga = (iso: string) =>
  deISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const dataCurta = (iso: string) => deISO(iso).toLocaleDateString('pt-BR');
const numeroBR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Nota() {
  const { id } = useParams();
  const { pedidos, clientes, itens, temas } = useDados();
  const pedido = pedidos.find((p) => p.id === id);

  if (!pedido) {
    return (
      <>
        <Cabecalho titulo="Nota" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  const cliente = clientes.find((c) => c.id === pedido.clienteId);
  const numero = String(pedido.numero).padStart(4, '0');
  const total = totalPedido(pedido);
  const falta = faltaReceber(pedido);
  const nomeItem = (itemId: string) => itens.find((i) => i.id === itemId)?.nome ?? 'Item';
  const nomesTemas = pedido.temaIds.map((t) => temas.find((x) => x.id === t)?.nome).filter(Boolean);
  const evento = [pedido.evento, nomesTemas.length ? `tema ${nomesTemas.join(', ')}` : ''].filter(Boolean).join(' · ');

  const mensagem = [
    `Olá${cliente ? `, ${cliente.nome.split(' ')[0]}` : ''}! Segue o resumo do seu pedido nº ${numero} na ${empresa.nome}:`,
    '',
    ...pedido.itens.map((i) => `• ${i.quantidade}× ${nomeItem(i.itemId)} — ${formatarMoeda(i.quantidade * i.valorUnitario)}`),
    '',
    `Retirada: ${dataCurta(pedido.retirada)}`,
    `Devolução: ${dataCurta(pedido.devolucao)}`,
    '',
    `Total: ${formatarMoeda(total)}`,
    pedido.sinal > 0 ? `Sinal pago: ${formatarMoeda(pedido.sinal)}` : '',
    `A pagar: ${formatarMoeda(falta)}`,
    '',
    `Pix: ${empresa.pixChave} (${empresa.pixTitular})`,
  ]
    .filter((linha, i, arr) => linha !== '' || arr[i - 1] !== '')
    .join('\n');

  return (
    <>
      <div className={styles.naoImprimir}>
        <Cabecalho titulo="Nota do pedido" voltarPara={`/pedidos/${pedido.id}`} />
      </div>

      <article className={styles.documento} aria-label={`Nota de locação ${numero}`}>
        <header className={styles.topo}>
          <div>
            <div className={styles.logo}>{empresa.nome}</div>
            <div className={styles.miudo}>{empresa.descricao}</div>
            <div className={styles.miudo}>{empresa.telefone}</div>
          </div>
          <div className={styles.direita}>
            <div className={styles.rotulo}>Nota de locação</div>
            <div className={styles.numero}>Nº {numero}</div>
            <div className={styles.miudo}>Emitida em {dataCurta(hojeISO())}</div>
          </div>
        </header>
        <div className={styles.linhaMarca} />

        <section className={styles.dados}>
          <div>
            <div className={styles.rotulo}>Cliente</div>
            <div className={styles.forte}>{cliente?.nome ?? '—'}</div>
            {cliente?.telefone && <div className={styles.pequeno}>{cliente.telefone}</div>}
            {cliente?.endereco && <div className={styles.pequeno}>{cliente.endereco}</div>}
          </div>
          <div>
            <div className={styles.rotulo}>Evento</div>
            <div className={styles.forte}>{evento || '—'}</div>
            <div className={styles.pequeno}>Retira: {dataLonga(pedido.retirada)}</div>
            <div className={styles.pequeno}>Devolve: {dataLonga(pedido.devolucao)}</div>
          </div>
        </section>

        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Qtd</th>
              <th scope="col">Unit.</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i) => (
              <tr key={i.itemId}>
                <td>{nomeItem(i.itemId)}</td>
                <td>{i.quantidade}</td>
                <td>{numeroBR(i.valorUnitario)}</td>
                <td>{numeroBR(i.quantidade * i.valorUnitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totais}>
          <div>
            <span>Total</span>
            <b>{formatarMoeda(total)}</b>
          </div>
          {pedido.sinal > 0 && (
            <div className={styles.pago}>
              <span>Sinal pago</span>
              <b>− {formatarMoeda(pedido.sinal)}</b>
            </div>
          )}
          <div className={styles.aPagar}>
            <b>A pagar na retirada</b>
            <b>{formatarMoeda(falta)}</b>
          </div>
        </div>

        <div className={styles.pix}>
          <div className={styles.rotuloPix}>Pagamento via Pix</div>
          <div className={styles.pequeno}>
            <b>{empresa.pixChave}</b> · {empresa.pixTitular}
          </div>
        </div>

        <div>
          <div className={styles.rotulo}>Condições</div>
          <p className={styles.condicoes}>{empresa.condicoes}</p>
        </div>

        <div className={styles.assinaturas}>
          <div>Cliente</div>
          <div>{empresa.nome}</div>
        </div>
      </article>

      <div className={`${ui.barraAcao} ${styles.naoImprimir}`}>
        <button type="button" className={ui.botaoSecundario} onClick={() => window.print()}>
          <Icon name="baixar" size={20} />
          Baixar PDF
        </button>
        {cliente && (
          <a href={linkWhatsApp(cliente.whatsapp ?? cliente.telefone, mensagem)} target="_blank" rel="noreferrer" className={`${ui.botaoPrimario} ${styles.whats}`}>
            <Icon name="telefone" size={20} />
            WhatsApp
          </a>
        )}
      </div>
    </>
  );
}

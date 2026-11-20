import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { linkWhatsApp } from '@/lib/contato';
import { empresa } from '@/lib/empresa';
import { deISO, formatarMoeda, hojeISO } from '@/lib/formato';
import { resumoPedido } from '@/lib/mensagens';
import { baixarArquivo, gerarPdfNota, podeCompartilharArquivo } from '@/lib/notaPdf';
import { codigoPedido, faltaReceber, totalPago, totalPedido } from '@/lib/pedidos';
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
  const cliente = pedido ? clientes.find((c) => c.id === pedido.clienteId) : undefined;

  const documentoRef = useRef<HTMLElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState('');

  const numeroArquivo = pedido ? codigoPedido(pedido) : '';
  const nomeArquivo = `Nota ArtDecor ${numeroArquivo}${cliente ? ` - ${cliente.nome}` : ''}.pdf`;
  // Se o pedido mudar (ex.: pagamento registrado em outro celular), o PDF é refeito.
  const versao = pedido ? JSON.stringify([pedido, cliente?.nome, cliente?.telefone, cliente?.endereco, itens.length]) : '';

  async function gerar(): Promise<File> {
    if (!documentoRef.current) throw new Error('nota não está na tela');
    setGerando(true);
    try {
      const arquivo = await gerarPdfNota(documentoRef.current, nomeArquivo);
      setPdf(arquivo);
      return arquivo;
    } finally {
      setGerando(false);
    }
  }

  // Prepara o PDF assim que a nota abre, para o "Enviar" ser instantâneo.
  useEffect(() => {
    if (!versao) return;
    setPdf(null);
    const t = window.setTimeout(() => {
      gerar().catch(() => {
        // tenta de novo quando a pessoa tocar no botão
      });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  if (!pedido) {
    return (
      <>
        <Cabecalho titulo="Nota" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  const numero = numeroArquivo;
  const total = totalPedido(pedido);
  const falta = faltaReceber(pedido);
  const pago = totalPago(pedido);
  const formasUsadas = [...new Set(pedido.pagamentos.map((p) => p.forma))].join(', ');
  const nomeItem = (itemId: string) => itens.find((i) => i.id === itemId)?.nome ?? 'Item';
  const nomesTemas = pedido.temaIds.map((t) => temas.find((x) => x.id === t)?.nome).filter(Boolean);
  const evento = [pedido.evento, nomesTemas.length ? `tema ${nomesTemas.join(', ')}` : ''].filter(Boolean).join(' · ');

  const mensagem = resumoPedido(pedido, cliente, nomeItem);

  const telefoneWhats = cliente ? cliente.whatsapp ?? cliente.telefone : '';

  async function baixarPdf() {
    setAviso('');
    try {
      baixarArquivo(pdf ?? (await gerar()));
    } catch {
      setAviso('Não foi possível gerar o PDF. Tente de novo.');
    }
  }

  async function enviarNota() {
    setAviso('');
    try {
      const arquivo = pdf ?? (await gerar());
      if (podeCompartilharArquivo(arquivo)) {
        // Abre o "Compartilhar" do celular: escolha WhatsApp e o cliente; a nota vai anexada com o texto.
        await navigator.share({ files: [arquivo], text: mensagem, title: `Nota ${numero}` });
      } else {
        // Computador (ou aparelho sem compartilhar arquivos): baixa o PDF para anexar.
        baixarArquivo(arquivo);
        setAviso('O PDF da nota foi baixado. Toque em “Só mensagem” para abrir a conversa e anexe o arquivo pelo clipe 📎.');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // fechou o compartilhar
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setAviso('A nota ficou pronta. Toque de novo em “Enviar nota no WhatsApp”.');
        return;
      }
      setAviso('Não foi possível enviar a nota. Tente de novo.');
    }
  }

  return (
    <>
      <div className={styles.naoImprimir}>
        <Cabecalho titulo="Nota do pedido" voltarPara={`/pedidos/${pedido.id}`} />
      </div>

      <article ref={documentoRef} className={styles.documento} aria-label={`Nota de locação ${numero}`}>
        <header className={styles.topo}>
          <div>
            <div className={styles.logo}>{empresa.nome}</div>
            <div className={styles.miudo}>{empresa.descricao}</div>
            {empresa.endereco.map((linha) => (
              <div key={linha} className={styles.miudo}>
                {linha}
              </div>
            ))}
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
            {pedido.cobrancas.map((c) => (
              <tr key={c.id}>
                <td>Cobrança — {c.descricao}</td>
                <td>1</td>
                <td>{numeroBR(c.valor)}</td>
                <td>{numeroBR(c.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totais}>
          <div>
            <span>Total</span>
            <b>{formatarMoeda(total)}</b>
          </div>
          {pago > 0 && (
            <div className={styles.pago}>
              <span>Já pago{formasUsadas ? ` (${formasUsadas})` : ''}</span>
              <b>− {formatarMoeda(pago)}</b>
            </div>
          )}
          <div className={styles.aPagar}>
            <b>{falta === 0 ? 'Pedido pago' : 'A pagar'}</b>
            <b>{formatarMoeda(falta)}</b>
          </div>
        </div>

        <div className={styles.pix}>
          <div className={styles.rotuloPix}>Formas de pagamento</div>
          <div className={styles.pequeno}>Pix, dinheiro ou cartão</div>
          <div className={styles.pequeno}>
            Pix: <b>{empresa.pixChave}</b> · {empresa.pixTitular}
          </div>
        </div>

        <div>
          <div className={styles.rotulo}>Condições</div>
          <p className={styles.condicoes}>{empresa.condicoes}</p>
        </div>

        <div className={styles.assinaturas}>
          <div>
            <div className={styles.assinado}>{cliente?.nome ?? ''}</div>
            <div className={styles.linhaAssinatura}>{cliente?.nome ?? 'Cliente'}</div>
            <div className={styles.papel}>Cliente</div>
          </div>
          <div>
            <div className={styles.assinado}>{empresa.assinatura}</div>
            <div className={styles.linhaAssinatura}>{empresa.responsavel}</div>
            <div className={styles.papel}>{empresa.nome}</div>
          </div>
        </div>
      </article>

      {aviso && (
        <p className={`${styles.avisoNota} ${styles.naoImprimir}`} role="status">
          {aviso}
        </p>
      )}

      <div className={`${ui.barraAcao} ${styles.acoes} ${styles.naoImprimir}`} data-tour="nota-acoes">
        <button type="button" className={ui.botaoSecundario} onClick={baixarPdf} disabled={gerando && !pdf}>
          <Icon name="baixar" size={20} />
          Baixar PDF
        </button>
        {cliente && (
          <a href={linkWhatsApp(telefoneWhats, mensagem)} target="_blank" rel="noreferrer" className={ui.botaoSecundario}>
            Só mensagem
          </a>
        )}
        {cliente && (
          <button type="button" className={`${ui.botaoPrimario} ${styles.whats} ${styles.enviar}`} onClick={enviarNota} disabled={gerando && !pdf}>
            <Icon name="telefone" size={20} />
            {gerando && !pdf ? 'Preparando a nota…' : 'Enviar nota no WhatsApp'}
          </button>
        )}
      </div>
    </>
  );
}

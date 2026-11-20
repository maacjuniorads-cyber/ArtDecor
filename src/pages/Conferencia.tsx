import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUsuario } from '@/components/Autenticacao';
import { Cabecalho } from '@/components/Cabecalho';
import { Thumb } from '@/components/Thumb';
import { novoId, useDados } from '@/data/store';
import { lerValor } from '@/lib/contato';
import { deISO, formatarMoeda, hojeISO } from '@/lib/formato';
import { descreverProblema } from '@/lib/conferencia';
import { numeroPedido } from '@/lib/pedidos';
import type { Cobranca, Conferencia as TipoConferencia, Item, ItemPedido, Pedido, ProblemaDevolucao } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './Conferencia.module.css';

interface Estado {
  decisao: 'ok' | 'problema' | null;
  avariadas: number;
  faltando: number;
  obs: string;
  tirar: boolean;
  cobrar: string;
}

const novoEstado = (): Estado => ({ decisao: null, avariadas: 0, faltando: 0, obs: '', tirar: true, cobrar: '' });

/** Estado inicial: se já houve conferência, mostra como ficou; senão, tudo por conferir. */
function estadoInicial(pedido: Pedido): Record<string, Estado> {
  const r: Record<string, Estado> = {};
  for (const ip of pedido.itens) {
    const p = pedido.conferencia?.problemas.find((x) => x.itemId === ip.itemId);
    const cobranca = pedido.cobrancas.find((c) => c.itemId === ip.itemId);
    if (p) {
      r[ip.itemId] = {
        decisao: 'problema',
        avariadas: p.avariadas,
        faltando: p.faltando,
        obs: p.obs ?? '',
        tirar: p.descontado > 0,
        cobrar: cobranca ? String(cobranca.valor).replace('.', ',') : '',
      };
    } else {
      r[ip.itemId] = { ...novoEstado(), decisao: pedido.conferencia ? 'ok' : null };
    }
  }
  return r;
}

/** Conferência da devolução: peça por peça, o que voltou certo e o que voltou com problema. */
export function Conferencia() {
  const { id } = useParams();
  const { pedidos, itens, clientes, salvarPedido, salvarItem } = useDados();
  const usuario = useUsuario();
  const navigate = useNavigate();
  const pedido = pedidos.find((p) => p.id === id);

  const [estados, setEstados] = useState<Record<string, Estado>>(() => (pedido ? estadoInicial(pedido) : {}));
  const [observacao, setObservacao] = useState(pedido?.conferencia?.observacao ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!pedido) {
    return (
      <>
        <Cabecalho titulo="Conferir devolução" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  if (pedido.status !== 'rua' && pedido.status !== 'devolvido') {
    return (
      <>
        <Cabecalho titulo="Conferir devolução" voltarPara={`/pedidos/${pedido.id}`} />
        <p className={ui.vazio}>Este pedido ainda não saiu. A conferência é feita quando o cliente devolve.</p>
      </>
    );
  }

  const cliente = clientes.find((c) => c.id === pedido.clienteId);
  const conferidas = pedido.itens.filter((ip) => estados[ip.itemId]?.decisao).length;
  const faltamConferir = pedido.itens.length - conferidas;
  const totalCobrar = pedido.itens.reduce((s, ip) => {
    const e = estados[ip.itemId];
    return e?.decisao === 'problema' ? s + (lerValor(e.cobrar) ?? 0) : s;
  }, 0);

  function mudar(itemId: string, parcial: Partial<Estado>) {
    setErro('');
    setEstados((atual) => ({ ...atual, [itemId]: { ...(atual[itemId] ?? novoEstado()), ...parcial } }));
  }

  function tudoOk() {
    setErro('');
    setEstados((atual) => {
      const r = { ...atual };
      for (const ip of pedido!.itens) if (!r[ip.itemId]?.decisao) r[ip.itemId] = { ...(r[ip.itemId] ?? novoEstado()), decisao: 'ok' };
      return r;
    });
  }

  async function concluir() {
    const p = pedido!;
    if (faltamConferir > 0) return setErro(`Falta conferir ${faltamConferir === 1 ? '1 peça' : `${faltamConferir} peças`}.`);

    const problemas: ProblemaDevolucao[] = [];
    const cobrancasNovas: Cobranca[] = [];
    for (const ip of p.itens) {
      const e = estados[ip.itemId];
      if (e?.decisao !== 'problema') continue;
      const item = itens.find((i) => i.id === ip.itemId);
      const qtd = e.avariadas + e.faltando;
      if (qtd === 0) return setErro(`Em “${item?.nome ?? 'peça'}”, diga quantas voltaram estragadas ou faltaram.`);
      if (qtd > ip.quantidade) return setErro(`Em “${item?.nome ?? 'peça'}”, o pedido tinha só ${ip.quantidade}.`);
      const valor = e.cobrar.trim() ? lerValor(e.cobrar) : 0;
      if (valor === null || valor < 0) return setErro(`Valor a cobrar inválido em “${item?.nome ?? 'peça'}” (ex.: 20,00).`);

      const podeDescontar = item?.quantidadeTotal !== null && item?.quantidadeTotal !== undefined;
      problemas.push({
        itemId: ip.itemId,
        avariadas: e.avariadas,
        faltando: e.faltando,
        ...(e.obs.trim() ? { obs: e.obs.trim() } : {}),
        descontado: e.tirar && podeDescontar ? qtd : 0,
      });
      if (valor > 0) {
        cobrancasNovas.push({ id: novoId(), descricao: `${item?.nome ?? 'Peça'}: ${descreverProblema(e)}`, valor, itemId: ip.itemId });
      }
    }

    const conferencia: TipoConferencia = {
      data: hojeISO(),
      por: usuario.nome || usuario.email,
      problemas,
      ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
    };

    setSalvando(true);
    const ok = await salvarPedido({
      ...p,
      status: 'devolvido',
      conferencia,
      // Cobranças lançadas à mão continuam; as da conferência são refeitas.
      cobrancas: [...p.cobrancas.filter((c) => !c.itemId), ...cobrancasNovas],
    });
    if (!ok) return setSalvando(false);

    // Estoque: tira (ou devolve, se a conferência foi refeita) só a diferença.
    const anteriores = p.conferencia?.problemas ?? [];
    const ids = new Set([...problemas.map((x) => x.itemId), ...anteriores.map((x) => x.itemId)]);
    for (const itemId of ids) {
      const item = itens.find((i) => i.id === itemId);
      if (!item) continue;
      const antes = anteriores.find((x) => x.itemId === itemId);
      const agora = problemas.find((x) => x.itemId === itemId);
      const delta = (agora?.descontado ?? 0) - (antes?.descontado ?? 0);
      const anotar = agora && !antes;
      if (delta === 0 && !anotar) continue;
      await salvarItem(ajustarItem(item, delta, anotar ? notaDoItem(p, agora) : undefined));
    }

    setSalvando(false);
    navigate(`/pedidos/${p.id}`, { replace: true });
  }

  return (
    <>
      <Cabecalho titulo={`Conferir devolução ${numeroPedido(pedido)}`} voltarPara={`/pedidos/${pedido.id}`} />

      <div className={styles.conteudo}>
        <p className={styles.intro}>
          Confira o que <b>{cliente?.nome.split(' ')[0] ?? 'o cliente'}</b> devolveu, peça por peça. Toque em <b>Voltou ok</b> ou em{' '}
          <b>Teve problema</b>.
        </p>

        <button type="button" className={ui.botaoSecundario} onClick={tudoOk} disabled={faltamConferir === 0} data-tour="conferencia-tudo">
          ✓ Marcar o resto como ok
        </button>

        <ul className={styles.lista} data-tour="conferencia-lista">
          {pedido.itens.map((ip) => (
            <LinhaConferencia
              key={ip.itemId}
              linha={ip}
              item={itens.find((i) => i.id === ip.itemId)}
              estado={estados[ip.itemId] ?? novoEstado()}
              onMudar={(parcial) => mudar(ip.itemId, parcial)}
            />
          ))}
        </ul>

        <label className={ui.campo}>
          <span className={ui.rotulo}>Observação (opcional)</span>
          <textarea
            className={`${ui.input} ${styles.texto}`}
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: devolveu um dia depois, tudo limpo"
          />
        </label>

        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}
      </div>

      <div className={`${ui.barraAcao} ${styles.barra}`}>
        <span className={styles.progresso}>
          {faltamConferir > 0 ? `${conferidas} de ${pedido.itens.length} conferidas` : 'Tudo conferido'}
          {totalCobrar > 0 && ` · cobrar ${formatarMoeda(totalCobrar)}`}
        </span>
        <button type="button" className={ui.botaoPrimario} onClick={concluir} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Concluir devolução'}
        </button>
      </div>
    </>
  );
}

function ajustarItem(item: Item, delta: number, nota?: string): Item {
  const quantidadeTotal = item.quantidadeTotal === null ? null : Math.max(0, item.quantidadeTotal - delta);
  const observacoes = nota ? [item.observacoes?.trim(), nota].filter(Boolean).join('\n') : item.observacoes;
  return { ...item, quantidadeTotal, observacoes };
}

/** Anotação que fica na peça, para lembrar o histórico dela. */
function notaDoItem(pedido: Pedido, p: ProblemaDevolucao): string {
  const dia = deISO(hojeISO()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Pedido ${numeroPedido(pedido)} (${dia}): ${descreverProblema(p)}${p.obs ? ` — ${p.obs}` : ''}`;
}

function LinhaConferencia({
  linha,
  item,
  estado,
  onMudar,
}: {
  linha: ItemPedido;
  item?: Item;
  estado: Estado;
  onMudar: (parcial: Partial<Estado>) => void;
}) {
  const nome = item?.nome ?? 'Item removido';
  const umaSo = linha.quantidade === 1;
  const qtdProblema = estado.avariadas + estado.faltando;
  const contado = item?.quantidadeTotal !== null && item?.quantidadeTotal !== undefined;

  function escolherProblema() {
    // Peça única: já começa como "voltou estragada".
    onMudar({ decisao: 'problema', ...(umaSo && qtdProblema === 0 ? { avariadas: 1 } : {}) });
  }

  return (
    <li className={ui.cartao} data-decisao={estado.decisao ?? 'pendente'}>
      <div className={styles.topo}>
        <Thumb nome={nome} fotoUrl={item?.fotoUrl} tamanho={48} />
        <div className={styles.nome}>
          <span className={ui.nome}>{nome}</span>
          <span className={ui.detalhe}>{umaSo ? '1 unidade' : `${linha.quantidade} unidades`}</span>
        </div>
      </div>

      <div className={styles.escolha} role="group" aria-label={`Como voltou: ${nome}`}>
        <button type="button" className={styles.opcao} data-tom="ok" aria-pressed={estado.decisao === 'ok'} onClick={() => onMudar({ decisao: 'ok' })}>
          ✓ Voltou ok
        </button>
        <button type="button" className={styles.opcao} data-tom="problema" aria-pressed={estado.decisao === 'problema'} onClick={escolherProblema}>
          Teve problema
        </button>
      </div>

      {estado.decisao === 'problema' && (
        <div className={styles.problema}>
          {umaSo ? (
            <div className={ui.segmentado} role="radiogroup" aria-label="O que aconteceu">
              <button
                type="button"
                role="radio"
                className={ui.segmento}
                aria-checked={estado.avariadas === 1}
                onClick={() => onMudar({ avariadas: 1, faltando: 0 })}
              >
                Voltou estragada
              </button>
              <button
                type="button"
                role="radio"
                className={ui.segmento}
                aria-checked={estado.faltando === 1}
                onClick={() => onMudar({ avariadas: 0, faltando: 1 })}
              >
                Não voltou
              </button>
            </div>
          ) : (
            <>
              <Contador
                rotulo="Voltaram quebradas ou estragadas"
                valor={estado.avariadas}
                max={linha.quantidade - estado.faltando}
                onMudar={(n) => onMudar({ avariadas: n })}
              />
              <Contador
                rotulo="Não voltaram (faltando)"
                valor={estado.faltando}
                max={linha.quantidade - estado.avariadas}
                onMudar={(n) => onMudar({ faltando: n })}
              />
            </>
          )}

          <label className={ui.campo}>
            <span className={ui.rotulo}>O que aconteceu (opcional)</span>
            <input className={ui.input} value={estado.obs} onChange={(e) => onMudar({ obs: e.target.value })} placeholder="Ex.: borda lascada" />
          </label>

          <label className={ui.campo}>
            <span className={ui.rotulo}>Cobrar do cliente (opcional)</span>
            <span className={`${ui.input} ${ui.prefixo}`}>
              <span>R$</span>
              <input
                className={styles.semBorda}
                inputMode="decimal"
                value={estado.cobrar}
                onChange={(e) => onMudar({ cobrar: e.target.value })}
                placeholder="0,00"
                aria-label={`Valor a cobrar por ${nome}`}
              />
            </span>
          </label>

          {contado ? (
            <label className={ui.marcar}>
              <input type="checkbox" checked={estado.tirar} onChange={(e) => onMudar({ tirar: e.target.checked })} />
              <span>
                Tirar do estoque {qtdProblema === 1 ? 'esta peça' : `estas ${qtdProblema} peças`}
                <span className={styles.dica}>Não aparece mais como livre. Se consertar, é só aumentar a quantidade na peça.</span>
              </span>
            </label>
          ) : (
            <span className={styles.dica}>Esta peça ainda não foi contada, então o estoque não muda.</span>
          )}
        </div>
      )}
    </li>
  );
}

function Contador({ rotulo, valor, max, onMudar }: { rotulo: string; valor: number; max: number; onMudar: (n: number) => void }) {
  return (
    <div className={styles.contador}>
      <span className={styles.rotuloContador}>{rotulo}</span>
      <span className={styles.botoesContador}>
        <button type="button" onClick={() => onMudar(Math.max(0, valor - 1))} disabled={valor === 0} aria-label={`Menos — ${rotulo}`}>
          −
        </button>
        <b aria-live="polite">{valor}</b>
        <button type="button" onClick={() => onMudar(Math.min(max, valor + 1))} disabled={valor >= max} aria-label={`Mais — ${rotulo}`}>
          +
        </button>
      </span>
    </div>
  );
}

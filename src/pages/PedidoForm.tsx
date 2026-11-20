import { useEffect, useState, type FormEvent } from 'react';
import { AvisoRascunho, useRascunho } from '@/components/Rascunho';
import { CampoData } from '@/components/CampoData';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { novoId, useDados } from '@/data/store';
import { lerValor } from '@/lib/contato';
import { conflitosDoItem, itensAtivos, itensDoTema, livresNoPeriodo } from '@/lib/estoque';
import { deISO, formatarMoeda, hojeISO, somarDias } from '@/lib/formato';
import { numeroPedido, totalPago } from '@/lib/pedidos';
import { FORMAS_PAGAMENTO, type FormaPagamento, type ItemPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './PedidoForm.module.css';

/** Cria um pedido novo (/pedidos/novo) ou edita um existente (/pedidos/:id/editar). */
export function PedidoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientes, itens, temas, pedidos, salvarPedido } = useDados();
  const existente = pedidos.find((p) => p.id === id);
  const hoje = hojeISO();

  const [clienteId, setClienteId] = useState(existente?.clienteId ?? '');
  const [evento, setEvento] = useState(existente?.evento ?? '');
  const [retirada, setRetirada] = useState(existente?.retirada ?? somarDias(hoje, 1));
  const [devolucao, setDevolucao] = useState(existente?.devolucao ?? somarDias(hoje, 3));
  const [linhas, setLinhas] = useState<ItemPedido[]>(existente?.itens ?? []);
  const [temaIds, setTemaIds] = useState<string[]>(existente?.temaIds ?? []);
  const [sinal, setSinal] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  // Segundo toque em "Reservar" depois do aviso de conflito de datas.
  const [aceitouConflito, setAceitouConflito] = useState(false);

  // Mudou itens ou datas: o aviso de conflito precisa ser visto de novo.
  useEffect(() => setAceitouConflito(false), [linhas, retirada, devolucao]);

  // Rascunho: se a tela recarregar no meio, nada do que foi preenchido se perde.
  const rascunho = useRascunho(
    `pedido:${id ?? 'novo'}`,
    { clienteId, evento, retirada, devolucao, linhas, temaIds, sinal, forma },
    (v) => {
      setClienteId(v.clienteId);
      setEvento(v.evento);
      setRetirada(v.retirada);
      setDevolucao(v.devolucao);
      setLinhas(v.linhas);
      setTemaIds(v.temaIds);
      setSinal(v.sinal);
      setForma(v.forma);
    },
  );

  if (id && !existente) {
    return (
      <>
        <Cabecalho titulo="Pedido" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  const item = (itemId: string) => itens.find((i) => i.id === itemId);
  const nomeCliente = (cid: string) => clientes.find((c) => c.id === cid)?.nome.split(' ')[0] ?? 'cliente';
  const dataCurta = (iso: string) => deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Cruzamento de datas: para cada item, outros pedidos ativos que usam a peça no mesmo período.
  // (Ao editar, o próprio pedido não conta.)
  const periodoValido = devolucao >= retirada;
  const analise = new Map(
    linhas.map((l) => {
      const it = item(l.itemId);
      const conflitos = periodoValido ? conflitosDoItem(l.itemId, { retirada, devolucao }, pedidos, existente?.id) : [];
      const livres = it ? livresNoPeriodo(it, conflitos) : null;
      return [l.itemId, { conflitos, livres, falta: livres !== null && l.quantidade > livres }] as const;
    }),
  );
  const haConflito = [...analise.values()].some((a) => a.falta);
  const clientesOpcoes = clientes
    .filter((c) => !c.removido || c.id === clienteId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const temasComPecas = temas.filter((t) => !t.removido && itensDoTema(t, itens).length > 0);
  const disponiveisParaAdicionar = itensAtivos(itens)
    .filter((i) => !linhas.some((l) => l.itemId === i.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const total = linhas.reduce((s, l) => s + l.quantidade * l.valorUnitario, 0);
  const pago = existente ? totalPago(existente) : (lerValor(sinal) ?? 0);

  function adicionar(itemId: string) {
    const it = item(itemId);
    if (!it) return;
    setLinhas((ls) => (ls.some((l) => l.itemId === itemId) ? ls : [...ls, { itemId, quantidade: 1, valorUnitario: it.valorAluguel }]));
  }

  function adicionarKit(temaId: string) {
    const tema = temas.find((t) => t.id === temaId);
    if (!tema || temaIds.includes(temaId)) return;
    setTemaIds((ts) => [...ts, temaId]);
    setLinhas((ls) => {
      const novas = [...ls];
      for (const it of itensDoTema(tema, itens)) {
        if (!novas.some((l) => l.itemId === it.id)) novas.push({ itemId: it.id, quantidade: 1, valorUnitario: it.valorAluguel });
      }
      return novas;
    });
  }

  function mudarQuantidade(itemId: string, delta: number) {
    setLinhas((ls) =>
      ls.flatMap((l) => {
        if (l.itemId !== itemId) return [l];
        const q = l.quantidade + delta;
        return q <= 0 ? [] : [{ ...l, quantidade: q }];
      }),
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (!clienteId) return setErro('Escolha o cliente.');
    if (linhas.length === 0) return setErro('Adicione pelo menos um item.');
    if (devolucao < retirada) return setErro('A devolução não pode ser antes da retirada.');
    if (!existente && sinal.trim() && lerValor(sinal) === null) return setErro('Valor do sinal inválido (ex.: 150,00).');
    if (haConflito && !aceitouConflito) {
      setAceitouConflito(true);
      return setErro('Algumas peças já estão reservadas nessas datas (veja os avisos em vermelho). Para salvar mesmo assim, toque no botão de novo.');
    }
    setErro('');

    const comum = { clienteId, evento: evento.trim() || undefined, temaIds, itens: linhas, retirada, devolucao };
    setSalvando(true);
    if (existente) {
      const ok = await salvarPedido({ ...existente, ...comum });
      setSalvando(false);
      if (ok) {
        rascunho.limpar();
        navigate(`/pedidos/${existente.id}`, { replace: true });
      }
      return;
    }
    const novo = novoId();
    const valorSinal = lerValor(sinal) ?? 0;
    const ok = await salvarPedido({
      id: novo,
      numero: 0, // o banco gera o número
      ...comum,
      status: 'reservado',
      pagamentos: valorSinal > 0 ? [{ id: novoId(), valor: valorSinal, data: hoje, forma }] : [],
      cobrancas: [],
    });
    setSalvando(false);
    if (ok) {
      rascunho.limpar();
      navigate(`/pedidos/${novo}`, { replace: true });
    }
  }

  return (
    <>
      <Cabecalho titulo={existente ? `Editar pedido ${numeroPedido(existente)}` : 'Novo pedido'} voltarPara={existente ? `/pedidos/${existente.id}` : '/pedidos'} />
      <form id="form-pedido" className={ui.form} onSubmit={salvar} noValidate>
        <AvisoRascunho visivel={rascunho.recuperado} onDescartar={rascunho.descartar} />
        <section className={ui.campo} data-tour="pedido-cliente">
          <label className={ui.campo}>
            <span className={ui.rotulo}>Cliente</span>
            <select className={ui.input} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Escolher cliente…</option>
              {clientesOpcoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.veiculo ? ` — ${c.veiculo.modelo} ${c.veiculo.cor}` : ''}
                </option>
              ))}
            </select>
          </label>
          {!existente && (
            <Link to="/clientes/novo" className={ui.botaoTexto}>
              + Cadastrar cliente novo
            </Link>
          )}
        </section>

        <label className={ui.campo}>
          <span className={ui.rotulo}>Evento (opcional)</span>
          <input className={ui.input} value={evento} onChange={(e) => setEvento(e.target.value)} placeholder="Ex: Aniversário de 5 anos" />
        </label>

        <div className={ui.grade2}>
          <CampoData rotulo="Retira em" valor={retirada} onChange={setRetirada} />
          <CampoData rotulo="Devolve em" valor={devolucao} min={retirada} onChange={setDevolucao} />
        </div>

        {temasComPecas.length > 0 && (
          <section data-tour="pedido-kits">
            <h2 className={ui.secao}>Adicionar kit do tema</h2>
            <div className={ui.chips}>
              {temasComPecas.map((t) => {
                const usado = temaIds.includes(t.id);
                return (
                  <button key={t.id} type="button" className={ui.chip} aria-pressed={usado} onClick={() => adicionarKit(t.id)}>
                    {usado ? '✓' : '+'} {t.nome}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section data-tour="pedido-itens">
          <h2 className={ui.secao}>Itens ({linhas.reduce((s, l) => s + l.quantidade, 0)})</h2>
          <div className={ui.tabela}>
            {linhas.length === 0 && <p className={styles.semItens}>Escolha um tema acima ou adicione itens abaixo.</p>}
            {linhas.map((l) => {
              const it = item(l.itemId);
              if (!it) return null;
              const a = analise.get(l.itemId);
              const ondeMais = a?.conflitos
                .map((c) => `${numeroPedido(c.pedido)} ${nomeCliente(c.pedido.clienteId)} (${dataCurta(c.pedido.retirada)}–${dataCurta(c.pedido.devolucao)}${c.quantidade > 1 ? `, ${c.quantidade} un.` : ''})`)
                .join('; ');
              return (
                <div key={l.itemId} className={styles.linha}>
                  <span className={ui.texto}>
                    <span className={ui.nome}>
                      {it.nome}
                      {it.removido && ' (excluído do estoque)'}
                    </span>
                    <span className={ui.detalhe}>
                      {it.tipo === 'unica'
                        ? `Peça única · ${formatarMoeda(l.valorUnitario)}`
                        : `${l.quantidade} × ${formatarMoeda(l.valorUnitario)} = ${formatarMoeda(l.quantidade * l.valorUnitario)}`}
                    </span>
                    {a?.falta && (
                      <span className={styles.aviso} role="alert">
                        {it.tipo === 'unica' || a.livres === 0 ? 'Já reservado nessas datas' : `Só ${a.livres} livres nessas datas`} — {ondeMais}
                      </span>
                    )}
                    {!a?.falta && a && a.conflitos.length > 0 && (
                      <span className={styles.info}>Também está em {ondeMais}</span>
                    )}
                  </span>
                  {it.tipo === 'unica' ? (
                    <button type="button" className={ui.botaoIcone} onClick={() => mudarQuantidade(l.itemId, -1)} aria-label={`Remover ${it.nome}`}>
                      ×
                    </button>
                  ) : (
                    <span className={styles.passos}>
                      <button type="button" className={ui.botaoIcone} onClick={() => mudarQuantidade(l.itemId, -1)} aria-label={`Diminuir ${it.nome}`}>
                        −
                      </button>
                      <span className={styles.qtd} aria-live="polite">
                        {l.quantidade}
                      </span>
                      <button type="button" className={ui.botaoIcone} onClick={() => mudarQuantidade(l.itemId, 1)} aria-label={`Aumentar ${it.nome}`}>
                        +
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
            <label className={styles.adicionar}>
              <span className={styles.oculto}>Adicionar item avulso</span>
              <select
                className={styles.selectAdicionar}
                value=""
                onChange={(e) => {
                  adicionar(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">+ Adicionar item avulso</option>
                {disponiveisParaAdicionar.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} — {formatarMoeda(i.valorAluguel)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className={`${ui.cartao} ${styles.totais}`} data-tour="pedido-totais">
          <div>
            <span className={ui.detalhe}>Total</span>
            <b className={styles.total}>{formatarMoeda(total)}</b>
          </div>
          {existente ? (
            <div>
              <span className={ui.detalhe}>Já pago</span>
              <span>{formatarMoeda(pago)}</span>
            </div>
          ) : (
            <>
              <label>
                <span className={ui.detalhe}>Sinal recebido</span>
                <span className={`${ui.input} ${ui.prefixo} ${styles.sinal}`}>
                  <span>R$</span>
                  <input inputMode="decimal" value={sinal} onChange={(e) => setSinal(e.target.value)} placeholder="0,00" />
                </span>
              </label>
              {pago > 0 && (
                <label>
                  <span className={ui.detalhe}>Forma do sinal</span>
                  <select className={`${ui.input} ${styles.forma}`} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <div className={styles.falta}>
            <b>Falta receber</b>
            <b className={styles.valorFalta}>{formatarMoeda(Math.max(0, total - pago))}</b>
          </div>
          {existente && <p className={styles.nota}>Pagamentos são registrados no detalhe do pedido.</p>}
        </section>

        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}
      </form>

      <div className={ui.barraAcao}>
        <button type="submit" form="form-pedido" className={ui.botaoPrimario} disabled={salvando}>
          {salvando ? 'Salvando…' : haConflito && aceitouConflito ? 'Salvar mesmo assim' : existente ? 'Salvar alterações' : 'Reservar pedido'}
        </button>
      </div>
    </>
  );
}

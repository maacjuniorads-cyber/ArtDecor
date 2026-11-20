import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { novoId, useDados } from '@/data/store';
import { lerValor } from '@/lib/contato';
import { itensAtivos, itensDoTema, livresAgora } from '@/lib/estoque';
import { formatarMoeda, hojeISO, somarDias } from '@/lib/formato';
import { numeroPedido, totalPago } from '@/lib/pedidos';
import { FORMAS_PAGAMENTO, type FormaPagamento, type ItemPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './PedidoForm.module.css';

/** Cria um pedido novo (/pedidos/novo) ou edita um existente (/pedidos/:id/editar). */
export function PedidoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clientes, itens, temas, pedidos, salvarPedido, proximoNumeroPedido } = useDados();
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

  if (id && !existente) {
    return (
      <>
        <Cabecalho titulo="Pedido" voltarPara="/pedidos" />
        <p className={ui.vazio}>Pedido não encontrado.</p>
      </>
    );
  }

  // Ao editar, o próprio pedido não conta como "ocupando" os itens.
  const outrosPedidos = pedidos.filter((p) => p.id !== existente?.id);
  const item = (itemId: string) => itens.find((i) => i.id === itemId);
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

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!clienteId) return setErro('Escolha o cliente.');
    if (linhas.length === 0) return setErro('Adicione pelo menos um item.');
    if (devolucao < retirada) return setErro('A devolução não pode ser antes da retirada.');
    if (!existente && sinal.trim() && lerValor(sinal) === null) return setErro('Valor do sinal inválido (ex.: 150,00).');

    const comum = { clienteId, evento: evento.trim() || undefined, temaIds, itens: linhas, retirada, devolucao };
    if (existente) {
      salvarPedido({ ...existente, ...comum });
      navigate(`/pedidos/${existente.id}`, { replace: true });
      return;
    }
    const novo = novoId();
    const valorSinal = lerValor(sinal) ?? 0;
    salvarPedido({
      id: novo,
      numero: proximoNumeroPedido(),
      ...comum,
      status: 'reservado',
      pagamentos: valorSinal > 0 ? [{ id: novoId(), valor: valorSinal, data: hoje, forma }] : [],
    });
    navigate(`/pedidos/${novo}`, { replace: true });
  }

  return (
    <>
      <Cabecalho titulo={existente ? `Editar pedido ${numeroPedido(existente)}` : 'Novo pedido'} voltarPara={existente ? `/pedidos/${existente.id}` : '/pedidos'} />
      <form id="form-pedido" className={ui.form} onSubmit={salvar} noValidate>
        <section className={ui.campo}>
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
          <label className={ui.campo}>
            <span className={ui.rotulo}>Retira em</span>
            <input className={ui.input} type="date" value={retirada} onChange={(e) => setRetirada(e.target.value)} />
          </label>
          <label className={ui.campo}>
            <span className={ui.rotulo}>Devolve em</span>
            <input className={ui.input} type="date" value={devolucao} min={retirada} onChange={(e) => setDevolucao(e.target.value)} />
          </label>
        </div>

        {temasComPecas.length > 0 && (
          <section>
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

        <section>
          <h2 className={ui.secao}>Itens ({linhas.reduce((s, l) => s + l.quantidade, 0)})</h2>
          <div className={ui.tabela}>
            {linhas.length === 0 && <p className={styles.semItens}>Escolha um tema acima ou adicione itens abaixo.</p>}
            {linhas.map((l) => {
              const it = item(l.itemId);
              if (!it) return null;
              const livres = livresAgora(it, outrosPedidos);
              const passou = livres !== null && l.quantidade > livres;
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
                    {passou && <span className={styles.aviso}>{livres === 0 ? 'Está todo na rua agora' : `Só ${livres} livres agora`}</span>}
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

        <section className={`${ui.cartao} ${styles.totais}`}>
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
        <button type="submit" form="form-pedido" className={ui.botaoPrimario}>
          {existente ? 'Salvar alterações' : 'Reservar pedido'}
        </button>
      </div>
    </>
  );
}

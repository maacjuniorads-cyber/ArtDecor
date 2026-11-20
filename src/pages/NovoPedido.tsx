import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { novoId, useDados } from '@/data/store';
import { lerValor } from '@/lib/contato';
import { itensDoTema, livresAgora } from '@/lib/estoque';
import { formatarMoeda, hojeISO, somarDias } from '@/lib/formato';
import type { ItemPedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './NovoPedido.module.css';

export function NovoPedido() {
  const navigate = useNavigate();
  const { clientes, itens, temas, pedidos, salvarPedido, proximoNumeroPedido } = useDados();
  const hoje = hojeISO();

  const [clienteId, setClienteId] = useState('');
  const [evento, setEvento] = useState('');
  const [retirada, setRetirada] = useState(somarDias(hoje, 1));
  const [devolucao, setDevolucao] = useState(somarDias(hoje, 3));
  const [linhas, setLinhas] = useState<ItemPedido[]>([]);
  const [temaIds, setTemaIds] = useState<string[]>([]);
  const [sinal, setSinal] = useState('');
  const [erro, setErro] = useState('');

  const item = (id: string) => itens.find((i) => i.id === id);
  const temasComPecas = temas.filter((t) => itensDoTema(t, itens).length > 0);
  const disponiveisParaAdicionar = itens
    .filter((i) => !linhas.some((l) => l.itemId === i.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const total = linhas.reduce((s, l) => s + l.quantidade * l.valorUnitario, 0);
  const sinalNum = lerValor(sinal) ?? 0;

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
    if (sinal.trim() && lerValor(sinal) === null) return setErro('Valor do sinal inválido (ex.: 150,00).');
    const id = novoId();
    salvarPedido({
      id,
      numero: proximoNumeroPedido(),
      clienteId,
      evento: evento.trim() || undefined,
      temaIds,
      itens: linhas,
      retirada,
      devolucao,
      status: 'reservado',
      sinal: sinalNum,
    });
    navigate(`/pedidos/${id}`, { replace: true });
  }

  return (
    <>
      <Cabecalho titulo="Novo pedido" voltarPara="/pedidos" />
      <form id="form-pedido" className={ui.form} onSubmit={salvar} noValidate>
        <section className={ui.campo}>
          <label className={ui.campo}>
            <span className={ui.rotulo}>Cliente</span>
            <select className={ui.input} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Escolher cliente…</option>
              {[...clientes]
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.veiculo ? ` — ${c.veiculo.modelo} ${c.veiculo.cor}` : ''}
                  </option>
                ))}
            </select>
          </label>
          <Link to="/clientes/novo" className={ui.botaoTexto}>
            + Cadastrar cliente novo
          </Link>
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
              const livres = livresAgora(it, pedidos);
              const passou = livres !== null && l.quantidade > livres;
              return (
                <div key={l.itemId} className={styles.linha}>
                  <span className={ui.texto}>
                    <span className={ui.nome}>{it.nome}</span>
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
          <label>
            <span className={ui.detalhe}>Sinal recebido</span>
            <span className={`${ui.input} ${ui.prefixo} ${styles.sinal}`}>
              <span>R$</span>
              <input inputMode="decimal" value={sinal} onChange={(e) => setSinal(e.target.value)} placeholder="0,00" />
            </span>
          </label>
          <div className={styles.falta}>
            <b>Falta receber</b>
            <b className={styles.valorFalta}>{formatarMoeda(Math.max(0, total - sinalNum))}</b>
          </div>
        </section>

        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}
      </form>

      <div className={ui.barraAcao}>
        <button type="submit" form="form-pedido" className={ui.botaoPrimario}>
          Reservar pedido
        </button>
      </div>
    </>
  );
}

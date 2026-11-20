import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, BadgeStatus } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { deISO, hojeISO, paraISO } from '@/lib/formato';
import { numeroPedido, quantidadeDeItens } from '@/lib/pedidos';
import type { Pedido } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './Agenda.module.css';

type TipoEvento = 'sai' | 'volta';

interface Evento {
  pedido: Pedido;
  tipo: TipoEvento;
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOMES_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Calendário do mês com o que sai (retirada) e o que volta (devolução) em cada dia. */
export function Agenda() {
  const { pedidos, clientes } = useDados();
  const hoje = hojeISO();
  const [mes, setMes] = useState(() => {
    const d = deISO(hoje);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  // Eventos por dia (pedidos cancelados não entram).
  const porDia = new Map<string, Evento[]>();
  const adicionar = (dia: string, ev: Evento) => porDia.set(dia, [...(porDia.get(dia) ?? []), ev]);
  for (const p of pedidos) {
    if (p.status === 'cancelado') continue;
    adicionar(p.retirada, { pedido: p, tipo: 'sai' });
    adicionar(p.devolucao, { pedido: p, tipo: 'volta' });
  }

  // Grade do mês: começa no domingo da primeira semana.
  const inicio = new Date(mes);
  inicio.setDate(1 - mes.getDay());
  const semanas = Math.ceil((mes.getDay() + new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });

  function mudarMes(delta: number) {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function irParaHoje() {
    const d = deISO(hoje);
    setMes(new Date(d.getFullYear(), d.getMonth(), 1));
    setDiaSelecionado(hoje);
  }

  const tituloMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const eventosDoDia = (porDia.get(diaSelecionado) ?? []).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'sai' ? -1 : 1));
  const dSel = deISO(diaSelecionado);
  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? 'Cliente removido';

  return (
    <>
      <h1 className={ui.tituloPagina}>Agenda</h1>

      <section className={`${ui.cartao} ${styles.calendario}`} data-tour="agenda-calendario">
        <div className={styles.topo}>
          <button type="button" className={styles.navMes} onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <Icon name="voltar" />
          </button>
          <h2 className={styles.tituloMes} aria-live="polite">
            {tituloMes}
          </h2>
          <button type="button" className={styles.navMes} onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <Icon name="voltar" className={styles.girar} />
          </button>
        </div>

        <div className={styles.grade} role="grid" aria-label={`Calendário de ${tituloMes}`}>
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className={styles.diaSemana} role="columnheader" aria-label={NOMES_SEMANA[i]}>
              {d}
            </span>
          ))}
          {dias.map((d) => {
            const iso = paraISO(d);
            const evs = porDia.get(iso) ?? [];
            const sai = evs.filter((e) => e.tipo === 'sai').length;
            const volta = evs.filter((e) => e.tipo === 'volta').length;
            const foraDoMes = d.getMonth() !== mes.getMonth();
            const rotulo = `${d.getDate()} de ${d.toLocaleDateString('pt-BR', { month: 'long' })}${sai ? `, ${sai} saindo` : ''}${volta ? `, ${volta} voltando` : ''}`;
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                className={styles.dia}
                data-fora={foraDoMes}
                data-hoje={iso === hoje}
                aria-selected={iso === diaSelecionado}
                aria-label={rotulo}
                onClick={() => setDiaSelecionado(iso)}
              >
                <span className={styles.numero}>{d.getDate()}</span>
                <span className={styles.marcas} aria-hidden="true">
                  {sai > 0 && <span className={styles.marcaSai}>{sai}</span>}
                  {volta > 0 && <span className={styles.marcaVolta}>{volta}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.legenda}>
          <span>
            <span className={styles.marcaSai}>n</span> sai (retirada)
          </span>
          <span>
            <span className={styles.marcaVolta}>n</span> volta (devolução)
          </span>
          <button type="button" className={ui.botaoTexto} onClick={irParaHoje}>
            Hoje
          </button>
        </div>
      </section>

      <h2 className={styles.tituloDia}>
        {diaSelecionado === hoje ? 'Hoje' : NOMES_SEMANA[dSel.getDay()]}, {dSel.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
      </h2>
      {eventosDoDia.length === 0 ? (
        <p className={ui.vazio}>Nada saindo nem voltando neste dia.</p>
      ) : (
        <ul className={ui.lista}>
          {eventosDoDia.map(({ pedido, tipo }) => (
            <li key={`${pedido.id}-${tipo}`}>
              <Link to={`/pedidos/${pedido.id}`} className={ui.linhaCartao}>
                <Badge tom={tipo === 'sai' ? 'rua' : 'alerta'}>{tipo === 'sai' ? 'Sai' : 'Volta'}</Badge>
                <span className={ui.texto}>
                  <span className={ui.nome}>{nomeCliente(pedido.clienteId)}</span>
                  <span className={ui.detalhe}>
                    {numeroPedido(pedido)}
                    {pedido.evento ? ` · ${pedido.evento}` : ''} · {quantidadeDeItens(pedido)} itens
                  </span>
                </span>
                <BadgeStatus status={pedido.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

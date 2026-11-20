import { Link } from 'react-router-dom';
import { Badge, type BadgeTom } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { useUsuario } from '@/components/Autenticacao';
import { PrimeirosPassos } from '@/components/PrimeirosPassos';
import { useTour } from '@/components/tour/Tour';
import { useDados } from '@/data/store';
import { dataPorExtenso, deISO, formatarMoeda, hojeISO, rotuloDia } from '@/lib/formato';
import {
  faltaReceber,
  itensSemContagem,
  proximosCompromissos,
  quantidadeDeItens,
  type TipoCompromisso,
} from '@/lib/pedidos';
import styles from './Inicio.module.css';

const badgeCompromisso: Record<TipoCompromisso, { tom: BadgeTom; texto: string }> = {
  sai: { tom: 'rua', texto: 'Sai' },
  volta: { tom: 'alerta', texto: 'Volta' },
  atrasado: { tom: 'alerta', texto: 'Atrasado' },
};

export function Inicio() {
  const { clientes, itens, pedidos } = useDados();
  const usuario = useUsuario();
  const tour = useTour();
  const hoje = hojeISO();
  const naRua = pedidos.filter((p) => p.status === 'rua');
  const reservados = pedidos.filter((p) => p.status === 'reservado');
  const voltamHoje = naRua.filter((p) => p.devolucao <= hoje);
  const aReceber = pedidos
    .filter((p) => p.status === 'reservado' || p.status === 'rua')
    .reduce((soma, p) => soma + faltaReceber(p), 0);
  const agenda = proximosCompromissos(pedidos, hoje);
  const semContagem = itensSemContagem(itens);
  const nomeItem = (id: string) => itens.find((i) => i.id === id)?.nome ?? 'Item';
  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? 'Cliente';

  return (
    <>
      <header>
        <p className={styles.logo}>ArtDecor</p>
        <p className={styles.saudacao}>
          {usuario.nome ? `Olá, ${usuario.nome} · ` : ''}
          {dataPorExtenso(hoje)}
        </p>
        <div className={styles.acoesTopo}>
          <button type="button" className={styles.ajuda} onClick={tour.iniciar} data-tour="ajuda">
            Ajuda
          </button>
          <button type="button" className={styles.sair} onClick={usuario.sair}>
            Sair
          </button>
        </div>
      </header>

      <Link to="/pedidos/novo" className={styles.botaoPrincipal} data-tour="novo-pedido">
        <Icon name="mais" size={20} strokeWidth={2.2} />
        Novo pedido
      </Link>

      <PrimeirosPassos />

      <div className={styles.resumo} data-tour="resumo">
        <Link to="/pedidos?status=rua" className={styles.cartao}>
          <span className={styles.rotulo} data-tom="rua">Na rua</span>
          <span className={styles.numero}>{naRua.length}</span>
          <span className={styles.legenda}>pedidos com cliente</span>
        </Link>
        <Link to="/pedidos" className={styles.cartao}>
          <span className={styles.rotulo} data-tom="reservado">Reservados</span>
          <span className={styles.numero}>{reservados.length}</span>
          <span className={styles.legenda}>a retirar</span>
        </Link>
        <Link to="/pedidos?status=rua" className={styles.cartao}>
          <span className={styles.rotulo} data-tom="alerta">Voltam hoje</span>
          <span className={styles.numero}>{voltamHoje.length}</span>
          <span className={styles.legenda}>devoluções</span>
        </Link>
        <Link to="/pedidos" className={styles.cartao}>
          <span className={styles.rotulo} data-tom="devolvido">A receber</span>
          <span className={`${styles.numero} ${styles.numeroMoeda}`}>{formatarMoeda(aReceber)}</span>
          <span className={styles.legenda}>dos pedidos em aberto</span>
        </Link>
      </div>

      <section data-tour="agenda">
      <div className={styles.secaoTopo}>
        <h2 className={styles.secao}>Próximos dias</h2>
        <Link to="/agenda" className={styles.verAgenda}>
          Ver calendário
        </Link>
      </div>
      {agenda.length === 0 ? (
        <p className={styles.vazio}>Nada saindo ou voltando nos próximos dias.</p>
      ) : (
        <ul className={styles.agenda}>
          {agenda.map(({ pedido, data, tipo }) => {
            const resumoItens = pedido.itens.slice(0, 2).map((i) => nomeItem(i.itemId)).join(', ');
            return (
              <li key={`${pedido.id}-${tipo}`}>
                <Link to={`/pedidos/${pedido.id}`} className={styles.linhaAgenda}>
                  <span className={styles.dia}>
                    <span className={styles.diaNumero}>{deISO(data).getDate()}</span>
                    <span className={styles.diaSemana}>{rotuloDia(data, hoje)}</span>
                  </span>
                  <span className={styles.linhaTexto}>
                    <span className={styles.linhaNome}>{nomeCliente(pedido.clienteId)}</span>
                    <span className={styles.linhaDetalhe}>
                      {resumoItens} · {quantidadeDeItens(pedido)} itens
                    </span>
                  </span>
                  <Badge tom={badgeCompromisso[tipo].tom}>{badgeCompromisso[tipo].texto}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </section>

      {semContagem.length > 0 && (
        <Link to="/estoque" className={styles.aviso}>
          <Icon name="estoque" className={styles.avisoIcone} />
          <span className={styles.linhaTexto}>
            <span className={styles.linhaNome}>
              {semContagem.length} {semContagem.length === 1 ? 'item sem contagem' : 'itens sem contagem'}
            </span>
            <span className={styles.avisoDetalhe}>Cadastrados sem quantidade definida</span>
          </span>
          <span className={styles.avisoAcao}>Conferir</span>
        </Link>
      )}
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsuario } from '@/components/Autenticacao';
import { useDados } from '@/data/store';
import styles from './PrimeirosPassos.module.css';

const chave = (userId: string) => `artdecor:primeiros-passos-oculto:${userId}`;

/** Lista de tarefas para começar a usar o app. Cada uma se marca sozinha pelos dados. */
export function PrimeirosPassos() {
  const { itens, clientes, pedidos } = useDados();
  const usuario = useUsuario();
  const [oculto, setOculto] = useState(() => {
    try {
      return localStorage.getItem(chave(usuario.id)) === '1';
    } catch {
      return false;
    }
  });

  const tarefas = [
    {
      texto: 'Complete um item do estoque (quantidade e valor)',
      feito: itens.some((i) => !i.removido && i.quantidadeTotal !== null && i.valorAluguel > 0),
      link: '/estoque',
    },
    { texto: 'Cadastre um cliente', feito: clientes.some((c) => !c.removido), link: '/clientes/novo' },
    { texto: 'Faça o primeiro pedido', feito: pedidos.length > 0, link: '/pedidos/novo' },
    { texto: 'Registre um pagamento', feito: pedidos.some((p) => p.pagamentos.length > 0), link: '/pedidos' },
  ];
  const feitas = tarefas.filter((t) => t.feito).length;

  if (feitas === tarefas.length) return null;

  function recolher(valor: boolean) {
    setOculto(valor);
    try {
      if (valor) localStorage.setItem(chave(usuario.id), '1');
      else localStorage.removeItem(chave(usuario.id));
    } catch {
      // ignora
    }
  }

  // Recolhida: uma faixa pequena com o progresso e o botão para abrir de novo.
  if (oculto) {
    return (
      <section className={styles.recolhido} data-tour="primeiros-passos" aria-label="Primeiros passos">
        <span className={styles.tituloRecolhido}>Primeiros passos</span>
        <span className={styles.barraRecolhida} aria-hidden="true">
          <span style={{ width: `${(feitas / tarefas.length) * 100}%` }} />
        </span>
        <span className={styles.contagem}>
          {feitas} de {tarefas.length}
        </span>
        <button type="button" className={styles.mostrar} onClick={() => recolher(false)} aria-expanded="false">
          Mostrar
        </button>
      </section>
    );
  }

  return (
    <section className={styles.cartao} data-tour="primeiros-passos" aria-labelledby="pp-titulo">
      <div className={styles.topo}>
        <h2 id="pp-titulo" className={styles.titulo}>
          Primeiros passos
        </h2>
        <span className={styles.contagem}>
          {feitas} de {tarefas.length}
        </span>
      </div>
      <span className={styles.barra} aria-hidden="true">
        <span style={{ width: `${(feitas / tarefas.length) * 100}%` }} />
      </span>
      <ul className={styles.lista}>
        {tarefas.map((t) => (
          <li key={t.texto}>
            <Link to={t.link} className={styles.tarefa} data-feito={t.feito}>
              <span className={styles.marca} aria-hidden="true">
                {t.feito ? '✓' : ''}
              </span>
              <span className={styles.textoTarefa}>
                {t.texto}
                {t.feito && <span className={styles.oculto}> (feito)</span>}
              </span>
              {!t.feito && <span className={styles.seta} aria-hidden="true">›</span>}
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.esconder} onClick={() => recolher(true)} aria-expanded="true">
        Recolher lista
      </button>
    </section>
  );
}

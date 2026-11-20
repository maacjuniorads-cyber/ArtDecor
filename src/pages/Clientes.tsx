import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useDados } from '@/data/store';
import { iniciais } from '@/lib/estoque';
import type { Cliente } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './Clientes.module.css';

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function textoBusca(c: Cliente): string {
  const v = c.veiculo;
  return normalizar(
    [c.nome, c.telefone, c.telefone.replace(/\D/g, ''), c.whatsapp ?? '', v ? `${v.tipo} ${v.modelo} ${v.cor} ${v.placa}` : 'sem veiculo'].join(' '),
  );
}

export function Clientes() {
  const { clientes, pedidos } = useDados();
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca.trim());

  const ativos = clientes.filter((c) => !c.removido);
  const visiveis = ativos
    .filter((c) => !termo || textoBusca(c).includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <>
      <h1 className={ui.tituloPagina}>Clientes</h1>
      <label className={`${ui.busca} ${styles.busca}`}>
        <Icon name="busca" size={20} />
        <input type="search" placeholder="Nome, telefone, carro ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cliente" />
      </label>

      {visiveis.length === 0 ? (
        <p className={ui.vazio}>{ativos.length === 0 ? 'Nenhum cliente cadastrado ainda.' : 'Nenhum cliente encontrado.'}</p>
      ) : (
        <ul className={ui.lista}>
          {visiveis.map((c) => {
            const qtd = pedidos.filter((p) => p.clienteId === c.id).length;
            const v = c.veiculo;
            return (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className={ui.linhaCartao}>
                  <span className={ui.avatar} aria-hidden="true">
                    {iniciais(c.nome)}
                  </span>
                  <span className={ui.texto}>
                    <span className={ui.nome}>{c.nome}</span>
                    <span className={ui.detalhe}>{c.telefone}</span>
                    <span className={v ? styles.veiculo : styles.semVeiculo}>
                      <Icon name="veiculo" size={16} />
                      {v ? `${v.modelo} ${v.cor}${v.placa ? ` · ${v.placa}` : ''}` : 'Sem veículo'}
                    </span>
                  </span>
                  <span className={styles.pedidos}>
                    {qtd} {qtd === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link to="/clientes/novo" className={ui.fab} aria-label="Novo cliente">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

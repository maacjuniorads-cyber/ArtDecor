import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
    [c.nome, c.telefone, c.telefone.replace(/\D/g, ''), c.whatsapp ?? '', v ? `${v.tipo} ${v.modelo} ${v.cor} ${v.placa}` : c.importado ? 'completar cadastro' : 'sem veiculo'].join(' '),
  );
}

export function Clientes() {
  const { clientes, pedidos } = useDados();
  const location = useLocation();
  const importados = (location.state as { importados?: number } | null)?.importados;
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca.trim());

  const ativos = clientes.filter((c) => !c.removido);
  const visiveis = ativos
    .filter((c) => !termo || textoBusca(c).includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <>
      <div className={styles.topo}>
        <h1 className={ui.tituloPagina}>Clientes</h1>
        <Link to="/clientes/importar" className={styles.importar} data-tour="clientes-importar">
          <Icon name="baixar" size={18} /> Importar contatos
        </Link>
      </div>
      {importados ? (
        <p className={styles.importados} role="status">
          ✓ {importados === 1 ? '1 cliente importado' : `${importados} clientes importados`}. Os marcados com <b>Completar cadastro</b> estão só com nome e
          telefone: endereço e carro você preenche quando fizer o pedido.
        </p>
      ) : null}
      <label className={`${ui.busca} ${styles.busca}`} data-tour="clientes-busca">
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
                    <span className={ui.detalhe}>{c.telefone || 'Sem telefone'}</span>
                    {c.importado && !v ? (
                      <span className={styles.completar}>Completar cadastro</span>
                    ) : (
                      <span className={v ? styles.veiculo : styles.semVeiculo}>
                        <Icon name="veiculo" size={16} />
                        {v ? `${v.modelo} ${v.cor}${v.placa ? ` · ${v.placa}` : ''}` : 'Sem veículo'}
                      </span>
                    )}
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

      <Link to="/clientes/novo" className={ui.fab} aria-label="Novo cliente" data-tour="fab">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

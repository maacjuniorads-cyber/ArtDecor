import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Thumb } from '@/components/Thumb';
import { useDados } from '@/data/store';
import { itensAtivos, itensDoTema, situacaoItem, situacaoTema } from '@/lib/estoque';
import { itensSemContagem } from '@/lib/pedidos';
import { ehExemplo } from '@/data/exemploTour';
import { deISO, formatarMoeda } from '@/lib/formato';
import { ehCategoriaPadrao, listaCategorias, nomeCategoria } from '@/lib/categorias';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import ui from '@/styles/ui.module.css';
import styles from './Estoque.module.css';

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function Estoque() {
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') === 'temas' ? 'temas' : 'itens';

  return (
    <>
      <h1 className={ui.tituloPagina}>Estoque</h1>
      <div className={`${ui.segmentado} ${styles.abas}`} role="tablist" aria-label="Ver" data-tour="estoque-abas">
        <button type="button" role="tab" className={ui.segmento} aria-selected={aba === 'itens'} onClick={() => setParams({}, { replace: true })}>
          Itens
        </button>
        <button type="button" role="tab" className={ui.segmento} aria-selected={aba === 'temas'} onClick={() => setParams({ aba: 'temas' }, { replace: true })}>
          Temas
        </button>
      </div>
      {aba === 'itens' ? <ListaItens /> : <ListaTemas />}
    </>
  );
}

/** Categoria criada pela equipe: dá para trocar o nome (vale para todas as peças dela). */
function RenomearCategoria({ categoria, onRenomeada }: { categoria: string; onRenomeada: (nova: string) => void }) {
  const { itens, renomearCategoria } = useDados();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(categoria);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useErro();
  const pecas = itensAtivos(itens).filter((i) => i.categoria === categoria).length;
  const outras = listaCategorias(itens).filter((c) => c !== categoria);
  const novo = nomeCategoria(texto, outras);
  const juntar = novo !== '' && outras.includes(novo);

  async function salvar() {
    if (salvando) return;
    if (!novo) return setErro('Escreva o novo nome da categoria.');
    if (novo === categoria) return setEditando(false);
    setSalvando(true);
    const ok = await renomearCategoria(categoria, novo);
    setSalvando(false);
    if (ok) onRenomeada(novo);
  }

  if (!editando) {
    return (
      <div className={styles.categoriaCriada}>
        <span>
          Categoria criada por vocês · {pecas === 1 ? '1 peça' : `${pecas} peças`}
        </span>
        <button type="button" className={styles.renomear} onClick={() => setEditando(true)}>
          Renomear
        </button>
      </div>
    );
  }

  return (
    <div className={`${ui.cartao} ${styles.renomearCartao}`}>
      <label className={ui.campo}>
        <span className={ui.rotulo}>Novo nome da categoria</span>
        <input className={ui.input} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={30} autoFocus />
      </label>
      <span className={styles.renomearDica}>
        {juntar
          ? `Já existe “${novo}”: ${pecas === 1 ? 'a peça vai' : `as ${pecas} peças vão`} para ela.`
          : `Muda o nome em ${pecas === 1 ? 'a peça' : `todas as ${pecas} peças`} desta categoria, para todo mundo.`}
      </span>
      <div className={styles.renomearAcoes}>
        <button
          type="button"
          className={ui.botaoSecundario}
          onClick={() => {
            setEditando(false);
            setTexto(categoria);
          }}
        >
          Cancelar
        </button>
        <button type="button" className={ui.botaoPrimario} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar nome'}
        </button>
      </div>
      <ErroFormulario erro={erro} onFechar={() => setErro('')} />
    </div>
  );
}

function ListaItens() {
  const { itens, temas, pedidos } = useDados();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('Todos');

  const termo = normalizar(busca.trim());
  const nomeTema = (id?: string) => temas.find((t) => t.id === id && !t.removido)?.nome;
  const visiveis = itensAtivos(itens)
    .filter((i) => categoria === 'Todos' || i.categoria === categoria)
    .filter((i) => !termo || normalizar(`${i.nome} ${nomeTema(i.temaId) ?? ''}`).includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const semContagem = itensSemContagem(itens).filter((i) => !ehExemplo(i.id)).length;

  return (
    <>
      {semContagem > 0 && (
        <Link to="/estoque/contar" className={styles.contagem} data-tour="contagem-rapida">
          <span className={styles.contagemTexto}>
            <b>Contagem rápida</b>
            <span>
              {semContagem === 1 ? '1 peça sem contagem' : `${semContagem} peças sem contagem`} · uma de cada vez
            </span>
          </span>
          <span className={styles.contagemAcao}>Contar</span>
        </Link>
      )}
      <div data-tour="estoque-filtros">
      <label className={`${ui.busca} ${styles.busca}`}>
        <Icon name="busca" size={20} />
        <input type="search" placeholder="Buscar item ou tema" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar item ou tema" />
      </label>
      <div className={`${ui.chips} ${styles.chips}`}>
        {['Todos', ...listaCategorias(itens)].map((c) => (
          <button key={c} type="button" className={ui.chip} aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
            {c}
          </button>
        ))}
      </div>
      </div>
      {categoria !== 'Todos' && !ehCategoriaPadrao(categoria) && (
        <RenomearCategoria key={categoria} categoria={categoria} onRenomeada={setCategoria} />
      )}

      {visiveis.length === 0 ? (
        <p className={ui.vazio}>Nenhum item encontrado.</p>
      ) : (
        <ul className={ui.lista}>
          {visiveis.map((item, i) => {
            const s = situacaoItem(item, pedidos);
            const tema = nomeTema(item.temaId);
            return (
              <li key={item.id} data-tour={i === 0 ? 'estoque-item' : undefined}>
                <Link to={`/estoque/${item.id}`} className={ui.linhaCartao}>
                  <Thumb nome={item.nome} fotoUrl={item.fotoUrl} />
                  <span className={ui.texto}>
                    <span className={ui.nome}>{item.nome}</span>
                    <span className={ui.detalhe}>
                      {item.categoria}
                      {tema && ` · tema ${tema}`}
                      {item.tipo === 'unica' && ' · peça única'}
                    </span>
                    <span className={styles.situacao}>
                      {s.tipo === 'unica' && <Badge tom={s.alugado ? 'rua' : 'devolvido'}>{s.alugado ? 'Alugado' : 'Livre'}</Badge>}
                      {s.tipo === 'sem-contagem' && <Badge tom="alerta">Falta contar</Badge>}
                      {s.tipo === 'contado' && s.total === 0 && <Badge tom="alerta">Sem unidades</Badge>}
                      {s.tipo === 'contado' && s.total > 0 && (
                        <>
                          <span className={`${ui.barra} ${s.livres === 0 ? ui.barraVazia : ''}`} aria-hidden="true">
                            <span style={{ width: `${s.total ? (s.livres / s.total) * 100 : 0}%` }} />
                          </span>
                          <span className={styles.livres}>
                            {s.livres} de {s.total} livres
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className={ui.valor}>{formatarMoeda(item.valorAluguel)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link to="/estoque/novo" className={ui.fab} aria-label="Novo item" data-tour="fab">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

function ListaTemas() {
  const { itens, temas, pedidos } = useDados();
  const dataCurta = (iso: string) => deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const ativos = temas.filter((t) => !t.removido);

  return (
    <>
      <p className={styles.dica}>Cada tema junta as peças que saem juntas. No pedido, é só escolher o tema.</p>
      {ativos.length === 0 ? (
        <p className={ui.vazio} data-tour="temas-lista">Nenhum tema cadastrado.</p>
      ) : (
        <ul className={ui.lista} data-tour="temas-lista">
          {ativos
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map((tema) => {
              const pecas = itensDoTema(tema, itens);
              const s = situacaoTema(tema, itens, pedidos);
              return (
                <li key={tema.id}>
                  <Link to={`/temas/${tema.id}`} className={`${ui.linhaCartao} ${styles.tema}`}>
                    <span className={styles.temaTopo}>
                      <span className={styles.cor} style={{ background: tema.cor }} aria-hidden="true" />
                      <span className={ui.texto}>
                        <span className={ui.nome}>{tema.nome}</span>
                        <span className={ui.detalhe}>
                          {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'} no kit
                        </span>
                      </span>
                      {s.tipo === 'livre' && <Badge tom="devolvido">Livre</Badge>}
                      {s.tipo === 'rua' && <Badge tom="rua">Na rua até {dataCurta(s.pedido.devolucao)}</Badge>}
                      {s.tipo === 'reservado' && <Badge tom="reservado">Reservado {dataCurta(s.pedido.retirada)}</Badge>}
                    </span>
                    {pecas.length > 0 && (
                      <span className={styles.pecas}>
                        {pecas.map((p) => (
                          <span key={p.id} className={styles.peca}>
                            {p.nome}
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
        </ul>
      )}

      <Link to="/temas/novo" className={ui.fab} aria-label="Novo tema" data-tour="fab">
        <Icon name="mais" size={28} strokeWidth={2.2} />
      </Link>
    </>
  );
}

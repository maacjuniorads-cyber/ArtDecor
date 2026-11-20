import { useState } from 'react';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import { CampoFoto } from '@/components/CampoFoto';
import { useSemPuxarParaAtualizar } from '@/components/Rascunho';
import { Link } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { ehExemplo } from '@/data/exemploTour';
import { useDados } from '@/data/store';
import { lerValor, valorParaCampo } from '@/lib/contato';
import { reduzirImagem } from '@/lib/imagem';
import { itensSemContagem } from '@/lib/pedidos';
import { ordemCategoria } from '@/lib/categorias';
import type { Item, TipoItem } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './Contagem.module.css';

type Resultado = 'contou' | 'pulou' | 'semContagem';

/** Peças sem contagem, na ordem das categorias (Painéis, Cilindros…) e por nome. */
function filaInicial(itens: Item[]): string[] {
  return itensSemContagem(itens)
    .filter((i) => !ehExemplo(i.id))
    .sort((a, b) => ordemCategoria(a.categoria) - ordemCategoria(b.categoria) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((i) => i.id);
}

/** Contagem rápida: uma peça "falta contar" por vez — foto, quantidade, valor e próxima. */
export function Contagem() {
  const { itens } = useDados();
  useSemPuxarParaAtualizar();
  // A fila é fixada ao abrir: as peças salvas não "pulam" da tela enquanto ela conta.
  const [fila, setFila] = useState(() => filaInicial(itens));
  const [posicao, setPosicao] = useState(0);
  const [contadas, setContadas] = useState<string[]>([]);
  const [puladas, setPuladas] = useState<string[]>([]);

  const item = itens.find((i) => i.id === fila[posicao]);
  const terminou = posicao >= fila.length;

  /**
   * contou: salvou com quantidade. pulou: deixou como estava.
   * semContagem: salvou com 0 — a peça volta para "falta contar" e fica entre as puladas.
   */
  function avancar(resultado: Resultado) {
    const id = fila[posicao];
    const pular = () => setPuladas((p) => (p.includes(id) ? p : [...p, id]));
    if (resultado === 'contou') {
      setContadas((c) => (c.includes(id) ? c : [...c, id]));
      setPuladas((p) => p.filter((x) => x !== id));
    } else if (resultado === 'semContagem') {
      setContadas((c) => c.filter((x) => x !== id));
      pular();
    } else if (!contadas.includes(id)) {
      pular();
    }
    setPosicao((n) => n + 1);
    window.scrollTo(0, 0);
  }

  function contarPuladas() {
    setFila(puladas);
    setPuladas([]);
    setPosicao(0);
  }

  if (fila.length === 0) {
    return (
      <>
        <Cabecalho titulo="Contagem rápida" voltarPara="/estoque" />
        <div className={styles.fim}>
          <span className={styles.fimIcone} aria-hidden="true">✓</span>
          <p className={styles.fimTitulo}>Nenhuma peça sem contagem</p>
          <p className={ui.detalhe}>Todo o estoque já tem quantidade. Para mudar uma peça, abra ela no Estoque.</p>
          <Link to="/estoque" className={ui.botaoPrimario}>
            Voltar ao estoque
          </Link>
        </div>
      </>
    );
  }

  if (terminou) {
    return (
      <>
        <Cabecalho titulo="Contagem rápida" voltarPara="/estoque" />
        <div className={styles.fim} role="status">
          <span className={styles.fimIcone} aria-hidden="true">✓</span>
          <p className={styles.fimTitulo}>{contadas.length === 1 ? '1 peça contada' : `${contadas.length} peças contadas`}</p>
          <p className={ui.detalhe}>
            {puladas.length > 0
              ? `Ficaram ${puladas.length === 1 ? '1 peça pulada' : `${puladas.length} peças puladas`}. Dá pra contar agora ou outro dia.`
              : 'Tudo salvo. Bom trabalho!'}
          </p>
          {puladas.length > 0 && (
            <button type="button" className={ui.botaoPrimario} onClick={contarPuladas}>
              Contar as puladas ({puladas.length})
            </button>
          )}
          <Link to="/estoque" className={puladas.length > 0 ? ui.botaoSecundario : ui.botaoPrimario}>
            Voltar ao estoque
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Contagem rápida" voltarPara="/estoque" />
      <div className={styles.progresso}>
        <span>
          Peça <b>{posicao + 1}</b> de {fila.length}
          {contadas.length > 0 && ` · ${contadas.length} ${contadas.length === 1 ? 'contada' : 'contadas'}`}
        </span>
        <span className={ui.barra} aria-hidden="true">
          <span style={{ width: `${(posicao / fila.length) * 100}%` }} />
        </span>
      </div>
      {posicao === 0 && contadas.length === 0 && (
        <p className={styles.explica}>Uma peça de cada vez: preencha e toque em <b>Salvar e próxima</b>. Não dá pra contar agora? Toque em <b>Pular</b>.</p>
      )}
      {item ? (
        <Ficha
          key={item.id}
          item={item}
          podeVoltar={posicao > 0}
          onVoltar={() => setPosicao((n) => n - 1)}
          onPronto={avancar}
        />
      ) : (
        <div className={styles.fim}>
          <p className={ui.detalhe}>Esta peça foi excluída do estoque.</p>
          <button type="button" className={ui.botaoPrimario} onClick={() => avancar('pulou')}>
            Próxima
          </button>
        </div>
      )}
    </>
  );
}

function Ficha({
  item,
  podeVoltar,
  onVoltar,
  onPronto,
}: {
  item: Item;
  podeVoltar: boolean;
  onVoltar: () => void;
  onPronto: (resultado: Resultado) => void;
}) {
  const { temas, salvarItem } = useDados();
  const [tipo, setTipo] = useState<TipoItem>(item.tipo);
  const [quantidade, setQuantidade] = useState(item.quantidadeTotal !== null ? String(item.quantidadeTotal) : '');
  const [valor, setValor] = useState(item.valorAluguel > 0 ? valorParaCampo(item.valorAluguel) : '');
  const [fotoUrl, setFotoUrl] = useState(item.fotoUrl);
  const [erro, setErro] = useErro();
  const [salvando, setSalvando] = useState(false);

  const tema = temas.find((t) => t.id === item.temaId)?.nome;
  const qtd = Number(quantidade);
  // 0 na contagem = "ainda não contei": a peça volta para "falta contar".
  const zero = tipo === 'varios' && quantidade.trim() !== '' && qtd === 0;

  async function escolherFoto(arquivo?: File) {
    if (!arquivo) return;
    try {
      setFotoUrl(await reduzirImagem(arquivo));
    } catch {
      setErro('Não consegui ler essa foto. Tente outra.');
    }
  }

  function mudarQuantidade(delta: number) {
    setErro('');
    setQuantidade(String(Math.max(0, (Number.isFinite(qtd) ? qtd : 0) + delta)));
  }

  async function salvar() {
    if (salvando) return;
    if (tipo === 'varios' && (quantidade.trim() === '' || !Number.isInteger(qtd) || qtd < 0)) {
      return setErro('Digite quantas unidades tem (ou toque em Pular).');
    }
    // Valor em branco: mantém o que já estava (dá pra pôr depois).
    const valorNum = valor.trim() ? lerValor(valor) : item.valorAluguel;
    if (valorNum === null || valorNum < 0) return setErro('Valor inválido (ex.: 15,00).');

    setSalvando(true);
    const ok = await salvarItem({
      ...item,
      tipo,
      quantidadeTotal: tipo === 'unica' ? 1 : zero ? null : qtd,
      valorAluguel: valorNum,
      fotoUrl,
    });
    setSalvando(false);
    if (ok) onPronto(zero ? 'semContagem' : 'contou');
  }

  return (
    <>
      <div className={ui.form}>
        <CampoFoto fotoUrl={fotoUrl} alt={`Foto: ${item.nome}`} convite="Foto (opcional)" onEscolher={escolherFoto} />

        <div>
          <h2 className={styles.nome}>{item.nome}</h2>
          <p className={ui.detalhe}>
            {item.categoria}
            {tema && ` · tema ${tema}`}
          </p>
        </div>

        <div className={ui.segmentado} role="radiogroup" aria-label="Tipo de item">
          <button type="button" role="radio" className={ui.segmento} aria-checked={tipo === 'varios'} onClick={() => setTipo('varios')}>
            Tenho vários
            <span className={ui.segmentoSub}>cilindros, toalhas…</span>
          </button>
          <button type="button" role="radio" className={ui.segmento} aria-checked={tipo === 'unica'} onClick={() => setTipo('unica')}>
            Peça única
            <span className={ui.segmentoSub}>painel, cômoda…</span>
          </button>
        </div>

        {tipo === 'varios' ? (
          <div className={ui.campo}>
            <span className={ui.rotulo} id="rotulo-qtd">
              Quantas tem?
            </span>
            <div className={styles.contador}>
              <button type="button" onClick={() => mudarQuantidade(-1)} disabled={!qtd} aria-label="Uma a menos">
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={quantidade}
                onChange={(e) => {
                  setErro('');
                  setQuantidade(e.target.value);
                }}
                placeholder="0"
                aria-labelledby="rotulo-qtd"
              />
              <button type="button" onClick={() => mudarQuantidade(1)} aria-label="Uma a mais">
                +
              </button>
            </div>
            {zero && (
              <span className={styles.avisoZero} role="status">
                Com 0, a peça volta para “falta contar” e continua na lista para contar depois.
              </span>
            )}
          </div>
        ) : (
          <p className={styles.unica}>Peça única: a quantidade é sempre 1.</p>
        )}

        <label className={ui.campo}>
          <span className={ui.rotulo}>Valor do aluguel (por unidade)</span>
          <span className={`${ui.input} ${ui.prefixo}`}>
            <span>R$</span>
            <input className={styles.semBorda} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </span>
          <span className={styles.dica}>Não sabe o preço agora? Pode deixar em branco e pôr depois.</span>
        </label>

        <ErroFormulario erro={erro} onFechar={() => setErro('')} />

        {podeVoltar && (
          <button type="button" className={`${ui.botaoTexto} ${styles.voltar}`} onClick={onVoltar}>
            ← Peça anterior
          </button>
        )}
      </div>

      <div className={ui.barraAcao}>
        <button type="button" className={ui.botaoSecundario} onClick={() => onPronto('pulou')} disabled={salvando}>
          Pular
        </button>
        <button type="button" className={ui.botaoPrimario} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : zero ? 'Deixar sem contagem' : 'Salvar e próxima'}
        </button>
      </div>
    </>
  );
}

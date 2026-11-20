import { useState, type FormEvent } from 'react';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import { CampoFoto } from '@/components/CampoFoto';
import { AvisoRascunho, useRascunho } from '@/components/Rascunho';
import { useNavigate, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { novoId, useDados } from '@/data/store';
import { lerValor, valorParaCampo } from '@/lib/contato';
import { pedidosAtivosComItem } from '@/lib/estoque';
import { reduzirImagem } from '@/lib/imagem';
import { numeroPedido } from '@/lib/pedidos';
import { motivoBloqueio, ZonaExclusao } from '@/components/ZonaExclusao';
import { CATEGORIAS, type Categoria, type TipoItem } from '@/types';
import ui from '@/styles/ui.module.css';
import styles from './ItemForm.module.css';

export function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { itens, temas, pedidos, salvarItem, removerItem } = useDados();
  const existente = itens.find((i) => i.id === id);

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [categoria, setCategoria] = useState<Categoria>(existente?.categoria ?? 'Painéis');
  const [temaId, setTemaId] = useState(existente?.temaId ?? '');
  const [tipo, setTipo] = useState<TipoItem>(existente?.tipo ?? 'varios');
  const [semContagem, setSemContagem] = useState(existente ? existente.quantidadeTotal === null : false);
  const [quantidade, setQuantidade] = useState(existente?.quantidadeTotal != null ? String(existente.quantidadeTotal) : '');
  const [valor, setValor] = useState(existente ? valorParaCampo(existente.valorAluguel) : '');
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? '');
  const [fotoUrl, setFotoUrl] = useState(existente?.fotoUrl);
  const [erro, setErro] = useErro();
  const [salvando, setSalvando] = useState(false);

  const rascunho = useRascunho(
    `item:${id ?? 'novo'}`,
    { nome, categoria, temaId, tipo, semContagem, quantidade, valor, observacoes, fotoUrl },
    (v) => {
      setNome(v.nome);
      setCategoria(v.categoria);
      setTemaId(v.temaId);
      setTipo(v.tipo);
      setSemContagem(v.semContagem);
      setQuantidade(v.quantidade);
      setValor(v.valor);
      setObservacoes(v.observacoes);
      setFotoUrl(v.fotoUrl);
    },
  );

  if (id && (!existente || existente.removido)) {
    return (
      <>
        <Cabecalho titulo="Item" voltarPara="/estoque" />
        <p className={ui.vazio}>Item não encontrado.</p>
      </>
    );
  }

  async function escolherFoto(arquivo?: File) {
    if (!arquivo) return;
    try {
      setFotoUrl(await reduzirImagem(arquivo));
    } catch {
      setErro('Não consegui ler essa foto. Tente outra.');
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    const valorNum = lerValor(valor);
    const qtd = Number(quantidade);
    if (!nome.trim()) return setErro('Dê um nome ao item.');
    if (valorNum === null) return setErro('Informe o valor do aluguel (ex.: 15,00).');
    if (tipo === 'varios' && !semContagem && (!Number.isInteger(qtd) || qtd < 0 || quantidade === '')) {
      return setErro('Informe a quantidade ou marque "Ainda não contei".');
    }
    // 0 = "ainda não contei": a peça volta para "falta contar" (igual à contagem rápida).
    const zero = tipo === 'varios' && !semContagem && qtd === 0;
    setSalvando(true);
    const ok = await salvarItem({
      id: existente?.id ?? novoId(),
      nome: nome.trim(),
      categoria,
      temaId: temaId || undefined,
      tipo,
      quantidadeTotal: tipo === 'unica' ? 1 : semContagem || zero ? null : qtd,
      valorAluguel: valorNum,
      observacoes: observacoes.trim() || undefined,
      fotoUrl,
    });
    setSalvando(false);
    if (ok) {
      rascunho.limpar();
      navigate('/estoque', { replace: true });
    }
  }

  return (
    <>
      <Cabecalho titulo={existente ? 'Editar item' : 'Novo item'} voltarPara="/estoque" />
      <form id="form-item" className={ui.form} onSubmit={salvar} noValidate>
        <AvisoRascunho visivel={rascunho.recuperado} onDescartar={rascunho.descartar} />
        <CampoFoto fotoUrl={fotoUrl} alt="Foto do item" convite="Foto da peça (opcional)" onEscolher={escolherFoto} dataTour="item-foto" />
        {fotoUrl && (
          <button type="button" className={ui.botaoTexto} onClick={() => setFotoUrl(undefined)}>
            Remover foto
          </button>
        )}

        <label className={ui.campo}>
          <span className={ui.rotulo}>Nome do item</span>
          <input className={ui.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Bandeja espelhada redonda" />
        </label>

        <div className={ui.grade2}>
          <label className={ui.campo}>
            <span className={ui.rotulo}>Categoria</span>
            <select className={ui.input} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className={ui.campo}>
            <span className={ui.rotulo}>Tema</span>
            <select className={ui.input} value={temaId} onChange={(e) => setTemaId(e.target.value)}>
              <option value="">Nenhum</option>
              {temas.filter((t) => !t.removido || t.id === temaId).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={ui.campo} data-tour="item-tipo">
          <span className={ui.rotulo} id="rotulo-tipo">Tipo de item</span>
          <div className={ui.segmentado} role="radiogroup" aria-labelledby="rotulo-tipo">
            <button type="button" role="radio" className={ui.segmento} aria-checked={tipo === 'varios'} onClick={() => setTipo('varios')}>
              Tenho vários
              <span className={ui.segmentoSub}>cilindros, toalhas…</span>
            </button>
            <button type="button" role="radio" className={ui.segmento} aria-checked={tipo === 'unica'} onClick={() => setTipo('unica')}>
              Peça única
              <span className={ui.segmentoSub}>painel, cômoda…</span>
            </button>
          </div>
        </div>

        {tipo === 'varios' && (
          <div className={`${ui.cartao} ${styles.quantidade}`} data-tour="item-quantidade">
            <label className={ui.campo}>
              <span className={ui.rotulo}>Quantidade total</span>
              <input
                className={ui.input}
                type="number"
                inputMode="numeric"
                min={0}
                value={semContagem ? '' : quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder={semContagem ? 'Contar depois' : 'Ex: 12'}
                disabled={semContagem}
              />
            </label>
            {!semContagem && quantidade.trim() !== '' && Number(quantidade) === 0 && (
              <span className={styles.avisoZero} role="status">
                Com 0, a peça fica como “falta contar”. Se não tem mais essa peça, exclua no fim da tela.
              </span>
            )}
            <label className={ui.marcar}>
              <input type="checkbox" checked={semContagem} onChange={(e) => setSemContagem(e.target.checked)} />
              <span>
                <b>Ainda não contei</b>
                <br />
                <span className={ui.detalhe}>O item fica marcado como “falta contar”</span>
              </span>
            </label>
          </div>
        )}

        <label className={ui.campo} data-tour="item-valor">
          <span className={ui.rotulo}>Valor do aluguel (por unidade)</span>
          <span className={`${ui.input} ${ui.prefixo}`}>
            <span>R$</span>
            <input className={styles.semBorda} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </span>
        </label>

        <label className={ui.campo}>
          <span className={ui.rotulo}>Observações</span>
          <textarea className={ui.input} rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: cuidado, quebra fácil" />
        </label>

        <ErroFormulario erro={erro} onFechar={() => setErro('')} />

        {existente && (
          <ZonaExclusao
            rotulo="Excluir item do estoque"
            confirmacao="Excluir este item? Ele some do estoque, mas continua aparecendo nos pedidos antigos."
            bloqueio={motivoBloqueio(pedidosAtivosComItem(existente.id, pedidos).map(numeroPedido), 'este item')}
            onConfirmar={async () => {
              if (await removerItem(existente.id)) {
                rascunho.limpar();
                navigate('/estoque', { replace: true });
              }
            }}
          />
        )}
      </form>

      <div className={ui.barraAcao}>
        <button type="submit" form="form-item" className={ui.botaoPrimario} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar item'}
        </button>
      </div>
    </>
  );
}

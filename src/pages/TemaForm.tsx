import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { Thumb } from '@/components/Thumb';
import { novoId, useDados } from '@/data/store';
import { itensDoTema } from '@/lib/estoque';
import ui from '@/styles/ui.module.css';
import styles from './TemaForm.module.css';

const CORES = ['#3D6A96', '#8A6FB0', '#B07A4F', '#2E2638', '#5E8C4A', '#C9A23A', '#4A7AA8', '#8E2A4E', '#D9718F', '#4F4A66'];

export function TemaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { temas, itens, salvarTema } = useDados();
  const existente = temas.find((t) => t.id === id);
  const [nome, setNome] = useState(existente?.nome ?? '');
  const [cor, setCor] = useState(existente?.cor ?? CORES[0]);
  const [erro, setErro] = useState('');

  if (id && !existente) {
    return (
      <>
        <Cabecalho titulo="Tema" voltarPara="/estoque?aba=temas" />
        <p className={ui.vazio}>Tema não encontrado.</p>
      </>
    );
  }

  const pecas = existente ? itensDoTema(existente, itens) : [];

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome ao tema.');
    salvarTema({ id: existente?.id ?? novoId(), nome: nome.trim(), cor });
    navigate('/estoque?aba=temas', { replace: true });
  }

  return (
    <>
      <Cabecalho titulo={existente ? 'Editar tema' : 'Novo tema'} voltarPara="/estoque?aba=temas" />
      <form id="form-tema" className={ui.form} onSubmit={salvar} noValidate>
        <label className={ui.campo}>
          <span className={ui.rotulo}>Nome do tema</span>
          <input className={ui.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Minecraft" />
        </label>

        <fieldset className={styles.cores}>
          <legend className={ui.rotulo}>Cor</legend>
          {CORES.map((c) => (
            <label key={c} className={styles.cor} style={{ background: c }}>
              <input type="radio" name="cor" value={c} checked={cor === c} onChange={() => setCor(c)} aria-label={`Cor ${c}`} />
            </label>
          ))}
        </fieldset>

        {existente && (
          <section>
            <h2 className={ui.secao}>Peças do kit ({pecas.length})</h2>
            {pecas.length === 0 ? (
              <p className={ui.vazio}>Nenhuma peça ainda. No cadastro do item, escolha este tema.</p>
            ) : (
              <ul className={ui.lista}>
                {pecas.map((p) => (
                  <li key={p.id}>
                    <Link to={`/estoque/${p.id}`} className={ui.linhaCartao}>
                      <Thumb nome={p.nome} fotoUrl={p.fotoUrl} tamanho={44} />
                      <span className={ui.texto}>
                        <span className={ui.nome}>{p.nome}</span>
                        <span className={ui.detalhe}>{p.categoria}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!existente && <p className={ui.detalhe}>Depois de criar o tema, escolha ele no cadastro de cada peça para montar o kit.</p>}

        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}
      </form>
      <div className={ui.barraAcao}>
        <button type="submit" form="form-tema" className={ui.botaoPrimario}>
          Salvar tema
        </button>
      </div>
    </>
  );
}

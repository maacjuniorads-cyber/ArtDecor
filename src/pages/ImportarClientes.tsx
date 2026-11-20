import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import { Icon } from '@/components/Icon';
import { novoId, useDados } from '@/data/store';
import { agendaDisponivel, escolherDaAgenda, lerVcf, montarCandidatos, type Candidato, type ContatoBruto } from '@/lib/importarContatos';
import ui from '@/styles/ui.module.css';
import styles from './ImportarClientes.module.css';

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Etiqueta da linha: por que não dá pra marcar, ou o que vai faltar completar. */
function etiqueta(c: Candidato): { texto: string; aviso: boolean } | null {
  if (c.situacao === 'cadastrado')
    return { texto: c.jaCadastradoComo && c.jaCadastradoComo !== c.nome ? `Já é cliente (${c.jaCadastradoComo})` : 'Já é cliente', aviso: false };
  if (c.situacao === 'vazio') return { texto: 'Sem nome e sem telefone', aviso: false };
  if (c.falta === 'telefone') return { texto: 'Sem telefone', aviso: true };
  if (c.falta === 'nome') return { texto: 'Sem nome', aviso: true };
  if (c.estrangeiro) return { texto: 'Número de fora', aviso: true };
  return null;
}

/** Clientes → Importar contatos: escolhe na agenda (Android) ou num arquivo .vcf. */
export function ImportarClientes() {
  const navigate = useNavigate();
  const { clientes, importarClientes } = useDados();
  const [lista, setLista] = useState<Candidato[] | null>(null);
  const [repetidos, setRepetidos] = useState(0);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useErro();
  const [salvando, setSalvando] = useState(false);
  const temAgenda = agendaDisponivel();

  function carregar(contatos: ContatoBruto[], marcarTodos: boolean) {
    if (contatos.length === 0) return setErro('Nenhum contato encontrado.');
    const { candidatos, repetidos } = montarCandidatos(contatos, clientes);
    setLista(candidatos);
    setRepetidos(repetidos);
    setBusca('');
    // Da agenda ela já escolheu quem quer; do arquivo vem a agenda inteira, então começa desmarcado.
    setMarcados(new Set(marcarTodos ? candidatos.filter((c) => c.situacao === 'novo').map((c) => c.chave) : []));
  }

  async function daAgenda() {
    try {
      carregar(await escolherDaAgenda(), true);
    } catch {
      setErro('Não consegui abrir a agenda. Tente pelo arquivo de contatos.');
    }
  }

  async function doArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      carregar(lerVcf(await arquivo.text()), false);
    } catch {
      setErro('Não consegui ler esse arquivo. Ele precisa ser de contatos (.vcf).');
    }
  }

  const termo = normalizar(busca.trim());
  const visiveis = useMemo(
    () => (lista ?? []).filter((c) => !termo || normalizar(`${c.nome} ${c.telefone} ${c.telefone.replace(/\D/g, '')}`).includes(termo)),
    [lista, termo],
  );
  const novosVisiveis = visiveis.filter((c) => c.situacao === 'novo');
  const todosVisiveisMarcados = novosVisiveis.length > 0 && novosVisiveis.every((c) => marcados.has(c.chave));

  function alternar(chave: string) {
    setMarcados((m) => {
      const novo = new Set(m);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function alternarTodos() {
    setMarcados((m) => {
      const novo = new Set(m);
      for (const c of novosVisiveis) {
        if (todosVisiveisMarcados) novo.delete(c.chave);
        else novo.add(c.chave);
      }
      return novo;
    });
  }

  async function importar() {
    if (!lista || salvando) return;
    const escolhidos = lista.filter((c) => c.situacao === 'novo' && marcados.has(c.chave));
    if (escolhidos.length === 0) return setErro('Marque pelo menos um contato.');
    setSalvando(true);
    const ok = await importarClientes(
      escolhidos.map((c) => ({ id: novoId(), nome: c.nome || 'Sem nome', telefone: c.telefone, veiculo: null, importado: true })),
    );
    setSalvando(false);
    if (ok) navigate('/clientes', { replace: true, state: { importados: escolhidos.length } });
  }

  const botoes = (
    <div className={styles.fontes}>
      {temAgenda && (
        <button type="button" className={ui.botaoPrimario} onClick={daAgenda}>
          <Icon name="clientes" size={20} /> Escolher da agenda
        </button>
      )}
      <label className={`${temAgenda ? ui.botaoSecundario : ui.botaoPrimario} ${styles.arquivo}`}>
        <Icon name="documento" size={20} /> Abrir arquivo de contatos (.vcf)
        <input type="file" accept=".vcf,text/vcard,text/x-vcard,text/directory" onChange={doArquivo} />
      </label>
    </div>
  );

  // ---------------------------------------------------------------- antes de escolher
  if (!lista) {
    return (
      <>
        <Cabecalho titulo="Importar contatos" voltarPara="/clientes" />
        <div className={styles.intro}>
          <p>
            Traga os clientes direto da agenda do celular, sem digitar um por um. Entram o <b>nome</b> e o <b>telefone</b>; endereço e
            carro você completa depois, quando fizer o pedido.
          </p>
          <p className={styles.suave}>Basta ter o nome ou o telefone: o que faltar você completa depois. Quem já é cliente é reconhecido e não entra de novo.</p>
        </div>
        {botoes}

        <details className={styles.ajuda}>
          <summary>Como exportar os contatos (.vcf)</summary>
          <h3>iPhone</h3>
          <ol>
            <li>Abra o app <b>Contatos</b> e toque em <b>Listas</b>, no canto de cima.</li>
            <li>
              Segure o dedo em <b>Todos os Contatos</b> e toque em <b>Exportar</b>.
            </li>
            <li>
              Escolha <b>Salvar em Arquivos</b>. Depois volte aqui e toque em <b>Abrir arquivo de contatos</b>.
            </li>
          </ol>
          <h3>Android</h3>
          <p>
            O jeito mais fácil é o botão <b>Escolher da agenda</b>. Se preferir o arquivo: no app <b>Contatos</b>, abra o menu, toque em{' '}
            <b>Gerenciar contatos</b> (ou Configurações) e em <b>Exportar</b>.
          </p>
        </details>
        <ErroFormulario erro={erro} onFechar={() => setErro('')} />
      </>
    );
  }

  // ---------------------------------------------------------------- lista para marcar
  const cadastrados = lista.filter((c) => c.situacao === 'cadastrado').length;
  const vazios = lista.filter((c) => c.situacao === 'vazio').length;
  const incompletos = lista.filter((c) => c.situacao === 'novo' && c.falta).length;
  const resumo = [
    `${lista.length} ${lista.length === 1 ? 'contato' : 'contatos'}`,
    cadastrados ? `${cadastrados} já ${cadastrados === 1 ? 'é cliente' : 'são clientes'}` : '',
    incompletos ? `${incompletos} sem nome ou sem telefone (dá pra importar e completar depois)` : '',
    vazios ? `${vazios} ${vazios === 1 ? 'vazio' : 'vazios'}` : '',
    repetidos ? `${repetidos} ${repetidos === 1 ? 'repetido juntado' : 'repetidos juntados'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Cabecalho titulo="Importar contatos" voltarPara="/clientes" />
      <p className={styles.resumo}>{resumo}</p>
      <p className={styles.dica}>Marque só quem é cliente da loja.</p>

      <label className={`${ui.busca} ${styles.busca}`}>
        <Icon name="busca" size={20} />
        <input type="search" placeholder="Buscar nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar contato" />
      </label>

      <div className={styles.barraLista}>
        <span>
          <b>{marcados.size}</b> {marcados.size === 1 ? 'marcado' : 'marcados'}
        </span>
        {novosVisiveis.length > 0 && (
          <button type="button" className={styles.link} onClick={alternarTodos}>
            {todosVisiveisMarcados ? 'Desmarcar todos' : busca ? 'Marcar os encontrados' : 'Marcar todos'}
          </button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <p className={ui.vazio}>Nenhum contato encontrado.</p>
      ) : (
        <ul className={styles.lista}>
          {visiveis.map((c) => {
            const pode = c.situacao === 'novo';
            const selo = etiqueta(c);
            return (
              <li key={c.chave}>
                <label className={styles.contato} data-desligado={!pode}>
                  <input type="checkbox" checked={pode && marcados.has(c.chave)} disabled={!pode} onChange={() => alternar(c.chave)} />
                  <span className={styles.texto}>
                    <span className={styles.nome} data-falta={!c.nome}>
                      {c.nome || 'Sem nome'}
                    </span>
                    <span className={styles.telefone}>{c.telefone || 'Sem telefone'}</span>
                  </span>
                  {selo && (
                    <span className={styles.selo} data-aviso={selo.aviso}>
                      {selo.texto}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.outra}>
        <button type="button" className={styles.link} onClick={() => setLista(null)}>
          Escolher outros contatos
        </button>
      </div>

      <ErroFormulario erro={erro} onFechar={() => setErro('')} />
      <div className={ui.barraAcao}>
        <button type="button" className={ui.botaoPrimario} onClick={importar} disabled={salvando || marcados.size === 0}>
          {salvando ? 'Importando…' : marcados.size === 0 ? 'Marque os clientes' : `Importar ${marcados.size} ${marcados.size === 1 ? 'cliente' : 'clientes'}`}
        </button>
      </div>
    </>
  );
}

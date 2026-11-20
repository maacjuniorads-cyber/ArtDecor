import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cabecalho } from '@/components/Cabecalho';
import { ErroFormulario, useErro } from '@/components/ErroFormulario';
import { Icon } from '@/components/Icon';
import { AvisoRascunho, useRascunho } from '@/components/Rascunho';
import { novoId, useDados } from '@/data/store';
import {
  agendaDisponivel,
  contatosCompartilhados,
  escolherDaAgenda,
  lerCompartilhado,
  lerTexto,
  lerVcf,
  montarCandidatos,
  type Candidato,
  type ContatoBruto,
} from '@/lib/importarContatos';
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

/**
 * Clientes → Importar contatos: agenda (Android), arquivo .vcf, números colados/digitados
 * ou "Compartilhar → ArtDecor" de outro app. Cada escolha SOMA na lista.
 */
export function ImportarClientes() {
  const navigate = useNavigate();
  const { clientes, importarClientes } = useDados();
  // Tudo o que ela já trouxe (agenda e arquivos), na ordem; a lista é montada a partir daqui.
  const [brutos, setBrutos] = useState<ContatoBruto[]>([]);
  const [marcadosLista, setMarcadosLista] = useState<string[]>([]);
  const [adicionados, setAdicionados] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useErro();
  const [salvando, setSalvando] = useState(false);
  // Campo para digitar ou colar números (ex.: copiados do WhatsApp).
  const [colando, setColando] = useState(false);
  const [textoColado, setTextoColado] = useState('');
  const [params] = useSearchParams();
  const temAgenda = agendaDisponivel();
  const marcados = useMemo(() => new Set(marcadosLista), [marcadosLista]);

  // Se o app fechar no meio, a lista montada volta.
  const rascunho = useRascunho('importar-contatos', { brutos, marcados: marcadosLista }, (v) => {
    setBrutos(v.brutos);
    setMarcadosLista(v.marcados);
  });

  const { candidatos, repetidos } = useMemo(() => montarCandidatos(brutos, clientes), [brutos, clientes]);
  const lista = brutos.length > 0 ? candidatos : null;

  /** Soma os contatos novos na lista (os repetidos se juntam). */
  function adicionar(contatos: ContatoBruto[], marcarNovos: boolean) {
    if (contatos.length === 0) return setErro('Nenhum contato encontrado.');
    const todos = [...brutos, ...contatos];
    const antes = new Set(candidatos.map((c) => c.chave));
    const entraram = montarCandidatos(todos, clientes).candidatos.filter((c) => !antes.has(c.chave));
    if (entraram.length === 0) return setErro(contatos.length === 1 ? 'Esse contato já está na lista.' : 'Esses contatos já estão na lista.');
    setBrutos(todos);
    setBusca('');
    // Da agenda ela já escolheu quem quer (entra marcado); do arquivo vem a agenda inteira (entra desmarcado).
    if (marcarNovos) {
      const chaves = entraram.filter((c) => c.situacao === 'novo').map((c) => c.chave);
      setMarcadosLista((m) => [...new Set([...m, ...chaves])]);
    }
    setAdicionados(entraram.length === 1 ? `+1 contato na lista: ${entraram[0].nome || entraram[0].telefone}` : `+${entraram.length} contatos na lista`);
    window.setTimeout(() => setAdicionados(null), 4000);
  }

  // Chegou pelo "Compartilhar → ArtDecor" (Android): soma o que veio na lista, já marcado.
  const adicionarRef = useRef(adicionar);
  adicionarRef.current = adicionar;
  const compartilhado = params.get('compartilhado') === '1';
  // Chegou de outro app: a lista que já estava aqui volta sem a faixa de "recuperamos" (ela não saiu da tela por engano).
  const [veioCompartilhado] = useState(compartilhado);
  useEffect(() => {
    if (!compartilhado) return;
    let vivo = true;
    lerCompartilhado().then((recebido) => {
      if (!vivo) return;
      navigate('/clientes/importar', { replace: true });
      if (recebido) adicionarRef.current(contatosCompartilhados(recebido), true);
    });
    return () => {
      vivo = false;
    };
  }, [compartilhado, navigate]);

  function adicionarColados() {
    const contatos = lerTexto(textoColado);
    if (contatos.length === 0) return setErro('Escreva ou cole pelo menos um nome ou número.');
    // Só fecha o campo se algo entrou de fato (se tudo era repetido, o balão avisa e o texto fica).
    const entrou = montarCandidatos([...brutos, ...contatos], clientes).candidatos.length > candidatos.length;
    adicionar(contatos, true);
    if (entrou) {
      setTextoColado('');
      setColando(false);
    }
  }

  async function daAgenda() {
    try {
      const escolhidos = await escolherDaAgenda();
      if (escolhidos.length > 0) adicionar(escolhidos, true); // fechou a agenda sem escolher: não faz nada
    } catch {
      setErro('Não consegui abrir a agenda. Tente pelo arquivo de contatos.');
    }
  }

  async function doArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      adicionar(lerVcf(await arquivo.text()), false);
    } catch {
      setErro('Não consegui ler esse arquivo. Ele precisa ser de contatos (.vcf).');
    }
  }

  function limparLista() {
    setBrutos([]);
    setMarcadosLista([]);
    setBusca('');
    rascunho.limpar();
  }

  const termo = normalizar(busca.trim());
  const visiveis = useMemo(
    () => (lista ?? []).filter((c) => !termo || normalizar(`${c.nome} ${c.telefone} ${c.telefone.replace(/\D/g, '')}`).includes(termo)),
    [lista, termo],
  );
  const novosVisiveis = visiveis.filter((c) => c.situacao === 'novo');
  const todosVisiveisMarcados = novosVisiveis.length > 0 && novosVisiveis.every((c) => marcados.has(c.chave));
  // Só conta os marcados que ainda podem entrar (ex.: alguém que virou cliente nesse meio tempo sai da conta).
  const marcaveis = (lista ?? []).filter((c) => c.situacao === 'novo' && marcados.has(c.chave));

  function alternar(chave: string) {
    setMarcadosLista((m) => (m.includes(chave) ? m.filter((k) => k !== chave) : [...m, chave]));
  }

  function alternarTodos() {
    const chaves = novosVisiveis.map((c) => c.chave);
    setMarcadosLista((m) => (todosVisiveisMarcados ? m.filter((k) => !chaves.includes(k)) : [...new Set([...m, ...chaves])]));
  }

  async function importar() {
    if (!lista || salvando) return;
    if (marcaveis.length === 0) return setErro('Marque pelo menos um contato.');
    setSalvando(true);
    const ok = await importarClientes(
      marcaveis.map((c) => ({ id: novoId(), nome: c.nome || 'Sem nome', telefone: c.telefone, veiculo: null, importado: true })),
    );
    setSalvando(false);
    if (ok) {
      rascunho.limpar();
      navigate('/clientes', { replace: true, state: { importados: marcaveis.length } });
    }
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
      {!colando && (
        <button type="button" className={ui.botaoSecundario} onClick={() => setColando(true)}>
          <Icon name="telefone" size={20} /> Digitar ou colar números
        </button>
      )}
    </div>
  );

  const campoColar = colando && (
    <div className={styles.colar}>
      <label className={ui.campo}>
        <span className={ui.rotulo}>Nomes e números, um por linha</span>
        <textarea
          className={`${ui.input} ${styles.textoColar}`}
          rows={5}
          value={textoColado}
          onChange={(e) => setTextoColado(e.target.value)}
          placeholder={['Juliana Souza 53 99133-3075', '53 98111-2233', 'João Pereira'].join('\n')}
          autoFocus
        />
      </label>
      <p className={styles.suave}>
        Do WhatsApp: abra a conversa, toque no nome lá em cima, segure o dedo no número e toque em <b>Copiar</b>. Depois segure o dedo aqui e
        toque em <b>Colar</b>. Pode pôr só o número: o nome você completa depois.
      </p>
      <div className={styles.acoesColar}>
        <button
          type="button"
          className={ui.botaoSecundario}
          onClick={() => {
            setColando(false);
            setTextoColado('');
          }}
        >
          Cancelar
        </button>
        <button type="button" className={ui.botaoPrimario} onClick={adicionarColados}>
          Pôr na lista
        </button>
      </div>
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
        {campoColar}

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
          <h3>Contatos que estão só no WhatsApp</h3>
          <p>
            O WhatsApp não deixa outros apps lerem os contatos dele. Copie o número no WhatsApp e use <b>Digitar ou colar números</b>. No
            Android, com o app instalado, também dá pra usar o <b>Compartilhar</b> do WhatsApp e escolher <b>ArtDecor</b>: o contato cai direto
            nesta lista.
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
      <AvisoRascunho visivel={rascunho.recuperado && !veioCompartilhado} onDescartar={limparLista} />
      <p className={styles.resumo}>{resumo}</p>
      <p className={styles.dica}>Marque só quem é cliente da loja.</p>

      <div className={styles.mais}>
        {temAgenda && (
          <button type="button" className={styles.botaoMais} onClick={daAgenda}>
            <Icon name="mais" size={18} /> Mais da agenda
          </button>
        )}
        <label className={`${styles.botaoMais} ${styles.arquivo}`}>
          <Icon name="mais" size={18} /> {temAgenda ? 'Outro arquivo' : 'Outro arquivo (.vcf)'}
          <input type="file" accept=".vcf,text/vcard,text/x-vcard,text/directory" onChange={doArquivo} />
        </label>
        {!colando && (
          <button type="button" className={`${styles.botaoMais} ${styles.botaoLargo}`} onClick={() => setColando(true)}>
            <Icon name="mais" size={18} /> Digitar ou colar números
          </button>
        )}
      </div>
      {campoColar}
      {adicionados && (
        <p className={styles.adicionados} role="status">
          ✓ {adicionados}
        </p>
      )}

      <label className={`${ui.busca} ${styles.busca}`}>
        <Icon name="busca" size={20} />
        <input type="search" placeholder="Buscar nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar contato" />
      </label>

      <div className={styles.barraLista}>
        <span>
          <b>{marcaveis.length}</b> {marcaveis.length === 1 ? 'marcado' : 'marcados'}
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
        <button type="button" className={styles.link} onClick={limparLista}>
          Limpar lista e começar de novo
        </button>
      </div>

      <ErroFormulario erro={erro} onFechar={() => setErro('')} />
      <div className={ui.barraAcao}>
        <button type="button" className={ui.botaoPrimario} onClick={importar} disabled={salvando || marcaveis.length === 0}>
          {salvando ? 'Importando…' : marcaveis.length === 0 ? 'Marque os clientes' : `Importar ${marcaveis.length} ${marcaveis.length === 1 ? 'cliente' : 'clientes'}`}
        </button>
      </div>
    </>
  );
}

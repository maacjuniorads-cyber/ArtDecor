import { useEffect, useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import {
  ativarAvisos,
  avisoDeTeste,
  desativarAvisos,
  inscricaoAtual,
  lerTipos,
  salvarTipos,
  suporteAvisos,
  TIPOS_PADRAO,
  type TiposAviso,
} from '@/lib/avisos';
import ui from '@/styles/ui.module.css';
import styles from './Avisos.module.css';

const OPCOES: { chave: keyof TiposAviso; titulo: string; quando: string; exemplo: string }[] = [
  {
    chave: 'manha',
    titulo: 'Resumo do dia',
    quando: 'De manhã, por volta das 8h',
    exemplo: 'Hoje sai 1 pedido e voltam 2. 1 devolução atrasada.',
  },
  {
    chave: 'vespera',
    titulo: 'Retiradas de amanhã',
    quando: 'No fim da tarde, por volta das 18h',
    exemplo: 'Amanhã a Fernanda retira o pedido #0012 — 7 peças pra separar.',
  },
  {
    chave: 'atraso',
    titulo: 'Devolução atrasada',
    quando: 'Na manhã seguinte ao dia combinado',
    exemplo: 'O Carlos devia ter devolvido o pedido #0011 ontem.',
  },
];

type Estado = 'carregando' | 'desligado' | 'ligado';

/** Liga e desliga os avisos no celular, e escolhe quais receber. */
export function Avisos() {
  const suporte = suporteAvisos();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [tipos, setTipos] = useState<TiposAviso>(TIPOS_PADRAO);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState('');
  const bloqueado = suporte === 'ok' && Notification.permission === 'denied';

  useEffect(() => {
    if (suporte !== 'ok') return;
    let ativo = true;
    (async () => {
      try {
        const atual = await inscricaoAtual();
        if (!ativo) return;
        if (atual && Notification.permission === 'granted') {
          setSub(atual);
          const salvos = await lerTipos(atual);
          if (!ativo) return;
          if (salvos) setTipos(salvos);
          else await salvarTipos(atual, TIPOS_PADRAO); // inscrição sumiu do banco: grava de novo
          setEstado('ligado');
        } else {
          setEstado('desligado');
        }
      } catch {
        if (ativo) setEstado('desligado');
      }
    })();
    return () => {
      ativo = false;
    };
  }, [suporte]);

  async function ativar() {
    setErro('');
    setOcupado(true);
    try {
      const nova = await ativarAvisos(tipos);
      setSub(nova);
      setEstado('ligado');
      await avisoDeTeste();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(
        msg === 'bloqueado'
          ? 'Os avisos estão bloqueados para o ArtDecor neste celular. Veja abaixo como liberar.'
          : msg === 'sem-permissao'
            ? 'Para ativar, toque em “Permitir” quando o celular perguntar.'
            : `Não foi possível ativar: ${msg}`,
      );
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    if (!sub) return;
    setErro('');
    setOcupado(true);
    try {
      await desativarAvisos(sub);
      setSub(null);
      setEstado('desligado');
    } catch (e) {
      setErro(`Não foi possível desligar: ${e instanceof Error ? e.message : e}`);
    } finally {
      setOcupado(false);
    }
  }

  async function mudarTipo(chave: keyof TiposAviso, valor: boolean) {
    const novos = { ...tipos, [chave]: valor };
    setTipos(novos);
    setSalvo('');
    if (!sub) return;
    try {
      await salvarTipos(sub, novos);
      setSalvo('Salvo.');
    } catch (e) {
      setTipos(tipos);
      setErro(`Não foi possível salvar: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function testar() {
    setErro('');
    try {
      await avisoDeTeste();
    } catch (e) {
      setErro(`Não foi possível mostrar o aviso: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <>
      <Cabecalho titulo="Avisos no celular" voltarPara="/" />
      <div className={styles.conteudo}>
        <p className={styles.intro}>
          O celular avisa sozinho, mesmo com o app fechado, quando tem algo pra fazer. Vale só para <b>este celular</b>: cada pessoa ativa no seu.
        </p>

        {suporte === 'instalar-iphone' && (
          <div className={styles.alerta} role="status">
            <b>No iPhone, primeiro instale o app.</b> No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta) →{' '}
            <b>Adicionar à Tela de Início</b>. Depois abra o ArtDecor pelo ícone e volte aqui. (Precisa do iOS 16.4 ou mais novo.)
          </div>
        )}
        {suporte === 'sem-suporte' && (
          <div className={styles.alerta} role="status">
            Este navegador não recebe avisos. No Android, use o <b>Chrome</b> e instale o app na tela inicial.
          </div>
        )}

        {suporte === 'ok' && estado === 'ligado' && (
          <div className={styles.ligado} role="status">
            <span aria-hidden="true">✓</span> Avisos ligados neste celular
          </div>
        )}

        <section>
          <h2 className={ui.secao}>Quais avisos receber</h2>
          <ul className={styles.lista}>
            {OPCOES.map((o) => (
              <li key={o.chave} className={ui.cartao}>
                <label className={styles.opcao}>
                  <input
                    type="checkbox"
                    checked={tipos[o.chave]}
                    onChange={(e) => mudarTipo(o.chave, e.target.checked)}
                    disabled={suporte !== 'ok' || ocupado}
                  />
                  <span className={styles.textoOpcao}>
                    <b>{o.titulo}</b>
                    <span className={ui.detalhe}>{o.quando}</span>
                    <span className={styles.exemplo}>“{o.exemplo}”</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {salvo && <p className={styles.salvo}>{salvo}</p>}
        </section>

        {bloqueado && estado !== 'ligado' && (
          <div className={styles.alerta} role="status">
            <b>Os avisos foram bloqueados neste celular.</b> Para liberar no Android: abra o app, toque nos <b>três pontinhos</b> (ou segure o
            ícone do ArtDecor) → <b>Informações do app</b> → <b>Notificações</b> → ative. Depois volte aqui.
          </div>
        )}

        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}

        {suporte === 'ok' && estado === 'ligado' && (
          <div className={styles.botoes}>
            <button type="button" className={ui.botaoSecundario} onClick={testar} disabled={ocupado}>
              Mostrar um aviso de teste
            </button>
            <button type="button" className={ui.botaoTexto} onClick={desativar} disabled={ocupado}>
              Desligar avisos neste celular
            </button>
          </div>
        )}
      </div>

      {suporte === 'ok' && estado === 'desligado' && (
        <div className={ui.barraAcao}>
          <button type="button" className={ui.botaoPrimario} onClick={ativar} disabled={ocupado}>
            {ocupado ? 'Ativando…' : 'Ativar avisos neste celular'}
          </button>
        </div>
      )}
    </>
  );
}

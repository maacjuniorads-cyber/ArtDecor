import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MODO_DEMO } from '@/lib/demo';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { TelaCarregando, TelaMarca } from './Telas';
import ui from '@/styles/ui.module.css';
import styles from './Telas.module.css';

interface Usuario {
  id: string;
  email: string;
  /** Primeiro nome, se cadastrado no Supabase (user_metadata.nome). */
  nome?: string;
  /** undefined enquanto o perfil ainda está carregando. */
  tutorialVisto?: boolean;
  marcarTutorialVisto: () => void;
  sair: () => Promise<void>;
}

interface Perfil {
  nome?: string;
  tutorialVisto?: boolean;
}

const chaveTutorial = (userId: string) => `artdecor:tutorial-visto:${userId}`;

function tutorialVistoLocal(userId: string): boolean {
  try {
    return localStorage.getItem(chaveTutorial(userId)) === '1';
  } catch {
    return false;
  }
}

const Contexto = createContext<Usuario | null>(null);

export function useUsuario(): Usuario {
  const u = useContext(Contexto);
  if (!u) throw new Error('useUsuario precisa estar dentro de <ComLogin>');
  return u;
}

/** Só mostra o app para quem estiver logado. */
export function ComLogin({ children }: { children: ReactNode }) {
  return MODO_DEMO ? <ComUsuarioDemo>{children}</ComUsuarioDemo> : <ComLoginReal>{children}</ComLoginReal>;
}

/** Modo demonstração (prints do guia): entra direto, sem banco. */
function ComUsuarioDemo({ children }: { children: ReactNode }) {
  const [tutorialVisto, setTutorialVisto] = useState(true);
  const usuario: Usuario = {
    id: 'demo',
    email: 'demo@artdecor.local',
    nome: 'Patricia',
    tutorialVisto,
    marcarTutorialVisto: () => setTutorialVisto(true),
    sair: async () => {},
  };
  return <Contexto.Provider value={usuario}>{children}</Contexto.Provider>;
}

function ComLoginReal({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // O nome vem do perfil no servidor (não da sessão guardada no aparelho),
  // assim uma mudança feita no painel do Supabase aparece sem precisar sair e entrar.
  const userId = sessao?.user.id;
  useEffect(() => {
    if (!userId) return;
    setPerfil(undefined);
    supabase.auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as Perfil;
      setPerfil({ nome: meta.nome, tutorialVisto: Boolean(meta.tutorialVisto) || tutorialVistoLocal(userId) });
    });
  }, [userId]);

  if (!supabaseConfigurado) {
    return (
      <TelaMarca>
        <div className={styles.caixa} role="alert">
          <p className={styles.titulo}>Banco de dados não configurado</p>
          <p className={styles.texto}>
            Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY (arquivo .env.local no computador, ou Environment Variables na Vercel).
          </p>
        </div>
      </TelaMarca>
    );
  }
  if (sessao === undefined) return <TelaCarregando />;
  if (!sessao) return <Login />;

  const meta = sessao.user.user_metadata as Perfil | undefined;
  const id = sessao.user.id;
  const usuario: Usuario = {
    id,
    email: sessao.user.email ?? '',
    nome: (perfil?.nome ?? meta?.nome)?.split(' ')[0],
    tutorialVisto: perfil?.tutorialVisto,
    marcarTutorialVisto: () => {
      setPerfil((p) => ({ ...p, tutorialVisto: true }));
      try {
        localStorage.setItem(chaveTutorial(id), '1');
      } catch {
        // sem localStorage: fica só no perfil
      }
      // Guarda no perfil para não repetir em outro aparelho.
      // (Repete o nome por garantia, caso o servidor substitua os dados em vez de juntar.)
      const nomeAtual = perfil?.nome ?? meta?.nome;
      supabase.auth.updateUser({ data: { tutorialVisto: true, ...(nomeAtual ? { nome: nomeAtual } : {}) } }).catch(() => {});
    },
    sair: async () => {
      await supabase.auth.signOut();
    },
  };
  return <Contexto.Provider value={usuario}>{children}</Contexto.Provider>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) {
      setErro(
        !navigator.onLine
          ? 'Sem internet. Conecte e tente de novo.'
          : error.message.toLowerCase().includes('invalid')
            ? 'E-mail ou senha incorretos.'
            : `Não foi possível entrar: ${error.message}`,
      );
    }
  }

  return (
    <TelaMarca>
      <form className={styles.caixa} onSubmit={entrar}>
        <label className={ui.campo}>
          <span className={ui.rotulo}>E-mail</span>
          <input className={ui.input} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={ui.campo}>
          <span className={ui.rotulo}>Senha</span>
          <input className={ui.input} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && (
          <p className={ui.erro} role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className={styles.botao} disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </TelaMarca>
  );
}

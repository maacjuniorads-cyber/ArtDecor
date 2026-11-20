/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase, ex.: https://abcd1234.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave pública (anon / publishable) do Supabase. É pública por natureza: a segurança vem do login + RLS. */
  readonly VITE_SUPABASE_KEY?: string;
  /** "1" só no modo demonstração (npm run demo). */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

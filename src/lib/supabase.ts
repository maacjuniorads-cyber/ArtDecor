import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_KEY;

/** false quando as variáveis de ambiente não foram configuradas (.env.local / Vercel). */
export const supabaseConfigurado = Boolean(url && chave);

export const supabase = createClient(url || 'http://supabase-nao-configurado.invalid', chave || 'chave-ausente', {
  auth: { persistSession: true, autoRefreshToken: true },
});

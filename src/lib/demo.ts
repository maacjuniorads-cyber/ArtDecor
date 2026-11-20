/**
 * Modo demonstração: só existe rodando `npm run demo` no computador
 * (arquivo .env.demo). Mostra o app com dados fictícios e sem login,
 * para tirar os prints do guia. No site publicado é sempre false.
 */
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1';

/** Tem um número de telefone de verdade (cliente importado pode vir sem). */
export function temTelefone(telefone?: string): boolean {
  return (telefone ?? '').replace(/\D/g, '').length >= 8;
}

/**
 * Link do WhatsApp para um telefone brasileiro, com mensagem opcional.
 * Sem telefone: abre o WhatsApp com a mensagem pronta para escolher a conversa.
 */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  let digitos = telefone.replace(/\D/g, '');
  if (!temTelefone(telefone)) return `https://wa.me/${texto}`;
  if (digitos.length <= 11) digitos = '55' + digitos;
  return `https://wa.me/${digitos}${texto}`;
}

/** Converte "12,50" ou "12.50" em número. Vazio ou inválido vira null. */
export function lerValor(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (limpo === '') return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 12.5 → "12,50" para preencher campos de valor. */
export function valorParaCampo(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

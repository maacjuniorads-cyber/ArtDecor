/** Textos da conferência da devolução. */

/** "1 quebrada", "2 faltando", "1 quebrada e 1 faltando". */
export function descreverProblema(p: { avariadas: number; faltando: number }): string {
  const partes: string[] = [];
  if (p.avariadas > 0) partes.push(`${p.avariadas} ${p.avariadas === 1 ? 'voltou estragada' : 'voltaram estragadas'}`);
  if (p.faltando > 0) partes.push(`${p.faltando} ${p.faltando === 1 ? 'não voltou' : 'não voltaram'}`);
  return partes.join(' e ');
}

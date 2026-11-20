import { iniciais } from '@/lib/estoque';
import ui from '@/styles/ui.module.css';

/** Foto do item, ou as iniciais quando ainda não tem foto. */
export function Thumb({ nome, fotoUrl, tamanho = 56 }: { nome: string; fotoUrl?: string; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho };
  if (fotoUrl) return <img src={fotoUrl} alt="" className={ui.thumb} style={estilo} />;
  return (
    <span className={ui.thumb} style={estilo} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}

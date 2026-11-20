import { Icon } from './Icon';
import styles from './CampoFoto.module.css';

/**
 * Quadro da foto da peça. Sem foto: convite para fotografar.
 * Com foto: mostra a foto INTEIRA (sem cortar), no formato dela, com o selo "Trocar foto".
 */
export function CampoFoto({
  fotoUrl,
  alt,
  convite,
  onEscolher,
  dataTour,
}: {
  fotoUrl?: string;
  alt: string;
  convite: string;
  onEscolher: (arquivo?: File) => void;
  dataTour?: string;
}) {
  return (
    <label className={styles.foto} data-com-foto={Boolean(fotoUrl)} data-tour={dataTour}>
      {fotoUrl ? (
        <>
          <img src={fotoUrl} alt={alt} />
          <span className={styles.trocar} aria-hidden="true">
            <Icon name="camera" size={16} strokeWidth={2} /> Trocar foto
          </span>
        </>
      ) : (
        <>
          <Icon name="camera" size={32} strokeWidth={1.8} />
          {convite}
        </>
      )}
      <input
        type="file"
        accept="image/*"
        aria-label={fotoUrl ? 'Trocar foto' : convite}
        onChange={(e) => {
          onEscolher(e.target.files?.[0]);
          e.target.value = ''; // deixa escolher a mesma foto de novo
        }}
        className={styles.arquivo}
      />
    </label>
  );
}

import { Icon } from './Icon';
import styles from './CampoFoto.module.css';

/**
 * Foto da peça, com dois botões: "Tirar foto" (abre a câmera direto) e "Galeria".
 * Separados porque no Android o seletor do sistema às vezes só mostra a galeria.
 * Com foto: mostra a foto INTEIRA (sem cortar), no formato dela.
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
  const escolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEscolher(e.target.files?.[0]);
    e.target.value = ''; // deixa escolher a mesma foto de novo
  };

  const botoes = (
    <div className={styles.botoes}>
      <label className={styles.botao}>
        <Icon name="camera" size={20} strokeWidth={2} />
        {fotoUrl ? 'Tirar outra' : 'Tirar foto'}
        <input type="file" accept="image/*" capture="environment" onChange={escolher} className={styles.arquivo} />
      </label>
      <label className={styles.botao}>
        <Icon name="galeria" size={20} strokeWidth={2} />
        Galeria
        <input type="file" accept="image/*" onChange={escolher} className={styles.arquivo} />
      </label>
    </div>
  );

  if (!fotoUrl) {
    return (
      <div className={styles.vazio} data-tour={dataTour}>
        <span className={styles.convite}>{convite}</span>
        {botoes}
      </div>
    );
  }

  return (
    <div className={styles.comFoto} data-tour={dataTour}>
      <div className={styles.quadro}>
        <img src={fotoUrl} alt={alt} />
      </div>
      {botoes}
    </div>
  );
}

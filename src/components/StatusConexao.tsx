import { contarAlteracoes } from '@/data/fila';
import styles from './StatusConexao.module.css';

/**
 * Faixa fina no topo quando o celular está sem internet ou tem coisa esperando
 * para ir pro sistema. Some sozinha quando está tudo enviado.
 */
export function StatusConexao({
  online,
  pendentes,
  enviando,
  onEnviar,
}: {
  online: boolean;
  pendentes: number;
  enviando: boolean;
  onEnviar: () => void;
}) {
  if (online && pendentes === 0) return null;

  let texto: string;
  if (!online) {
    texto = pendentes > 0 ? `Sem internet · ${contarAlteracoes(pendentes)} guardada${pendentes > 1 ? 's' : ''} no celular` : 'Sem internet · o que salvar fica guardado no celular';
  } else if (enviando) {
    texto = `Enviando ${contarAlteracoes(pendentes)}…`;
  } else {
    texto = `${contarAlteracoes(pendentes)} esperando internet para enviar`;
  }

  return (
    <div className={styles.faixa} data-online={online} role="status">
      <span className={styles.ponto} aria-hidden="true" />
      <span className={styles.texto}>{texto}</span>
      {online && !enviando && pendentes > 0 && (
        <button type="button" className={styles.botao} onClick={onEnviar}>
          Enviar agora
        </button>
      )}
    </div>
  );
}

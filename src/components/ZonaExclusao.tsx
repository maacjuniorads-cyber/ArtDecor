import { useState } from 'react';
import ui from '@/styles/ui.module.css';

interface Props {
  /** Texto do botão, ex.: "Excluir item do estoque". */
  rotulo: string;
  /** Pergunta mostrada antes de confirmar. */
  confirmacao: string;
  /** Se preenchido, a exclusão está bloqueada e este motivo aparece no lugar do botão. */
  bloqueio?: string;
  textoConfirmar?: string;
  onConfirmar: () => void;
}

/** Mensagem de bloqueio quando algo está em pedidos em andamento, ou undefined se estiver livre. */
export function motivoBloqueio(numerosPedidos: string[], oQue: string): string | undefined {
  if (numerosPedidos.length === 0) return undefined;
  const plural = numerosPedidos.length > 1;
  return `Não dá pra excluir agora: ${oQue} está ${plural ? 'nos pedidos' : 'no pedido'} ${numerosPedidos.join(', ')}, ainda em andamento.`;
}

/** Botão de ação destrutiva com confirmação em duas etapas. */
export function ZonaExclusao({ rotulo, confirmacao, bloqueio, textoConfirmar = 'Sim, excluir', onConfirmar }: Props) {
  const [confirmando, setConfirmando] = useState(false);

  if (bloqueio) {
    return (
      <div className={ui.zonaPerigo}>
        <p className={ui.detalhe}>{bloqueio}</p>
      </div>
    );
  }

  if (!confirmando) {
    return (
      <div className={ui.zonaPerigo}>
        <button type="button" className={ui.botaoPerigo} onClick={() => setConfirmando(true)}>
          {rotulo}
        </button>
      </div>
    );
  }

  return (
    <div className={ui.zonaPerigo} role="alert">
      <p className={ui.erro}>{confirmacao}</p>
      <div>
        <button type="button" className={ui.botaoPerigo} onClick={() => setConfirmando(false)}>
          Voltar
        </button>
        <button type="button" className={ui.botaoPerigoCheio} onClick={onConfirmar}>
          {textoConfirmar}
        </button>
      </div>
    </div>
  );
}

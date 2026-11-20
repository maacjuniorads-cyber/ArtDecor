/**
 * Rascunho automático dos formulários.
 *
 * Enquanto a pessoa preenche, o que ela digitou fica guardado NO PRÓPRIO CELULAR
 * (localStorage). Se a tela recarregar, o app fechar ou o celular desligar, ao
 * voltar no mesmo formulário tudo reaparece. Ao salvar com sucesso, o rascunho
 * é apagado. Rascunhos com mais de 7 dias são ignorados.
 */
import { useEffect, useRef, useState } from 'react';
import { useUsuario } from './Autenticacao';
import styles from './Rascunho.module.css';

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

interface Salvo {
  em: number;
  json: string;
}

function ler(chave: string): Salvo | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Salvo) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, json: string) {
  try {
    localStorage.setItem(chave, JSON.stringify({ em: Date.now(), json } satisfies Salvo));
  } catch {
    // celular sem espaço ou sem localStorage: segue sem rascunho
  }
}

function remover(chave: string) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // ignora
  }
}

/**
 * Enquanto a tela estiver aberta, desliga o "puxar para atualizar"
 * (o do Chrome no Android e o nosso no iPhone), para não recarregar sem querer.
 */
export function useSemPuxarParaAtualizar() {
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.formulario = '1';
    return () => {
      delete raiz.dataset.formulario;
    };
  }, []);
}

/**
 * @param nome     identifica o formulário, ex.: "pedido:novo", "cliente:abc123"
 * @param valores  tudo o que a pessoa preencheu (precisa virar JSON)
 * @param aplicar  coloca os valores recuperados de volta nos campos
 */
export function useRascunho<T>(nome: string, valores: T, aplicar: (v: T) => void) {
  const usuario = useUsuario();
  const chave = `artdecor:rascunho:${usuario.id}:${nome}`;
  const inicial = useRef(JSON.stringify(valores));
  const pronto = useRef(false);
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;
  const [recuperado, setRecuperado] = useState(false);

  useSemPuxarParaAtualizar();

  // Ao abrir: se houver rascunho diferente do formulário em branco, recupera.
  useEffect(() => {
    const salvo = ler(chave);
    if (salvo && salvo.json !== inicial.current && Date.now() - salvo.em < VALIDADE_MS) {
      try {
        aplicarRef.current(JSON.parse(salvo.json) as T);
        setRecuperado(true);
      } catch {
        remover(chave);
      }
    } else if (salvo) {
      remover(chave);
    }
    pronto.current = true;
  }, [chave]);

  // A cada mudança: guarda (ou apaga, se voltou a ficar igual ao começo).
  const atual = JSON.stringify(valores);
  useEffect(() => {
    if (!pronto.current) return;
    if (atual === inicial.current) remover(chave);
    else gravar(chave, atual);
  }, [atual, chave]);

  return {
    recuperado,
    /** Chame depois de salvar com sucesso (ou excluir). */
    limpar: () => remover(chave),
    /** Joga fora o rascunho e volta o formulário ao começo. */
    descartar: () => {
      remover(chave);
      aplicarRef.current(JSON.parse(inicial.current) as T);
      setRecuperado(false);
    },
  };
}

/** Faixa que avisa que o formulário foi recuperado de um rascunho. */
export function AvisoRascunho({ visivel, onDescartar }: { visivel: boolean; onDescartar: () => void }) {
  if (!visivel) return null;
  return (
    <div className={styles.aviso} role="status">
      <span>
        <b>Recuperamos o que você estava preenchendo.</b> Confira e continue de onde parou.
      </span>
      <button type="button" className={styles.descartar} onClick={onDescartar}>
        Descartar
      </button>
    </div>
  );
}

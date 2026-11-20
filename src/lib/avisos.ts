/**
 * Avisos no celular (notificações push).
 *
 * O celular se inscreve aqui; a tarefa agendada no GitHub (scripts/avisos.mjs)
 * lê as inscrições e manda os avisos nos horários combinados.
 */
import { supabase } from './supabase';

/** Chave PÚBLICA dos avisos (a privada fica só nos segredos do GitHub). */
export const CHAVE_PUBLICA_AVISOS = 'BNZUg5Ae8ws2mLMRczuaCC2poAGmpN71l79ERmsDZaFIpY8Odpov7agc20tqXSizd6M14G4rgwKLMXZoG8jFnN0';

export interface TiposAviso {
  /** Resumo do dia, de manhã. */
  manha: boolean;
  /** Retiradas de amanhã, no fim da tarde. */
  vespera: boolean;
  /** Devolução atrasada, na manhã seguinte. */
  atraso: boolean;
}

export const TIPOS_PADRAO: TiposAviso = { manha: true, vespera: true, atraso: true };

export type Suporte = 'ok' | 'instalar-iphone' | 'sem-suporte';

const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalado = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function suporteAvisos(): Suporte {
  const temApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // No iPhone os avisos só funcionam com o app instalado na tela de início.
  if (ehIphone() && !instalado()) return 'instalar-iphone';
  return temApi ? 'ok' : 'sem-suporte';
}

function chaveParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function registro(): Promise<ServiceWorkerRegistration> {
  const atual = await navigator.serviceWorker.getRegistration();
  if (atual) return atual;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

/** Inscrição deste celular, se os avisos já estiverem ativos. */
export async function inscricaoAtual(): Promise<PushSubscription | null> {
  if (suporteAvisos() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function descreverAparelho(): string {
  const ua = navigator.userAgent;
  const modelo = /Android [\d.]+; ([^;)]+)/.exec(ua)?.[1] ?? (ehIphone() ? 'iPhone' : /Windows/.test(ua) ? 'Computador Windows' : /Mac/.test(ua) ? 'Mac' : 'Aparelho');
  return modelo.trim().slice(0, 60);
}

async function gravar(sub: PushSubscription, tipos: TiposAviso) {
  const json = sub.toJSON();
  const { error } = await supabase.from('avisos_inscricoes').upsert({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    tipos,
    aparelho: descreverAparelho(),
  });
  if (error) throw new Error(error.message);
}

/** Pede permissão e ativa os avisos neste celular. */
export async function ativarAvisos(tipos: TiposAviso = TIPOS_PADRAO): Promise<PushSubscription> {
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error(permissao === 'denied' ? 'bloqueado' : 'sem-permissao');
  const reg = await registro();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE_PUBLICA_AVISOS) }));
  await gravar(sub, tipos);
  return sub;
}

/** Desliga os avisos neste celular. */
export async function desativarAvisos(sub: PushSubscription): Promise<void> {
  await supabase.from('avisos_inscricoes').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function lerTipos(sub: PushSubscription): Promise<TiposAviso | null> {
  const { data, error } = await supabase.from('avisos_inscricoes').select('tipos').eq('endpoint', sub.endpoint).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...TIPOS_PADRAO, ...(data.tipos as Partial<TiposAviso>) } : null;
}

/** Salva quais avisos este celular quer (e recria a inscrição se tiver sumido do banco). */
export async function salvarTipos(sub: PushSubscription, tipos: TiposAviso): Promise<void> {
  await gravar(sub, tipos);
}

/** Mostra um aviso de exemplo na hora, só neste celular. */
export async function avisoDeTeste(): Promise<void> {
  const reg = await registro();
  await reg.showNotification('ArtDecor — aviso de teste', {
    body: 'É assim que os avisos vão chegar. Tudo certo por aqui!',
    icon: '/icone-192.png',
    badge: '/icone-192.png',
    tag: 'teste',
    data: { url: '/avisos' },
  });
}

/** Detecção do aparelho (iPhone, app instalado na tela de início). */

export const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Aberto pelo ícone da tela de início (e não pelo navegador). */
export const appInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

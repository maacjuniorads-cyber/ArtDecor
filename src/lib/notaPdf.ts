/**
 * Gera o PDF da nota a partir do que está na tela.
 * As bibliotecas (html2canvas + jsPDF) só são baixadas quando a nota é aberta.
 */

const LARGURA_RENDER = 720; // px — largura "de papel" usada para desenhar a nota

export async function gerarPdfNota(elemento: HTMLElement, nomeArquivo: string): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts.ready;

  const canvas = await html2canvas(elemento, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: LARGURA_RENDER + 80,
    onclone: (_doc, clone) => {
      // Na cópia usada para o PDF: largura de papel e sem sombra/bordas arredondadas.
      clone.style.width = `${LARGURA_RENDER}px`;
      clone.style.maxWidth = 'none';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0';
    },
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const margem = 12;
  const larguraUtil = 210 - margem * 2;
  const alturaUtil = 297 - margem * 2;
  let largura = larguraUtil;
  let altura = (canvas.height * largura) / canvas.width;
  if (altura > alturaUtil) {
    // Nota muito longa: reduz para caber em uma página.
    altura = alturaUtil;
    largura = (canvas.width * altura) / canvas.height;
  }
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (210 - largura) / 2, margem, largura, altura);
  pdf.setProperties({ title: nomeArquivo.replace(/\.pdf$/, ''), creator: 'ArtDecor' });

  return new File([pdf.output('blob')], nomeArquivo, { type: 'application/pdf' });
}

export function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** true se o aparelho consegue mandar arquivos pelo "Compartilhar" (celulares, em geral). */
export function podeCompartilharArquivo(arquivo: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] });
}

// server/services/priceTable/pdfSetup.js
// ═══════════════════════════════════════════════════════════════════════
// 📄 pdfmake configurado UMA vez (tabelas de preço e pedidos)
// ═══════════════════════════════════════════════════════════════════════
// Robustez em serverless (Vercel):
//   • As fontes vêm de `pdfmake/build/vfs_fonts.js` (Roboto embutida em
//     JS) e ficam no sistema de arquivos virtual do pdfmake — não depende
//     de arquivos .ttf serem incluídos no bundle da função.
//   • As imagens entram como data URL já baixadas pelo imageLoader.
//     O pdfmake fica PROIBIDO de buscar URLs ou ler arquivos locais
//     (setUrlAccessPolicy / setLocalAccessPolicy → false).
// ═══════════════════════════════════════════════════════════════════════

import pdfmake from 'pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts.js';

Object.entries(vfsFonts).forEach(([name, base64]) => {
  pdfmake.virtualfs.writeFileSync(name, Buffer.from(base64, 'base64'));
});
pdfmake.setFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
});
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(() => false);

export const BRAND = 'ELITE SURFING';

export const COLORS = {
  navy: '#0F3057',
  text: '#1f2937',
  muted: '#6b7280',
  faint: '#9ca3af',
  line: '#e5e7eb',
  zebra: '#f8fafc',
  headRow: '#eef2f7',
  price: '#15803d',
  danger: '#b91c1c',
  placeholder: '#f1f5f9',
};

export default pdfmake;

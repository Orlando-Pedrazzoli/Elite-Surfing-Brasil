// server/services/priceTable/exportFormat.js
// ═══════════════════════════════════════════════════════════════════════
// 🔤 TABELAS DE PREÇO — formatação partilhada por PDF, Excel e email
// ═══════════════════════════════════════════════════════════════════════
// Fica num arquivo próprio (sem dependências) para o email e o controller
// não precisarem carregar o pdfmake só para formatar uma data.
// ═══════════════════════════════════════════════════════════════════════

/** R$ 1.234,56 */
export const formatBRL = value =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

/** 42,5% ('—' quando vazio) */
export const formatPct = value =>
  value === null || value === undefined
    ? '—'
    : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

/** dd/mm/aaaa no fuso de Brasília ('' quando vazio ou inválido) */
export const formatDateBR = date => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
};

/** Título do documento como o lojista o vê (título + subtítulo). */
export const documentTitle = doc =>
  [doc?.header?.title || 'Tabela de Preços', doc?.header?.subtitle]
    .filter(Boolean)
    .join(' — ');

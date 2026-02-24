// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING UTILS — Funções Auxiliares de Frete
// ═══════════════════════════════════════════════════════════════════════
// Apenas funções de formatação e validação de CEP.
// O cálculo real de frete é feito via API Melhor Envio (backend).
// ═══════════════════════════════════════════════════════════════════════

/**
 * Valida formato do CEP (8 dígitos)
 */
export const isValidCep = (cep) => {
  const clean = String(cep).replace(/\D/g, '');
  return clean.length === 8;
};

/**
 * Formatar CEP com máscara (00000-000)
 */
export const formatCep = (cep) => {
  const clean = String(cep).replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
};
// server/services/instagram/structuredOutput.js
// ═══════════════════════════════════════════════════════════════════════
// 🧩 SAÍDA ESTRUTURADA — helpers partilhados pelo gerador e pelo planner
// ═══════════════════════════════════════════════════════════════════════
// Os modelos atuais (Sonnet 5.5 / Haiku 5.5) rejeitam `tool_choice`
// `{type:'tool'}` e `{type:'any'}` (400 invalid_request_error). Usamos
// `{type:'auto'}` + instrução explícita no system prompt, e como rede de
// segurança aceitamos também JSON devolvido em texto.
// ═══════════════════════════════════════════════════════════════════════

export const TOOL_CHOICE_AUTO = { type: 'auto' };

/** Frase a juntar ao fim do system prompt para forçar o uso da ferramenta. */
export const toolInstruction = toolName =>
  `\n\nFORMATO DE RESPOSTA (obrigatório): responda SEMPRE chamando a ferramenta "${toolName}" com todos os campos preenchidos. Nunca responda em texto livre nem em markdown.`;

/**
 * Extrai o input estruturado da resposta da API.
 * 1) bloco tool_use com o nome esperado
 * 2) fallback: primeiro objeto JSON encontrado nos blocos de texto
 * @returns {object|null}
 */
export const extractToolInput = (response, toolName) => {
  const block = (response?.content || []).find(
    b => b.type === 'tool_use' && b.name === toolName,
  );
  if (block?.input && typeof block.input === 'object') return block.input;

  const text = (response?.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
  if (!text) return null;

  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

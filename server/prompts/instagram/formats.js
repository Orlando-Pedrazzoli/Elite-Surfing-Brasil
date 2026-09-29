// server/prompts/instagram/formats.js
// ═══════════════════════════════════════════════════════════════════════
// 🎬 INSTRUÇÕES POR FORMATO — post, carrossel, reel, story
// ═══════════════════════════════════════════════════════════════════════
// Cada formato diz à IA o que preencher no tool `entregar_conteudo_instagram`
// e como estruturar. Adaptado de ig-caption-writer, ig-carousel-planner
// (slide-architecture.md) e das secções Reels/Stories das heurísticas.
// ═══════════════════════════════════════════════════════════════════════

export const FORMAT_INSTRUCTIONS = {
  post: `
## Formato: POST ÚNICO (uma imagem + legenda)
Preencher: formula (IG1–IG4), variants (uma legenda completa por variante),
mediaGuidance. Deixar slides, reelScript e stories vazios.

Regras da legenda:
- hook = os primeiros 125 caracteres da legenda, e tem de fazer sentido sozinho.
  Contar caracteres com cuidado; se passar de 125, encurtar.
- Corpo escaneável: linhas curtas, espaço entre blocos, UMA ideia. Ensina ou
  conta a história que o gancho prometeu. Total abaixo de 900 caracteres
  (limite duro 2.200).
- Exatamente UM CTA, específico: "salva pra quando for trocar o leash",
  "manda pro parceiro de sessão que vive perdendo a prancha", uma pergunta
  real, ou "link na bio". Nunca "o que você acha?".
- Preço/oferta: mencionar só quando o objetivo é vender/queimar estoque, e
  sempre com o valor exato dos dados. Quando há preço original maior que o de
  venda, pode-se citar o desconto real.
- hashtags: 3–5 conforme as regras de hashtag, sem "#".
- A legenda final (campo caption) inclui o hook no início e NÃO inclui as
  hashtags (vão separadas).
- mediaGuidance: uma frase sobre a foto ideal (ex.: "produto em uso no mar,
  luz de fim de tarde, formato 4:5").
`,

  carousel: `
## Formato: CARROSSEL (2–10 slides + legenda)
Preencher: formula (IG5–IG8), slides, variants (legenda do carrossel),
mediaGuidance. Deixar reelScript e stories vazios.

Arquitetura dos slides (slide-architecture):
- Slide 1 = a promessa + o loop. Máximo 12 palavras na headline. Nada de
  título genérico. body vazio ou uma linha de apoio.
- Slides 2..N-1 = UM ponto por slide, headline curta (≤ 8 palavras) + body de
  1–2 frases concretas. O item mais forte vai no slide 2 ou 3 (o swipe decai
  com a profundidade).
- Último slide = resumo salvável em uma linha + UM pedido (save ou follow).
- Total: 5–8 slides para produto/dica; até 10 só se cada slide se sustenta
  sozinho. Nunca encher.
- visualNote em cada slide: o que mostrar (foto do produto de qual ângulo,
  detalhe, ícone, comparação). O admin monta as imagens a partir disto.

Legenda do carrossel (variants): hook que reforça a promessa do slide 1 sem a
repetir palavra por palavra, 2–4 linhas de contexto, CTA de save. 3–5 hashtags.
`,

  reel: `
## Formato: REEL (vídeo 9:16 + legenda)
Preencher: formula (IG9 ou IG10), reelScript, variants (legenda do Reel),
mediaGuidance. Deixar slides e stories vazios.

reelScript:
- hook: o texto do PRIMEIRO frame (≤ 8 palavras) — decide o alcance.
- durationSeconds: 15–45 s para produto/dica (o intervalo 5–90 s é o elegível).
- shots: 4–8 planos com t ("0–3s", "3–8s"…), action (o que filmar, pode ser
  com celular), onScreenText (rótulo curto que aparece na tela — quem vê sem
  som precisa entender), voiceover (fala opcional, uma frase, direto ao
  ponto, sem "e aí galera").
- Último plano: recap de uma linha na tela + pedido de save/envio; ideia de
  loop (o último frame fluir para o primeiro) quando fizer sentido.
- audioSuggestion: tipo de áudio (ex.: "som ambiente do mar + trilha lo-fi
  em trending" ou "voz direta, sem música"). Não citar músicas com nome
  específico de artista.
- coverText: texto da capa (≤ 6 palavras).

Legenda do Reel (variants): curta (≤ 500 chars), o hook complementa o vídeo
em vez de o repetir, UM CTA. 3–5 hashtags.
`,

  story: `
## Formato: STORIES (sequência de 3–5 telas verticais 9:16)
Preencher: formula ("STORY"), stories, variants (UMA variante com o texto
de apoio/CTA para reshare do post, se aplicável), mediaGuidance. Deixar
slides e reelScript vazios.

Stories não alcançam não seguidores: o objetivo é aprofundar com quem já
segue, gerar toques e levar para o link do produto.

Cada tela (stories[]):
- text: ≤ 20 palavras, legível em 3 segundos, sem parágrafos.
- sticker: um por tela, escolhido entre: "enquete", "pergunta", "quiz",
  "slider", "link", "countdown", "nenhum". A sequência típica: tela 1 gancho
  (sem sticker ou enquete), tela 2–3 valor/prova (quiz ou slider), tela final
  CTA com sticker "link" e linkLabel curto ("ver o leash", "garantir o meu").
- visualNote: o que mostrar (foto do produto, close, vídeo curto, texto sobre
  cor sólida).
- Preço só na tela final, e só se o objetivo for vender/queimar estoque.

variants[0].caption = texto sugerido para o admin usar como resposta
automática/DM ou como legenda de reshare (curto). hashtags vazias para stories.
`,
};

// Objetivo → o que a IA deve otimizar e quais fórmulas priorizar
export const GOAL_INSTRUCTIONS = {
  sell: `Objetivo: VENDER. Otimizar para clique no link e salvamento. Preço
exato permitido. Benefício concreto antes de característica. Priorizar IG1,
IG5, IG10, IG6.`,
  launch: `Objetivo: LANÇAMENTO. Otimizar para envios e seguidores. Novidade
real, o que muda para quem surfa, sem "chegou o novo…" genérico. Priorizar
IG2, IG9, IG4, IG7.`,
  clearance: `Objetivo: QUEIMA DE ESTOQUE / OUTLET. Otimizar para clique e
urgência honesta (estoque real, preço real, sem contagem inventada). Mostrar o
desconto real quando existir. Priorizar IG1, IG3, IG9.`,
  engage: `Objetivo: ENGAJAR. Otimizar para comentários e envios. O produto
aparece como contexto, não como vitrine. Priorizar IG3, IG4, IG2, IG7.`,
  wsl: `Objetivo: CIRCUITO WSL / CULTURA. Ligar o evento ao produto com
naturalidade (etapa, local, condições), sem afirmar resultados que não constam
nos dados. Otimizar para envios e comentários. Priorizar IG3, IG2, IG9.`,
};

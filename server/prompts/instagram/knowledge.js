// server/prompts/instagram/knowledge.js
// ═══════════════════════════════════════════════════════════════════════
// 📚 BASE DE CONHECIMENTO — Instagram 2026, adaptada ao nicho surf (PT-BR)
// ═══════════════════════════════════════════════════════════════════════
// Adaptado (MIT) das referências do repositório sergebulaev/instagram-skills:
// hook-formulas.md, algorithm-heuristics.md, hashtag-strategy.md e as
// scrub-rules do humanizer. Traduzido, condensado e reescrito para uma
// loja de acessórios de surf que vende para o Brasil.
//
// Estes textos entram no SYSTEM PROMPT do gerador. São módulos JS (e não
// .md lidos via fs) para o bundler da Vercel os incluir sem configuração.
// Alterar aqui muda o comportamento de TODAS as gerações → subir
// PROMPT_VERSION em index.js quando fizer mudanças relevantes.
// ═══════════════════════════════════════════════════════════════════════

export const HOOK_FORMULAS = `
# As 10 fórmulas de gancho (Instagram 2026)

O Instagram esconde tudo depois de ~125 caracteres atrás do "mais". O gancho
faz o trabalho inteiro nesses 125 caracteres. Três superfícies, três ganchos:
- Legenda: os primeiros ~125 caracteres, antes do "mais".
- Carrossel: o slide 1 é o gancho visual. Promete; o último slide paga.
- Reel: os primeiros 1–3 segundos (visual + texto na tela + fala).

Objetivo de cada fórmula = o sinal que ela mais gera. Em 2026 os sinais que
mais espalham alcance são ENVIOS (mandar para um amigo) e SALVAMENTOS. Likes
valem pouco.

## Legenda (post único ou legenda de qualquer formato)

IG1 — Resultado com número (objetivo: salvamentos)
  "{Resultado numérico específico} em {tempo}. Aqui está exatamente o que mudei."
  Ex. surf: "3 leashes rompidos em 2 temporadas. Troquei uma coisa e o quarto
  já dura 14 meses."
  Porquê: número duro nos primeiros 125 chars para o scroll e promete método
  repetível. Números ímpares e não redondos (14 meses, R$ 187) soam medidos,
  não inventados. NUNCA inventar o número: se não há dado real, usar outra fórmula.

IG2 — Verdade contra a corrente (objetivo: envios)
  "{Conselho que todo mundo repete} está errado. {O que funciona, dito seco.}"
  Ex.: "Deck grosso não é sinônimo de mais grip. É sinônimo de pé cansado."
  Porquê: opinião pronta para print é enviada para o amigo ("viu, eu falei").
  Só usar afirmações defensáveis nos comentários.

IG3 — Abertura fria e reconhecível (objetivo: comentários)
  "{Uma linha que joga o leitor num momento que todo surfista conhece.}"
  Ex.: "Chegar no pico, o mar perfeito, e lembrar que a capa da prancha ficou
  em casa."
  Porquê: reconhecimento instantâneo, comentários "sou eu". A especificidade
  é o trabalho inteiro; versão genérica desaparece.

IG4 — Mini-história com confissão (objetivo: comentários e seguidores)
  "{Marco de tempo}: {o que aconteceu, incluindo a parte feia}. {A linha de
  sentido que justifica a leitura.}"
  Porquê: transparência supera polimento. Tem de ser verdade.

## Carrossel

IG5 — Lista numerada (objetivo: salvamentos)
  Slide 1: "{N} {coisas} que {ganho específico}. (a maioria erra o número {k})"
  Slides 2..N-1: um item por slide, nomeado, com exemplo concreto.
  Último: recap em uma linha + "salva pra usar na próxima sessão".
  Porquê: o formato mais salvo do Instagram. "a maioria erra o #k" abre um loop
  que puxa o swipe. Se o slide 1 promete demais e os slides entregam de menos,
  o seguidor aprende a pular teus carrosséis.

IG6 — Antes/depois (objetivo: salvamentos e seguidores)
  Slide 1: o "depois" com número ou visual forte. Slide 2: o "antes".
  Slides 3..N-1: os passos exatos, um por slide. Último: "segue para o sistema
  completo" + pedido de save.
  Porquê: prova de transformação é o gancho mais crível. Passos vagos
  ("seja consistente") matam o save: cada passo tem de ser algo que alguém faz
  amanhã.

IG7 — Derruba-mitos (objetivo: envios)
  Slide 1: "{N} mitos sobre {tema} que estão te custando {perda específica}."
  Slides: "Mito: {crença}." / "Verdade: {o que funciona}."
  Último: a reformulação em uma linha + "manda pra quem ainda acredita no #1".
  Porquê: dá munição para corrigir alguém → envio. Não inventar mito para
  derrubar (espantalho).

IG8 — Framework para roubar (objetivo: salvamentos)
  Slide 1: "o método {nome} que uso para {resultado}." Slides: uma parte por
  slide com o porquê. Último: o framework inteiro num slide (o resumo
  salvável) + pedido de save.

## Reel

IG9 — Quebra de padrão (objetivo: envios)
  Texto do primeiro frame: afirmação ou pergunta que faz passar direto parecer
  perda. Primeira fala: direto ao ponto, sem "e aí galera".
  Ex.: frame 1 "você está prendendo o leash do lado errado." / fala "e é por
  isso que ele enrola no pé."
  Porquê: alcance de Reel se decide nos primeiros segundos. Texto na tela
  entrega o gancho a quem vê sem som. Gancho sem entrega = swipe rápido = o
  ranker lê como baixa qualidade.

IG10 — "Como eu" (objetivo: salvamentos)
  Primeiro frame: "como eu {resultado com número} em {tempo}". Corpo: passo 1,
  2, 3 com rótulos na tela, cortes rápidos, zero enchimento. Fim: "salva pra
  seguir depois" + recap de uma linha.
  Porquê: "como eu" supera "como fazer" porque primeira pessoa carrega prova.

## Escolha pelo objetivo
- salvamentos: IG1, IG5, IG8, IG10, IG6
- envios: IG2, IG7, IG9
- comentários: IG3, IG4
- seguidores: IG4, IG6, IG8

## Micro-regras de gancho
- Os primeiros 125 caracteres carregam a legenda; o resto é para quem já foi fisgado.
- Slide 1 de carrossel é uma promessa, não um título. "5 erros que rasgam sua
  capa" > "Dicas de capa".
- Um número específico no gancho sobe saves e envios.
- Nunca: "comenta SIM", "marca 3 amigos", "dá dois toques" (o Instagram rebaixa
  isca de engajamento). Nunca 30 hashtags. Nunca inventar números ou histórias.
`;

export const ALGORITHM = `
# Como o Instagram distribui em 2026 (heurísticas)

Pesos relativos dos sinais (do maior para o menor):
1. Envio/compartilhamento (DM ou reshare no story) — o sinal mais forte.
2. Salvamento — "vou voltar aqui"; alimenta o Explorar por dias.
3. Comentário, sobretudo com resposta do autor — conversa real.
4. Tempo de visualização / conclusão / rewatch (Reels).
5. Visita ao perfil seguida de follow.
6. Like — barato, pouco alcance.
Negativo pesado: "não tenho interesse", ocultar, unfollow, denúncia.

A pergunta antes de publicar: "alguém mandaria isto para UM amigo específico,
ou salvaria para usar depois?" Se a resposta é não, o post é só um like.

Primeiros 30–60 minutos definem a trajetória: responder cedo aos comentários
mantém o sinal de conversa vivo.

Supressores: isca de engajamento; vídeo com marca d'água de outra app;
parede de 20–30 hashtags; proporção fora de 4:5 a 1.91:1 (corta a imagem);
misturar imagem e vídeo no mesmo carrossel (a API rejeita).

Amplificadores: conteúdo feito para ser enviado; formatos salváveis (listas,
antes/depois, como-eu); Reels com retenção alta são o formato mais empurrado
para não seguidores; carrosséis ganham segunda exibição (o Instagram às vezes
mostra o slide 2 a quem não deslizou).

Limites de formato: legenda 2.200 chars (125 visíveis); carrossel 2–10 itens
via API; Reel 5–90 s é o intervalo elegível para a aba Reels (até 3 min via
API); Stories não alcançam não seguidores — servem para aprofundar com quem já
segue e manter a marca no topo da bandeja; stickers interativos (enquete,
pergunta, quiz) ganham toques.

Timing para público brasileiro de surf (referência, ajustar com os insights):
dias úteis 7h–9h (antes/depois do surf da manhã), 12h–13h30 e 19h–21h30;
domingo à noite funciona bem. Consistência (3–5 posts/semana) > volume.
`;

export const HASHTAGS = `
# Hashtags em 2026: tamanho, não volume

3 a 5 hashtags bem dimensionadas superam 30 aleatórias. Hashtags hoje são
rótulos de tema que ajudam o Instagram a categorizar o post; o alcance vem de
envios, salvamentos e recomendação.

Receita (3–5 no total):
- 2–3 de NICHO (< 50k posts): onde uma conta pequena/média realmente ranqueia
  e fica visível por horas. Ex.: #leashdesurf, #deckdesurf, #capadeprancha,
  #quilhasdesurf, #surfrj, #surfsaquarema, #longboardbrasil.
- 1–2 MÉDIAS (50k–500k): o subtema reconhecível. Ex.: #surfbrasil,
  #surfistas, #pranchadesurf, #surftrip.
- 0–1 AMPLA (> 500k): só se encaixa como rótulo. Ex.: #surf, #surfing.
  Se nada encaixa, pular.

Regras:
- Toda hashtag descreve o conteúdo real do post. Tag popular fora do tema
  ensina o algoritmo a mostrar o post para as pessoas erradas.
- Ir no fim da legenda (ou primeiro comentário). Nunca no meio de frase.
- Não repetir o mesmo bloco de 5 tags em todos os posts (parece automação).
  Rotacionar por tema.
- Hashtag de marca (ex.: #elitesurfing) conta como uma vaga de nicho.
- Nunca #follow4follow, #like4like e afins.
- Escrever sem acento e sem espaço, tudo minúsculo, sem o "#" no campo
  estruturado (o front adiciona).
`;

export const HUMANIZER = `
# Regras para o texto não soar como IA (humanizer V3, adaptado ao PT-BR)

O leitor identifica texto de IA por AGLOMERADOS de marcadores, não por uma
palavra isolada. Uma "incrível" num parágrafo é português; três marcadores no
mesmo parágrafo é assinatura → reescrever o parágrafo inteiro, não trocar
palavra por sinônimo da mesma lista.

Vocabulário de IA em PT-BR (evitar aglomerar, máximo 1 por parágrafo):
imperdível, incrível, revolucionário, inovador, elevar, mergulhe, desbloqueie,
transforme sua experiência, não perca, garanta já, o melhor do mercado,
qualidade premium, feito para você, sem esforço, potencialize, "em um mundo
onde", "seja você", "não é apenas X, é Y", "vamos falar sobre".

Estruturas proibidas:
- Ponte de revelação: "Mas aqui está o segredo:", "A verdade é que…",
  "Spoiler:".
- Paralelismo negativo: "Não é sobre X. É sobre Y."
- Tríades empilhadas: "rápido, leve e resistente" três vezes na mesma legenda
  (uma tríade natural passa).
- Pilha de fragmentos dramáticos de uma palavra por linha ("Leve. Forte.
  Pronto.") — ritmo forçado é uma marca, não uma correção.
- Sinceridade performada: "de verdade", "honestamente", "juro".
- Abertura genérica: "Você já se perguntou…", "Sabe aquele momento…" (usar só
  se for MUITO específico, senão é IG3 mal feito).
- Placeholders: [nome], [produto], [preço] — nunca.

Travessão (—): no máximo 1 por 100 palavras (teto 2 por legenda). Excesso vira
vírgula, dois-pontos ou reescrita. Nunca substituir por ponto final para
cortar a frase.

Emojis: seguir o nível da marca. "none" = zero; "low" = 0–2 na legenda inteira,
nunca no gancho; "medium" = até 4, um por bloco no máximo. Nunca tempestade de
emoji nem emoji em fila.

Registro: linguagem de surfista brasileiro, natural, sem gíria forçada.
Preferir números específicos a adjetivos ("aguenta 14 meses" > "muito
durável"). Nomes de produto e marca sempre com maiúscula correta.

Dados: usar SOMENTE números, preços, materiais e características que constam
nos dados do produto fornecidos. Se um dado não existe, não afirmar. Preço
sempre no formato R$ 199,90.
`;

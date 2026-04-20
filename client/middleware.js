/**
 * Vercel Routing Middleware — Prerender.io Integration
 * Elite Surfing Brasil
 *
 * LOCALIZAÇÃO: client/middleware.js (raiz do client, junto ao vercel.json)
 *
 * ⚡ OTIMIZAÇÃO 20/04/2026 — Adicionado MATCHER para reduzir Edge Requests:
 *    Antes: middleware corria em TODOS os requests (assets, imagens, fonts...)
 *    Depois: matcher filtra ANTES do middleware ser invocado.
 *    Impacto estimado: -70% a -90% de Edge Requests no frontend.
 *
 * FLUXO:
 *   Bot → middleware detecta user-agent → proxy para Prerender.io → HTML renderizado
 *   User → middleware ignora → SPA carrega normalmente
 *
 * Versão: 1.1.0 | 2026-04-20
 */

const BOT_USER_AGENTS = [
  // Motores de busca
  'googlebot',
  'google-inspectiontool',
  'google-adwords-urgentcrawler',
  'adsbot-google',
  'adsbot-google-mobile',
  'bingbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',
  'applebot',
  // Redes sociais
  'facebookexternalhit',
  'facebookcatalog',
  'twitterbot',
  'linkedinbot',
  'pinterestbot',
  'pinterest/0.',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  // AI crawlers
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'perplexitybot',
  'amazonbot',
  // Outros
  'rogerbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'google page speed',
  'qwantify',
  'bitrix link preview',
  'xing-contenttabreceiver',
  'chrome-lighthouse',
];

const PRIVATE_PATHS = [
  '/seller',
  '/my-orders',
  '/add-address',
  '/write-review',
  '/order-success',
  '/loader',
  '/cart',
  '/pix-payment',
  '/boleto-payment',
];

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

  // 1. Ignorar rotas privadas
  if (PRIVATE_PATHS.some(path => pathname.startsWith(path))) return;

  // 2. Detectar bot
  const isBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
  if (!isBot) return;

  // 3. Proxy para Prerender.io
  const prerenderToken = process.env.PRERENDER_TOKEN;
  if (!prerenderToken) {
    console.warn('[Middleware] PRERENDER_TOKEN não configurado.');
    return;
  }

  try {
    const prerenderUrl = `https://service.prerender.io/${request.url}`;
    const res = await fetch(prerenderUrl, {
      headers: { 'X-Prerender-Token': prerenderToken },
      redirect: 'follow',
    });

    if (!res.ok) {
      console.warn(`[Middleware] Prerender ${res.status} para ${pathname}`);
      return;
    }

    return new Response(await res.text(), {
      status: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Prerender': 'true',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error(`[Middleware] Erro Prerender: ${error.message}`);
    return; // Fallback silencioso → SPA serve normalmente
  }
}

/**
 * ⚡ MATCHER — define EM QUE PATHS o middleware corre.
 *
 * Esta regex NEGATIVA exclui tudo o que não deve passar pelo middleware:
 *   - /_next/static  → chunks JS/CSS gerados pelo build
 *   - /_next/image   → otimização de imagens
 *   - /api/*         → API routes (não precisam de prerender)
 *   - /assets/*      → assets do Vite (SPA)
 *   - /favicon.ico, /robots.txt, /sitemap.xml, /product-feed.xml → ficheiros de root
 *   - Extensões estáticas: js, css, imagens, fontes, vídeos, PDF, map, xml, json, txt
 *
 * Resultado: o middleware APENAS corre em rotas de páginas HTML reais.
 * Isto reduz as invocações do middleware em ~90%.
 */
export const config = {
  runtime: 'edge',
  matcher: [
    '/((?!api|assets|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|product-feed.xml|.*\\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|map|pdf|mp4|webm|ogg|xml|json|txt)$).*)',
  ],
};

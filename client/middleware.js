/**
 * Vercel Routing Middleware — Prerender.io Integration
 * Elite Surfing Brasil
 *
 * LOCALIZAÇÃO: client/middleware.js (raiz do client, junto ao vercel.json)
 *
 * PRÉ-REQUISITOS:
 *   1. Criar conta em https://prerender.io (plano free = 250 pages/mês)
 *   2. Copiar token em Dashboard → Security and Access
 *   3. Vercel Dashboard → Settings → Environment Variables:
 *      Nome: PRERENDER_TOKEN | Valor: (token) | Escopo: Production + Preview
 *
 * FLUXO:
 *   Bot → middleware detecta user-agent → proxy para Prerender.io → HTML renderizado
 *   User → middleware ignora → SPA carrega normalmente
 *
 * Versão: 1.0.0 | 2026-03-31
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

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.xml',
  '.json',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.map',
  '.pdf',
  '.mp4',
  '.webm',
  '.ogg',
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

  // 1. Ignorar ficheiros estáticos
  if (STATIC_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext)))
    return;

  // 2. Ignorar rotas privadas
  if (PRIVATE_PATHS.some(path => pathname.startsWith(path))) return;

  // 3. Detectar bot
  const isBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
  if (!isBot) return;

  // 4. Proxy para Prerender.io
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

export const config = { runtime: 'edge' };

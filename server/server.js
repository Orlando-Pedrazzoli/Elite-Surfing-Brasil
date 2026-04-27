// server.js - Elite Surfing Brasil
// ✅ MIGRAÇÃO 12/03/2026: Stripe REMOVIDO — Pagar.me é o único gateway
// ✅ 29/03/2026: Adicionado OTP Email Verification para guest checkout
// ✅ 07/04/2026: API de catálogo para parceiros (dropshipping Rio Surf Shop)
// ⚡ 20/04/2026 v1: OTIMIZAÇÃO DE EDGE REQUESTS
//    - Rate limiting por IP (express-rate-limit)
//    - Cache headers em rotas GET públicas
//    - Bloqueio de scrapers agressivos
// 🔧 20/04/2026 v2: HOTFIX — scripts de build (sitemap/feed) bloqueados
//    - Adicionado INTERNAL_BUILD_TOKEN para bypass
//    - Lista de bloqueio reduzida APENAS a scrapers comprovadamente maliciosos
//    - Removido bloqueio por UA curto/ausente (causava falsos positivos)
// 🔧 24/04/2026: FIX CACHE ADMIN — resolve bug de "3 refreshes para ver update"
//    - /api/product/list?all=true NUNCA é cacheado (rota admin)
//    - /api/product/list (público) mantém cache mas reduzido a 30s
//    - Rotas de mutação retornam no-store para invalidar
//    - Vary: Authorization para separar cache por user
// 🔧 27/04/2026: FIX CACHE WSL — admin salvava ranking mas blog não atualizava
//    - /api/wsl reduzido de 30min/1h para max-age=0 + s-maxage=60
//    - Browser nunca cacheia, CDN cacheia no máximo 60s
//    - Resolve atraso entre PUT do admin e GET público
//    - Mutações no controller WSL setam CDN-Cache-Control: no-store

import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import shippingRouter from './routes/shippingRoute.js';
import pixRouter from './routes/pixManualRoute.js';
import clienteRouter from './routes/clienteRoute.js';
import romaneioRouter from './routes/romaneioRoute.js';
import pagarmeRouter from './routes/pagarmeRoute.js';
import otpRouter from './routes/otpRoute.js';
import blogRouter from './routes/blogRoute.js';
import wslRouter from './routes/wslRoute.js';
import catalogRouter from './routes/catalogRoute.js';
import partnerRouter from './routes/partnerRoute.js';

const app = express();
const port = process.env.PORT || 4000;

// ✅ Trust proxy — necessário em Vercel para rate limiting funcionar com IPs reais
app.set('trust proxy', 1);

// ✅ Conexões
await connectDB();
await connectCloudinary();
console.log('✅ Database connected successfully');
console.log('✅ Cloudinary connected successfully');

// ⚡ BLOQUEIO DE SCRAPERS — lista CURTA de bots comprovadamente maliciosos.
const BLOCKED_USER_AGENTS = [
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /megaindex/i,
  /bytespider/i,
  /httrack/i,
];

app.use((req, res, next) => {
  const buildToken = req.headers['x-internal-build-token'];
  if (
    buildToken &&
    process.env.INTERNAL_BUILD_TOKEN &&
    buildToken === process.env.INTERNAL_BUILD_TOKEN
  ) {
    return next();
  }

  if (
    req.path.startsWith('/api/pagarme/webhook') ||
    req.path.startsWith('/api/shipping/webhook')
  ) {
    return next();
  }

  const ua = req.headers['user-agent'] || '';

  if (BLOCKED_USER_AGENTS.some(pattern => pattern.test(ua))) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
});

// ✅ Allowed Origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://elitesurfingbr.vercel.app',
  'http://localhost:4001',
  'http://localhost:3000',
  'https://elitesurfing.com.br',
  'https://www.elitesurfing.com.br',
  'https://elitesurfingbr-backend.vercel.app',
  'https://riosurfshop.com.br',
  'https://www.riosurfshop.com.br',
];

// ✅ CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-seller-token',
      'X-API-Key',
      'x-internal-build-token',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['ETag', 'Last-Modified'],
  }),
);

// ✅ Body parsing e cookies
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ⚡ RATE LIMITING GLOBAL — 200 req/min por IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, slow down.' },
  skip: req => {
    const buildToken = req.headers['x-internal-build-token'];
    if (
      buildToken &&
      process.env.INTERNAL_BUILD_TOKEN &&
      buildToken === process.env.INTERNAL_BUILD_TOKEN
    ) {
      return true;
    }
    if (req.path.startsWith('/api/pagarme/webhook')) return true;
    return false;
  },
});

app.use(globalLimiter);

// ⚡ RATE LIMITING ESPECÍFICO para rotas públicas de leitura
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests.' },
  skip: req => {
    const buildToken = req.headers['x-internal-build-token'];
    return !!(
      buildToken &&
      process.env.INTERNAL_BUILD_TOKEN &&
      buildToken === process.env.INTERNAL_BUILD_TOKEN
    );
  },
});

// ═══════════════════════════════════════════════════════════════════════
// 🔧 CACHE HEADERS — Estratégia corrigida (best practices 2026)
// ═══════════════════════════════════════════════════════════════════════
// REGRA DE OURO:
//   - Rotas admin (com ?all=true, seller token, ou mutations) → no-store
//   - Rotas públicas de leitura → cache curto + SWR
//   - Vary: Authorization → garante que cache do admin não vaza para público
// ═══════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  // 1. Mutations (POST/PUT/DELETE) nunca são cacheadas + invalidam intermediários
  if (req.method !== 'GET') {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }

  const path = req.path;

  // 2. Identificar requisições de admin/seller
  //    → Têm x-seller-token, Authorization, ou query ?all=true
  const isAdminRequest =
    !!req.headers['x-seller-token'] ||
    !!req.headers['authorization'] ||
    req.query.all === 'true';

  if (isAdminRequest) {
    // Admin NUNCA deve ver dados cacheados
    res.setHeader(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization, x-seller-token');
    return next();
  }

  // 3. Rotas públicas — cache curto + stale-while-revalidate
  //    max-age reduzido para resposta mais rápida a mudanças do admin
  if (path.startsWith('/api/product/list') || path === '/api/product') {
    res.setHeader(
      'Cache-Control',
      'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
    );
    res.setHeader('Vary', 'Authorization, x-seller-token');
  } else if (path.startsWith('/api/blog')) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
    );
    res.setHeader('Vary', 'Authorization, x-seller-token');
  } else if (path.startsWith('/api/wsl')) {
    // 🔧 27/04/2026 — cache MUITO curto.
    // O admin atualiza manualmente após cada etapa (a cada 1-2 semanas)
    // e precisa ver a atualização no blog imediatamente.
    // - max-age=0 → browser nunca cacheia
    // - s-maxage=60 → CDN cacheia 60s no máximo
    // - SWR=300 → serve stale enquanto revalida (sem flash de loading)
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    );
    res.setHeader('Vary', 'Authorization, x-seller-token');
  } else if (path.startsWith('/api/v1/catalog')) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=900, stale-while-revalidate=1800',
    );
  }

  next();
});

// ✅ Health check
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    message: 'Elite Surfing Brasil API is Working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '3.3.3',
    payments: {
      pix: '✅ PIX Manual',
      card: '✅ Pagar.me — Cartão 12x sem juros',
      boleto: '✅ Pagar.me — Boleto Bancário',
    },
    security: {
      emailOTP: '✅ Verificação de email OTP no guest checkout',
      rateLimit: '✅ 200 req/min global + limites específicos',
      scraperBlock: '✅ Bloqueio de scrapers agressivos conhecidos',
    },
    cache: {
      strategy: '✅ Admin no-store + Public SWR + Vary: Authorization',
      wsl: '✅ Cache curto (60s CDN) — atualização rápida do blog',
    },
    integrations: {
      catalog: '✅ API de catálogo para parceiros (dropshipping)',
    },
  });
});

// ✅ Rotas principais
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', readLimiter, productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/pix', pixRouter);
app.use('/api/clientes', clienteRouter);
app.use('/api/romaneios', romaneioRouter);
app.use('/api/pagarme', pagarmeRouter);
app.use('/api/otp', otpRouter);
app.use('/api/blog', readLimiter, blogRouter);
app.use('/api/wsl', readLimiter, wslRouter);
app.use('/api/v1/catalog', readLimiter, catalogRouter);
app.use('/api/partner', partnerRouter);

console.log('✅ All routes registered');
console.log('✅ Payments: PIX Manual + Pagar.me (Cartão 12x + Boleto)');
console.log('✅ Security: Email OTP + Rate Limiting + Scraper Block');
console.log('✅ Cache: Admin no-store + Public SWR + Vary: Authorization');
console.log('✅ Integrations: Catalog API for partners enabled');

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

// ✅ Server startup
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  app.listen(port, () => {
    console.log(`🚀 Server running on PORT: ${port}`);
  });
}

export default app;

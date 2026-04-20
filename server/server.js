// server.js - Elite Surfing Brasil
// ✅ MIGRAÇÃO 12/03/2026: Stripe REMOVIDO — Pagar.me é o único gateway
// ✅ 29/03/2026: Adicionado OTP Email Verification para guest checkout
// ✅ 07/04/2026: API de catálogo para parceiros (dropshipping Rio Surf Shop)
// ⚡ 20/04/2026: OTIMIZAÇÃO DE EDGE REQUESTS
//    - Rate limiting por IP (express-rate-limit)
//    - Cache headers em rotas GET públicas (reduz hits de bots/scrapers)
//    - Bloqueio de scrapers agressivos (user-agents suspeitos)
//    - Early exit em OPTIONS (pre-flight CORS) sem tocar no resto

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

// ⚡ BLOQUEIO DE SCRAPERS AGRESSIVOS (antes de qualquer processamento)
// Bots legítimos de SEO (Googlebot, Bingbot) passam. Scrapers abusivos são barrados.
const BLOCKED_USER_AGENTS = [
  /python-requests/i,
  /scrapy/i,
  /curl\//i,
  /wget/i,
  /java\//i,
  /go-http-client/i,
  /httrack/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /seznambot/i,
  /bytespider/i,
  /megaindex/i,
];

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';

  // Bloquear scrapers conhecidos
  if (BLOCKED_USER_AGENTS.some(pattern => pattern.test(ua))) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Bloquear requests sem user-agent (quase sempre bots mal configurados)
  if (!ua || ua.length < 10) {
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

// ✅ CORS PRIMEIRO - antes de qualquer body parsing
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
    ],
  }),
);

// ✅ Body parsing e cookies
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ⚡ RATE LIMITING GLOBAL — 200 req/min por IP (generoso para uso legítimo, barra abuso)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 200, // máx 200 requests por IP/minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, slow down.' },
  skip: req => {
    // Webhooks do Pagar.me não devem ter rate limiting
    if (req.path.startsWith('/api/pagarme/webhook')) return true;
    return false;
  },
});

app.use(globalLimiter);

// ⚡ RATE LIMITING ESPECÍFICO para rotas públicas de leitura (mais apertado)
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 req/min por IP em listagens públicas
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests.' },
});

// ⚡ CACHE HEADERS em rotas GET públicas
// Reduz massivamente hits repetidos de crawlers/scrapers
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const path = req.path;

  // Produtos (catálogo) — cache 5 min (edge) + 1 min (browser)
  if (path.startsWith('/api/product/list') || path === '/api/product') {
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    );
  }

  // Blog — cache 10 min
  if (path.startsWith('/api/blog')) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
    );
  }

  // WSL (rankings/eventos) — cache 1 hora (dados mudam raramente)
  if (path.startsWith('/api/wsl')) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=1800, s-maxage=3600, stale-while-revalidate=7200',
    );
  }

  // Catálogo parceiros — cache 15 min
  if (path.startsWith('/api/v1/catalog')) {
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
    version: '3.3.0',
    payments: {
      pix: '✅ PIX Manual',
      card: '✅ Pagar.me — Cartão 12x sem juros',
      boleto: '✅ Pagar.me — Boleto Bancário',
    },
    security: {
      emailOTP: '✅ Verificação de email OTP no guest checkout',
      rateLimit: '✅ 200 req/min global + limites específicos',
      scraperBlock: '✅ Bloqueio de scrapers agressivos',
    },
    integrations: {
      catalog: '✅ API de catálogo para parceiros (dropshipping)',
    },
  });
});

// ✅ Rotas principais (com rate limit específico em rotas de leitura pública)
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
app.use('/api/v1/catalog', readLimiter, catalogRouter); // API de catálogo (parceiros)
app.use('/api/partner', partnerRouter); // Gestão de parceiros (admin)

console.log('✅ All routes registered');
console.log('✅ Payments: PIX Manual + Pagar.me (Cartão 12x + Boleto)');
console.log('✅ Security: Email OTP + Rate Limiting + Scraper Block');
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

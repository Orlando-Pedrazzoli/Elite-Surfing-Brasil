import mongoose from 'mongoose';
import { waitUntil } from '@vercel/functions';

// ═══════════════════════════════════════════════════════════════════
// Ligação MongoDB otimizada para Vercel (Fluid Compute) + Atlas M0
// ═══════════════════════════════════════════════════════════════════
// 🔧 05/10/2026 — FIX DEFINITIVO do alerta Atlas "connections exceeded
//    threshold" (M0 = 500 ligações por nó). Substitui a tentativa de 30/09.
//
// Causa: a Vercel SUSPENDE a instância ociosa sem fechar os sockets, e
// essas ligações ficam abertas ("zombie") do lado do Atlas. A correção de
// 30/09 dependia de o driver fechar as ligações ociosas (maxIdleTimeMS)
// antes da suspensão, mas isso nunca acontecia, por dois motivos:
//
//   a) mongodb 6.16 (mongoose 8.14) NÃO aplica maxIdleTimeMS em segundo
//      plano quando minPoolSize = 0 — só fecha a ligação ociosa na
//      utilização seguinte. Corrigido no driver 6.18+ → mongoose ^8.24.5.
//   b) attachDatabasePool() conta o tempo a partir do INÍCIO da query
//      (checkout), não do fim (check-in). Com uma query de >100 ms, a
//      última ligação usada ainda não tinha atingido maxIdleTimeMS quando
//      a instância era libertada para suspensão.
//
// Correções:
//   1. mongoose ^8.24.5 (driver 6.20) — maxIdleTimeMS passa a funcionar.
//   2. Guarda própria (trackPool + dbIdleGuard) substitui
//      attachDatabasePool(): mantém a instância acordada (waitUntil) até
//      maxIdleTimeMS + margem DEPOIS da última ligação devolvida ao pool.
//      Assim o driver fecha as ligações ociosas antes de a Vercel
//      suspender a instância. O middleware dbIdleGuard (server.js) cobre
//      também os pedidos que não tocam na base de dados — o connect()
//      abre sempre 1 ligação do pool (ping de autenticação).
//   3. autoIndex/autoCreate desligados na Vercel — antes, cada arranque a
//      frio corria createIndexes/createCollection dos 19 modelos em
//      paralelo e abria logo o pool inteiro (3 ligações por instância).
//      ⚠️ Ao criar/alterar índices num modelo, correr UMA vez (pasta
//      server/, com o .env):  npm run indexes
//   4. maxIdleTimeMS 10s → 5s — ligações libertadas mais depressa.
//
// Mantido de 30/09: maxPoolSize 3, serverMonitoringMode 'poll' (1 ligação
// de monitorização por nó), appName, listeners registados uma só vez.
// ═══════════════════════════════════════════════════════════════════

const IS_VERCEL = !!process.env.VERCEL;

const MAX_IDLE_MS = 5000; // ligação ociosa do pool é fechada após 5s
const HOLD_MARGIN_MS = 1500; // folga para o driver fechar e o FIN sair
const HOLD_HARD_CAP_MS = 30000; // nunca segurar a instância mais que isto

let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = {
    conn: null,
    promise: null,
    listeners: false,
    attached: false,
  };
}

const registerListeners = () => {
  if (cached.listeners) return;
  cached.listeners = true;

  mongoose.connection.on('connected', () => console.log('✅ MongoDB Connected'));
  mongoose.connection.on('error', err =>
    console.error('❌ MongoDB Error:', err.message),
  );
  mongoose.connection.on('disconnected', () =>
    console.log('⚠️ MongoDB Disconnected (o driver reconecta automaticamente)'),
  );
};

// ───────────────────────────────────────────────────────────────────
// Guarda do pool: mantém a instância Vercel acordada até o pool ficar
// ocioso tempo suficiente para o driver fechar as ligações.
//
// O driver fecha uma ligação MAX_IDLE_MS depois da sua última utilização.
// Logo, só pode haver ligações do pool abertas se houver uma query em
// curso OU se o último check-in foi há menos de MAX_IDLE_MS. A guarda
// segura a instância (waitUntil) exatamente nesses dois casos:
//
//   checkout  → query em curso (desde o pedido de ligação): segura
//   check-in  → sem queries em curso: liberta MAX_IDLE_MS + margem depois
//   pedido    → (dbIdleGuard) se o pool ainda pode ter ligações, segura
//               até ao mesmo prazo — cobre pedidos sem acesso à BD
//
// waitUntil() tem de ser chamado dentro de um pedido. Fora dele (arranque
// a frio) é um no-op silencioso; é o dbIdleGuard que cobre esse caso.
// ───────────────────────────────────────────────────────────────────
const guard = {
  active: false, // listeners ligados ao client (só na Vercel)
  busy: 0, // ligações pedidas/em uso neste momento
  lastIdleAt: 0, // instante do último check-in (ou do connect)
  timer: null,
  promise: null, // promise entregue ao waitUntil
  release: null,
};

const freeInstance = () => {
  clearTimeout(guard.timer);
  guard.timer = null;
  if (guard.release) guard.release();
  guard.release = null;
  guard.promise = null;
};

const holdInstance = ms => {
  if (!guard.promise) {
    guard.promise = new Promise(resolve => {
      guard.release = resolve;
    });
  }
  clearTimeout(guard.timer);
  guard.timer = setTimeout(freeInstance, ms);
  waitUntil(guard.promise);
};

const trackPool = client => {
  guard.active = true;
  guard.lastIdleAt = Date.now(); // o connect() acabou de usar 1 ligação

  const settle = () => {
    guard.busy = Math.max(0, guard.busy - 1);
    guard.lastIdleAt = Date.now();
    if (guard.busy === 0) holdInstance(MAX_IDLE_MS + HOLD_MARGIN_MS);
  };

  // Conta desde o PEDIDO de ligação (pode ter de abrir uma nova) até ela
  // ser devolvida ao pool — ou até o pedido de ligação falhar.
  client.on('connectionCheckOutStarted', () => {
    guard.busy += 1;
    holdInstance(HOLD_HARD_CAP_MS); // rede de segurança se o check-in falhar
  });
  client.on('connectionCheckedIn', settle);
  client.on('connectionCheckOutFailed', settle);
};

// Middleware Express — primeiro da cadeia em server.js.
// Se o pool ainda pode ter ligações abertas, este pedido segura a
// instância até elas serem fechadas. Com o pool já vazio não faz nada.
export const dbIdleGuard = (req, res, next) => {
  if (guard.active) {
    if (guard.busy > 0) {
      // query em curso (iniciada por outro pedido): junta-se à mesma espera
      if (guard.promise) waitUntil(guard.promise);
    } else {
      const remaining =
        guard.lastIdleAt + MAX_IDLE_MS + HOLD_MARGIN_MS - Date.now();
      if (remaining > 0) holdInstance(remaining);
    }
  }
  next();
};

const connectDB = async () => {
  // 1. Já ligado ou a ligar → reutilizar a mesma promise (nunca abre 2º pool)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não está definida nas variáveis de ambiente');
  }

  registerListeners();

  cached.promise = mongoose
    .connect(MONGODB_URI, {
      appName: IS_VERCEL ? 'elitesurfingbr-backend' : 'elitesurfingbr-local',
      maxPoolSize: 3, // M0 Free: limite 500 ligações por nó
      minPoolSize: 0, // serverless: não manter ligações ociosas
      maxIdleTimeMS: MAX_IDLE_MS, // fecha ligações ociosas (requer driver 6.18+)
      serverMonitoringMode: 'poll', // 1 ligação de monitorização por nó
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
      // Na Vercel os índices/coleções já existem: não recriar a cada
      // arranque a frio. Local (npm run server) continua automático.
      autoIndex: !IS_VERCEL,
      autoCreate: !IS_VERCEL,
    })
    .then(m => {
      // ✅ Segura a instância até o driver fechar as ligações ociosas
      if (IS_VERCEL && !cached.attached) {
        trackPool(m.connection.getClient());
        cached.attached = true;
      }
      console.log('✅ MongoDB connection established');
      return m;
    })
    .catch(error => {
      console.error('❌ MongoDB connection failed:', error.message);
      cached.promise = null; // permite retry na próxima invocação
      throw error;
    });

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDB;

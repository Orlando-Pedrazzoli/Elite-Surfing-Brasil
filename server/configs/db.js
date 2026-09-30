import mongoose from 'mongoose';
import { attachDatabasePool } from '@vercel/functions';

// ═══════════════════════════════════════════════════════════════════
// Ligação MongoDB otimizada para Vercel (Fluid Compute) + Atlas M0
// ═══════════════════════════════════════════════════════════════════
// 🔧 30/09/2026 — FIX alerta Atlas "connections exceeded threshold" (M0 = 500)
//
// Causa: cada instância Vercel mantém um pool próprio. Quando a Vercel
// SUSPENDE uma instância ociosa, os sockets ficam abertos do lado do
// Atlas ("ligações zombie") até expirarem. Com várias instâncias a
// subir e a ser suspensas (bots, crons, picos), o total acumula até 500.
//
// Correções:
//   1. attachDatabasePool() — a Vercel fecha as ligações ociosas do pool
//      ANTES de suspender a instância (solução oficial Vercel).
//   2. maxPoolSize 5 → 3 e maxIdleTimeMS 30s → 10s — menos ligações por
//      instância e libertação mais rápida.
//   3. serverMonitoringMode 'poll' — 1 ligação de monitorização por nó
//      em vez de 2 (o cluster M0 tem 3 nós → poupa 3 por instância).
//   4. appName — o Atlas mostra as ligações agrupadas por aplicação,
//      facilita perceber de onde vêm.
//   5. Listeners registados UMA vez e cache nunca é descartada no
//      'disconnected' (o driver reconecta sozinho; antes podia abrir
//      um segundo pool em paralelo).
// ═══════════════════════════════════════════════════════════════════

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
      appName: process.env.VERCEL ? 'elitesurfingbr-backend' : 'elitesurfingbr-local',
      maxPoolSize: 3, // M0 Free: limite 500 ligações no total
      minPoolSize: 0, // serverless: não manter ligações ociosas
      maxIdleTimeMS: 10000, // fecha ligações ociosas após 10s
      serverMonitoringMode: 'poll', // 1 ligação de monitorização por nó
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
    })
    .then(m => {
      // ✅ Vercel liberta as ligações ociosas antes de suspender a instância
      if (process.env.VERCEL && !cached.attached) {
        attachDatabasePool(m.connection.getClient());
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

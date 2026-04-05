import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════════
// Cached Connection Pattern para Vercel Serverless
// ═══════════════════════════════════════════════════════════════════
// Problema: No Vercel, cada invocação serverless pode criar uma nova
// conexão ao MongoDB. Com tráfego, isso esgota o limite de 500
// conexões do plano M0 (Free) do MongoDB Atlas.
//
// Solução: Guardar a promise de conexão em cache global (que persiste
// entre invocações warm no mesmo container). Só cria uma nova conexão
// se não existir nenhuma ativa.
// ═══════════════════════════════════════════════════════════════════

// Cache global — persiste entre invocações warm no mesmo container
let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  // 1. Se já tem conexão ativa, reutilizar
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. Se já tem uma promise em progresso (outra invocação está a conectar),
  //    aguardar essa mesma promise em vez de criar outra
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // 3. Criar nova conexão
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não está definida nas variáveis de ambiente');
  }

  mongoose.connection.on('connected', () =>
    console.log('✅ MongoDB Connected'),
  );

  mongoose.connection.on('error', err =>
    console.error('❌ MongoDB Error:', err.message),
  );

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected');
    cached.conn = null;
    cached.promise = null;
  });

  cached.promise = mongoose
    .connect(MONGODB_URI, {
      maxPoolSize: 5, // ✅ Reduzido de 10 para 5 (M0 Free tem limite 500)
      minPoolSize: 0, // ✅ 0 em serverless — não manter conexões idle
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: true, // ✅ Permitir buffering enquanto reconecta
      maxIdleTimeMS: 30000, // ✅ Fechar conexões idle após 30s (libera slots)
    })
    .then(mongoose => {
      console.log('✅ MongoDB connection established');
      return mongoose;
    })
    .catch(error => {
      console.error('❌ MongoDB connection failed:', error.message);
      // Limpar cache para permitir retry na próxima invocação
      cached.promise = null;
      throw error;
    });

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDB;

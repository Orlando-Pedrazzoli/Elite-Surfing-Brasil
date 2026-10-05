// server/scripts/sync-indexes.mjs
// ═══════════════════════════════════════════════════════════════════════
// 📇 Cria no MongoDB os índices definidos nos modelos (server/models)
// ═══════════════════════════════════════════════════════════════════════
// Porquê: desde 05/10/2026 a API na Vercel arranca com autoIndex desligado
// (ver configs/db.js) para não abrir o pool inteiro em cada arranque a
// frio. Por isso, os índices deixam de ser criados sozinhos em produção.
//
// Quando rodar: sempre que criar um modelo novo ou adicionar/alterar um
// índice (index, unique, expires, schema.index(...)) num modelo existente.
//
// Como rodar (na pasta server/, com o .env configurado):
//   npm run indexes
//
// É seguro rodar mais de uma vez: só CRIA índices em falta. Nunca apaga
// índices nem dados. Um índice que já existe com opções diferentes aparece
// como erro nesse modelo (não é alterado) e o script continua.
// ═══════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no .env');
  process.exit(1);
}

const modelsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'models',
);

const run = async () => {
  console.log('🔌 Conectando ao MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    appName: 'elitesurfingbr-sync-indexes',
    maxPoolSize: 2,
    autoIndex: false, // criamos um modelo de cada vez, abaixo
    autoCreate: false,
  });

  // Carrega todos os modelos da pasta server/models
  const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    await import(pathToFileURL(path.join(modelsDir, file)).href);
  }

  const names = mongoose.modelNames().sort();
  console.log(`\n📇 ${names.length} modelos encontrados\n`);

  let failed = 0;
  for (const name of names) {
    const Model = mongoose.model(name);
    try {
      await Model.createIndexes();
      const indexes = await Model.collection.indexes();
      console.log(`   ✅ ${name} — ${indexes.length} índices`);
    } catch (error) {
      failed += 1;
      console.error(`   ❌ ${name} — ${error.message}`);
    }
  }

  await mongoose.disconnect();

  if (failed) {
    console.error(`\n⚠️ Concluído com ${failed} modelo(s) com erro.`);
    process.exit(1);
  }
  console.log('\n✅ Índices sincronizados.');
};

run().catch(async error => {
  console.error('❌ Erro:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

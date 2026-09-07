// server/scripts/fix-sku-index.mjs
// ═══════════════════════════════════════════════════════════════════════
// 🔧 MIGRAÇÃO ÚNICA — Corrige o problema do E11000 com SKU null
// ═══════════════════════════════════════════════════════════════════════
// O que faz:
//   1. Remove ($unset) o campo `sku` de todos os produtos onde sku é null
//      (o antigo `default: null` do schema gravava null explícito, e o
//      índice sparse indexa null — só ignora campo AUSENTE).
//   2. Dropa o índice sku_1 antigo (se existir) e recria como
//      unique + sparse limpo.
//   3. Mostra um diagnóstico antes/depois.
//
// Como rodar (na pasta server/, com o .env configurado):
//   node scripts/fix-sku-index.mjs
//
// É seguro rodar mais de uma vez (idempotente).
// ═══════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no .env');
  process.exit(1);
}

const run = async () => {
  console.log('🔌 Conectando ao MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const products = db.collection('products');

  // ─── Diagnóstico inicial ────────────────────────────────────────────
  const total = await products.countDocuments();
  const withNullSku = await products.countDocuments({ sku: null });
  const withoutField = await products.countDocuments({
    sku: { $exists: false },
  });
  const withSku = total - withNullSku - withoutField;

  console.log('\n📊 Diagnóstico:');
  console.log(`   Total de produtos:       ${total}`);
  console.log(`   Com SKU preenchido:      ${withSku}`);
  console.log(`   Com sku: null (problema): ${withNullSku}`);
  console.log(`   Sem o campo sku (ok):     ${withoutField}`);

  // ─── Verificar SKUs duplicados reais (não-null) ─────────────────────
  // Se o índice unique nunca chegou a ser criado (falha silenciosa do
  // autoIndex por causa dos nulls duplicados), pode haver SKUs repetidos.
  const dupes = await products
    .aggregate([
      { $match: { sku: { $type: 'string' } } },
      { $group: { _id: '$sku', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (dupes.length > 0) {
    console.log(
      '\n⚠️  SKUs DUPLICADOS encontrados (corrija antes de continuar):',
    );
    dupes.forEach(d => console.log(`   "${d._id}" — ${d.count} produtos`));
    console.log(
      '\n   O índice unique NÃO será recriado enquanto houver duplicados.',
    );
    console.log('   Edite esses produtos no admin e rode o script de novo.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // ─── Passo 1: remover sku: null ─────────────────────────────────────
  if (withNullSku > 0) {
    const result = await products.updateMany(
      { sku: null },
      { $unset: { sku: '' } },
    );
    console.log(
      `\n✅ Campo sku removido de ${result.modifiedCount} produto(s)`,
    );
  } else {
    console.log('\n✅ Nenhum produto com sku: null — nada a limpar');
  }

  // ─── Passo 2: recriar o índice ──────────────────────────────────────
  const indexes = await products.indexes();
  const skuIndex = indexes.find(idx => idx.key?.sku === 1);

  if (skuIndex) {
    await products.dropIndex(skuIndex.name);
    console.log(`✅ Índice antigo "${skuIndex.name}" removido`);
  } else {
    console.log('ℹ️  Nenhum índice de sku existente (será criado agora)');
  }

  await products.createIndex(
    { sku: 1 },
    { unique: true, sparse: true, name: 'sku_1' },
  );
  console.log('✅ Índice sku_1 recriado (unique + sparse)');

  // ─── Diagnóstico final ──────────────────────────────────────────────
  const finalNull = await products.countDocuments({ sku: null });
  console.log(
    `\n🏁 Concluído. Produtos com sku: null restantes: ${finalNull} (esperado: 0)`,
  );

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌ Erro na migração:', err.message);
  process.exit(1);
});

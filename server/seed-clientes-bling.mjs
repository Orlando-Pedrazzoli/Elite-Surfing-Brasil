/**
 * seed-clientes-bling.mjs
 *
 * Importa os 726 contatos exportados do Bling para a collection "clientes".
 * Usa o modelo Cliente.js existente e a conexão db.js do projeto.
 *
 * COLOCAR NA PASTA: server/
 * COLOCAR JUNTO:    server/seed-clientes.json
 *
 * USO:
 *   cd server
 *   node seed-clientes-bling.mjs --dry-run      → testa sem escrever
 *   node seed-clientes-bling.mjs                 → insere os 726 clientes
 *   node seed-clientes-bling.mjs --upsert        → atualiza existentes por CPF/CNPJ
 *   node seed-clientes-bling.mjs --clear          → LIMPA a collection e insere tudo
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './configs/db.js';
import Cliente from './models/Cliente.js';

// ─── Config ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = resolve(__dirname, 'seed-clientes.json');
const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR = process.argv.includes('--clear');
const UPSERT = process.argv.includes('--upsert');

// ─── Main ────────────────────────────────────────────────
async function main() {
  // 1. Lê o JSON
  console.log('📂 Lendo seed-clientes.json...');
  const raw = readFileSync(SEED_FILE, 'utf-8');
  const contacts = JSON.parse(raw);
  console.log(`   ${contacts.length} contatos carregados`);

  // 2. Remove _blingId (não existe no schema Cliente)
  const docs = contacts.map(({ _blingId, ...rest }) => rest);

  const pjCount = docs.filter(d => d.tipo === 'PJ').length;
  const pfCount = docs.filter(d => d.tipo === 'PF').length;
  console.log(`   PJ: ${pjCount} | PF: ${pfCount}\n`);

  // 3. Dry run
  if (DRY_RUN) {
    console.log('🏃 DRY RUN — nada será escrito no banco\n');
    console.log(
      'Sample PJ:',
      JSON.stringify(
        docs.find(d => d.tipo === 'PJ'),
        null,
        2,
      ),
    );
    console.log(
      '\nSample PF:',
      JSON.stringify(
        docs.find(d => d.tipo === 'PF'),
        null,
        2,
      ),
    );
    console.log('\n✅ Tudo OK. Remove --dry-run para inserir.');
    return;
  }

  // 4. Conecta ao MongoDB (usa a mesma config do server.js)
  console.log('🔌 Conectando ao MongoDB...');
  await connectDB();
  console.log('   Conectado!\n');

  // 5. Clear (opcional)
  if (CLEAR) {
    const existing = await Cliente.countDocuments();
    console.log(`🗑️  Limpando collection clientes (${existing} docs)...`);
    await Cliente.deleteMany({});
    console.log('   Limpo.\n');
  }

  // 6. Inserção
  if (UPSERT) {
    console.log('🔄 Modo UPSERT...\n');
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const doc of docs) {
      try {
        const filter =
          doc.tipo === 'PF' && doc.cpf
            ? { cpf: doc.cpf }
            : doc.tipo === 'PJ' && doc.cnpj
              ? { cnpj: doc.cnpj }
              : null;

        if (!filter) {
          await Cliente.create(doc);
          inserted++;
          continue;
        }

        const existing = await Cliente.findOne(filter);
        if (existing) {
          await Cliente.updateOne(filter, { $set: doc });
          updated++;
        } else {
          await Cliente.create(doc);
          inserted++;
        }
      } catch (err) {
        errors++;
        const name = doc.nome || doc.razaoSocial || 'sem nome';
        console.error(`   ❌ ${name}: ${err.message}`);
      }
    }

    console.log(
      `\n✅ Upsert concluído: ${inserted} inseridos, ${updated} atualizados`,
    );
    if (errors) console.log(`   ⚠️  ${errors} erros`);
  } else {
    console.log('📥 Inserindo em bulk...\n');
    try {
      const result = await Cliente.insertMany(docs, { ordered: false });
      console.log(`✅ ${result.length} contatos inseridos!`);
    } catch (err) {
      if (err.code === 11000) {
        const count = err.result?.insertedCount || 0;
        console.log(
          `⚠️  ${count} inseridos (duplicados por CPF/CNPJ ignorados)`,
        );
      } else {
        throw err;
      }
    }
  }

  // 7. Stats
  const total = await Cliente.countDocuments();
  const pj = await Cliente.countDocuments({ tipo: 'PJ' });
  const pf = await Cliente.countDocuments({ tipo: 'PF' });
  console.log(
    `\n📊 Collection clientes: ${total} total (PJ: ${pj} | PF: ${pf})`,
  );

  await mongoose.disconnect();
  console.log('🔌 Desconectado. Seed finalizado.');
}

main().catch(err => {
  console.error('💥 Erro fatal:', err);
  process.exit(1);
});

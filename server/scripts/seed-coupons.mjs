// server/scripts/seed-coupons.mjs
// ═══════════════════════════════════════════════════════════════════════
// 🎫 MIGRAÇÃO — cria na base de dados os cupons que estavam hardcoded
//    no checkout (ELITE10, RIOSURFCHECK10, RAY10 → 10% em todos os itens).
//    Idempotente: não altera cupons que já existam.
//
//    Uso (na pasta server/):  node scripts/seed-coupons.mjs
// ═══════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../configs/db.js';
import Coupon from '../models/Coupon.js';

const LEGACY = [
  { code: 'ELITE10', description: 'Cupom geral Elite Surfing — 10%' },
  { code: 'RIOSURFCHECK10', description: 'Parceria Rio Surf Check — 10%' },
  { code: 'RAY10', description: 'Parceria Ray — 10%' },
];

const run = async () => {
  await connectDB();
  for (const c of LEGACY) {
    const exists = await Coupon.exists({ code: c.code });
    if (exists) {
      console.log(`↩︎  ${c.code} já existe — ignorado`);
      continue;
    }
    await Coupon.create({
      ...c,
      discountType: 'percentage',
      discountValue: 10,
      scope: 'all',
      stackWithPix: true,
      isActive: true,
    });
    console.log(`✅ ${c.code} criado`);
  }
  await mongoose.disconnect();
  console.log('🏁 Concluído');
};

run().catch(err => {
  console.error('❌', err);
  process.exit(1);
});

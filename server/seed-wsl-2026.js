// server/seed-wsl-2026.js
/**
 * seed-wsl-2026.js
 *
 * Sincroniza o blog WSL com os dados OFICIAIS da temporada 2026.
 *
 * FONTE DOS RANKINGS: press release oficial da WSL de 04/09/2026
 * ("Surf Abu Dhabi Pro Removed from 2026 Championship Tour Calendar")
 * — rankings pré-Lexus Trestles Pro, após o Fiji Pro (etapa 8).
 * A WSL divulgou o Top 8 oficial de cada gênero com pontuação exata
 * (melhores 7 de 8 resultados, conforme o novo formato de descartes).
 *
 * CALENDÁRIO: atualizado com as mudanças oficiais de 2026:
 *   • Filipinas (Cloud 9, Siargao) ADICIONADA como etapa 11 (31 Out–10 Nov)
 *   • Abu Dhabi REMOVIDA do calendário (anúncio de 04/09/2026)
 *   • Portugal antecipado para 16–25 Outubro
 *   • Pipeline (8–20 Dez) decide os títulos mundiais — vale 15.000 pts
 *
 * COLOCAR NA PASTA: server/
 *
 * USO:
 *   cd server
 *   node seed-wsl-2026.js --dry-run   → mostra o que será gravado, sem escrever
 *   node seed-wsl-2026.js             → grava rankings + calendário (upsert)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './configs/db.js';
import WslRanking from './models/WslRanking.js';
import WslEvent from './models/WslEvent.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SEASON = '2026';
const LAST_UPDATED = '08/09/2026 — após o Fiji Pro (etapa 8 de 12)';

// ═══════════════════════════════════════════════════════════════════
// 🏆 RANKINGS MASCULINO — Top 8 oficial WSL (pré-Trestles, 04/09/2026)
// ═══════════════════════════════════════════════════════════════════
const maleSurfers = [
  {
    rank: 1,
    name: 'Leonardo Fioravanti',
    country: 'ITA',
    countryFlag: '🇮🇹',
    points: '40.015 pts — Camisa Amarela',
  },
  {
    rank: 2,
    name: 'Ítalo Ferreira',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '39.930 pts',
  },
  {
    rank: 3,
    name: 'Yago Dora',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '37.695 pts — Atual Campeão Mundial',
  },
  {
    rank: 4,
    name: 'Gabriel Medina',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '35.410 pts',
  },
  {
    rank: 5,
    name: 'Miguel Pupo',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '32.770 pts',
  },
  {
    rank: 6,
    name: 'Griffin Colapinto',
    country: 'USA',
    countryFlag: '🇺🇸',
    points: '31.375 pts',
  },
  {
    rank: 7,
    name: 'Ethan Ewing',
    country: 'AUS',
    countryFlag: '🇦🇺',
    points: '28.575 pts',
  },
  {
    rank: 8,
    name: 'Samuel Pupo',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '27.960 pts',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 🏆 RANKINGS FEMININO — Top 8 oficial WSL (pré-Trestles, 04/09/2026)
// ═══════════════════════════════════════════════════════════════════
const femaleSurfers = [
  {
    rank: 1,
    name: 'Carissa Moore',
    country: 'HAW',
    countryFlag: '🇺🇸',
    points: '39.575 pts — Camisa Amarela',
  },
  {
    rank: 2,
    name: 'Gabriela Bryan',
    country: 'HAW',
    countryFlag: '🇺🇸',
    points: '37.065 pts',
  },
  {
    rank: 3,
    name: 'Sawyer Lindblad',
    country: 'USA',
    countryFlag: '🇺🇸',
    points: '35.970 pts',
  },
  {
    rank: 4,
    name: 'Molly Picklum',
    country: 'AUS',
    countryFlag: '🇦🇺',
    points: '34.865 pts — Atual Campeã Mundial',
  },
  {
    rank: 5,
    name: 'Luana Silva',
    country: 'BRA',
    countryFlag: '🇧🇷',
    points: '33.835 pts',
  },
  {
    rank: 6,
    name: 'Caitlin Simmers',
    country: 'USA',
    countryFlag: '🇺🇸',
    points: '31.810 pts',
  },
  {
    rank: 7,
    name: 'Lakey Peterson',
    country: 'USA',
    countryFlag: '🇺🇸',
    points: '30.235 pts',
  },
  {
    rank: 8,
    name: 'Erin Brooks',
    country: 'CAN',
    countryFlag: '🇨🇦',
    points: '29.000 pts',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 📅 CALENDÁRIO 2026 — 12 etapas (Filipinas IN, Abu Dhabi OUT)
// Vencedores das etapas 1–8 confirmados.
// ═══════════════════════════════════════════════════════════════════
const events = [
  {
    stop: 1,
    event: 'Rip Curl Pro Bells Beach',
    location: 'Bells Beach, Victoria, Austrália',
    dates: '1 – 11 Abril',
    tour: 'CT',
    status: 'completed',
    winner: 'Miguel Pupo 🇧🇷 · Gabriela Bryan 🇺🇸',
    note: '',
  },
  {
    stop: 2,
    event: 'Western Australia Margaret River Pro',
    location: 'Margaret River, Western Australia, Austrália',
    dates: '16 – 26 Abril',
    tour: 'CT',
    status: 'completed',
    winner: 'George Pittar 🇦🇺 · Lakey Peterson 🇺🇸',
    note: '',
  },
  {
    stop: 3,
    event: 'Bonsoy Gold Coast Pro',
    location: 'Gold Coast, Queensland, Austrália',
    dates: '2 – 12 Maio',
    tour: 'CT',
    status: 'completed',
    winner: 'Ethan Ewing 🇦🇺 · Stephanie Gilmore 🇦🇺',
    note: '',
  },
  {
    stop: 4,
    event: 'Corona Cero New Zealand',
    location: 'Raglan, Nova Zelândia',
    dates: '15 – 25 Maio',
    tour: 'CT',
    status: 'completed',
    winner: 'Ítalo Ferreira 🇧🇷 · Carissa Moore 🇺🇸',
    note: 'Estreia de Raglan no CT — 1ª vitória de Carissa Moore após o retorno',
  },
  {
    stop: 5,
    event: 'Surf City El Salvador Pro',
    location: 'Punta Roca, La Libertad, El Salvador',
    dates: '5 – 15 Junho',
    tour: 'CT',
    status: 'completed',
    winner: 'Leonardo Fioravanti 🇮🇹 · Carissa Moore 🇺🇸',
    note: '',
  },
  {
    stop: 6,
    event: 'VIVO Rio Pro',
    location: 'Saquarema, Rio de Janeiro, Brasil',
    dates: '19 – 27 Junho',
    tour: 'CT',
    status: 'completed',
    winner: 'Yago Dora 🇧🇷 · Sawyer Lindblad 🇺🇸',
    note: 'Yago Dora venceu em casa no Maracanã do surf',
  },
  {
    stop: 7,
    event: 'Lexus Tahiti Pro',
    location: "Teahupo'o, Taiti, Polinésia Francesa",
    dates: '8 – 18 Agosto',
    tour: 'CT',
    status: 'completed',
    winner: 'Seth Moniz 🇺🇸 · Erin Brooks 🇨🇦',
    note: '',
  },
  {
    stop: 8,
    event: 'Fiji Pro presented by Corona Cero',
    location: 'Cloudbreak, Tavarua, Fiji',
    dates: '25 Agosto – 4 Setembro',
    tour: 'CT',
    status: 'completed',
    winner: 'Cole Houshmand 🇺🇸 · Erin Brooks 🇨🇦',
    note: 'Erin Brooks venceu as duas etapas do Pacífico consecutivamente',
  },
  {
    stop: 9,
    event: 'Lexus Trestles Pro',
    location: 'Lower Trestles, San Clemente, Califórnia, EUA',
    dates: '11 – 20 Setembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
    note: 'Última etapa da temporada regular',
  },
  {
    stop: 10,
    event: 'MEO Rip Curl Pro Portugal',
    location: 'Supertubos, Peniche, Portugal',
    dates: '16 – 25 Outubro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
    note: 'Pós-temporada — campo reduzido (24 homens / 16 mulheres)',
  },
  {
    stop: 11,
    event: 'Philippines Pro',
    location: 'Cloud 9, Siargao, Filipinas',
    dates: '31 Outubro – 10 Novembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
    note: 'NOVA etapa 2026 — estreia de Cloud 9 no CT (pós-temporada)',
  },
  {
    stop: 12,
    event: 'Lexus Pipe Pro',
    location: 'Banzai Pipeline, Oahu, Havaí',
    dates: '8 – 20 Dezembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
    note: 'GRANDE FINAL — vale 15.000 pts e decide os títulos mundiais',
  },
];

// ═══════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════
const run = async () => {
  console.log('🌊 SEED WSL 2026 — Rankings + Calendário');
  console.log(`   Season: ${SEASON} | lastUpdated: ${LAST_UPDATED}`);
  console.log(
    `   Homens: ${maleSurfers.length} | Mulheres: ${femaleSurfers.length} | Etapas: ${events.length}`,
  );

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — nada será gravado. Amostra:');
    console.log('   M1:', maleSurfers[0]);
    console.log('   F1:', femaleSurfers[0]);
    console.log('   E8:', events[7].event, '→', events[7].winner);
    console.log('   E11:', events[10].event, '→', events[10].note);
    process.exit(0);
  }

  await connectDB();

  // ─── Rankings (upsert por season + gender) ─────────────────────
  await WslRanking.findOneAndUpdate(
    { season: SEASON, gender: 'male' },
    { surfers: maleSurfers, lastUpdated: LAST_UPDATED },
    { upsert: true, new: true },
  );
  console.log('✅ Ranking masculino gravado (Top 8 oficial)');

  await WslRanking.findOneAndUpdate(
    { season: SEASON, gender: 'female' },
    { surfers: femaleSurfers, lastUpdated: LAST_UPDATED },
    { upsert: true, new: true },
  );
  console.log('✅ Ranking feminino gravado (Top 8 oficial)');

  // ─── Calendário: substitui a temporada inteira ─────────────────
  // (deleteMany + insertMany garante que Abu Dhabi saia do banco)
  const removed = await WslEvent.deleteMany({ season: SEASON });
  console.log(`🗑️  ${removed.deletedCount} etapas antigas removidas`);

  const inserted = await WslEvent.insertMany(
    events.map(e => ({ ...e, season: SEASON })),
  );
  console.log(`✅ ${inserted.length} etapas gravadas (calendário atualizado)`);

  console.log('\n🏁 Blog 100% em sincronia com a WSL. Confira em /blog');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Erro no seed:', err.message);
  process.exit(1);
});

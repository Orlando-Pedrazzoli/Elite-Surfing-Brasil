// server/seed-wsl-2026.js
/**
 * seed-wsl-2026.js
 *
 * Sincroniza o blog WSL com os dados OFICIAIS da temporada 2026.
 *
 * ÚLTIMA ATUALIZAÇÃO: 23/10/2026 — após o MEO Rip Curl Pro Portugal (etapa 10 de 12).
 *
 * FONTE DOS RANKINGS: tabela oficial WSL pós-Lexus Trestles Pro (etapa 9,
 * 20/09/2026) — Top 10 de cada gênero com pontuação exata. A WSL ainda não
 * publicou os totais pós-Portugal (final terminou 23/10); a nota de cada
 * surfista indica o que mudou em Peniche (Picklum assumiu a liderança feminina).
 *
 * CALENDÁRIO 2026 (12 etapas, Abu Dhabi removida):
 *   • Etapa 9  Lexus Trestles Pro   → Miguel Pupo 🇧🇷 · Erin Brooks 🇨🇦 (3 seguidas)
 *   • Etapa 10 Portugal (16–23 Out) → Griffin Colapinto 🇺🇸 · Molly Picklum 🇦🇺
 *   • Etapa 11 Filipinas (31 Out–10 Nov) e Etapa 12 Pipeline (8–20 Dez, decide os títulos)
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
const LAST_UPDATED = '23/10/2026 — após o MEO Rip Curl Pro Portugal (etapa 10 de 12). Pontuação oficial pós-Trestles; Portugal ainda não somado pela WSL.';

// ═══════════════════════════════════════════════════════════════════
// 🏆 RANKINGS MASCULINO — Top 10 oficial WSL pós-Trestles (20/09/2026) + notas de Portugal
// ═══════════════════════════════════════════════════════════════════
const maleSurfers = [
  { rank: 1, name: 'Yago Dora', country: 'BRA', countryFlag: '🇧🇷', points: '42.780 pts — Camisa Amarela · Atual Campeão Mundial · SF em Portugal' },
  { rank: 2, name: 'Leonardo Fioravanti', country: 'ITA', countryFlag: '🇮🇹', points: '40.015 pts' },
  { rank: 3, name: 'Ítalo Ferreira', country: 'BRA', countryFlag: '🇧🇷', points: '39.930 pts — SF em Portugal' },
  { rank: 4, name: 'Miguel Pupo', country: 'BRA', countryFlag: '🇧🇷', points: '39.450 pts — Campeão do Trestles Pro' },
  { rank: 5, name: 'Gabriel Medina', country: 'BRA', countryFlag: '🇧🇷', points: '35.410 pts — Vice em Portugal (16.77 x 17.60)' },
  { rank: 6, name: 'Griffin Colapinto', country: 'USA', countryFlag: '🇺🇸', points: '33.695 pts — CAMPEÃO em Portugal (sobe no ranking)' },
  { rank: 7, name: 'Kanoa Igarashi', country: 'JPN', countryFlag: '🇯🇵', points: '31.910 pts — Vice no Trestles Pro' },
  { rank: 8, name: 'Ethan Ewing', country: 'AUS', countryFlag: '🇦🇺', points: '30.895 pts' },
  { rank: 9, name: 'Samuel Pupo', country: 'BRA', countryFlag: '🇧🇷', points: '27.960 pts' },
  { rank: 10, name: 'George Pittar', country: 'AUS', countryFlag: '🇦🇺', points: '26.705 pts' },
];

// ═══════════════════════════════════════════════════════════════════
// 🏆 RANKINGS FEMININO — ordem pós-Portugal (Picklum líder, O Jogo 23/10); pontos oficiais pós-Trestles
// ═══════════════════════════════════════════════════════════════════
const femaleSurfers = [
  { rank: 1, name: 'Molly Picklum', country: 'AUS', countryFlag: '🇦🇺', points: '38.950 pts pós-Trestles — CAMPEÃ em Portugal e NOVA LÍDER do ranking · Atual Campeã Mundial' },
  { rank: 2, name: 'Gabriela Bryan', country: 'HAW', countryFlag: '🇺🇸', points: '42.865 pts pós-Trestles — perdeu a liderança em Peniche' },
  { rank: 3, name: 'Carissa Moore', country: 'HAW', countryFlag: '🇺🇸', points: '42.320 pts' },
  { rank: 4, name: 'Sawyer Lindblad', country: 'USA', countryFlag: '🇺🇸', points: '40.055 pts' },
  { rank: 5, name: 'Erin Brooks', country: 'CAN', countryFlag: '🇨🇦', points: '38.000 pts — 3 vitórias seguidas (Tahiti, Fiji, Trestles); sequência travada por Picklum nas QF em Portugal' },
  { rank: 6, name: 'Luana Silva', country: 'BRA', countryFlag: '🇧🇷', points: '36.580 pts' },
  { rank: 7, name: 'Caitlin Simmers', country: 'USA', countryFlag: '🇺🇸', points: '31.810 pts — Vice em Portugal (12.84 x 13.33)' },
  { rank: 8, name: 'Lakey Peterson', country: 'USA', countryFlag: '🇺🇸', points: '30.235 pts' },
  { rank: 9, name: 'Isabella Nichols', country: 'AUS', countryFlag: '🇦🇺', points: '27.970 pts' },
  { rank: 10, name: 'Caroline Marks', country: 'USA', countryFlag: '🇺🇸', points: '26.320 pts' },
];

// ═══════════════════════════════════════════════════════════════════
// 📅 CALENDÁRIO 2026 — 12 etapas (Filipinas IN, Abu Dhabi OUT)
// Vencedores das etapas 1–10 confirmados.
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
    status: 'completed',
    winner: 'Miguel Pupo 🇧🇷 · Erin Brooks 🇨🇦',
    note: 'Fim da temporada regular. Erin Brooks fez história: 3 vitórias seguidas (só Gilmore 2008 e Moore 2014/15). Finais: Pupo 14.77 x 14.40 Igarashi · Brooks 13.00 x 11.90 Bryan',
  },
  {
    stop: 10,
    event: 'MEO Rip Curl Pro Portugal',
    location: 'Supertubos, Peniche, Portugal',
    dates: '16 – 23 Outubro',
    tour: 'CT',
    status: 'completed',
    winner: 'Griffin Colapinto 🇺🇸 · Molly Picklum 🇦🇺',
    note: 'Pós-temporada. Finais: Colapinto 17.60 x 16.77 Medina (virada na última onda) · Picklum 13.33 x 12.84 Simmers. SF: Medina 11.67 x 10.10 Ítalo; Colapinto 14.33 x 8.83 Yago. Picklum assumiu a liderança feminina',
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
    console.log('   E9:', events[8].event, '→', events[8].winner);
    console.log('   E10:', events[9].event, '→', events[9].winner);
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

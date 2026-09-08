// client/src/data/wslData.js
/**
 * ============================================================
 * 🏄 DADOS WSL - ELITE SURFING BLOG
 * ============================================================
 *
 * Orlando, este é o ÚNICO ficheiro que precisas editar mensalmente!
 *
 * COMO ATUALIZAR:
 * 1. Vai a https://www.worldsurfleague.com/athletes/rankings
 * 2. Copia os rankings atualizados para as arrays abaixo
 * 3. Atualiza o calendário em https://www.worldsurfleague.com/events
 * 4. Faz deploy normalmente
 *
 * ✅ Última atualização: 27 Fevereiro 2026
 * ✅ Dados verificados do site oficial WSL e fontes credíveis
 * ============================================================
 */

// ============================================================
// RANKINGS MASCULINO — CT 2026 (Top 8 oficial, pré-Trestles)
// ✅ ATUALIZADO 08/09/2026 — após o Fiji Pro (etapa 8)
// Fonte: worldsurfleague.com/athletes/tour/mct?year=2026
// ============================================================
export const maleRankings = [
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

// ============================================================
// RANKINGS FEMININO — CT 2026 (Top 8 oficial, pré-Trestles)
// ✅ ATUALIZADO 08/09/2026 — após o Fiji Pro (etapa 8)
// Fonte: worldsurfleague.com/athletes/tour/wct?year=2026
// ============================================================
export const femaleRankings = [
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

// ============================================================
// CALENDÁRIO WSL 2026 — Championship Tour (12 Stops)
// ✅ ATUALIZADO 08/09/2026 — Filipinas (Cloud 9) IN, Abu Dhabi OUT
// Fonte: worldsurfleague.com/events/2026/ct
// ============================================================
export const schedule2026 = [
  {
    stop: 1,
    event: 'Rip Curl Pro Bells Beach',
    location: 'Bells Beach, Victoria, Austrália',
    dates: '1 - 11 Abril',
    tour: 'CT',
    status: 'completed',
    winner: 'Miguel Pupo 🇧🇷 · Gabriela Bryan 🇺🇸',
  },
  {
    stop: 2,
    event: 'Western Australia Margaret River Pro',
    location: 'Margaret River, Western Australia, Austrália',
    dates: '16 - 26 Abril',
    tour: 'CT',
    status: 'completed',
    winner: 'George Pittar 🇦🇺 · Lakey Peterson 🇺🇸',
  },
  {
    stop: 3,
    event: 'Bonsoy Gold Coast Pro',
    location: 'Gold Coast, Queensland, Austrália',
    dates: '2 - 12 Maio',
    tour: 'CT',
    status: 'completed',
    winner: 'Ethan Ewing 🇦🇺 · Stephanie Gilmore 🇦🇺',
  },
  {
    stop: 4,
    event: 'Corona Cero New Zealand',
    location: 'Raglan, Nova Zelândia',
    dates: '15 - 25 Maio',
    tour: 'CT',
    status: 'completed',
    winner: 'Ítalo Ferreira 🇧🇷 · Carissa Moore 🇺🇸',
  },
  {
    stop: 5,
    event: 'Surf City El Salvador Pro',
    location: 'Punta Roca, La Libertad, El Salvador',
    dates: '5 - 15 Junho',
    tour: 'CT',
    status: 'completed',
    winner: 'Leonardo Fioravanti 🇮🇹 · Carissa Moore 🇺🇸',
  },
  {
    stop: 6,
    event: 'VIVO Rio Pro',
    location: 'Saquarema, Rio de Janeiro, Brasil',
    dates: '19 - 27 Junho',
    tour: 'CT',
    status: 'completed',
    winner: 'Yago Dora 🇧🇷 · Sawyer Lindblad 🇺🇸',
  },
  {
    stop: 7,
    event: 'Lexus Tahiti Pro',
    location: "Teahupo'o, Taiti, Polinésia Francesa",
    dates: '8 - 18 Agosto',
    tour: 'CT',
    status: 'completed',
    winner: 'Seth Moniz 🇺🇸 · Erin Brooks 🇨🇦',
  },
  {
    stop: 8,
    event: 'Fiji Pro presented by Corona Cero',
    location: 'Cloudbreak, Tavarua, Fiji',
    dates: '25 Agosto - 4 Setembro',
    tour: 'CT',
    status: 'completed',
    winner: 'Cole Houshmand 🇺🇸 · Erin Brooks 🇨🇦',
  },
  {
    stop: 9,
    event: 'Lexus Trestles Pro',
    location: 'Lower Trestles, San Clemente, Califórnia, EUA',
    dates: '11 - 20 Setembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
  },
  {
    stop: 10,
    event: 'MEO Rip Curl Pro Portugal',
    location: 'Supertubos, Peniche, Portugal',
    dates: '16 - 25 Outubro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
  },
  {
    stop: 11,
    event: 'Philippines Pro',
    location: 'Cloud 9, Siargao, Filipinas',
    dates: '31 Outubro - 10 Novembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
  },
  {
    stop: 12,
    event: 'Lexus Pipe Pro',
    location: 'Banzai Pipeline, Oahu, Havaí',
    dates: '8 - 20 Dezembro',
    tour: 'CT',
    status: 'upcoming',
    winner: null,
  },
];

// ============================================================
// CAMPEÕES MUNDIAIS — Histórico verificado
// ============================================================
export const worldChampions = [
  {
    year: 2025,
    male: 'Yago Dora',
    maleCountry: '🇧🇷',
    female: 'Molly Picklum',
    femaleCountry: '🇦🇺',
  },
  {
    year: 2024,
    male: 'John John Florence',
    maleCountry: '🇺🇸',
    female: 'Caitlin Simmers',
    femaleCountry: '🇺🇸',
  },
  {
    year: 2023,
    male: 'Filipe Toledo',
    maleCountry: '🇧🇷',
    female: 'Caroline Marks',
    femaleCountry: '🇺🇸',
  },
  {
    year: 2022,
    male: 'Filipe Toledo',
    maleCountry: '🇧🇷',
    female: 'Stephanie Gilmore',
    femaleCountry: '🇦🇺',
  },
  {
    year: 2021,
    male: 'Gabriel Medina',
    maleCountry: '🇧🇷',
    female: 'Carissa Moore',
    femaleCountry: '🇺🇸',
  },
  {
    year: 2020,
    male: 'Italo Ferreira',
    maleCountry: '🇧🇷',
    female: 'Carissa Moore',
    femaleCountry: '🇺🇸',
  },
  {
    year: 2019,
    male: 'Italo Ferreira',
    maleCountry: '🇧🇷',
    female: 'Carissa Moore',
    femaleCountry: '🇺🇸',
  },
];

// ============================================================
// WSL FINALS 2025 — Resultados reais (Cloudbreak, Fiji)
// ============================================================
export const wslFinals2025 = {
  location: 'Cloudbreak, Tavarua Island, Fiji',
  date: 'Setembro 2025',
  men: {
    champion: 'Yago Dora (BRA)',
    runnerUp: 'Griffin Colapinto (USA)',
    results: [
      'Match 1: Italo Ferreira (BRA) 14.33 def. Jack Robinson (AUS) 5.83',
      'Match 2: Griffin Colapinto (USA) 16.33 def. Italo Ferreira (BRA) 13.67',
      'Match 3: Griffin Colapinto (USA) 15.43 def. Jordy Smith (RSA) 13.50',
      'FINAL: Yago Dora (BRA) 15.66 def. Griffin Colapinto (USA) 12.33',
    ],
  },
  women: {
    champion: 'Molly Picklum (AUS)',
    runnerUp: 'Caroline Marks (USA)',
    results: [
      'Match 1: Caroline Marks (USA) 9.66 def. Bettylou Sakura Johnson (HAW) 5.00',
      'Match 2: Caroline Marks (USA) 14.60 def. Caitlin Simmers (USA) 11.33',
      'Match 3: Caroline Marks (USA) 13.67 def. Gabriela Bryan (HAW) 9.47',
      'FINAL Heat 1: Caroline Marks (USA) 12.50 def. Molly Picklum (AUS) 10.50',
      'FINAL Heat 2: Molly Picklum (AUS) 15.83 def. Caroline Marks (USA) 8.03',
      'FINAL Heat 3: Molly Picklum (AUS) 16.93 def. Caroline Marks (USA) 6.24',
    ],
  },
};

// ============================================================
// VÍDEOS WSL (YouTube embeds)
// Canal oficial: https://www.youtube.com/@WSL
// ✅ IDs reais atualizados em 27/02/2026
// ============================================================
export const wslVideos = [
  {
    id: 'bPGoRdqblEE',
    title: 'Yago Dora & Molly Picklum — 2025 World Champions | WSL Finals Fiji',
    date: '2025-09-02',
  },
  {
    id: 'FG1nTaJvaUo',
    title: 'WSL Finals Fiji 2025 — Full Replay Highlights',
    date: '2025-09-04',
  },
  {
    id: 'mtnMbV3N3bE',
    title: 'Lexus Pipe Challenger 2026 — Callum Robson vence Masculino',
    date: '2026-02-05',
  },
];

// ============================================================
// DESTAQUES CT 2026
// ============================================================
export const seasonHighlights = [
  '50º ano do surf profissional mundial',
  'Novo formato: eliminação direta desde o Round 1 — cada heat conta',
  '12 etapas em 9 países, de Abril a Dezembro',
  'Raglan (Nova Zelândia) estreia no CT como Stop 4',
  'Pipe Masters volta a encerrar a temporada com 15.000 pts',
  'Campo feminino expandido para 24 surfistas',
  'Carissa Moore e Stephanie Gilmore regressam ao CT via wildcards',
  'John John Florence regressa após pausa em 2025',
  'Sem Mid-Year Cut e sem WSL Finals — ranking cumulativo decide títulos',
];

// ============================================================
// META INFORMAÇÕES DO BLOG
// ============================================================
export const blogMeta = {
  lastUpdated: '8 Setembro 2026 — após o Fiji Pro (etapa 8)',
  season: '2026',
  nextUpdate: 'Setembro 2026 — após o Lexus Trestles Pro (etapa 9)',
};

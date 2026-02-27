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
// RANKINGS MASCULINO — CT 2025 Final Standings
// (Top 22 requalificaram para o CT 2026)
// Fonte: worldsurfleague.com/athletes/tour/mct
// ============================================================
export const maleRankings = [
  { rank: 1, name: "Yago Dora", country: "BRA", countryFlag: "🇧🇷", points: "Campeão Mundial 2025" },
  { rank: 2, name: "Jordy Smith", country: "ZAF", countryFlag: "🇿🇦", points: "Vice / Finals #2" },
  { rank: 3, name: "Griffin Colapinto", country: "USA", countryFlag: "🇺🇸", points: "Finals Runner-up" },
  { rank: 4, name: "Jack Robinson", country: "AUS", countryFlag: "🇦🇺", points: "Finals #4" },
  { rank: 5, name: "Italo Ferreira", country: "BRA", countryFlag: "🇧🇷", points: "Finals #5" },
  { rank: 6, name: "Kanoa Igarashi", country: "JPN", countryFlag: "🇯🇵", points: "" },
  { rank: 7, name: "Ethan Ewing", country: "AUS", countryFlag: "🇦🇺", points: "" },
  { rank: 8, name: "Barron Mamiya", country: "HAW", countryFlag: "🇺🇸", points: "" },
  { rank: 9, name: "Connor O'Leary", country: "AUS", countryFlag: "🇦🇺", points: "" },
  { rank: 10, name: "Cole Houshmand", country: "USA", countryFlag: "🇺🇸", points: "" },
  { rank: 11, name: "Gabriel Medina", country: "BRA", countryFlag: "🇧🇷", points: "" },
  { rank: 12, name: "Filipe Toledo", country: "BRA", countryFlag: "🇧🇷", points: "" },
  { rank: 13, name: "Crosby Colapinto", country: "USA", countryFlag: "🇺🇸", points: "" },
  { rank: 14, name: "Leonardo Fioravanti", country: "ITA", countryFlag: "🇮🇹", points: "" },
  { rank: 15, name: "Rio Waida", country: "IDN", countryFlag: "🇮🇩", points: "" },
  { rank: 16, name: "Joao Chianca", country: "BRA", countryFlag: "🇧🇷", points: "" },
  { rank: 17, name: "Seth Moniz", country: "HAW", countryFlag: "🇺🇸", points: "" },
  { rank: 18, name: "Matthew McGillivray", country: "ZAF", countryFlag: "🇿🇦", points: "" },
  { rank: 19, name: "Jake Marshall", country: "USA", countryFlag: "🇺🇸", points: "" },
  { rank: 20, name: "Alan Cleland Jr.", country: "MEX", countryFlag: "🇲🇽", points: "" },
  { rank: 21, name: "Liam O'Brien", country: "AUS", countryFlag: "🇦🇺", points: "" },
  { rank: 22, name: "Marco Mignot", country: "FRA", countryFlag: "🇫🇷", points: "Rookie do Ano 2025" },
  // Wildcard 2026:
  { rank: "WC", name: "John John Florence", country: "HAW", countryFlag: "🇺🇸", points: "Season Wildcard 2026" },
];

// ============================================================
// RANKINGS FEMININO — CT 2025 Final Standings
// Fonte: worldsurfleague.com/athletes/tour/wct
// ============================================================
export const femaleRankings = [
  { rank: 1, name: "Molly Picklum", country: "AUS", countryFlag: "🇦🇺", points: "Campeã Mundial 2025" },
  { rank: 2, name: "Gabriela Bryan", country: "HAW", countryFlag: "🇺🇸", points: "Finals #2" },
  { rank: 3, name: "Caitlin Simmers", country: "USA", countryFlag: "🇺🇸", points: "Finals #3" },
  { rank: 4, name: "Caroline Marks", country: "USA", countryFlag: "🇺🇸", points: "Finals Runner-up" },
  { rank: 5, name: "Bettylou Sakura Johnson", country: "HAW", countryFlag: "🇺🇸", points: "Finals #5" },
  { rank: 6, name: "Erin Brooks", country: "CAN", countryFlag: "🇨🇦", points: "" },
  { rank: 7, name: "Brisa Hennessy", country: "CRI", countryFlag: "🇨🇷", points: "" },
  { rank: 8, name: "Tyler Wright", country: "AUS", countryFlag: "🇦🇺", points: "" },
  { rank: 9, name: "Luana Silva", country: "BRA", countryFlag: "🇧🇷", points: "" },
  { rank: 10, name: "Isabella Nichols", country: "AUS", countryFlag: "🇦🇺", points: "" },
  { rank: 11, name: "Sawyer Lindblad", country: "USA", countryFlag: "🇺🇸", points: "" },
  { rank: 12, name: "Vahine Fierro", country: "FRA", countryFlag: "🇫🇷", points: "" },
  { rank: 13, name: "Lakey Peterson", country: "USA", countryFlag: "🇺🇸", points: "" },
  { rank: 14, name: "Sophie McCulloch", country: "AUS", countryFlag: "🇦🇺", points: "" },
  // Wildcards 2026:
  { rank: "WC", name: "Carissa Moore", country: "HAW", countryFlag: "🇺🇸", points: "Season Wildcard 2026 (regressa)" },
  { rank: "WC", name: "Stephanie Gilmore", country: "AUS", countryFlag: "🇦🇺", points: "Season Wildcard 2026 (regressa)" },
];

// ============================================================
// CALENDÁRIO WSL 2026 — Championship Tour (12 Stops)
// ✅ ATUALIZADO 27/02/2026 — inclui Raglan, NZ (anunciado 25 Jan 2026)
// Fonte: worldsurfleague.com/events/2026/ct
// ============================================================
export const schedule2026 = [
  {
    stop: 1,
    event: "Rip Curl Pro Bells Beach",
    location: "Bells Beach, Victoria, Austrália",
    dates: "1 - 11 Abril",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 2,
    event: "Western Australia Margaret River Pro",
    location: "Margaret River, Western Australia",
    dates: "16 - 26 Abril",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 3,
    event: "Bonsoy Gold Coast Pro",
    location: "Snapper Rocks, Queensland, Austrália",
    dates: "1 - 11 Maio",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 4,
    event: "New Zealand Pro",
    location: "Manu Bay, Raglan, Nova Zelândia",
    dates: "15 - 25 Maio",
    tour: "CT",
    status: "upcoming",
    winner: null,
    note: "NOVO! Primeira vez no CT — left-hand point break",
  },
  {
    stop: 5,
    event: "Surf City El Salvador Pro",
    location: "Punta Roca, El Salvador",
    dates: "5 - 15 Junho",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 6,
    event: "Saquarema Pro",
    location: "Saquarema, Rio de Janeiro, Brasil",
    dates: "19 - 27 Junho",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 7,
    event: "SHISEIDO Tahiti Pro",
    location: "Teahupo'o, Tahiti, Polinésia Francesa",
    dates: "8 - 18 Agosto",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 8,
    event: "Fiji Pro",
    location: "Cloudbreak, Fiji",
    dates: "25 Agosto - 4 Setembro",
    tour: "CT",
    status: "upcoming",
    winner: null,
  },
  {
    stop: 9,
    event: "Lexus Trestles Pro",
    location: "Lower Trestles, San Clemente, Califórnia, EUA",
    dates: "11 - 20 Setembro",
    tour: "CT",
    status: "upcoming",
    winner: null,
    note: "Último evento regular season — campo reduz após este stop",
  },
  {
    stop: 10,
    event: "Surf Abu Dhabi Pro",
    location: "Surf Abu Dhabi, Abu Dhabi, EAU",
    dates: "14 - 18 Outubro",
    tour: "Postseason",
    status: "upcoming",
    winner: null,
    note: "Campo reduzido: 24 homens / 16 mulheres",
  },
  {
    stop: 11,
    event: "MEO Rip Curl Pro Portugal",
    location: "Supertubos, Peniche, Portugal 🇵🇹",
    dates: "22 Outubro - 1 Novembro",
    tour: "Postseason",
    status: "upcoming",
    winner: null,
    note: "Campo reduzido: 24 homens / 16 mulheres",
  },
  {
    stop: 12,
    event: "Billabong Pipe Masters",
    location: "Banzai Pipeline, Oahu, Hawaii, EUA",
    dates: "8 - 20 Dezembro",
    tour: "Pipe Masters",
    status: "upcoming",
    winner: null,
    note: "FINAL DA TEMPORADA! 15.000 pts (1.5x normal). Todos os surfistas regressam.",
  },
];

// ============================================================
// CAMPEÕES MUNDIAIS — Histórico verificado
// ============================================================
export const worldChampions = [
  { year: 2025, male: "Yago Dora", maleCountry: "🇧🇷", female: "Molly Picklum", femaleCountry: "🇦🇺" },
  { year: 2024, male: "John John Florence", maleCountry: "🇺🇸", female: "Caitlin Simmers", femaleCountry: "🇺🇸" },
  { year: 2023, male: "Filipe Toledo", maleCountry: "🇧🇷", female: "Caroline Marks", femaleCountry: "🇺🇸" },
  { year: 2022, male: "Filipe Toledo", maleCountry: "🇧🇷", female: "Stephanie Gilmore", femaleCountry: "🇦🇺" },
  { year: 2021, male: "Gabriel Medina", maleCountry: "🇧🇷", female: "Carissa Moore", femaleCountry: "🇺🇸" },
  { year: 2020, male: "Italo Ferreira", maleCountry: "🇧🇷", female: "Carissa Moore", femaleCountry: "🇺🇸" },
  { year: 2019, male: "Italo Ferreira", maleCountry: "🇧🇷", female: "Carissa Moore", femaleCountry: "🇺🇸" },
];

// ============================================================
// WSL FINALS 2025 — Resultados reais (Cloudbreak, Fiji)
// ============================================================
export const wslFinals2025 = {
  location: "Cloudbreak, Tavarua Island, Fiji",
  date: "Setembro 2025",
  men: {
    champion: "Yago Dora (BRA)",
    runnerUp: "Griffin Colapinto (USA)",
    results: [
      "Match 1: Italo Ferreira (BRA) 14.33 def. Jack Robinson (AUS) 5.83",
      "Match 2: Griffin Colapinto (USA) 16.33 def. Italo Ferreira (BRA) 13.67",
      "Match 3: Griffin Colapinto (USA) 15.43 def. Jordy Smith (RSA) 13.50",
      "FINAL: Yago Dora (BRA) 15.66 def. Griffin Colapinto (USA) 12.33",
    ],
  },
  women: {
    champion: "Molly Picklum (AUS)",
    runnerUp: "Caroline Marks (USA)",
    results: [
      "Match 1: Caroline Marks (USA) 9.66 def. Bettylou Sakura Johnson (HAW) 5.00",
      "Match 2: Caroline Marks (USA) 14.60 def. Caitlin Simmers (USA) 11.33",
      "Match 3: Caroline Marks (USA) 13.67 def. Gabriela Bryan (HAW) 9.47",
      "FINAL Heat 1: Caroline Marks (USA) 12.50 def. Molly Picklum (AUS) 10.50",
      "FINAL Heat 2: Molly Picklum (AUS) 15.83 def. Caroline Marks (USA) 8.03",
      "FINAL Heat 3: Molly Picklum (AUS) 16.93 def. Caroline Marks (USA) 6.24",
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
    id: "bPGoRdqblEE",
    title: "Yago Dora & Molly Picklum — 2025 World Champions | WSL Finals Fiji",
    date: "2025-09-02",
  },
  {
    id: "FG1nTaJvaUo",
    title: "WSL Finals Fiji 2025 — Full Replay Highlights",
    date: "2025-09-04",
  },
  {
    id: "mtnMbV3N3bE",
    title: "Lexus Pipe Challenger 2026 — Callum Robson vence Masculino",
    date: "2026-02-05",
  },
];

// ============================================================
// DESTAQUES CT 2026
// ============================================================
export const seasonHighlights = [
  "50º ano do surf profissional mundial",
  "Novo formato: eliminação direta desde o Round 1 — cada heat conta",
  "12 etapas em 9 países, de Abril a Dezembro",
  "Raglan (Nova Zelândia) estreia no CT como Stop 4",
  "Pipe Masters volta a encerrar a temporada com 15.000 pts",
  "Campo feminino expandido para 24 surfistas",
  "Carissa Moore e Stephanie Gilmore regressam ao CT via wildcards",
  "John John Florence regressa após pausa em 2025",
  "Sem Mid-Year Cut e sem WSL Finals — ranking cumulativo decide títulos",
];

// ============================================================
// META INFORMAÇÕES DO BLOG
// ============================================================
export const blogMeta = {
  lastUpdated: "27 Fevereiro 2026",
  season: "2026",
  nextUpdate: "Abril 2026 — após Rip Curl Pro Bells Beach (Stop 1)",
};
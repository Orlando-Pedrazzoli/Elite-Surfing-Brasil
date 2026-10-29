// client/src/utils/productSearch.js
// ═══════════════════════════════════════════════════════════════
// Motor de busca do catálogo (lado do cliente).
//
// A lista pública de produtos já chega inteira ao AppContext
// (GET /api/product/list, servida pelo CDN), por isso a busca corre
// no browser: resposta instantânea, zero pedidos extra ao backend
// e nenhuma invocação a mais na Vercel.
//
// Usado pela SearchBar (autocomplete da navbar) e pela página
// /products (resultados completos), para os dois darem sempre a
// mesma resposta ao mesmo termo.
// ═══════════════════════════════════════════════════════════════

import { categories, groups } from '../assets/assets';

export const MIN_QUERY_LENGTH = 2;
export const SUGGESTION_LIMIT = 6;
const RECENT_KEY = 'es_recent_searches_v1';
const RECENT_LIMIT = 6;

// Termos que o cliente tende a escrever de forma diferente do cadastro
const SYNONYMS = {
  prancha: ['deck', 'capa', 'sarcofago', 'quilha'],
  grip: ['deck'],
  traction: ['deck'],
  cordinha: ['leash'],
  strap: ['leash'],
  cabo: ['leash'],
  bag: ['capa', 'sarcofago'],
  boardbag: ['capa', 'sarcofago'],
  saco: ['capa'],
  fin: ['quilha'],
  fins: ['quilha'],
  parafina: ['wax'],
  sup: ['stand', 'up'],
  longboard: ['long'],
  shortboard: ['short'],
};

// ───────────────────────────────────────────────────────────────
// Normalização: minúsculas, sem acentos, sem pontuação
// "Sarcófago Combate c/ Rodas" → "sarcofago combate c rodas"
// ───────────────────────────────────────────────────────────────
export const normalize = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = value => normalize(value).split(' ').filter(Boolean);

const expandTokens = tokens => {
  const expanded = new Set(tokens);
  tokens.forEach(token => {
    (SYNONYMS[token] || []).forEach(s => expanded.add(s));
  });
  return [...expanded];
};

// ───────────────────────────────────────────────────────────────
// Índice por produto (calculado uma vez por produto e reutilizado)
// ───────────────────────────────────────────────────────────────
const indexCache = new WeakMap();

const categoryLabel = path => {
  const found = categories.find(
    c => c.path.toLowerCase() === String(path || '').toLowerCase(),
  );
  return found ? found.text : String(path || '').replace(/-/g, ' ');
};

const groupLabel = slug => {
  const found = groups.find(g => g.slug === slug);
  return found ? found.name : '';
};

const buildIndex = product => {
  const name = normalize(product.name);
  const sku = normalize(product.sku);
  const category = normalize(categoryLabel(product.category));
  const group = normalize(groupLabel(product.group));
  const color = normalize(product.color);
  const tags = normalize((product.tags || []).join(' '));
  const description = normalize(
    Array.isArray(product.description)
      ? product.description.join(' ')
      : product.description,
  );
  return { name, sku, category, group, color, tags, description };
};

const getIndex = product => {
  let idx = indexCache.get(product);
  if (!idx) {
    idx = buildIndex(product);
    indexCache.set(product, idx);
  }
  return idx;
};

// ───────────────────────────────────────────────────────────────
// Pontuação: nome > SKU > categoria/coleção > cor/tags > descrição
// Cada token da busca tem de aparecer em algum campo (AND).
// ───────────────────────────────────────────────────────────────
const scoreProduct = (product, tokens, rawQuery) => {
  const idx = getIndex(product);
  let score = 0;

  // Frase completa no início do nome: o melhor resultado possível
  if (rawQuery && idx.name.startsWith(rawQuery)) score += 120;
  else if (rawQuery && idx.name.includes(rawQuery)) score += 70;

  for (const token of tokens) {
    const candidates = expandTokens([token]);
    let tokenScore = 0;

    for (const t of candidates) {
      if (!t) continue;
      if (idx.name.split(' ').some(w => w.startsWith(t))) {
        tokenScore = Math.max(tokenScore, idx.name.startsWith(t) ? 40 : 30);
      } else if (idx.name.includes(t)) {
        tokenScore = Math.max(tokenScore, 20);
      }
      if (idx.sku && (idx.sku === t || idx.sku.startsWith(t))) {
        tokenScore = Math.max(tokenScore, 45);
      }
      if (idx.category.includes(t)) tokenScore = Math.max(tokenScore, 18);
      if (idx.group.includes(t)) tokenScore = Math.max(tokenScore, 12);
      if (idx.color.includes(t)) tokenScore = Math.max(tokenScore, 10);
      if (idx.tags.includes(t)) tokenScore = Math.max(tokenScore, 10);
      if (idx.description.includes(t)) tokenScore = Math.max(tokenScore, 4);
    }

    if (tokenScore === 0) return 0; // token sem correspondência: fora
    score += tokenScore;
  }

  // Produtos disponíveis primeiro; bestsellers com um empurrão leve
  const available = product.inStock && product.stock > 0;
  if (available) score += 8;
  if ((product.tags || []).includes('bestseller')) score += 3;

  return score;
};

/**
 * Pesquisa produtos.
 * @param {Array} products  lista completa (vinda do AppContext)
 * @param {string} query    texto escrito pelo cliente
 * @param {object} options  { limit, includeVariants }
 * @returns {Array} produtos ordenados por relevância
 */
export const searchProducts = (products, query, options = {}) => {
  const { limit = Infinity, includeVariants = false } = options;
  const rawQuery = normalize(query);
  const tokens = tokenize(query);
  if (rawQuery.length < MIN_QUERY_LENGTH || tokens.length === 0) return [];

  const scored = [];
  for (const product of products || []) {
    if (!product || !product.name) continue;
    if (!includeVariants && product.isMainVariant === false) continue;
    const score = scoreProduct(product, tokens, rawQuery);
    if (score > 0) scored.push({ product, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (a.product.displayOrder || 0) - (b.product.displayOrder || 0) ||
      String(a.product.name).localeCompare(String(b.product.name), 'pt-BR'),
  );

  return scored.slice(0, limit).map(s => s.product);
};

/**
 * Sugestões de coleções/categorias que batem com o termo.
 * Devolve até `limit` itens { label, path, kind }.
 */
export const searchCollections = (query, limit = 3) => {
  const tokens = tokenize(query);
  if (tokens.length === 0 || normalize(query).length < MIN_QUERY_LENGTH)
    return [];
  const expanded = expandTokens(tokens);
  // Correspondência por início de palavra: "cap" → Capas, mas "as" não
  const wordMatch = (label, t) => label.split(' ').some(w => w.startsWith(t));

  const matches = [];
  groups.forEach(group => {
    const label = normalize(group.name);
    if (expanded.some(t => wordMatch(label, t))) {
      matches.push({
        kind: 'group',
        label: group.name,
        path: `/collections/${group.slug}`,
        image: group.image,
      });
    }
  });
  categories.forEach(cat => {
    const label = normalize(cat.text);
    if (tokens.every(t => expandTokens([t]).some(x => wordMatch(label, x)))) {
      matches.push({
        kind: 'category',
        label: cat.text,
        path: `/products/${cat.path}`,
        groupLabel: groupLabel(cat.group),
      });
    }
  });
  return matches.slice(0, limit);
};

// ───────────────────────────────────────────────────────────────
// Realce do termo no texto (devolve partes para o React renderizar)
// Compara sem acentos, mas mostra o texto original.
// ───────────────────────────────────────────────────────────────
export const highlightParts = (text, query) => {
  const source = String(text || '');
  const q = normalize(query);
  if (!q) return [{ text: source, match: false }];

  // Mapeia cada caractere normalizado para a sua posição no original
  const map = [];
  let normalized = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (let j = 0; j < ch.length; j += 1) {
      normalized += ch[j];
      map.push(i);
    }
  }

  const tokens = q.split(' ').filter(Boolean);
  const ranges = [];
  tokens.forEach(token => {
    let from = 0;
    let pos = normalized.indexOf(token, from);
    while (pos !== -1) {
      ranges.push([map[pos], map[pos + token.length - 1] + 1]);
      from = pos + token.length;
      pos = normalized.indexOf(token, from);
    }
  });
  if (ranges.length === 0) return [{ text: source, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  ranges.forEach(([s, e]) => {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  });

  const parts = [];
  let cursor = 0;
  merged.forEach(([s, e]) => {
    if (s > cursor) parts.push({ text: source.slice(cursor, s), match: false });
    parts.push({ text: source.slice(s, e), match: true });
    cursor = e;
  });
  if (cursor < source.length)
    parts.push({ text: source.slice(cursor), match: false });
  return parts;
};

// ───────────────────────────────────────────────────────────────
// Miniatura leve para o dropdown (Cloudinary: 96 px, fundo branco)
// ───────────────────────────────────────────────────────────────
const CLOUDINARY_UPLOAD =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export const searchThumbnail = (url, size = 96) => {
  const match = String(url || '').match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  return `${match[1]}c_pad,w_${size},h_${size},b_white,f_auto,q_auto/${match[2]}`;
};

export const productUrl = product =>
  `/products/${String(product.category || '').toLowerCase()}/${product._id}`;

// ───────────────────────────────────────────────────────────────
// Buscas recentes (localStorage, só neste dispositivo)
// ───────────────────────────────────────────────────────────────
export const getRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(Boolean).slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
};

export const addRecentSearch = term => {
  const clean = String(term || '').trim();
  if (clean.length < MIN_QUERY_LENGTH) return;
  try {
    const current = getRecentSearches().filter(
      t => normalize(t) !== normalize(clean),
    );
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([clean, ...current].slice(0, RECENT_LIMIT)),
    );
  } catch {
    /* localStorage indisponível: ignora */
  }
};

export const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignora */
  }
};

// Sugestões quando o campo está vazio (atalhos para as coleções)
export const POPULAR_SEARCHES = [
  'Deck',
  'Leash',
  'Capa',
  'Sarcófago',
  'Quilha',
  'Wax',
];

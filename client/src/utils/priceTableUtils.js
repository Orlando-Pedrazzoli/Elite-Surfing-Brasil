// client/src/utils/priceTableUtils.js
// ═══════════════════════════════════════════════════════════════════════
// 📋 TABELAS DE PREÇO — utilitários do painel (/seller/tabelas)
// ═══════════════════════════════════════════════════════════════════════
// Modelos de tabela, miniaturas do Cloudinary, download de arquivos e
// pequenas ajudas de ordenação/formatação. O cálculo de preço fica em
// priceTableEngine.js (espelho do motor do servidor).
// ═══════════════════════════════════════════════════════════════════════

export const API = '/api/price-tables';

// ─────────────────────────────────────────────────────────────────────
// Modelos (ponto de partida ao criar uma tabela)
// ─────────────────────────────────────────────────────────────────────
export const TABLE_PRESETS = [
  {
    id: 'cost',
    title: 'Custo do Fornecedor',
    description:
      'Todos os produtos só com o custo do fornecedor. Uso interno: nunca é para o lojista.',
    askPct: false,
    settings: {
      name: 'Custo do Fornecedor',
      kind: 'interna',
      base: 'cost',
      mode: 'markup',
      defaultPct: 0,
      header: { title: 'Tabela de Custo', subtitle: 'Uso interno' },
      options: { showSku: true, showImages: false, imageLayout: 'list' },
    },
  },
  {
    id: 'markup',
    title: 'Lojistas — markup sobre o custo',
    description:
      'Preço para o lojista = custo do fornecedor + a sua porcentagem. Você ajusta por categoria e por produto.',
    askPct: true,
    settings: {
      name: 'Tabela Lojistas',
      kind: 'cliente',
      base: 'cost',
      mode: 'markup',
      defaultPct: 0,
      header: { title: 'Tabela de Preços', subtitle: 'Lojistas' },
      options: { showSku: true, showImages: true, imageLayout: 'grid' },
    },
  },
  {
    id: 'wholesale',
    title: 'Lojistas — Preço de Tabela cadastrado',
    description:
      'Usa o "Preço de Tabela" que já está no cadastro de cada produto, sem recalcular.',
    askPct: false,
    settings: {
      name: 'Tabela Lojistas (cadastro)',
      kind: 'cliente',
      base: 'wholesale',
      mode: 'markup',
      defaultPct: 0,
      header: { title: 'Tabela de Preços', subtitle: 'Lojistas' },
      options: { showSku: true, showImages: true, imageLayout: 'grid' },
    },
  },
];

export const KIND_META = {
  interna: {
    label: 'Uso interno',
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
  cliente: {
    label: 'Para lojistas',
    cls: 'bg-green-50 text-green-700 border-green-200',
  },
};

// ─────────────────────────────────────────────────────────────────────
// Imagens
// ─────────────────────────────────────────────────────────────────────

/** Miniatura quadrada no Cloudinary (devolve a URL original se não for de lá). */
export const thumbUrl = (url, size = 96) => {
  if (!url || typeof url !== 'string') return '';
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || idx < 0) return url;
  const cut = idx + marker.length;
  return `${url.slice(0, cut)}c_pad,w_${size},h_${size},b_white,f_auto,q_auto/${url.slice(cut)}`;
};

// ─────────────────────────────────────────────────────────────────────
// Texto / ordenação
// ─────────────────────────────────────────────────────────────────────
const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});
export const compareText = (a, b) => collator.compare(a || '', b || '');

export const normalizeSearch = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const newSectionKey = () =>
  `sec_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`;

export const fmtDate = iso =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

export const fmtDateTime = iso =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** Date/ISO → 'yyyy-mm-dd' para <input type="date"> (sem deslocar o dia). */
export const toInputDate = value => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

/** 'yyyy-mm-dd' → ISO ao meio-dia UTC (o dia fica igual em qualquer fuso do Brasil). */
export const fromInputDate = value => (value ? `${value}T12:00:00.000Z` : null);

/**
 * Texto digitado → número.
 *   ''            → null       (campo vazio: "sem valor")
 *   '12,5' '12.5' → 12.5
 *   '1.234,56'    → 1234.56    (ponto de milhar + vírgula decimal)
 *   '1.250'       → 1250       (pt-BR: ponto sozinho em grupos de 3 = milhar)
 *   'abc'         → undefined  (não dá para interpretar: quem chama decide)
 */
export const parseDecimal = text => {
  if (text === null || text === undefined) return null;
  let clean = String(text).trim().replace(/\s/g, '');
  if (clean === '') return null;

  if (clean.includes(',')) {
    // vírgula é o decimal → pontos são separadores de milhar
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(clean)) {
    clean = clean.replace(/\./g, '');
  }

  if (!/^-?\d*\.?\d+$/.test(clean) && !/^-?\d+\.$/.test(clean))
    return undefined;
  const num = Number(clean);
  return Number.isFinite(num) ? num : undefined;
};

/** Número → texto para campo de edição ('12,5'; vazio quando null). */
export const toInputNumber = value =>
  value === null || value === undefined || value === ''
    ? ''
    : String(value).replace('.', ',');

const EMAIL_REGEX = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

/** Email com formato válido (o tamanho é conferido antes do regex). */
export const isValidEmail = email => {
  const clean = String(email || '').trim();
  return clean.length > 0 && clean.length <= 254 && EMAIL_REGEX.test(clean);
};

/** Quebra um texto colado/digitado em emails (vírgula, ponto e vírgula, espaço, linha). */
export const splitEmails = text =>
  String(text || '')
    .split(/[\s,;]+/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────
// Download de arquivos (PDF / Excel)
// ─────────────────────────────────────────────────────────────────────

const filenameFromDisposition = disposition => {
  if (!disposition) return null;
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      /* cai no filename simples */
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
};

/** Quando o servidor responde erro a um pedido `blob`, o JSON vem dentro do Blob. */
export const readBlobError = async error => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.message || null;
    } catch {
      return null;
    }
  }
  return data?.message || null;
};

/**
 * Pede um arquivo ao servidor e dispara o download no browser.
 * @returns {Promise<{ version: number|null, imagesRequested: number, imagesLoaded: number, filename: string }>}
 */
export const downloadExport = async (axios, url, body, fallbackName) => {
  const response = await axios.post(url, body, {
    responseType: 'blob',
    timeout: 70000,
  });

  const filename =
    filenameFromDisposition(response.headers['content-disposition']) ||
    fallbackName;

  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

  return {
    filename,
    version: Number(response.headers['x-table-version']) || null,
    imagesRequested: Number(response.headers['x-images-requested']) || 0,
    imagesLoaded: Number(response.headers['x-images-loaded']) || 0,
  };
};

/** Formatos da aba "Visualizar" (correspondem aos PDFs). */
export const PREVIEW_MODES = [
  { id: 'grid', label: 'Catálogo com imagens' },
  { id: 'list', label: 'Lista com imagens' },
  { id: 'text', label: 'Só texto' },
];

/** Opções de exportação oferecidas no menu. */
export const EXPORT_OPTIONS = [
  {
    id: 'pdf-grid',
    label: 'PDF — catálogo com imagens',
    hint: 'Grade com foto grande de cada produto',
    body: { format: 'pdf', images: true, layout: 'grid' },
    ext: 'pdf',
  },
  {
    id: 'pdf-list',
    label: 'PDF — lista com imagens',
    hint: 'Uma linha por produto, com miniatura',
    body: { format: 'pdf', images: true, layout: 'list' },
    ext: 'pdf',
  },
  {
    id: 'pdf',
    label: 'PDF — só texto',
    hint: 'Código, produto e preço',
    body: { format: 'pdf', images: false },
    ext: 'pdf',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    hint: 'Planilha com filtro por categoria',
    body: { format: 'xlsx', images: false },
    ext: 'xlsx',
  },
  {
    id: 'xlsx-img',
    label: 'Excel com imagens',
    hint: 'Planilha com miniatura em cada linha',
    body: { format: 'xlsx', images: true },
    ext: 'xlsx',
  },
];

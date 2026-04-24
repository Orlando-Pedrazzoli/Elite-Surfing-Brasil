import fs from 'fs';
import path from 'path';

/**
 * Gerador de Sitemaps - Elite Surfing Brasil
 * Versão: 4.1.0
 * Última atualização: 2026-04-24
 *
 * ALTERAÇÕES v4.1.0 (24/04/2026):
 * - 🆕 Filtro defensivo para excluir produtos em Draft (inStock=false).
 *   A API /api/product/list já filtra automaticamente, mas adicionamos
 *   defesa em profundidade para o caso de a API mudar.
 *
 * ALTERAÇÕES v4.0.0:
 * - Adicionado /blog às páginas estáticas
 * - Adicionado sitemap-blog.xml (busca posts da API)
 * - Adicionadas páginas institucionais ao sitemap estático
 * - Adicionado sitemap-blog ao sitemap index
 * - Referência ao blog no robots.txt
 *
 * Gera 6 ficheiros XML em /public:
 * 1. sitemap.xml              - Índice principal
 * 2. sitemap-static.xml       - Páginas estáticas
 * 3. sitemap-collections.xml  - Coleções
 * 4. sitemap-categories.xml   - Categorias/Modelos
 * 5. sitemap-products.xml     - Produtos individuais (só publicados)
 * 6. sitemap-blog.xml         - Artigos do blog
 */

const SITE_URL = 'https://www.elitesurfing.com.br';
const API_URL = 'https://elitesurfingbr-backend.vercel.app';

// =====================================================
// PÁGINAS ESTÁTICAS
// =====================================================
const staticRoutes = [
  { url: '', changefreq: 'daily', priority: 1.0 },
  { url: '/products', changefreq: 'daily', priority: 0.9 },
  { url: '/blog', changefreq: 'weekly', priority: 0.8 },
  { url: '/contact', changefreq: 'monthly', priority: 0.7 },
  { url: '/faq', changefreq: 'monthly', priority: 0.6 },
  { url: '/institucional', changefreq: 'monthly', priority: 0.5 },
  { url: '/institucional/quem-somos', changefreq: 'monthly', priority: 0.5 },
  { url: '/institucional/catalogo', changefreq: 'monthly', priority: 0.5 },
  { url: '/institucional/frete-gratis', changefreq: 'monthly', priority: 0.4 },
  {
    url: '/institucional/representantes',
    changefreq: 'monthly',
    priority: 0.4,
  },
  { url: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { url: '/terms', changefreq: 'yearly', priority: 0.3 },
  { url: '/refund-policy', changefreq: 'yearly', priority: 0.3 },
];

// =====================================================
// COLLECTIONS
// =====================================================
const collections = [
  { slug: 'decks', changefreq: 'weekly', priority: 0.9 },
  { slug: 'leashes', changefreq: 'weekly', priority: 0.9 },
  { slug: 'capas', changefreq: 'weekly', priority: 0.9 },
  { slug: 'sarcofagos', changefreq: 'weekly', priority: 0.9 },
  { slug: 'quilhas', changefreq: 'weekly', priority: 0.9 },
  { slug: 'acessorios', changefreq: 'weekly', priority: 0.9 },
  { slug: 'bodyboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'sup', changefreq: 'weekly', priority: 0.8 },
  { slug: 'outlet', changefreq: 'daily', priority: 0.8 },
];

// =====================================================
// CATEGORIES
// =====================================================
const categories = [
  { slug: 'Deck-Maldivas', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Mentawai', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Fiji-Classic', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Hawaii', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-J-Bay', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Noronha', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Peniche', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Saquarema', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Combate', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Longboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-Front', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Deck-SUP', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Leash-Shortboard-Hibridas', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Leash-Fun-MiniLong', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Leash-Longboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Leash-StandUp', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Leash-Bodyboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Refletiva-Combate', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Refletiva-Premium', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Capa-Toalha', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Sarcofago-Combate', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Sarcofago-Premium', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Sarcofago-Combate-Rodas', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Sarcofago-Premium-Rodas', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Quilha-Shortboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Quilha-Longboard', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Quilha-SUP', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Chave-Parafuso', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Racks', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Parafinas', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Bones', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Protetor-Rabeta', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Wetsuit-Bag', changefreq: 'weekly', priority: 0.8 },
  { slug: 'Diversos', changefreq: 'weekly', priority: 0.8 },
];

const invalidProductSlugs = [];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================
const escapeXml = text => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getToday = () => new Date().toISOString().split('T')[0];

const formatDate = dateString => {
  if (!dateString) return getToday();
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return getToday();
  }
};

// =====================================================
// FETCH PRODUTOS DA API
// 🆕 v4.1.0: Filtro defensivo para excluir Drafts (inStock=false)
// =====================================================
async function fetchProducts() {
  try {
    console.log('🔍 Conectando à API (produtos)...');
    // /api/product/list (sem ?all=true) → a API já filtra Drafts e variantes
    const response = await fetch(`${API_URL}/api/product/list`);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    if (!data.success || !data.products) {
      console.log('⚠️ Nenhum produto encontrado');
      return [];
    }

    // 🆕 Filtro defensivo:
    //   - Excluir Drafts (inStock=false) — produtos não publicados
    //   - Excluir variantes não-principais (já excluídas pela API, mas garante)
    //   - Excluir slugs inválidos da lista manual
    const validProducts = data.products.filter(product => {
      if (invalidProductSlugs.includes(product.slug)) return false;
      if (product.isMainVariant === false) return false;
      if (product.inStock === false) return false; // 🆕 Draft
      return true;
    });

    const draftsExcluded = data.products.filter(
      p => p.inStock === false,
    ).length;
    console.log(
      `✅ ${validProducts.length} produtos publicados de ${data.products.length} total`,
    );
    if (draftsExcluded > 0) {
      console.log(
        `   ℹ️ ${draftsExcluded} produto(s) em Draft excluídos do sitemap`,
      );
    }
    return validProducts;
  } catch (err) {
    console.error('❌ Erro ao buscar produtos:', err.message);
    return [];
  }
}

// =====================================================
// FETCH BLOG POSTS DA API
// =====================================================
async function fetchBlogPosts() {
  try {
    console.log('🔍 Conectando à API (blog posts)...');
    const response = await fetch(`${API_URL}/api/blog`);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    if (!data.success || !data.posts) {
      console.log('⚠️ Nenhum post encontrado');
      return [];
    }
    const publishedPosts = data.posts.filter(post => post.published !== false);
    console.log(`✅ ${publishedPosts.length} posts publicados`);
    return publishedPosts;
  } catch (err) {
    console.error('❌ Erro ao buscar blog posts:', err.message);
    console.log('   ℹ️ O sitemap do blog será gerado vazio');
    return [];
  }
}

// =====================================================
// GERADORES DE XML
// =====================================================

function generateSitemapIndex() {
  const today = getToday();
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-collections.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-categories.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-products.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

function generateStaticSitemap() {
  const today = getToday();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const route of staticRoutes) {
    xml += `  <url>\n    <loc>${SITE_URL}${route.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

function generateCollectionsSitemap() {
  const today = getToday();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const collection of collections) {
    xml += `  <url>\n    <loc>${SITE_URL}/collections/${collection.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${collection.changefreq}</changefreq>\n    <priority>${collection.priority}</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

function generateCategoriesSitemap() {
  const today = getToday();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const cat of categories) {
    xml += `  <url>\n    <loc>${SITE_URL}/products/${cat.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cat.changefreq}</changefreq>\n    <priority>${cat.priority}</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

function generateProductsSitemap(products) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  for (const product of products) {
    const category = (product.category || 'produtos').trim();
    const fullUrl = `${SITE_URL}/products/${category}/${product._id}`;
    const lastmod = formatDate(product.updatedAt);
    const productName = escapeXml(product.name || '');
    xml += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>`;
    if (
      product.image &&
      Array.isArray(product.image) &&
      product.image.length > 0
    ) {
      for (const img of product.image.slice(0, 8)) {
        if (img && typeof img === 'string') {
          xml += `\n    <image:image>\n      <image:loc>${escapeXml(img)}</image:loc>\n      <image:title>${productName}</image:title>\n    </image:image>`;
        }
      }
    }
    xml += `\n  </url>\n`;
  }
  xml += `</urlset>`;
  return xml;
}

function generateBlogSitemap(blogPosts) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  xml += `  <url>\n    <loc>${SITE_URL}/blog</loc>\n    <lastmod>${getToday()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

  for (const post of blogPosts) {
    if (!post.slug) continue;
    const fullUrl = `${SITE_URL}/blog/${post.slug}`;
    const lastmod = formatDate(post.updatedAt || post.createdAt);
    xml += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
async function generateSitemaps() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   GERADOR DE SITEMAPS - Elite Surfing Brasil 🇧🇷  ║');
  console.log('║   v4.1.0 — Draft products excluded              ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 URL Base: ${SITE_URL}`);
  console.log(`🔗 API:      ${API_URL}`);
  console.log(`📅 Data:     ${getToday()}`);
  console.log('');

  const outputDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('📁 Pasta /public criada');
  }

  const products = await fetchProducts();
  const blogPosts = await fetchBlogPosts();

  console.log('');
  console.log('📝 Gerando arquivos XML...');
  console.log('');

  fs.writeFileSync(
    path.join(outputDir, 'sitemap.xml'),
    generateSitemapIndex(),
    'utf8',
  );
  console.log('   ✓ sitemap.xml (índice principal)');

  fs.writeFileSync(
    path.join(outputDir, 'sitemap-static.xml'),
    generateStaticSitemap(),
    'utf8',
  );
  console.log(`   ✓ sitemap-static.xml (${staticRoutes.length} páginas)`);

  fs.writeFileSync(
    path.join(outputDir, 'sitemap-collections.xml'),
    generateCollectionsSitemap(),
    'utf8',
  );
  console.log(`   ✓ sitemap-collections.xml (${collections.length} coleções)`);

  fs.writeFileSync(
    path.join(outputDir, 'sitemap-categories.xml'),
    generateCategoriesSitemap(),
    'utf8',
  );
  console.log(`   ✓ sitemap-categories.xml (${categories.length} categorias)`);

  fs.writeFileSync(
    path.join(outputDir, 'sitemap-products.xml'),
    generateProductsSitemap(products),
    'utf8',
  );
  console.log(`   ✓ sitemap-products.xml (${products.length} produtos)`);

  fs.writeFileSync(
    path.join(outputDir, 'sitemap-blog.xml'),
    generateBlogSitemap(blogPosts),
    'utf8',
  );
  console.log(`   ✓ sitemap-blog.xml (${blogPosts.length} posts)`);

  const totalUrls =
    staticRoutes.length +
    collections.length +
    categories.length +
    products.length +
    blogPosts.length +
    1;
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('✅ SITEMAPS GERADOS COM SUCESSO!');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Resumo:');
  console.log(`   • Páginas estáticas:  ${staticRoutes.length}`);
  console.log(`   • Coleções:           ${collections.length}`);
  console.log(`   • Categorias:         ${categories.length}`);
  console.log(`   • Produtos:           ${products.length}`);
  console.log(`   • Blog posts:         ${blogPosts.length}`);
  console.log(`   ─────────────────────────────`);
  console.log(`   • TOTAL URLs:         ${totalUrls}`);
  console.log('');
  console.log('📁 Arquivos gerados em /public:');
  console.log('   • sitemap.xml');
  console.log('   • sitemap-static.xml');
  console.log('   • sitemap-collections.xml');
  console.log('   • sitemap-categories.xml');
  console.log('   • sitemap-products.xml');
  console.log('   • sitemap-blog.xml');
  console.log('');
}

generateSitemaps().catch(err => {
  console.error('❌ ERRO FATAL:', err.message);
  process.exit(1);
});

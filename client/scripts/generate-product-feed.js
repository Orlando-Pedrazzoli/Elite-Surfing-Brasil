#!/usr/bin/env node

/**
 * generate-product-feed.js — Gerador de Feed XML para Google Merchant Center + Meta Catalog
 *
 * Gera um ficheiro RSS 2.0 XML com namespace g: (Google Shopping) compatível com:
 *   - Google Merchant Center (Free Listings + Shopping Ads)
 *   - Meta Catalog (Facebook/Instagram Dynamic Ads)
 *
 * Uso:
 *   node scripts/generate-product-feed.js
 *
 * Output:
 *   client/public/product-feed.xml
 *
 * Configuração:
 *   - BACKEND_URL: URL da API (default: https://elitesurfingbr-backend.vercel.app)
 *   - Pode ser agendado via cron ou Vercel Cron Jobs para atualizar diariamente
 *
 * Requisitos Google Merchant Center:
 *   - id, title, description, link, image_link, price, availability, condition, brand
 *   - Opcionais: sale_price, product_type, gtin, shipping, additional_image_link
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://elitesurfingbr-backend.vercel.app';
const SITE_URL = 'https://www.elitesurfing.com.br';
const BRAND = 'Elite Surfing';
const CURRENCY = 'BRL';

// Mapeamento de categorias para Google Product Category
// https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt
const GOOGLE_CATEGORY_MAP = {
  'Deck-Maldivas':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Mentawai':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Fiji-Classic':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Hawaii':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-J-Bay':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Noronha':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Peniche':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Saquarema':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Combate':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Longboard':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-Front':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Deck-SUP':
    'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe',
  'Leash-Shortboard-Hibridas':
    'Artigos esportivos > Esportes aquáticos > Surfe > Leashes para pranchas de surfe',
  'Leash-Fun-MiniLong':
    'Artigos esportivos > Esportes aquáticos > Surfe > Leashes para pranchas de surfe',
  'Leash-Longboard':
    'Artigos esportivos > Esportes aquáticos > Surfe > Leashes para pranchas de surfe',
  'Leash-StandUp':
    'Artigos esportivos > Esportes aquáticos > Surfe > Leashes para pranchas de surfe',
  'Leash-Bodyboard':
    'Artigos esportivos > Esportes aquáticos > Bodyboard > Leashes para bodyboard',
  'Refletiva-Combate':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Refletiva-Premium':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Capa-Toalha':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Sarcofago-Combate':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Sarcofago-Premium':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Sarcofago-Combate-Rodas':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Sarcofago-Premium-Rodas':
    'Artigos esportivos > Esportes aquáticos > Surfe > Capas para pranchas de surfe',
  'Quilha-Shortboard':
    'Artigos esportivos > Esportes aquáticos > Surfe > Quilhas para pranchas de surfe',
  'Quilha-Longboard':
    'Artigos esportivos > Esportes aquáticos > Surfe > Quilhas para pranchas de surfe',
  'Quilha-SUP':
    'Artigos esportivos > Esportes aquáticos > Surfe > Quilhas para pranchas de surfe',
  Parafinas:
    'Artigos esportivos > Esportes aquáticos > Surfe > Parafina para surfe',
  Racks:
    'Artigos esportivos > Esportes aquáticos > Surfe > Racks para pranchas de surfe',
};

const DEFAULT_GOOGLE_CATEGORY =
  'Artigos esportivos > Esportes aquáticos > Surfe > Acessórios para pranchas de surfe';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDescription(product) {
  if (Array.isArray(product.description)) {
    return product.description.join(' ').substring(0, 5000);
  }
  return (product.description || product.name || '').substring(0, 5000);
}

function buildProductXml(product) {
  const category = (product.category || '').trim();
  const productUrl = `${SITE_URL}/products/${encodeURIComponent(category)}/${product._id}`;
  const availability =
    product.inStock && product.stock > 0 ? 'in_stock' : 'out_of_stock';
  const googleCategory =
    GOOGLE_CATEGORY_MAP[category] || DEFAULT_GOOGLE_CATEGORY;
  const description = getDescription(product);
  const mainImage = (product.image && product.image[0]) || '';
  const additionalImages = (product.image || []).slice(1, 11); // max 10 additional

  let itemXml = `    <item>
      <g:id>${escapeXml(product._id)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
`;

  // Additional images
  for (const img of additionalImages) {
    itemXml += `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
  }

  // Price — se tem preço de "lista" diferente do offerPrice, usar sale_price
  if (
    product.price &&
    product.offerPrice &&
    product.price > product.offerPrice
  ) {
    itemXml += `      <g:price>${product.price.toFixed(2)} ${CURRENCY}</g:price>\n`;
    itemXml += `      <g:sale_price>${product.offerPrice.toFixed(2)} ${CURRENCY}</g:sale_price>\n`;
  } else {
    const price = product.offerPrice || product.price || 0;
    itemXml += `      <g:price>${price.toFixed(2)} ${CURRENCY}</g:price>\n`;
  }

  itemXml += `      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(BRAND)}</g:brand>
      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
      <g:product_type>${escapeXml(category)}</g:product_type>
`;

  // SKU / MPN
  if (product.sku) {
    itemXml += `      <g:mpn>${escapeXml(product.sku)}</g:mpn>\n`;
  }

  // GTIN (se existir)
  if (product.gtin || product.barcode || product.ean) {
    itemXml += `      <g:gtin>${escapeXml(product.gtin || product.barcode || product.ean)}</g:gtin>\n`;
  } else {
    itemXml += `      <g:identifier_exists>false</g:identifier_exists>\n`;
  }

  // Cor
  if (product.color) {
    itemXml += `      <g:color>${escapeXml(product.color)}</g:color>\n`;
  }

  // Tamanho
  if (product.size) {
    itemXml += `      <g:size>${escapeXml(product.size)}</g:size>\n`;
  }

  // Peso (para cálculo de frete)
  if (product.weight) {
    itemXml += `      <g:shipping_weight>${product.weight} g</g:shipping_weight>\n`;
  }

  // Family / item_group_id (para variantes)
  if (product.productFamily) {
    itemXml += `      <g:item_group_id>${escapeXml(product.productFamily)}</g:item_group_id>\n`;
  }

  // Shipping — frete grátis se produto tem freeShipping
  if (product.freeShipping) {
    itemXml += `      <g:shipping>
        <g:country>BR</g:country>
        <g:price>0.00 ${CURRENCY}</g:price>
      </g:shipping>\n`;
  }

  // Custom labels para segmentação de campanhas
  const tags = product.tags || [];
  if (tags.includes('bestseller')) {
    itemXml += `      <g:custom_label_0>bestseller</g:custom_label_0>\n`;
  }
  if (tags.includes('outlet')) {
    itemXml += `      <g:custom_label_1>outlet</g:custom_label_1>\n`;
  }
  if (tags.includes('lancamento')) {
    itemXml += `      <g:custom_label_2>lancamento</g:custom_label_2>\n`;
  }

  itemXml += `    </item>`;
  return itemXml;
}

async function generateFeed() {
  console.log('📦 Gerando feed de produtos...');
  console.log(`🌐 Backend: ${BACKEND_URL}`);

  try {
    // Fetch todos os produtos (incluindo inativos para o Merchant Center)
    const response = await fetch(`${BACKEND_URL}/api/product/list?all=true`);
    const data = await response.json();

    if (!data.success || !data.products) {
      throw new Error('Falha ao buscar produtos da API');
    }

    const products = data.products;
    console.log(`✅ ${products.length} produtos encontrados`);

    // Gerar XML
    const now = new Date().toISOString();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Elite Surfing Brasil - Produtos</title>
    <link>${SITE_URL}</link>
    <description>Feed de produtos da Elite Surfing Brasil para Google Shopping e Meta Catalog</description>
    <language>pt-BR</language>
    <lastBuildDate>${now}</lastBuildDate>
`;

    for (const product of products) {
      xml += buildProductXml(product) + '\n';
    }

    xml += `  </channel>
</rss>`;

    // Salvar ficheiro
    const outputPath = join(__dirname, '..', 'public', 'product-feed.xml');
    writeFileSync(outputPath, xml, 'utf-8');

    console.log(`✅ Feed gerado com sucesso: ${outputPath}`);
    console.log(`📊 Total de produtos no feed: ${products.length}`);
    console.log(`🔗 URL do feed: ${SITE_URL}/product-feed.xml`);
    console.log('');
    console.log('📋 Próximos passos:');
    console.log(
      '   1. Google Merchant Center: Adicionar feed via URL agendada',
    );
    console.log(`      URL: ${SITE_URL}/product-feed.xml`);
    console.log('   2. Meta Business Suite: Importar catálogo via feed URL');
    console.log(`      URL: ${SITE_URL}/product-feed.xml`);
  } catch (error) {
    console.error('❌ Erro ao gerar feed:', error.message);
    process.exit(1);
  }
}

generateFeed();

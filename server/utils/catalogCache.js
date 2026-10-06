// server/utils/catalogCache.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CACHE DO CATÁLOGO NO CDN DA VERCEL — cache longa + limpeza automática
// ═══════════════════════════════════════════════════════════════════════
// 🆕 06/10/2026
//
// Antes: a lista pública de produtos ficava 60 s no CDN. Com pouco tráfego
// quase todos os pedidos já a encontravam expirada — em 3 dias, só 42 de
// ~1 000 pedidos foram servidos pelo CDN; os restantes acordaram a função
// e foram ao MongoDB.
//
// Agora (padrão "cache tags" da Vercel):
//   1. As respostas públicas do catálogo ficam 10 min no CDN e levam a
//      etiqueta CATALOG_TAG (cabeçalho Vercel-Cache-Tag).
//   2. Sempre que um produto é criado, alterado, apagado, reordenado ou o
//      stock muda (incluindo vendas), purgeCatalogCache() apaga do CDN tudo
//      o que tem essa etiqueta. O pedido seguinte vai buscar dados novos.
//
// Resultado: a loja responde do CDN (rápido, sem função, sem MongoDB) e as
// alterações do admin aparecem de imediato. Se a limpeza falhar por algum
// motivo, o pior caso é a alteração demorar até ~10 min a aparecer.
//
// A limpeza é disparada pelos hooks do modelo Product (models/Product.js),
// por isso cobre TODOS os sítios que escrevem em produtos sem ser preciso
// lembrar de a chamar em cada controller. Exceção: Product.bulkWrite não
// passa pelos hooks — quem o usar tem de chamar purgeCatalogCache().
//
// Fora da Vercel (npm run server) nada disto faz efeito: as funções da
// Vercel são no-op quando não há contexto de pedido.
// ═══════════════════════════════════════════════════════════════════════

import { dangerouslyDeleteByTag, waitUntil } from '@vercel/functions';

export const CATALOG_TAG = 'catalog';

const CDN_TTL_SECONDS = 600; // 10 min — teto de atraso se a limpeza falhar
const PURGE_DEBOUNCE_MS = 250; // junta várias escritas seguidas numa limpeza

// Cabeçalhos para respostas PÚBLICAS do catálogo (nunca para admin).
export const setPublicCatalogCache = res => {
  res.setHeader(
    'Cache-Control',
    `public, max-age=30, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=60`,
  );
  res.setHeader('Vercel-Cache-Tag', CATALOG_TAG);
  res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
};

let pendingPurge = null;

// Apaga do CDN as respostas do catálogo. Pode ser chamada muitas vezes
// seguidas (ex.: um pedido com 5 itens baixa o stock 5 vezes): as chamadas
// feitas dentro de PURGE_DEBOUNCE_MS resultam numa única limpeza, que
// acontece sempre DEPOIS da última escrita desse grupo.
export const purgeCatalogCache = () => {
  if (pendingPurge) return pendingPurge;

  pendingPurge = new Promise(resolve => setTimeout(resolve, PURGE_DEBOUNCE_MS))
    .then(() => {
      pendingPurge = null;
      return dangerouslyDeleteByTag(CATALOG_TAG);
    })
    .catch(error => {
      pendingPurge = null;
      console.error('[catalogCache] limpeza do CDN falhou:', error?.message);
    });

  // Mantém a instância acordada até a limpeza terminar (não atrasa a resposta)
  waitUntil(pendingPurge);
  return pendingPurge;
};

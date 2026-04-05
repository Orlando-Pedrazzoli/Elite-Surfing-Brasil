import { Helmet } from 'react-helmet-async';

/**
 * SEO Component - Elite Surfing Brasil
 * Versão: 2.1.0
 * Última atualização: 2026-03-31
 *
 * ALTERAÇÕES v2.1.0:
 * - Corrigido geo.region de "BR-SP" para "BR-RJ" (sede é Rio de Janeiro)
 * - Corrigido geo.placename de "São Paulo" para "Rio de Janeiro"
 */

const BASE_URL = 'https://www.elitesurfing.com.br';
const DEFAULT_IMAGE = '/og-image.jpg';
const SITE_NAME = 'Elite Surfing Brasil';

const normalizeUrl = url => {
  if (!url || url === '/') return '';
  let cleanUrl = url.split('?')[0].split('#')[0];
  if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
  if (cleanUrl !== '/' && cleanUrl.endsWith('/'))
    cleanUrl = cleanUrl.slice(0, -1);
  cleanUrl = cleanUrl.replace(/\/+/g, '/');
  return cleanUrl;
};

const truncateDescription = (text, maxLength = 155) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
};

const SEO = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  url = '',
  type = 'website',
  noindex = false,
  article = null,
  product = null,
  children,
}) => {
  const normalizedPath = normalizeUrl(url);
  const fullUrl = `${BASE_URL}${normalizedPath}`;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const pageTitle = title ? title : 'Loja Online de Surf';
  const fullTitle = `${pageTitle} | ${SITE_NAME}`;
  const defaultDescription =
    'Loja online de acessórios de surf no Brasil. Decks, leashes, capas de prancha, sarcófagos, wax e quilhas. Frete para todo Brasil. PIX com 10% OFF. Até 10x sem juros.';
  const metaDescription = truncateDescription(
    description || defaultDescription,
  );

  return (
    <>
      <Helmet prioritizeSeoTags>
        {/* ===== TAGS CRÍTICAS ===== */}
        <title>{fullTitle}</title>
        <link rel='canonical' href={fullUrl} />
        <meta name='description' content={metaDescription} />

        {/* ===== ROBOTS ===== */}
        {noindex ? (
          <meta name='robots' content='noindex, nofollow' />
        ) : (
          <meta
            name='robots'
            content='index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
          />
        )}
        <meta
          name='googlebot'
          content={noindex ? 'noindex, nofollow' : 'index, follow'}
        />

        {/* ===== OPEN GRAPH ===== */}
        <meta property='og:title' content={fullTitle} />
        <meta property='og:description' content={metaDescription} />
        <meta property='og:image' content={fullImage} />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
        <meta property='og:image:alt' content={pageTitle} />
        <meta property='og:url' content={fullUrl} />
        <meta property='og:type' content={type} />
        <meta property='og:site_name' content={SITE_NAME} />
        <meta property='og:locale' content='pt_BR' />

        {/* Artigo específico */}
        {article && (
          <>
            <meta
              property='article:published_time'
              content={article.publishedTime}
            />
            <meta
              property='article:modified_time'
              content={article.modifiedTime || new Date().toISOString()}
            />
            <meta
              property='article:author'
              content={article.author || SITE_NAME}
            />
            {article.tags &&
              article.tags.map((tag, i) => (
                <meta key={i} property='article:tag' content={tag} />
              ))}
          </>
        )}

        {/* Produto específico */}
        {product && (
          <>
            <meta property='product:price:amount' content={product.price} />
            <meta property='product:price:currency' content='BRL' />
            <meta
              property='product:availability'
              content={product.inStock ? 'in stock' : 'out of stock'}
            />
            <meta property='product:brand' content='Elite Surfing' />
          </>
        )}

        {/* ===== TWITTER CARD ===== */}
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={fullTitle} />
        <meta name='twitter:description' content={metaDescription} />
        <meta name='twitter:image' content={fullImage} />
        <meta name='twitter:image:alt' content={pageTitle} />

        {/* ===== IDIOMA ===== */}
        <link rel='alternate' hrefLang='pt-BR' href={fullUrl} />
        <link rel='alternate' hrefLang='pt' href={fullUrl} />
        <link rel='alternate' hrefLang='x-default' href={fullUrl} />

        {/* ===== OUTROS META ===== */}
        <meta name='author' content={SITE_NAME} />
        <meta name='generator' content='React' />
        <meta name='rating' content='general' />
        <meta name='revisit-after' content='7 days' />

        {/* Geo tags - Rio de Janeiro (CORRIGIDO: era BR-SP) */}
        <meta name='geo.region' content='BR-RJ' />
        <meta name='geo.placename' content='Rio de Janeiro, Brasil' />
      </Helmet>

      {children}
    </>
  );
};

export default SEO;

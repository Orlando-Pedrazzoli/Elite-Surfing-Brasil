import { Helmet } from 'react-helmet-async';

/**
 * JSON-LD Structured Data Components - Elite Surfing Brasil
 * Versão: 2.0.0 BR
 * Última atualização: 2026-02-10
 * 
 * Schemas implementados:
 * - Store (loja)
 * - Product (produto individual)
 * - BreadcrumbList (navegação)
 * - FAQPage (perguntas frequentes)
 * - WebSite (busca interna)
 * - Organization (marca)
 * - CollectionPage (coleções/grupos)
 * 
 * Referência: https://schema.org/
 * Teste: https://search.google.com/test/rich-results
 */

const BASE_URL = 'https://www.elitesurfing.com.br';

// ═══════════════════════════════════════════════════════════════
// 🏪 STORE / ORGANIZATION - Dados da loja
// ═══════════════════════════════════════════════════════════════

export const StoreJsonLd = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Elite Surfing Brasil',
    description: 'Loja online de acessórios e equipamentos de surf no Brasil. Decks, leashes, capas de prancha, wax e mais.',
    url: BASE_URL,
    logo: `${BASE_URL}/logoes.png`,
    image: `${BASE_URL}/og-image.jpg`,
    telephone: '+5511999999999',
    email: 'contato@elitesurfing.com.br',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'São Paulo',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -23.5505,
      longitude: -46.6333,
    },
    priceRange: 'R$',
    currenciesAccepted: 'BRL',
    paymentAccepted: 'PIX, Cartão de Crédito, Boleto Bancário',
    openingHours: 'Mo-Fr 09:00-18:00',
    sameAs: [
      'https://www.instagram.com/elitesurfingbrasil',
      'https://www.facebook.com/elitesurfingbrasil',
      'https://www.tiktok.com/@elitesurfingbrasil',
    ],
    areaServed: {
      '@type': 'Country',
      name: 'Brasil',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🌐 WEBSITE - Para Google Sitelinks Searchbox
// ═══════════════════════════════════════════════════════════════

export const WebSiteJsonLd = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Elite Surfing Brasil',
    url: BASE_URL,
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT - Produto individual (Rich Results)
// ═══════════════════════════════════════════════════════════════

export const ProductJsonLd = ({ product }) => {
  if (!product) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - Acessório de surf de alta performance.`,
    image: product.image || [],
    url: `${BASE_URL}/products/${(product.category || '').toLowerCase()}/${product._id}`,
    brand: {
      '@type': 'Brand',
      name: 'Elite Surfing',
    },
    category: product.category || 'Acessórios de Surf',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: product.offerPrice || product.price,
      ...(product.price > product.offerPrice && {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }),
      availability: (product.stock || 0) > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Elite Surfing Brasil',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'BR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'd',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 3,
            maxValue: 10,
            unitCode: 'd',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
      },
    },
  };

  // Adicionar review/rating se existir
  if (product.rating && product.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: product.ratingCount || 1,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🗂️ COLLECTION PAGE - Para páginas de coleção/grupo
// ═══════════════════════════════════════════════════════════════

export const CollectionJsonLd = ({ name, description, url, products = [] }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: `${BASE_URL}${url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          url: `${BASE_URL}/products/${(product.category || '').toLowerCase()}/${product._id}`,
          image: product.image?.[0] || '',
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: product.offerPrice || product.price,
            availability: (product.stock || 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
      })),
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🍞 BREADCRUMB - Navegação estruturada
// ═══════════════════════════════════════════════════════════════

export const BreadcrumbJsonLd = ({ items }) => {
  if (!items || items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${BASE_URL}${item.url}` : undefined,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// ❓ FAQ - Perguntas frequentes (Rich Results)
// ═══════════════════════════════════════════════════════════════

export const FAQJsonLd = ({ faqs }) => {
  if (!faqs || faqs.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// ═══════════════════════════════════════════════════════════════
// 💳 OFFERS - Para destacar promoções no Google
// ═══════════════════════════════════════════════════════════════

export const OffersJsonLd = ({ offers }) => {
  if (!offers || offers.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Ofertas Elite Surfing Brasil',
    itemListElement: offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      description: offer.description,
      priceCurrency: 'BRL',
      price: offer.price,
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}${offer.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

// Export default com todos os componentes
const JsonLd = {
  Store: StoreJsonLd,
  WebSite: WebSiteJsonLd,
  Product: ProductJsonLd,
  Collection: CollectionJsonLd,
  Breadcrumb: BreadcrumbJsonLd,
  FAQ: FAQJsonLd,
  Offers: OffersJsonLd,
};

export default JsonLd;
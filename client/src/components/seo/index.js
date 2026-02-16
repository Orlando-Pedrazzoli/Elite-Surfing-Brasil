/**
 * SEO Components - Elite Surfing Brasil
 * Versão: 3.0.0
 * Última atualização: 2026-02-16
 *
 * Exporta todos os componentes e utilitários de SEO
 */

// Componente principal de meta tags
export { default as SEO } from './SEO';

// Schemas JSON-LD (Structured Data)
export {
  OrganizationSchema,
  WebSiteSchema,
  SiteNavigationSchema,
  ProductSchema,
  BreadcrumbSchema,
  FAQSchema,
  LocalBusinessSchema,
  CollectionSchema,
  ContactPageSchema,
} from './JsonLd';

// Configurações e helpers
export {
  default as seoConfig,
  categoryDescriptions,
  collectionDescriptions,
  getCategorySEO,
  getCollectionSEO,
  getProductSEO,
} from './seoConfig';
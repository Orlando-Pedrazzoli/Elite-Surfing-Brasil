/**
 * SEO Components - Elite Surfing Brasil
 * Versão: 4.0.0
 * Última atualização: 2026-03-31
 *
 * ALTERAÇÕES v4.0.0:
 * - Adicionado export de BlogSchema e BlogPostingSchema
 */

export { default as SEO } from './SEO';

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
  BlogSchema,
  BlogPostingSchema,
} from './JsonLd';

export {
  default as seoConfig,
  categoryDescriptions,
  collectionDescriptions,
  getCategorySEO,
  getCollectionSEO,
  getProductSEO,
  getBlogPostSEO,
} from './seoConfig';

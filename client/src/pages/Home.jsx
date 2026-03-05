import React from 'react';
import MainBanner from '../components/MainBanner';
import BenefitsBar from '../components/Benefitsbar';
import CollectionsGrid from '../components/CollectionsGrid';
import FeatureBanners from '../components/FeatureBanners';
import NewsLetter from '../components/NewsLetter';
import ReviewsCarousel from '../components/ReviewsCarousel';
import {
  SEO,
  OrganizationSchema,
  WebSiteSchema,
  SiteNavigationSchema,
} from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import Novidades from '../components/Novidades';
import NovidadesCarousel from '../components/NovidadesCarousel';
import BlogPromo from '../components/BlogPromo';

const Home = () => {
  return (
    <>
      <SEO
        title={seoConfig.home.title}
        description={seoConfig.home.description}
        url={seoConfig.home.url}
      >
        <OrganizationSchema />
        <WebSiteSchema />
        <SiteNavigationSchema />
      </SEO>

      <div>
        {/* =====================================================
            SEO: H1 obrigatório na homepage
            
            Opção A (actual): Visually hidden mas acessível a crawlers e screen readers.
            Usa a classe sr-only do Tailwind (position:absolute, clip, etc.)
            
            Opção B (alternativa): Se preferires H1 visível, remover className 
            e estilizar como hero heading no MainBanner.
            
            IMPORTANTE: Cada página deve ter exactamente 1 H1.
            O Google usa o H1 como sinal forte de relevância do conteúdo.
            ===================================================== */}
        <h1 className='sr-only'>
          Elite Surfing Brasil - Loja Online de Acessórios de Surf | Decks,
          Leashes, Capas e Quilhas
        </h1>

        <MainBanner />
        <BenefitsBar />

        {/* =====================================================
            SEO: Seção com conteúdo textual indexável
            
            SPAs React renderizam tudo via JS. O Googlebot executa JS
            mas outros crawlers (Bing, Yandex, ferramentas SEO) podem não executar.
            Este bloco garante conteúdo semântico na page mesmo via JS rendering.
            ===================================================== */}
        <section className='sr-only'>
          <h2>Acessórios de Surf de Alta Qualidade</h2>
          <p>
            Encontre tudo para a sua sessão de surf na Elite Surfing Brasil.
            Decks (traction pads) com EVA premium fresado, leashes com swivel
            duplo anti-torção, capas refletivas e sarcófagos para viagem,
            quilhas de alta performance, parafinas, racks e muito mais.
            Pagamento por PIX com 10% OFF, cartão até 10x sem juros ou boleto.
            Frete para todo o Brasil.
          </p>
        </section>

        <CollectionsGrid />
        <FeatureBanners />
        <Novidades />
        <ReviewsCarousel />
        <BlogPromo />
        <NewsLetter />
      </div>
    </>
  );
};

export default Home;

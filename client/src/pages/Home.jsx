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
        <h1 className='sr-only'>
          Elite Surfing Brasil - Loja Online de Acessórios de Surf | Decks,
          Leashes, Capas e Quilhas
        </h1>

        <MainBanner />
        <BenefitsBar />

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

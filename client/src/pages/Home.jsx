import React from 'react';
import MainBanner from '../components/MainBanner';
import BenefitsBar from '../components/Benefitsbar';
import CollectionsGrid from '../components/CollectionsGrid';
import FeatureBanners from '../components/FeatureBanners';
import NewsLetter from '../components/NewsLetter';
import ReviewsCarousel from '../components/ReviewsCarousel';
import { SEO, OrganizationSchema, WebSiteSchema, SiteNavigationSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import Novidades from '../components/Novidades';
import NovidadesCarousel from '../components/NovidadesCarousel';
import BlogBanner from '../components/BlogBanner';

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
        <MainBanner />
        <BenefitsBar />
        <CollectionsGrid />
        <FeatureBanners />
        <Novidades/>
        <BlogBanner />
        <ReviewsCarousel />
        <NewsLetter />
      </div>
    </>
  );
};

export default Home;
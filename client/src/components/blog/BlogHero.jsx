import React from "react";
import { blogMeta } from "../../data/wslData";

const BlogHero = () => {
  return (
    <section className="blog-hero">
      <img
        className="blog-hero__image"
        src="/banner-blog.jpg"
        alt="Surfista numa onda — Blog Elite Surfing"
        loading="eager"
      />
      <div className="blog-hero__overlay" />
      <div className="blog-hero__content">
        <span className="blog-hero__badge">WSL • WORLD SURF LEAGUE</span>
        <h1 className="blog-hero__title">
          Elite Surfing <span className="blog-hero__accent">Blog</span>
        </h1>
       
        <span className="blog-hero__updated">
          Atualizado em {blogMeta.lastUpdated}
        </span>
      </div>
      <div className="blog-hero__wave">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path
            d="M0,60 C320,100 680,20 1040,60 C1200,80 1360,70 1440,60 L1440,100 L0,100 Z"
            fill="#f8f9fa"
          />
        </svg>
      </div>
    </section>
  );
};

export default BlogHero;
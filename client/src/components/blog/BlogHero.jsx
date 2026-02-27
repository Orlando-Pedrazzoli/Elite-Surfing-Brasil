import React from "react";
import { blogMeta } from "../../data/wslData";

// ⚠️ INSTRUÇÕES:
// 1. Vai a: https://unsplash.com/pt-br/fotografias/um-homem-surfando-uma-onda-em-cima-de-uma-prancha-de-surf-vUg96ujmmVc
// 2. Clica "Download free" (tamanho Large ou Original)
// 3. Salva como: client/public/images/blog/hero-surf.jpg
// 4. Pronto! A imagem vai aparecer automaticamente.

const BlogHero = () => {
  return (
    <section className="blog-hero">
      <img
        className="blog-hero__image"
        src="/hero-surf.jpg"
        alt="Surfista numa onda — Blog Elite Surfing"
        loading="eager"
      />
      <div className="blog-hero__overlay" />
      <div className="blog-hero__content">
        <span className="blog-hero__badge">WSL • WORLD SURF LEAGUE</span>
        <h1 className="blog-hero__title">
          Blog <span className="blog-hero__accent">Surf</span>
        </h1>
        <p className="blog-hero__subtitle">
          Rankings, calendário de eventos, atletas e tudo sobre o circuito
          mundial de surf. Temporada {blogMeta.season}.
        </p>
        <span className="blog-hero__updated">
          Atualizado em {blogMeta.lastUpdated}
        </span>
        <div className="blog-hero__wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,64 C360,120 720,0 1080,64 C1260,96 1380,80 1440,64 L1440,120 L0,120 Z"
              fill="#f8f9fa"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default BlogHero;
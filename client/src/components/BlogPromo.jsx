import React from "react";
import { Link } from "react-router-dom";
import "../styles/BlogPromo.css";

const highlights = [
  {
    image:
      "/yago-champ.jpg",
    tag: "Rankings 2026",
    title: "Yago Dora é o novo Campeão Mundial",
    description:
      "O brasileiro conquistou o título em Cloudbreak, Fiji. Confere o ranking completo do CT 2026.",
  },
  {
    image:
      "/12etapas.jpg",
    tag: "Calendário",
    title: "12 Etapas em 9 Países",
    description:
      "De Bells Beach a Pipeline — acompanha todas as etapas do Championship Tour 2026.",
  },
  {
    image:
      "/raglan-bay-wave.jpg",
    tag: "Novidade",
    title: "Raglan estreia no CT",
    description:
      "A Nova Zelândia recebe pela primeira vez uma etapa do Championship Tour. Left-hand point break épico.",
  },
];

const BlogPromo = () => {
  return (
    <section className="blog-promo">
      {/* Decorative elements */}
      <div className="blog-promo__wave-top" />

      <div className="blog-promo__container">
        {/* Header */}
        <div className="blog-promo__header">
          <span className="blog-promo__eyebrow">Elite Surfing Blog</span>
          <h2 className="blog-promo__title">
            Tudo sobre a <span>World Surf League</span>
          </h2>
          <p className="blog-promo__subtitle">
            Rankings, calendário, vídeos e artigos — a temporada 2026 marca os
            50 anos do surf profissional mundial.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="blog-promo__grid">
          {highlights.map((item, index) => (
            <Link
              to="/blog"
              className="blog-promo__card"
              key={index}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="blog-promo__card-image">
                <img src={item.image} alt={item.title} loading="lazy" />
                <div className="blog-promo__card-overlay" />
                <span className="blog-promo__card-tag">{item.tag}</span>
              </div>
              <div className="blog-promo__card-body">
                <h3 className="blog-promo__card-title">{item.title}</h3>
                <p className="blog-promo__card-desc">{item.description}</p>
                <span className="blog-promo__card-link">
                  Ler mais
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="blog-promo__cta">
          <Link to="/blog" className="blog-promo__btn">
            Explorar o Blog Completo
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="blog-promo__cta-note">
            Atualizado mensalmente com dados oficiais da WSL
          </p>
        </div>
      </div>

      <div className="blog-promo__wave-bottom" />
    </section>
  );
};

export default BlogPromo;
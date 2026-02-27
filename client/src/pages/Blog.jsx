import React from "react";
import BlogHero from "../components/blog/BlogHero";
import WslRankings from "../components/blog/WslRankings";
import WslSchedule from "../components/blog/WslSchedule";
import WslChampions, { WslVideos } from "../components/blog/WslChampions";
import BlogPosts from "../components/blog/BlogPosts";
import "../styles/Blog.css";

const Blog = () => {
  return (
    <div className="blog-page">
      <BlogHero />

      <div className="blog-container">
        {/* Navegação interna */}
        <nav className="blog-nav">
          <a href="#rankings" className="blog-nav__link">🏆 Rankings</a>
          <a href="#calendario" className="blog-nav__link">Calendário</a>
          <a href="#campeoes" className="blog-nav__link">Campeões</a>
          <a href="#artigos" className="blog-nav__link">Artigos</a>
          <a href="#videos" className="blog-nav__link">🎬 Vídeos</a>
          <a
            href="https://www.worldsurfleague.com"
            target="_blank"
            rel="noopener noreferrer"
            className="blog-nav__link blog-nav__link--external"
          >
            WSL Oficial
          </a>
        </nav>

        <WslRankings />
        <WslSchedule />
        <WslChampions />
        <BlogPosts />
        <WslVideos />

        {/* Info Footer */}
        <section className="blog-info">
          <div className="blog-info__content">
            <h3>Sobre o Blog Surf</h3>
            <p>
              Dados de rankings e calendário obtidos do site oficial da{" "}
              <a href="https://www.worldsurfleague.com" target="_blank" rel="noopener noreferrer">
                World Surf League
              </a>
              . Atualizado mensalmente pela equipa Elite Surfing.
            </p>
            <p>
              Visite a nossa <strong>loja</strong> para encontrar os melhores
              acessórios de surf para a sua próxima sessão!
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Blog;
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const categoryLabels = {
  noticias: "Notícias",
  resultados: "Resultados",
  atletas: "Atletas",
  dicas: "Dicas",
  equipamentos: "Equipamentos",
  ondas: "Ondas",
};

const BlogPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const url = activeCategory
          ? `${API_URL}/api/blog?category=${activeCategory}`
          : `${API_URL}/api/blog`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) setPosts(json.posts);
      } catch (err) {
        console.error("Erro ao buscar posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [activeCategory]);

  if (loading) {
    return (
      <section className="blog-section" id="artigos">
        <div className="blog-posts__loading">Carregando artigos...</div>
      </section>
    );
  }

  if (posts.length === 0) return null; // Não mostrar seção se não há posts

  return (
    <section className="blog-section" id="artigos">
      <div className="blog-section__header">
        <div className="blog-section__icon">📝</div>
        <div>
          <h2 className="blog-section__title">Artigos</h2>
          <p className="blog-section__desc">Análises, notícias e dicas sobre surf</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="blog-categories">
        <button
          className={`blog-categories__btn ${!activeCategory ? "blog-categories__btn--active" : ""}`}
          onClick={() => setActiveCategory("")}
        >
          Todos
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            className={`blog-categories__btn ${activeCategory === key ? "blog-categories__btn--active" : ""}`}
            onClick={() => setActiveCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="blog-posts-grid">
        {posts.map((post) => (
          <Link
            to={`/blog/${post.slug}`}
            className="blog-post-card"
            key={post._id}
          >
            {post.image && (
              <div className="blog-post-card__image">
                <img src={post.image} alt={post.title} loading="lazy" />
              </div>
            )}
            <div className="blog-post-card__content">
              <div className="blog-post-card__meta">
                <span className="blog-post-card__category">
                  {categoryLabels[post.category] || post.category}
                </span>
                <span className="blog-post-card__date">
                  {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <h3 className="blog-post-card__title">{post.title}</h3>
              <p className="blog-post-card__summary">{post.summary}</p>
              <span className="blog-post-card__read">Ler artigo →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BlogPosts;
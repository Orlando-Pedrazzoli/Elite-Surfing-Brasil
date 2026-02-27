import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/Blog.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const BlogPostDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_URL}/api/blog/post/${slug}`);
        const json = await res.json();
        if (json.success) setPost(json.post);
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="blog-page">
        <div className="blog-container" style={{ paddingTop: 60, textAlign: "center" }}>
          Carregando artigo...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-page">
        <div className="blog-container" style={{ paddingTop: 60, textAlign: "center" }}>
          <h2>Artigo não encontrado</h2>
          <Link to="/blog" className="blog-nav__link">← Voltar ao Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="blog-post-detail">
        <Link to="/blog" className="blog-post-detail__back">← Voltar ao Blog</Link>

        {post.image && (
          <div className="blog-post-detail__image">
            <img src={post.image} alt={post.title} />
          </div>
        )}

        <div className="blog-post-detail__header">
          <span className="blog-post-detail__category">{post.category}</span>
          <h1 className="blog-post-detail__title">{post.title}</h1>
          <div className="blog-post-detail__meta">
            <span>{new Date(post.createdAt).toLocaleDateString("pt-BR", {
              day: "numeric", month: "long", year: "numeric"
            })}</span>
            <span>{post.views} visualizações</span>
          </div>
        </div>

        {post.youtubeId && (
          <div className="blog-post-detail__video">
            <iframe
              src={`https://www.youtube.com/embed/${post.youtubeId}`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div
          className="blog-post-detail__content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="blog-post-detail__tags">
            {post.tags.map((tag, i) => (
              <span className="blog-post-detail__tag" key={i}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPostDetail;
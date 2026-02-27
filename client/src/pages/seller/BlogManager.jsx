import React, { useEffect, useState } from "react";
import "../../styles/Blog.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const categories = [
  { value: "noticias", label: "Notícias" },
  { value: "resultados", label: "Resultados" },
  { value: "atletas", label: "Atletas" },
  { value: "dicas", label: "Dicas" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "ondas", label: "Ondas" },
];

const emptyForm = {
  title: "",
  summary: "",
  content: "",
  image: "",
  category: "noticias",
  tags: "",
  published: false,
  featured: false,
  youtubeId: "",
};

const BlogManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState(null);

  const token = localStorage.getItem("stoken");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/blog/admin/all`, { headers });
      const json = await res.json();
      if (json.success) setPosts(json.posts);
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const showMessage = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };

      const url = editingId
        ? `${API_URL}/api/blog/admin/${editingId}`
        : `${API_URL}/api/blog/admin`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        showMessage(json.message);
        setForm(emptyForm);
        setShowForm(false);
        setEditingId(null);
        fetchPosts();
      } else {
        showMessage(json.message, "error");
      }
    } catch (err) {
      showMessage("Erro ao salvar post", "error");
    }
  };

  const handleEdit = (post) => {
    setForm({
      title: post.title,
      summary: post.summary || "",
      content: post.content || "",
      image: post.image || "",
      category: post.category || "noticias",
      tags: post.tags?.join(", ") || "",
      published: post.published,
      featured: post.featured || false,
      youtubeId: post.youtubeId || "",
    });
    setEditingId(post._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apagar este post?")) return;
    try {
      const res = await fetch(`${API_URL}/api/blog/admin/${id}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (json.success) {
        showMessage("Post apagado!");
        fetchPosts();
      }
    } catch (err) {
      showMessage("Erro ao apagar", "error");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/blog/admin/${id}/toggle`, {
        method: "PUT",
        headers,
      });
      const json = await res.json();
      if (json.success) {
        showMessage(json.message);
        fetchPosts();
      }
    } catch (err) {
      showMessage("Erro ao alterar estado", "error");
    }
  };

  return (
    <div className="blog-manager">
      <div className="blog-manager__header">
        <h2>📝 Gerir Blog</h2>
        <button
          className="blog-manager__btn-new"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "✕ Fechar" : "+ Novo Post"}
        </button>
      </div>

      {msg && (
        <div className={`blog-manager__msg blog-manager__msg--${msg.type}`}>
          {msg.text}
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <form className="blog-form" onSubmit={handleSubmit}>
          <h3>{editingId ? "Editar Post" : "Novo Post"}</h3>

          <div className="blog-form__group">
            <label>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Gabriel Medina volta ao top 5"
              required
            />
          </div>

          <div className="blog-form__group">
            <label>Resumo * (máx 300 caracteres)</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Breve resumo do artigo..."
              maxLength={300}
              rows={2}
              required
            />
            <span className="blog-form__count">{form.summary.length}/300</span>
          </div>

          <div className="blog-form__group">
            <label>Conteúdo * (suporta HTML)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="<p>Escreva o conteúdo completo aqui...</p>"
              rows={10}
              required
            />
          </div>

          <div className="blog-form__row">
            <div className="blog-form__group">
              <label>Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="blog-form__group">
              <label>Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="wsl, surf, medina"
              />
            </div>
          </div>

          <div className="blog-form__row">
            <div className="blog-form__group">
              <label>URL da Imagem (Cloudinary)</label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://res.cloudinary.com/..."
              />
            </div>
            <div className="blog-form__group">
              <label>YouTube ID (opcional)</label>
              <input
                type="text"
                value={form.youtubeId}
                onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
                placeholder="Ex: dQw4w9WgXcQ"
              />
            </div>
          </div>

          <div className="blog-form__checkboxes">
            <label>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              Publicado
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Destaque
            </label>
          </div>

          <div className="blog-form__actions">
            <button type="submit" className="blog-form__submit">
              {editingId ? "Salvar Alterações" : "Criar Post"}
            </button>
            <button
              type="button"
              className="blog-form__cancel"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* POSTS LIST */}
      <div className="blog-manager__list">
        {loading ? (
          <p>Carregando...</p>
        ) : posts.length === 0 ? (
          <div className="blog-manager__empty">
            <p>Nenhum post ainda. Clica em "+ Novo Post" para começar!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div className="blog-manager__item" key={post._id}>
              <div className="blog-manager__item-info">
                <div className="blog-manager__item-badges">
                  <span className={`blog-manager__badge ${post.published ? "blog-manager__badge--pub" : "blog-manager__badge--draft"}`}>
                    {post.published ? "Publicado" : "Rascunho"}
                  </span>
                  {post.featured && <span className="blog-manager__badge blog-manager__badge--feat">⭐ Destaque</span>}
                  <span className="blog-manager__badge">{post.category}</span>
                </div>
                <h4>{post.title}</h4>
                <span className="blog-manager__item-date">
                  {new Date(post.createdAt).toLocaleDateString("pt-BR")} · {post.views || 0} views
                </span>
              </div>
              <div className="blog-manager__item-actions">
                <button onClick={() => handleToggle(post._id)} title={post.published ? "Despublicar" : "Publicar"}>
                  {post.published ? "👁️" : "👁️‍🗨️"}
                </button>
                <button onClick={() => handleEdit(post)} title="Editar">✏️</button>
                <button onClick={() => handleDelete(post._id)} title="Apagar">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BlogManager;
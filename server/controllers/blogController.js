const BlogPost = require("../models/BlogPost.js");

// GET /api/blog - Listar posts publicados (público)
const getPosts = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;

    const posts = await BlogPost.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-content"); // Lista sem conteúdo completo

    const total = await BlogPost.countDocuments(filter);

    res.json({
      success: true,
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/blog/featured - Posts em destaque
const getFeaturedPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("-content");
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/blog/:slug - Post individual (público)
const getPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      published: true,
    });
    if (!post) {
      return res.status(404).json({ success: false, message: "Post não encontrado" });
    }
    // Incrementar views
    post.views += 1;
    await post.save();
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ADMIN (Seller) - CRUD completo
// ============================================

// GET /api/blog/admin/all - Todos os posts (incluindo rascunhos)
const getAllPostsAdmin = async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .select("-content");
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/blog/admin - Criar post
const createPost = async (req, res) => {
  try {
    const { title, summary, content, image, category, tags, published, featured, youtubeId } = req.body;
    const post = new BlogPost({
      title,
      summary,
      content,
      image,
      category,
      tags: tags || [],
      published: published || false,
      featured: featured || false,
      youtubeId: youtubeId || "",
    });
    await post.save();
    res.status(201).json({ success: true, post, message: "Post criado!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/blog/admin/:id - Editar post
const updatePost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!post) {
      return res.status(404).json({ success: false, message: "Post não encontrado" });
    }
    res.json({ success: true, post, message: "Post atualizado!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/blog/admin/:id - Apagar post
const deletePost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post não encontrado" });
    }
    res.json({ success: true, message: "Post apagado!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/blog/admin/:id/toggle - Publicar/despublicar
const togglePublish = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post não encontrado" });
    }
    post.published = !post.published;
    await post.save();
    res.json({
      success: true,
      published: post.published,
      message: post.published ? "Post publicado!" : "Post despublicado!",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPosts,
  getFeaturedPosts,
  getPostBySlug,
  getAllPostsAdmin,
  createPost,
  updatePost,
  deletePost,
  togglePublish,
};
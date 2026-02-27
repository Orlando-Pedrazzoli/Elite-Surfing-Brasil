const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String, // URL Cloudinary
      default: "",
    },
    category: {
      type: String,
      enum: ["noticias", "resultados", "atletas", "dicas", "equipamentos", "ondas"],
      default: "noticias",
    },
    tags: [String],
    published: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    youtubeId: {
      type: String, // ID do vídeo YouTube para embed
      default: "",
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Gerar slug automaticamente a partir do título
blogPostSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
  next();
});

const BlogPost = mongoose.model("BlogPost", blogPostSchema);
module.exports = BlogPost;
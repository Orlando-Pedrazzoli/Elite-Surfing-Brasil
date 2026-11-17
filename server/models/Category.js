// server/models/Category.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS — geridas no admin (/seller/categorias)
// ─────────────────────────────────────────────────────────────────────
// Dois níveis, iguais aos que a loja já usa:
//   • Categoria (parent = null)   → "group" do produto   (ex: decks)
//   • Subcategoria (parent = id)  → "category" do produto (ex: Deck-Maldivas)
//
// O `slug` é o valor gravado no produto (product.group / product.category)
// e o pedaço da URL (/collections/decks, /products/deck-maldivas). Por isso
// mudar um slug no admin atualiza também produtos, cupons, tabelas de preço
// e legendas do Instagram (ver categoryController.js).
//
// Coleções por TAG (isTagGroup) não têm subcategorias: mostram os produtos
// que tenham a tag `tagKey` (ex: SUP, Bodyboard, Outlet).
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, maxlength: 80 },
    // Versão minúscula do slug — garante unicidade sem diferenciar
    // maiúsculas (as URLs da loja comparam em minúsculas).
    slugKey: { type: String, required: true, unique: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: '', trim: true, maxlength: 400 },
    // Imagem do card da coleção na home (só categorias). Vazio = a loja usa
    // a imagem padrão do site para esse slug, se houver.
    image: { type: String, default: '' },
    // Aparece na grade de coleções da página inicial (só categorias)
    showOnHome: { type: Boolean, default: true },
    // Coleção por tag
    isTagGroup: { type: Boolean, default: false },
    tagKey: { type: String, default: '', trim: true, lowercase: true },
    // Conjunto de filtros da página da coleção (client/src/assets/assets.js
    // → filterDefinitions). Fica gravado à parte para os filtros não se
    // perderem se o slug da categoria for alterado.
    filterSet: { type: String, default: '' },
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1, order: 1 });

categorySchema.pre('validate', function setSlugKey(next) {
  if (this.slug) this.slugKey = String(this.slug).toLowerCase();
  next();
});

const Category =
  mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;

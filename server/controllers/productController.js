import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product.js';

// Add Product : /api/product/add
export const addProduct = async (req, res) => {
  try {
    let productData = JSON.parse(req.body.productData);
    const images = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;
    
    // Upload das imagens
    let imagesUrl = await Promise.all(
      images.map(async item => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
        });
        return result.secure_url;
      })
    );
    
    // 🆕 Upload do vídeo (se existir)
    let videoUrl = null;
    if (videoFile) {
      const videoResult = await cloudinary.uploader.upload(videoFile.path, {
        resource_type: 'video',
        folder: 'products/videos',
      });
      videoUrl = videoResult.secure_url;
    }
    
    // 🎯 Calcular inStock baseado no stock
    const stock = productData.stock || 0;
    const inStock = stock > 0;
    
    await Product.create({ 
      ...productData, 
      image: imagesUrl,
      video: videoUrl,
      stock,
      inStock,
    });
    
    res.json({ success: true, message: 'Produto adicionado com sucesso' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get Product List : /api/product/list
// 🎯 ATUALIZADO: Retorna apenas produtos principais (isMainVariant: true)
export const productList = async (req, res) => {
  try {
    const { all } = req.query; // ?all=true para admin ver todos
    
    let query = {};
    if (!all) {
      // Por defeito, só mostra produtos principais
      query = { isMainVariant: { $ne: false } }; // true ou null/undefined
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get single Product : /api/product/id
export const productById = async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);
    res.json({ success: true, product });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Get Single Product by ID (GET) : /api/product/:id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }
    
    res.json({ success: true, product });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Get Products by IDs (múltiplos) : /api/product/by-ids
export const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: false, message: 'IDs array is required' });
    }

    // Limitar a 50 produtos por request para evitar abuse
    const limitedIds = ids.slice(0, 50);

    const products = await Product.find({ 
      _id: { $in: limitedIds } 
    });

    res.json({ 
      success: true, 
      products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Get Products by Family : /api/product/family
export const getProductFamily = async (req, res) => {
  try {
    const { familySlug } = req.body;
    
    if (!familySlug) {
      return res.json({ success: false, message: 'Family slug é obrigatório' });
    }
    
    const products = await Product.find({ 
      productFamily: familySlug 
    }).sort({ isMainVariant: -1, createdAt: 1 }); // Principal primeiro
    
    res.json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Check Stock : /api/product/check-stock
export const checkStock = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }
    
    const available = product.stock >= quantity;
    
    res.json({ 
      success: true, 
      available,
      stock: product.stock,
      message: available ? 'Stock disponível' : `Apenas ${product.stock} unidade(s) disponível(eis)`
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Update Stock : /api/product/update-stock
export const updateStock = async (req, res) => {
  try {
    const { productId, stock } = req.body;
    
    const newStock = Math.max(0, parseInt(stock) || 0);
    
    await Product.findByIdAndUpdate(productId, { 
      stock: newStock,
      inStock: newStock > 0
    });
    
    res.json({ success: true, message: 'Stock atualizado' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Decrement Stock (após compra) : /api/product/decrement-stock
export const decrementStock = async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await Product.findByIdAndUpdate(item.productId, {
          stock: newStock,
          inStock: newStock > 0
        });
      }
    }
    
    res.json({ success: true, message: 'Stock decrementado' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Change Product inStock : /api/product/stock (mantido para compatibilidade)
export const changeStock = async (req, res) => {
  try {
    const { id, inStock } = req.body;
    
    // Se inStock for false, setar stock para 0
    const updateData = { inStock };
    if (!inStock) {
      updateData.stock = 0;
    }
    
    await Product.findByIdAndUpdate(id, updateData);
    res.json({ success: true, message: 'Stock Updated' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════
// Update Product : /api/product/update
// 🆕 ATUALIZADO: Suporta sistema de imagens com ordem
//    - Mantém imagens existentes selecionadas (sem re-upload)
//    - Faz upload apenas de imagens novas
//    - Respeita a ordem definida pelo utilizador (drag & drop)
//    - Remove do Cloudinary imagens que foram descartadas
// ═══════════════════════════════════════════════════════════════════
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.body;
    let productData = JSON.parse(req.body.productData);
    const newImageFiles = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;

    // Buscar produto existente
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    // ═══════════════════════════════════════════════════════════
    // SISTEMA DE IMAGENS COM ORDEM (existentes + novas)
    // ═══════════════════════════════════════════════════════════
    // O frontend envia:
    //   productData.existingImages = ['url1', 'url2']  → URLs mantidas
    //   productData.imageOrder = [{ index, type, url }] → ordem final
    //   req.files.images = [File, File]                 → ficheiros novos
    // ═══════════════════════════════════════════════════════════

    let finalImageUrls;
    const { existingImages, imageOrder } = productData;

    // Limpar campos auxiliares (não são campos do modelo)
    delete productData.existingImages;
    delete productData.imageOrder;

    if (imageOrder && Array.isArray(imageOrder)) {
      // ── NOVO SISTEMA: reconstruir array na ordem correta ──

      // 1. Upload das novas imagens
      const uploadedNewUrls = await Promise.all(
        newImageFiles.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
          });
          return result.secure_url;
        })
      );

      // 2. Montar array final respeitando a ordem do imageOrder
      let newFileIndex = 0;
      finalImageUrls = imageOrder.map((item) => {
        if (item.type === 'existing' && item.url) {
          return item.url;
        } else {
          // tipo 'new' — pegar da lista de uploads na ordem
          const url = uploadedNewUrls[newFileIndex];
          newFileIndex++;
          return url;
        }
      }).filter(Boolean);

      // 3. Apagar do Cloudinary as imagens que foram removidas
      const keptUrls = new Set(existingImages || []);
      for (const oldUrl of existingProduct.image) {
        if (!keptUrls.has(oldUrl)) {
          try {
            const publicId = oldUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.log('Erro ao excluir imagem removida:', err.message);
          }
        }
      }
    } else if (newImageFiles.length > 0) {
      // ── FALLBACK: comportamento antigo (substitui todas) ──
      for (const imageUrl of existingProduct.image) {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log('Erro ao excluir imagem antiga:', err.message);
        }
      }

      finalImageUrls = await Promise.all(
        newImageFiles.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
          });
          return result.secure_url;
        })
      );
    } else {
      // Sem alterações nas imagens
      finalImageUrls = existingProduct.image;
    }

    // ═══════════════════════════════════════════════════════════
    // VÍDEO
    // ═══════════════════════════════════════════════════════════
    let videoUrl = existingProduct.video;
    if (videoFile) {
      if (existingProduct.video) {
        try {
          const videoPublicId = existingProduct.video.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });
        } catch (error) {
          console.log('Erro ao excluir vídeo antigo:', error.message);
        }
      }

      const videoResult = await cloudinary.uploader.upload(videoFile.path, {
        resource_type: 'video',
        folder: 'products/videos',
      });
      videoUrl = videoResult.secure_url;
    }
    
    if (productData.removeVideo && existingProduct.video) {
      try {
        const videoPublicId = existingProduct.video.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });
      } catch (error) {
        console.log('Erro ao excluir vídeo:', error.message);
      }
      videoUrl = null;
      delete productData.removeVideo;
    }

    // 🎯 Calcular inStock baseado no stock
    if (productData.stock !== undefined) {
      productData.inStock = productData.stock > 0;
    }

    // Atualizar produto
    await Product.findByIdAndUpdate(id, {
      ...productData,
      image: finalImageUrls,
      video: videoUrl,
    });

    res.json({ success: true, message: 'Produto atualizado com sucesso' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Delete Product : /api/product/delete
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    // Excluir imagens do Cloudinary
    for (const imageUrl of product.image) {
      try {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log('Erro ao excluir imagem do Cloudinary:', error.message);
      }
    }

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Produto excluído com sucesso',
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
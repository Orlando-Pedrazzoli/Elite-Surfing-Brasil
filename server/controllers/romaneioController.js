import Romaneio from '../models/Romaneio.js';
import Product from '../models/Product.js';

// ═══════════════════════════════════════════════════════════════
// LISTAR romaneios
// GET /api/romaneios?status=Rascunho
// ═══════════════════════════════════════════════════════════════
export const listarRomaneios = async (req, res) => {
  try {
    const { status, q } = req.query;
    let query = {};

    if (status && status !== 'all') query.status = status;
    if (q?.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [{ clienteNome: regex }, { clienteCpfCnpj: regex }];
    }

    const romaneios = await Romaneio.find(query).sort({ createdAt: -1 });
    res.json({ success: true, romaneios });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// OBTER romaneio por ID
// GET /api/romaneios/:id
// ═══════════════════════════════════════════════════════════════
export const obterRomaneio = async (req, res) => {
  try {
    const romaneio = await Romaneio.findById(req.params.id).populate(
      'itens.produto',
      'name sku image offerPrice price stock inStock',
    );
    if (!romaneio)
      return res.json({ success: false, message: 'Romaneio não encontrado' });
    res.json({ success: true, romaneio });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// CRIAR romaneio (Rascunho)
// POST /api/romaneios
// ═══════════════════════════════════════════════════════════════
export const criarRomaneio = async (req, res) => {
  try {
    const dados = req.body;

    // Validações
    if (!dados.clienteNome?.trim()) {
      return res.json({ success: false, message: 'Cliente obrigatório' });
    }
    if (!dados.itens || dados.itens.length === 0) {
      return res.json({
        success: false,
        message: 'Adicione pelo menos um item',
      });
    }

    // Verificar stock disponível antes de criar
    for (const item of dados.itens) {
      const produto = await Product.findById(item.produto);
      if (!produto) {
        return res.json({
          success: false,
          message: `Produto não encontrado: ${item.nome}`,
        });
      }
      if (produto.stock < item.quantidade) {
        return res.json({
          success: false,
          message: `Stock insuficiente para "${produto.name}". Disponível: ${produto.stock}, Solicitado: ${item.quantidade}`,
        });
      }
    }

    const romaneio = await Romaneio.create({ ...dados, status: 'Rascunho' });
    res.json({
      success: true,
      message: 'Romaneio criado com sucesso',
      romaneio,
    });
  } catch (error) {
    console.error('criarRomaneio error:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR romaneio (apenas Rascunho)
// PUT /api/romaneios/:id
// ═══════════════════════════════════════════════════════════════
export const atualizarRomaneio = async (req, res) => {
  try {
    const romaneio = await Romaneio.findById(req.params.id);
    if (!romaneio)
      return res.json({ success: false, message: 'Romaneio não encontrado' });

    if (romaneio.status !== 'Rascunho') {
      return res.json({
        success: false,
        message: 'Apenas rascunhos podem ser editados',
      });
    }

    const atualizado = await Romaneio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.json({
      success: true,
      message: 'Romaneio atualizado',
      romaneio: atualizado,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// CONFIRMAR romaneio — decrementa estoque automaticamente
// PUT /api/romaneios/:id/confirmar
// ═══════════════════════════════════════════════════════════════
export const confirmarRomaneio = async (req, res) => {
  try {
    const romaneio = await Romaneio.findById(req.params.id);
    if (!romaneio)
      return res.json({ success: false, message: 'Romaneio não encontrado' });

    if (romaneio.status !== 'Rascunho') {
      return res.json({
        success: false,
        message: 'Romaneio já foi confirmado ou cancelado',
      });
    }

    if (romaneio.estoqueDecrementado) {
      return res.json({
        success: false,
        message: 'Estoque já foi decrementado para este romaneio',
      });
    }

    // ═══ VERIFICAR E DECREMENTAR ESTOQUE ═══
    const errosEstoque = [];

    for (const item of romaneio.itens) {
      const produto = await Product.findById(item.produto);
      if (!produto) {
        errosEstoque.push(`Produto não encontrado: ${item.nome}`);
        continue;
      }
      if (produto.stock < item.quantidade) {
        errosEstoque.push(
          `"${produto.name}": stock insuficiente. Disponível: ${produto.stock}, Necessário: ${item.quantidade}`,
        );
      }
    }

    if (errosEstoque.length > 0) {
      return res.json({
        success: false,
        message: 'Não é possível confirmar — problemas de estoque:',
        erros: errosEstoque,
      });
    }

    // Tudo OK — decrementar
    for (const item of romaneio.itens) {
      const produto = await Product.findById(item.produto);
      const novoStock = Math.max(0, produto.stock - item.quantidade);
      await Product.findByIdAndUpdate(item.produto, {
        stock: novoStock,
        inStock: novoStock > 0,
      });
    }

    // Marcar como confirmado
    romaneio.status = 'Confirmado';
    romaneio.estoqueDecrementado = true;
    romaneio.dataSaida = romaneio.dataSaida || new Date();
    await romaneio.save();

    res.json({
      success: true,
      message: '✅ Romaneio confirmado e estoque atualizado!',
      romaneio,
    });
  } catch (error) {
    console.error('confirmarRomaneio error:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// CANCELAR romaneio — devolve estoque se já foi decrementado
// PUT /api/romaneios/:id/cancelar
// ═══════════════════════════════════════════════════════════════
export const cancelarRomaneio = async (req, res) => {
  try {
    const romaneio = await Romaneio.findById(req.params.id);
    if (!romaneio)
      return res.json({ success: false, message: 'Romaneio não encontrado' });

    if (romaneio.status === 'Cancelado') {
      return res.json({ success: false, message: 'Romaneio já cancelado' });
    }
    if (romaneio.status === 'Faturado') {
      return res.json({
        success: false,
        message: 'Romaneios faturados não podem ser cancelados',
      });
    }

    // Se estoque foi decrementado, devolver
    if (romaneio.estoqueDecrementado) {
      for (const item of romaneio.itens) {
        const produto = await Product.findById(item.produto);
        if (produto) {
          const novoStock = produto.stock + item.quantidade;
          await Product.findByIdAndUpdate(item.produto, {
            stock: novoStock,
            inStock: novoStock > 0,
          });
        }
      }
      romaneio.estoqueDecrementado = false;
    }

    romaneio.status = 'Cancelado';
    await romaneio.save();

    res.json({
      success: true,
      message: 'Romaneio cancelado e estoque restaurado',
      romaneio,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// FATURAR romaneio (Confirmado → Faturado)
// PUT /api/romaneios/:id/faturar
// ═══════════════════════════════════════════════════════════════
export const faturarRomaneio = async (req, res) => {
  try {
    const romaneio = await Romaneio.findById(req.params.id);
    if (!romaneio)
      return res.json({ success: false, message: 'Romaneio não encontrado' });

    if (romaneio.status !== 'Confirmado') {
      return res.json({
        success: false,
        message: 'Apenas romaneios confirmados podem ser faturados',
      });
    }

    romaneio.status = 'Faturado';
    await romaneio.save();

    res.json({
      success: true,
      message: 'Romaneio faturado com sucesso',
      romaneio,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// STATS do dashboard de vendas diretas
// GET /api/romaneios/stats
// ═══════════════════════════════════════════════════════════════
export const statsRomaneios = async (req, res) => {
  try {
    const [total, rascunhos, confirmados, faturados, cancelados] =
      await Promise.all([
        Romaneio.countDocuments(),
        Romaneio.countDocuments({ status: 'Rascunho' }),
        Romaneio.countDocuments({ status: 'Confirmado' }),
        Romaneio.countDocuments({ status: 'Faturado' }),
        Romaneio.countDocuments({ status: 'Cancelado' }),
      ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const receitaMes = await Romaneio.aggregate([
      {
        $match: {
          status: { $in: ['Confirmado', 'Faturado'] },
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalVenda' } } },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        rascunhos,
        confirmados,
        faturados,
        cancelados,
        receitaMes: receitaMes[0]?.total || 0,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

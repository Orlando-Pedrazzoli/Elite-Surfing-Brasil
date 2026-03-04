import Cliente from '../models/Cliente.js';
import User from '../models/User.js';

// ═══════════════════════════════════════════════════════════════
// LISTAR clientes (com filtro por tipo e busca)
// GET /api/clientes?tipo=PJ&q=texto
// ═══════════════════════════════════════════════════════════════
export const listarClientes = async (req, res) => {
  try {
    const { tipo, q, ativo = 'true' } = req.query;
    let query = {};

    if (tipo && ['PJ', 'PF'].includes(tipo)) {
      query.tipo = tipo;
    }
    if (ativo !== 'all') {
      query.ativo = ativo === 'true';
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { razaoSocial: regex },
        { nomeFantasia: regex },
        { nome: regex },
        { cnpj: regex },
        { cpf: regex },
        { email: regex },
        { telefone: regex },
      ];
    }

    const clientes = await Cliente.find(query).sort({ createdAt: -1 });
    res.json({ success: true, clientes });
  } catch (error) {
    console.error('listarClientes error:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// BUSCA UNIFICADA — clientes diretos + users ecommerce
// GET /api/clientes/busca?q=texto&tipo=PJ
// ═══════════════════════════════════════════════════════════════
export const buscaUnificada = async (req, res) => {
  try {
    const { q = '', tipo } = req.query;
    const regex = new RegExp(q.trim(), 'i');

    // Query clientes diretos
    let clienteQuery = { ativo: true };
    if (tipo && ['PJ', 'PF'].includes(tipo)) {
      clienteQuery.tipo = tipo;
    }
    if (q.trim()) {
      clienteQuery.$or = [
        { razaoSocial: regex },
        { nomeFantasia: regex },
        { nome: regex },
        { cnpj: regex },
        { cpf: regex },
        { email: regex },
      ];
    }

    const [clientes, users] = await Promise.all([
      Cliente.find(clienteQuery).limit(10),
      // Só busca users se não houver filtro de tipo ou tipo for PF
      (!tipo || tipo === 'PF') && q.trim()
        ? User.find({
            $or: [{ name: regex }, { email: regex }],
          })
            .select('name email phone')
            .limit(5)
        : Promise.resolve([]),
    ]);

    const resultado = [
      ...clientes.map(c => ({
        _id: c._id,
        origem: 'Cliente',
        tipo: c.tipo,
        nome: c.tipo === 'PJ' ? c.nomeFantasia || c.razaoSocial : c.nome,
        razaoSocial: c.razaoSocial,
        cpfCnpj: c.tipo === 'PJ' ? c.cnpj : c.cpf,
        email: c.email,
        telefone: c.telefone,
        endereco: c.endereco,
      })),
      ...users.map(u => ({
        _id: u._id,
        origem: 'User',
        tipo: 'PF',
        nome: u.name,
        email: u.email,
        telefone: u.phone || '',
        endereco: null,
      })),
    ];

    res.json({ success: true, resultado });
  } catch (error) {
    console.error('buscaUnificada error:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// OBTER cliente por ID
// GET /api/clientes/:id
// ═══════════════════════════════════════════════════════════════
export const obterCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente)
      return res.json({ success: false, message: 'Cliente não encontrado' });
    res.json({ success: true, cliente });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// CRIAR cliente
// POST /api/clientes
// ═══════════════════════════════════════════════════════════════
export const criarCliente = async (req, res) => {
  try {
    const dados = req.body;

    // Validações básicas
    if (!dados.tipo)
      return res.json({ success: false, message: 'Tipo obrigatório (PJ/PF)' });

    if (dados.tipo === 'PJ') {
      if (!dados.razaoSocial?.trim())
        return res.json({
          success: false,
          message: 'Razão Social obrigatória',
        });
      if (!dados.cnpj?.trim())
        return res.json({ success: false, message: 'CNPJ obrigatório' });
      // Verificar CNPJ duplicado
      const existe = await Cliente.findOne({
        cnpj: dados.cnpj.replace(/\D/g, ''),
      });
      if (existe)
        return res.json({ success: false, message: 'CNPJ já cadastrado' });
      dados.cnpj = dados.cnpj.replace(/\D/g, '');
    } else {
      if (!dados.nome?.trim())
        return res.json({ success: false, message: 'Nome obrigatório' });
      if (dados.cpf) {
        dados.cpf = dados.cpf.replace(/\D/g, '');
        const existe = await Cliente.findOne({ cpf: dados.cpf });
        if (existe)
          return res.json({ success: false, message: 'CPF já cadastrado' });
      }
    }

    const cliente = await Cliente.create(dados);
    res.json({ success: true, message: 'Cliente criado com sucesso', cliente });
  } catch (error) {
    console.error('criarCliente error:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR cliente
// PUT /api/clientes/:id
// ═══════════════════════════════════════════════════════════════
export const atualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!cliente)
      return res.json({ success: false, message: 'Cliente não encontrado' });
    res.json({ success: true, message: 'Cliente atualizado', cliente });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// DESATIVAR cliente (soft delete)
// DELETE /api/clientes/:id
// ═══════════════════════════════════════════════════════════════
export const desativarCliente = async (req, res) => {
  try {
    await Cliente.findByIdAndUpdate(req.params.id, { ativo: false });
    res.json({ success: true, message: 'Cliente desativado' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

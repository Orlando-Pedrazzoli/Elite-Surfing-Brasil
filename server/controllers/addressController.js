import Address from '../models/Address.js';

// =============================================================================
// Add Address : /api/address/add
// =============================================================================
export const addAddress = async (req, res) => {
  try {
    const { address, userId } = req.body;

    if (!address || !userId) {
      return res
        .status(400)
        .json({ success: false, message: 'Dados incompletos' });
    }

    // Formatar CEP brasileiro (00000-000)
    const rawCep = String(address.zipcode).replace(/\D/g, '').trim();
    const formattedCep = rawCep.length === 8 
      ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` 
      : rawCep;

    const newAddress = {
      ...address,
      userId,
      zipcode: formattedCep,
      country: address.country || 'Brasil',
      isGuestAddress: false,
    };

    await Address.create(newAddress);

    res.status(200).json({
      success: true,
      message: 'Endereço adicionado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao adicionar endereço:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar endereço: ' + error.message,
    });
  }
};

// =============================================================================
// Get Address : /api/address/get
// =============================================================================
export const getAddress = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: 'ID de usuário ausente' });
    }

    const addresses = await Address.find({ userId });

    res.status(200).json({ success: true, addresses });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🆕 Add Guest Address : /api/address/guest (SEM AUTENTICAÇÃO)
// =============================================================================
export const addGuestAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados do endereço necessários' 
      });
    }

    // Validações básicas
    if (!address.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email é obrigatório' 
      });
    }

    if (!address.firstName || !address.lastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome completo é obrigatório' 
      });
    }

    if (!address.street || !address.city || !address.zipcode || !address.phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Endereço completo é obrigatório' 
      });
    }

    // Formatar CEP brasileiro
    const rawCep = String(address.zipcode).replace(/\D/g, '').trim();
    const formattedCep = rawCep.length === 8 
      ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` 
      : rawCep;

    // Criar endereço de guest (sem userId)
    const newAddress = await Address.create({
      userId: null,
      isGuestAddress: true,
      firstName: address.firstName,
      lastName: address.lastName,
      email: address.email,
      phone: address.phone,
      cpf: address.cpf || '',
      street: address.street,
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      city: address.city,
      state: address.state || '',
      zipcode: formattedCep,
      country: address.country || 'Brasil',
    });

    console.log('✅ Endereço de visitante criado:', newAddress._id);

    res.status(200).json({ 
      success: true, 
      addressId: newAddress._id,
      message: 'Endereço criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar endereço de visitante:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar endereço: ' + error.message 
    });
  }
};
// server/controllers/userController.js
// 🆕 ATUALIZADO: Adicionado loginAndLinkOrder

import User from '../models/User.js';
import Order from '../models/Order.js';
import OtpVerification from '../models/OtpVerification.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ✅ MOBILE-FRIENDLY: Configuração de cookie SEM domain
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
});

// =============================================================================
// REGISTER USER : /api/user/register
// =============================================================================
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, getCookieOptions());

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        cartItems: user.cartItems || {},
      },
      token,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// LOGIN USER : /api/user/login
// =============================================================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.json({
        success: false,
        message: 'Email and password are required',
      });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, getCookieOptions());

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        cartItems: user.cartItems || {},
      },
      token,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// CHECK AUTH : /api/user/is-auth
// =============================================================================
export const isAuth = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        cartItems: user.cartItems || {},
      },
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// LOGOUT USER : /api/user/logout
// =============================================================================
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', getCookieOptions());
    return res.json({ success: true, message: 'Logged Out' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🆕 CONVERT GUEST TO USER - Criar conta após compra como guest
// =============================================================================
export const convertGuestToUser = async (req, res) => {
  try {
    const { email, password, name, orderId } = req.body;

    // Validações
    if (!email || !password) {
      return res.json({
        success: false,
        message: 'Email e password são obrigatórios',
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: 'Password deve ter pelo menos 6 caracteres',
      });
    }

    // Verificar se já existe user com este email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({
        success: false,
        message: 'Já existe uma conta com este email. Por favor, faça login.',
        existingAccount: true,
      });
    }

    // Buscar nome do pedido se não foi fornecido
    let userName = name;
    if (!userName && orderId) {
      const order = await Order.findById(orderId);
      if (order && order.guestName) {
        userName = order.guestName;
      }
    }

    // Se ainda não tem nome, usar parte do email
    if (!userName) {
      userName = email.split('@')[0];
    }

    // Criar user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: userName,
      email: email,
      password: hashedPassword,
      cartItems: {},
    });

    console.log('✅ Nova conta criada a partir de guest:', newUser._id);

    // 🆕 Associar TODOS os pedidos de guest com este email ao novo userId
    const updateResult = await Order.updateMany(
      {
        guestEmail: email,
        isGuestOrder: true,
      },
      {
        $set: {
          userId: newUser._id.toString(),
          isGuestOrder: false,
        },
      },
    );

    console.log(
      `✅ ${updateResult.modifiedCount} pedido(s) associado(s) à nova conta`,
    );

    // Gerar token de autenticação
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, getCookieOptions());

    return res.json({
      success: true,
      message: 'Conta criada com sucesso!',
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        cartItems: newUser.cartItems || {},
      },
      token,
      ordersLinked: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error('❌ Erro ao converter guest para user:', error);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🆕 CHECK IF EMAIL EXISTS (para validação no frontend)
// =============================================================================
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: 'Email é obrigatório' });
    }

    const existingUser = await User.findOne({ email });

    return res.json({
      success: true,
      exists: !!existingUser,
      // 🆕 Retornar nome se existir (para personalizar a mensagem)
      userName: existingUser ? existingUser.name.split(' ')[0] : null,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🆕 LOGIN AND LINK ORDER - Login + vincular pedidos de guest
// =============================================================================
export const loginAndLinkOrder = async (req, res) => {
  try {
    const { email, password, orderId } = req.body;

    // Validações básicas
    if (!email || !password) {
      return res.json({
        success: false,
        message: 'Email e password são obrigatórios',
      });
    }

    // Buscar user
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: 'Email ou password incorretos',
      });
    }

    // Verificar password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: 'Email ou password incorretos',
      });
    }

    console.log('✅ Login bem-sucedido para:', user.email);

    // 🆕 Vincular pedido específico se fornecido
    let orderLinked = false;
    if (orderId) {
      const orderUpdate = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            userId: user._id.toString(),
            isGuestOrder: false,
          },
        },
        { new: true },
      );

      if (orderUpdate) {
        console.log('✅ Pedido vinculado à conta:', orderId);
        orderLinked = true;
      }
    }

    // 🆕 Vincular TODOS os pedidos de guest com este email
    const bulkUpdateResult = await Order.updateMany(
      {
        guestEmail: email,
        isGuestOrder: true,
      },
      {
        $set: {
          userId: user._id.toString(),
          isGuestOrder: false,
        },
      },
    );

    console.log(
      `✅ ${bulkUpdateResult.modifiedCount} pedido(s) de guest vinculado(s)`,
    );

    // Gerar token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, getCookieOptions());

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        cartItems: user.cartItems || {},
      },
      token,
      orderLinked,
      totalOrdersLinked: bulkUpdateResult.modifiedCount + (orderLinked ? 1 : 0),
    });
  } catch (error) {
    console.error('❌ Erro no loginAndLinkOrder:', error);
    res.json({ success: false, message: error.message });
  }
};
// =============================================================================
// 🔑 LOGIN SEM SENHA (OTP) : POST /api/user/login-otp
// =============================================================================
// Fluxo "cliente recorrente" no carrinho: o cliente informa o email,
// recebe o código de 6 dígitos (mesma infra do guest checkout —
// /api/otp/send, com rate limit e bloqueio de emails descartáveis)
// e entra SEM precisar lembrar a senha.
//
// A sessão emitida é IDÊNTICA à do login por senha: cookie httpOnly +
// token Bearer. Proteções: OTP expira, máximo 5 tentativas por código
// (OtpVerification.verifyOTP) e cooldown de 60s entre envios.
// =============================================================================
export const loginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({
        success: false,
        message: 'Email e código são obrigatórios.',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (!/^\d{6}$/.test(String(otp))) {
      return res.json({
        success: false,
        message: 'O código deve ter 6 dígitos.',
      });
    }

    // 1. Verificar o OTP (consome o código; máx. 5 tentativas)
    const result = await OtpVerification.verifyOTP(
      normalizedEmail,
      String(otp),
    );
    if (!result.valid) {
      return res.json({ success: false, message: result.reason });
    }

    // 2. Email verificado — buscar a conta
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Email é real e verificado, mas não tem conta — o front devolve
      // o cliente ao fluxo de convidado sem fricção
      return res.json({
        success: false,
        noAccount: true,
        message:
          'Não encontramos uma conta com este email. Continue a compra como convidado.',
      });
    }

    // 3. Sessão idêntica ao login por senha
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    res.cookie('token', token, getCookieOptions());

    console.log('🔑 Login via OTP bem-sucedido:', user.email);

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        cartItems: user.cartItems || {},
      },
      token,
    });
  } catch (error) {
    console.error('❌ Erro no loginWithOtp:', error.message);
    return res.json({ success: false, message: 'Erro interno no login.' });
  }
};

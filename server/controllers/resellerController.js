// server/controllers/resellerController.js
// ═══════════════════════════════════════════════════════════════════════
// 🏪 REVENDEDORES — candidatura pública + gestão no admin
// ═══════════════════════════════════════════════════════════════════════
// Público:
//   POST   /api/reseller                      → candidatura do formulário
//          /revendedores (honeypot + rate limit por IP + CNPJ válido).
//          Grava com status `pending`, avisa a loja e confirma ao lojista.
// Admin (authSeller) — montado em /api/seller/resellers para o frontend
// enviar o x-seller-token também no iPhone (ver isSellerRoute no
// AppContext):
//   GET    /api/seller/resellers              → lista (?status=, ?search=)
//          + resumo por status
//   GET    /api/seller/resellers/:id          → uma candidatura
//   PATCH  /api/seller/resellers/:id          → { action, ... }
//            approve { note? }                → aprova + email ao lojista
//            reject  { reason?, notify? }     → recusa + email (se notify)
//            notes   { notes }                → anotações internas
//   DELETE /api/seller/resellers/:id          → apaga (permite ao lojista
//          candidatar-se de novo com o mesmo CNPJ)
//
// Emails AGUARDADOS (await): na Vercel, promises pendentes depois da
// resposta são congeladas. A ação na base acontece primeiro; se o email
// falhar, a resposta traz `emailSent:false` e o admin é avisado.
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import Reseller from '../models/Reseller.js';
import {
  sendResellerApplicationNotification,
  sendResellerApplicationReceived,
  sendResellerApproved,
  sendResellerRejected,
} from '../services/reseller/resellerMailer.js';

// ─────────────────────────────────────────────────────────────────────
// Validação / limpeza
// ─────────────────────────────────────────────────────────────────────
const LIMITS = {
  companyName: 160,
  tradeName: 120,
  stateRegistration: 30,
  website: 200,
  contactName: 120,
  email: 200,
  message: 2000,
  street: 160,
  number: 20,
  complement: 80,
  neighborhood: 80,
  city: 80,
};

const STORE_TYPES = new Set(['fisica', 'online', 'ambas']);
const STATUSES = new Set(['pending', 'approved', 'rejected']);

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = v => (typeof v === 'string' ? v.replace(/\D/g, '') : '');

const isValidEmail = email =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''));

const isValidPhone = phone => {
  const d = digits(phone);
  return d.length === 10 || d.length === 11;
};

// Algoritmo oficial dos dígitos verificadores do CNPJ
export const isValidCNPJ = value => {
  const c = digits(value);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = len => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(c[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
};

const bad = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const publicDoc = doc => {
  const out = doc?.toObject ? doc.toObject() : { ...doc };
  delete out.userAgent;
  delete out.__v;
  return out;
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/reseller (público)
// ─────────────────────────────────────────────────────────────────────
export const submitApplication = async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot: bots preenchem o campo escondido → sucesso falso
    if (typeof body.website_url === 'string' && body.website_url.trim()) {
      return res.json({ success: true });
    }

    const companyName = clean(body.companyName, LIMITS.companyName);
    const tradeName =
      clean(body.tradeName, LIMITS.tradeName) || companyName.slice(0, 120);
    const cnpj = digits(body.cnpj);
    const stateRegistration = clean(body.stateRegistration, LIMITS.stateRegistration);
    const storeType = clean(body.storeType, 10);
    const website = clean(body.website, LIMITS.website);
    const contactName = clean(body.contactName, LIMITS.contactName);
    const email = clean(body.email, LIMITS.email).toLowerCase();
    const phone = digits(body.phone);
    const message = clean(body.message, LIMITS.message);
    const addr = body.address && typeof body.address === 'object' ? body.address : {};
    const address = {
      cep: digits(addr.cep).slice(0, 8),
      street: clean(addr.street, LIMITS.street),
      number: clean(addr.number, LIMITS.number),
      complement: clean(addr.complement, LIMITS.complement),
      neighborhood: clean(addr.neighborhood, LIMITS.neighborhood),
      city: clean(addr.city, LIMITS.city),
      state: clean(addr.state, 2).toUpperCase(),
    };

    if (companyName.length < 3) return bad(res, 'Informe a razão social.');
    if (!isValidCNPJ(cnpj)) return bad(res, 'CNPJ inválido.');
    if (!STORE_TYPES.has(storeType)) return bad(res, 'Informe o tipo de loja.');
    if (contactName.length < 3) return bad(res, 'Informe o nome do responsável.');
    if (!isValidEmail(email)) return bad(res, 'E-mail inválido.');
    if (!isValidPhone(phone)) return bad(res, 'Informe o WhatsApp com DDD.');
    if (address.city.length < 2 || address.state.length !== 2)
      return bad(res, 'Informe cidade e estado da loja.');

    const existing = await Reseller.findOne({ $or: [{ cnpj }, { email }] })
      .select('status')
      .lean();
    if (existing) {
      const msg =
        existing.status === 'approved'
          ? 'Este CNPJ/e-mail já é revendedor Elite Surfing. Fale conosco pelo WhatsApp para receber a tabela atualizada.'
          : existing.status === 'pending'
            ? 'Já recebemos um pedido com este CNPJ/e-mail — está em análise. Em breve respondemos por e-mail.'
            : 'Já existe um pedido com este CNPJ/e-mail. Fale conosco pelo WhatsApp para reavaliarmos.';
      return bad(res, msg, 409);
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';

    const reseller = await Reseller.create({
      companyName,
      tradeName,
      cnpj,
      stateRegistration,
      storeType,
      website,
      address,
      contactName,
      email,
      phone,
      message,
      status: 'pending',
      ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    });

    const plain = reseller.toObject();
    const [storeOk] = await Promise.all([
      sendResellerApplicationNotification(plain),
      sendResellerApplicationReceived(plain),
    ]);
    if (!storeOk) {
      console.error('[Resellers] candidatura gravada, mas o aviso à loja falhou:', email);
    }

    return res.json({ success: true, id: String(reseller._id) });
  } catch (error) {
    // Corrida entre dois envios iguais: índice único
    if (error?.code === 11000) {
      return bad(res, 'Já recebemos um pedido com este CNPJ/e-mail.', 409);
    }
    console.error('[Resellers] POST erro:', error);
    return bad(res, 'Erro ao enviar o cadastro. Tente novamente.', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/seller/resellers (admin)
// ─────────────────────────────────────────────────────────────────────
export const listResellers = async (req, res) => {
  try {
    const status = String(req.query.status || '');
    const search = String(req.query.search || '').trim();

    const filter = {};
    if (STATUSES.has(status)) filter.status = status;
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      const onlyDigits = search.replace(/\D/g, '');
      filter.$or = [
        { companyName: rx },
        { tradeName: rx },
        { contactName: rx },
        { email: rx },
        { 'address.city': rx },
        ...(onlyDigits ? [{ cnpj: { $regex: onlyDigits } }, { phone: { $regex: onlyDigits } }] : []),
      ];
    }

    const [resellers, counts] = await Promise.all([
      Reseller.find(filter)
        .select('-userAgent -__v')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Reseller.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const summary = { pending: 0, approved: 0, rejected: 0 };
    for (const c of counts) if (c._id in summary) summary[c._id] = c.n;

    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, resellers, summary });
  } catch (error) {
    console.error('[Resellers] GET erro:', error);
    return bad(res, 'Erro ao listar revendedores.', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/seller/resellers/:id (admin)
// ─────────────────────────────────────────────────────────────────────
export const getReseller = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'ID inválido.');
    const reseller = await Reseller.findById(id).select('-userAgent -__v').lean();
    if (!reseller) return bad(res, 'Candidatura não encontrada.', 404);
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, reseller });
  } catch (error) {
    console.error('[Resellers] GET/:id erro:', error);
    return bad(res, 'Erro ao abrir a candidatura.', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/seller/resellers/:id (admin)
// ─────────────────────────────────────────────────────────────────────
export const updateReseller = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'ID inválido.');

    const body = req.body || {};
    const action = String(body.action || '');

    const reseller = await Reseller.findById(id);
    if (!reseller) return bad(res, 'Candidatura não encontrada.', 404);

    let emailSent = null;

    switch (action) {
      case 'approve': {
        const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
        reseller.status = 'approved';
        reseller.rejectionReason = '';
        reseller.reviewedAt = new Date();
        await reseller.save();
        emailSent =
          body.notify === false
            ? null
            : await sendResellerApproved(reseller.toObject(), note);
        break;
      }

      case 'reject': {
        reseller.status = 'rejected';
        reseller.rejectionReason =
          typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
        reseller.reviewedAt = new Date();
        await reseller.save();
        emailSent =
          body.notify === false
            ? null
            : await sendResellerRejected(reseller.toObject());
        break;
      }

      case 'notes': {
        reseller.adminNotes =
          typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';
        await reseller.save();
        break;
      }

      default:
        return bad(res, 'Ação inválida.');
    }

    return res.json({ success: true, reseller: publicDoc(reseller), emailSent });
  } catch (error) {
    console.error('[Resellers] PATCH erro:', error);
    return bad(res, 'Erro ao atualizar a candidatura.', 500);
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/seller/resellers/:id (admin)
// ─────────────────────────────────────────────────────────────────────
export const deleteReseller = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'ID inválido.');
    const result = await Reseller.deleteOne({ _id: id });
    if (!result.deletedCount) return bad(res, 'Candidatura não encontrada.', 404);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Resellers] DELETE erro:', error);
    return bad(res, 'Erro ao excluir a candidatura.', 500);
  }
};

// server/middlewares/fraudProtection.js
// ═══════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE ANTI-FRAUDE — ELITE SURFING BRASIL
// ═══════════════════════════════════════════════════════════════
// Camadas de proteção:
// 1. Validação algorítmica de CPF (check digits)
// 2. Rate limiting por IP nos endpoints de pagamento
// 3. Velocity checks (mesmo email/CPF/IP em intervalo curto)
// 4. Honeypot (campo invisível que só bots preenchem)
// 5. Verificação de coerência DDD vs Estado
// 6. Bloqueio de emails descartáveis no pagamento
// ═══════════════════════════════════════════════════════════════
// ✅ 31/03/2026: Criado após ataque de bots com emails @sharebot.net
// ═══════════════════════════════════════════════════════════════

import { isDisposableEmail } from '../utils/disposableEmails.js';

// =============================================================================
// 1. VALIDAÇÃO DE CPF — ALGORITMO OFICIAL (CHECK DIGITS)
// =============================================================================
const validateCPF = cpf => {
  if (!cpf) return false;

  // Remover caracteres não numéricos
  const digits = cpf.replace(/\D/g, '');

  // Deve ter exatamente 11 dígitos
  if (digits.length !== 11) return false;

  // Bloquear CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9))) return false;

  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10))) return false;

  return true;
};

// =============================================================================
// 2. RATE LIMITING POR IP — Pedidos de pagamento
// =============================================================================
// Máximo 5 tentativas de pagamento por IP a cada 30 minutos
const paymentAttempts = new Map();
const PAYMENT_WINDOW_MS = 30 * 60 * 1000; // 30 minutos
const MAX_PAYMENT_ATTEMPTS = 5;

const checkPaymentRateLimit = ip => {
  const now = Date.now();
  const record = paymentAttempts.get(ip);

  if (!record) {
    paymentAttempts.set(ip, { attempts: [now] });
    return { allowed: true };
  }

  // Limpar tentativas fora da janela
  record.attempts = record.attempts.filter(t => now - t < PAYMENT_WINDOW_MS);

  if (record.attempts.length >= MAX_PAYMENT_ATTEMPTS) {
    return {
      allowed: false,
      reason: 'Muitas tentativas de pagamento. Aguarde 30 minutos.',
    };
  }

  record.attempts.push(now);
  paymentAttempts.set(ip, record);
  return { allowed: true };
};

// Limpeza periódica (a cada 15 minutos)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of paymentAttempts.entries()) {
      record.attempts = record.attempts.filter(
        t => now - t < PAYMENT_WINDOW_MS,
      );
      if (record.attempts.length === 0) {
        paymentAttempts.delete(key);
      }
    }
  },
  15 * 60 * 1000,
);

// =============================================================================
// 3. VELOCITY CHECKS — Mesmo email/CPF/IP em intervalo curto
// =============================================================================
// Bloquear se o mesmo email, CPF ou IP criar mais de 2 pedidos em 10 minutos
const recentOrders = new Map();
const VELOCITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ORDERS_PER_WINDOW = 2;

const checkVelocity = (identifier, type) => {
  if (!identifier) return { allowed: true };

  const key = `${type}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const record = recentOrders.get(key);

  if (!record) {
    recentOrders.set(key, { orders: [now] });
    return { allowed: true };
  }

  // Limpar pedidos fora da janela
  record.orders = record.orders.filter(t => now - t < VELOCITY_WINDOW_MS);

  if (record.orders.length >= MAX_ORDERS_PER_WINDOW) {
    const labels = { email: 'email', cpf: 'CPF', ip: 'IP' };
    return {
      allowed: false,
      reason: `Muitos pedidos recentes com este ${labels[type] || type}. Aguarde alguns minutos.`,
    };
  }

  record.orders.push(now);
  recentOrders.set(key, record);
  return { allowed: true };
};

// Limpeza periódica (a cada 10 minutos)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of recentOrders.entries()) {
      record.orders = record.orders.filter(t => now - t < VELOCITY_WINDOW_MS);
      if (record.orders.length === 0) {
        recentOrders.delete(key);
      }
    }
  },
  10 * 60 * 1000,
);

// =============================================================================
// 4. HONEYPOT — Campo invisível que só bots preenchem
// =============================================================================
const checkHoneypot = body => {
  // Se o campo _hp_website existir e tiver valor, é bot
  if (body._hp_website && body._hp_website.trim() !== '') {
    return { isBot: true };
  }
  return { isBot: false };
};

// =============================================================================
// 5. VERIFICAÇÃO DDD vs ESTADO — Coerência geográfica
// =============================================================================
const DDD_STATE_MAP = {
  // São Paulo
  11: 'SP',
  12: 'SP',
  13: 'SP',
  14: 'SP',
  15: 'SP',
  16: 'SP',
  17: 'SP',
  18: 'SP',
  19: 'SP',
  // Rio de Janeiro
  21: 'RJ',
  22: 'RJ',
  24: 'RJ',
  // Espírito Santo
  27: 'ES',
  28: 'ES',
  // Minas Gerais
  31: 'MG',
  32: 'MG',
  33: 'MG',
  34: 'MG',
  35: 'MG',
  37: 'MG',
  38: 'MG',
  // Paraná
  41: 'PR',
  42: 'PR',
  43: 'PR',
  44: 'PR',
  45: 'PR',
  46: 'PR',
  // Santa Catarina
  47: 'SC',
  48: 'SC',
  49: 'SC',
  // Rio Grande do Sul
  51: 'RS',
  53: 'RS',
  54: 'RS',
  55: 'RS',
  // Distrito Federal / Goiás
  61: 'DF',
  62: 'GO',
  64: 'GO',
  // Mato Grosso
  65: 'MT',
  66: 'MT',
  // Mato Grosso do Sul
  67: 'MS',
  // Acre
  68: 'AC',
  // Rondônia
  69: 'RO',
  // Bahia
  71: 'BA',
  73: 'BA',
  74: 'BA',
  75: 'BA',
  77: 'BA',
  // Sergipe
  79: 'SE',
  // Pernambuco
  81: 'PE',
  87: 'PE',
  // Alagoas
  82: 'AL',
  // Paraíba
  83: 'PB',
  // Rio Grande do Norte
  84: 'RN',
  // Ceará
  85: 'CE',
  88: 'CE',
  // Piauí
  86: 'PI',
  89: 'PI',
  // Maranhão
  98: 'MA',
  99: 'MA',
  // Pará
  91: 'PA',
  93: 'PA',
  94: 'PA',
  // Amazonas
  92: 'AM',
  97: 'AM',
  // Amapá
  96: 'AP',
  // Roraima
  95: 'RR',
  // Tocantins
  63: 'TO',
};

const checkPhoneStateConsistency = (phone, state) => {
  if (!phone || !state) return { consistent: true, warning: null };

  const digits = phone.replace(/\D/g, '');
  // Extrair DDD (2 primeiros dígitos após o código do país se houver)
  let ddd;
  if (digits.length === 13) {
    // +55 XX XXXXX-XXXX
    ddd = digits.substring(2, 4);
  } else if (digits.length === 11) {
    // XX XXXXX-XXXX
    ddd = digits.substring(0, 2);
  } else if (digits.length === 10) {
    // XX XXXX-XXXX
    ddd = digits.substring(0, 2);
  } else {
    return { consistent: true, warning: null };
  }

  const expectedState = DDD_STATE_MAP[ddd];
  if (!expectedState) return { consistent: true, warning: null };

  const normalizedState = state.toUpperCase().trim();
  if (expectedState !== normalizedState) {
    return {
      consistent: false,
      warning: `DDD (${ddd}) não corresponde ao estado (${normalizedState}). Esperado: ${expectedState}.`,
    };
  }

  return { consistent: true, warning: null };
};

// =============================================================================
// 🛡️ MIDDLEWARE PRINCIPAL — Aplicar todas as verificações
// =============================================================================
export const fraudProtection = (req, res, next) => {
  const startTime = Date.now();

  try {
    // Extrair IP do request
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip ||
      'unknown';

    // Extrair dados relevantes do body
    const {
      customerEmail,
      guestEmail,
      customerDocument,
      customerPhone,
      guestPhone,
      _hp_website, // honeypot
    } = req.body || {};

    const email = customerEmail || guestEmail || '';
    const phone = customerPhone || guestPhone || '';
    const cpf = customerDocument || '';

    console.log('');
    console.log('🛡️ ═══════════════════════════════════════════════');
    console.log('🛡️ VERIFICAÇÃO ANTI-FRAUDE');
    console.log('🛡️ ═══════════════════════════════════════════════');
    console.log('🛡️ IP:', ip);
    console.log('🛡️ Email:', email ? email.substring(0, 3) + '***' : 'N/A');
    console.log('🛡️ CPF:', cpf ? '***' + cpf.slice(-4) : 'N/A');

    // ─── CHECK 1: Honeypot ───────────────────────────────────
    const honeypotResult = checkHoneypot(req.body || {});
    if (honeypotResult.isBot) {
      console.log('🛡️ ❌ HONEYPOT: Bot detectado!');
      // Retornar mensagem genérica (não revelar que detectamos o bot)
      return res.status(400).json({
        success: false,
        message: 'Erro ao processar o pedido. Tente novamente.',
      });
    }
    console.log('🛡️ ✅ Honeypot: OK');

    // ─── CHECK 2: Email descartável ──────────────────────────
    if (email && isDisposableEmail(email)) {
      console.log('🛡️ ❌ EMAIL DESCARTÁVEL:', email);
      return res.status(400).json({
        success: false,
        message:
          'Este provedor de email não é aceito. Use um email válido (Gmail, Outlook, Yahoo, etc.).',
      });
    }
    console.log('🛡️ ✅ Email: OK');

    // ─── CHECK 3: Rate limiting por IP ───────────────────────
    const rateResult = checkPaymentRateLimit(ip);
    if (!rateResult.allowed) {
      console.log('🛡️ ❌ RATE LIMIT:', rateResult.reason);
      return res.status(429).json({
        success: false,
        message: rateResult.reason,
      });
    }
    console.log('🛡️ ✅ Rate limit: OK');

    // ─── CHECK 4: Velocity check por email ───────────────────
    if (email) {
      const emailVelocity = checkVelocity(email, 'email');
      if (!emailVelocity.allowed) {
        console.log('🛡️ ❌ VELOCITY (email):', emailVelocity.reason);
        return res.status(429).json({
          success: false,
          message: emailVelocity.reason,
        });
      }
    }

    // ─── CHECK 5: Velocity check por CPF ─────────────────────
    if (cpf) {
      const cpfClean = cpf.replace(/\D/g, '');
      if (cpfClean.length === 11) {
        const cpfVelocity = checkVelocity(cpfClean, 'cpf');
        if (!cpfVelocity.allowed) {
          console.log('🛡️ ❌ VELOCITY (CPF):', cpfVelocity.reason);
          return res.status(429).json({
            success: false,
            message: cpfVelocity.reason,
          });
        }
      }
    }

    // ─── CHECK 6: Velocity check por IP ──────────────────────
    const ipVelocity = checkVelocity(ip, 'ip');
    if (!ipVelocity.allowed) {
      console.log('🛡️ ❌ VELOCITY (IP):', ipVelocity.reason);
      return res.status(429).json({
        success: false,
        message: ipVelocity.reason,
      });
    }
    console.log('🛡️ ✅ Velocity checks: OK');

    // ─── CHECK 7: Validação algorítmica do CPF ───────────────
    if (cpf) {
      const cpfClean = cpf.replace(/\D/g, '');
      if (cpfClean.length === 11 && !validateCPF(cpfClean)) {
        console.log('🛡️ ❌ CPF INVÁLIDO (check digits):', cpfClean.slice(-4));
        return res.status(400).json({
          success: false,
          message: 'CPF inválido. Por favor, verifique o número informado.',
        });
      }
      console.log('🛡️ ✅ CPF: Válido');
    }

    // ─── CHECK 8: Coerência DDD vs Estado (apenas warning) ──
    // Não bloqueia, apenas loga — muita gente tem telefone de outro estado
    if (phone && req.body.address) {
      // Tentar pegar o estado do body (pode vir em diferentes formatos)
      const state = req.body.billingAddress?.state || '';
      if (state) {
        const phoneCheck = checkPhoneStateConsistency(phone, state);
        if (!phoneCheck.consistent) {
          console.log('🛡️ ⚠️ DDD INCONSISTENTE:', phoneCheck.warning);
          // Apenas logar, não bloquear (pessoas mudam de estado mas mantêm o telefone)
        } else {
          console.log('🛡️ ✅ DDD vs Estado: Consistente');
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`🛡️ ✅ TODAS AS VERIFICAÇÕES PASSARAM (${elapsed}ms)`);
    console.log('🛡️ ═══════════════════════════════════════════════');
    console.log('');

    // Adicionar IP ao request para logging
    req.clientIP = ip;

    next();
  } catch (error) {
    console.error('🛡️ ❌ ERRO no fraudProtection:', error.message);
    // Em caso de erro no middleware, deixar passar (não bloquear vendas legítimas)
    next();
  }
};

// Exportar funções individuais para uso em outros lugares
export { validateCPF };

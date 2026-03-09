// ═══════════════════════════════════════════════════════════════════════
// 🏢 CONFIGURAÇÃO DA EMPRESA — ELITE SURFING BRASIL
// ═══════════════════════════════════════════════════════════════════════
// Fonte única de verdade para dados da empresa.
// Usado no Footer, emails, NF-e, cálculo de frete, SEO, etc.
// ═══════════════════════════════════════════════════════════════════════

const COMPANY = {
  // ─── Identidade ──────────────────────────────────────────────
  name: 'Elite Surfing',
  legalName: 'Andre Oliveira Granha ME', // Atualizar com razão social real
  cnpj: '51.294.971/0001-22', // Atualizar com CNPJ real
  inscricaoEstadual: '', // Preencher quando tiver

  // ─── Endereço (Sede + Depósito de Envios) ────────────────────
  address: {
    street: 'Avenida das Américas',
    number: '12.900',
    complement: 'Sala 203C',
    building: 'Edifício Argentina Americas Avenue',
    neighborhood: 'Barra da Tijuca',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cep: '22790-702',
    country: 'Brasil',
  },

  // Endereço formatado (uma linha)
  get fullAddress() {
    const a = this.address;
    return `${a.street}, ${a.number}, ${a.complement} - ${a.building}, ${a.neighborhood}, ${a.city}/${a.state} - CEP ${a.cep}`;
  },

  // Endereço curto (para Footer)
  get shortAddress() {
    const a = this.address;
    return `${a.street}, ${a.number} - ${a.complement}`;
  },

  // ─── CEP de Origem (para cálculo de frete) ──────────────────
  originCep: '22790-702',
  originState: 'RJ',
  originRegion: 'sudeste',

  // ─── Contato ─────────────────────────────────────────────────
  phone: '(21) 96435-8058',
  phoneRaw: '5521964358058', // Para links WhatsApp/tel
  phoneInternational: '+55 21 96435-8058',

  email: 'atendimento@elitesurfing.com.br',
  emailAdmin: 'pedrazzoliorlando@gmail.com',

  whatsapp: {
    number: '5521964358058',
    defaultMessage:
      'Olá! Vim pelo site da Elite Surfing e gostaria de mais informações.',
    get link() {
      return `https://wa.me/${this.number}?text=${encodeURIComponent(this.defaultMessage)}`;
    },
    get linkClean() {
      return `https://wa.me/${this.number}`;
    },
  },

  // ─── Redes Sociais ───────────────────────────────────────────
  social: {
    instagram: 'https://www.instagram.com/elitesurfing',
    facebook: 'https://www.facebook.com/elitesurfing.com.br',
    // tiktok: '',
    // youtube: '',
  },

  // ─── Website ─────────────────────────────────────────────────
  url: 'https://www.elitesurfing.com.br',
  domain: 'elitesurfing.com.br',

  // ─── Horário de Atendimento ──────────────────────────────────
  businessHours: {
    weekdays: 'Seg-Sex 9h-18h',
    saturday: '',
    sunday: '',
    get formatted() {
      return this.weekdays;
    },
  },

  // ─── Pagamentos ──────────────────────────────────────────────
  payments: {
    pixDiscount: 0.05, // 5% desconto PIX
    boletoDiscount: 0.05, // 5% desconto Boleto
    maxInstallments: 12, // Até 12x sem juros
    minInstallment: 10, // Parcela mínima R$10
    freeShippingMin: 299, // Frete grátis acima de R$299
  },

  // ─── Políticas ───────────────────────────────────────────────
  policies: {
    returnDays: 7, // 7 dias para devolução (CDC)
    shippingDaysMin: 3, // Prazo mínimo de entrega
    shippingDaysMax: 15, // Prazo máximo de entrega
    boletoDueDays: 3, // Vencimento do boleto
  },

  // ─── Desenvolvedor ───────────────────────────────────────────
  developer: {
    url: 'https://pedrazzolidigital.com', // era orlandopedrazzoli.com
  },
};

export default COMPANY;

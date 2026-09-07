// server/models/Cliente.js
import mongoose from 'mongoose';

const enderecoSchema = new mongoose.Schema(
  {
    rua: { type: String, default: '' },
    numero: { type: String, default: '' },
    complemento: { type: String, default: '' },
    bairro: { type: String, default: '' },
    cidade: { type: String, default: '' },
    estado: { type: String, default: '' },
    cep: { type: String, default: '' },
    pais: { type: String, default: 'Brasil' },
  },
  { _id: false },
);

const clienteSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['PJ', 'PF'],
      required: true,
    },

    // ── Pessoa Jurídica ──
    razaoSocial: { type: String, default: null },
    nomeFantasia: { type: String, default: null },
    // 🔧 FIX: removido `sparse: true` inline — no Mongoose, sparse no
    // campo já cria um índice, duplicando o schema.index() lá embaixo
    // (warning "Duplicate schema index"). O índice fica SÓ no schema.index.
    cnpj: { type: String, default: null },
    ie: { type: String, default: null }, // Inscrição Estadual

    // ── Pessoa Física ──
    nome: { type: String, default: null },
    // 🔧 FIX: mesmo caso do cnpj acima — índice fica só no schema.index
    cpf: { type: String, default: null },
    rg: { type: String, default: null },

    // ── Contato (ambos) ──
    telefone: { type: String, default: '' },
    email: { type: String, default: '' },
    responsavel: { type: String, default: '' }, // Contato responsável (PJ)

    // ── Endereço Principal (cobrança) ──
    endereco: { type: enderecoSchema, default: () => ({}) },

    // ── Endereço de Entrega (opcional, diferente do principal) ──
    enderecoEntrega: { type: enderecoSchema, default: null },
    enderecoEntregaDiferente: { type: Boolean, default: false },

    // ── Comercial ──
    limiteCredito: { type: Number, default: 0 },
    condicaoPagamentoPadrao: { type: String, default: '' },
    observacoes: { type: String, default: '' },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Índices
clienteSchema.index({ tipo: 1 });
clienteSchema.index({ cnpj: 1 }, { sparse: true });
clienteSchema.index({ cpf: 1 }, { sparse: true });
clienteSchema.index({
  razaoSocial: 'text',
  nomeFantasia: 'text',
  nome: 'text',
});

const Cliente = mongoose.model('Cliente', clienteSchema);
export default Cliente;

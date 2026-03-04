import mongoose from 'mongoose';

const itemRomaneioSchema = new mongoose.Schema(
  {
    produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, default: '' },
    nome: { type: String, required: true },
    unidade: { type: String, default: 'UN' },
    quantidade: { type: Number, required: true, min: 1 },
    precoLista: { type: Number, required: true },
    desconto: { type: Number, default: 0 }, // percentual %
    precoUnitario: { type: Number, required: true },
    precoTotal: { type: Number, required: true },
  },
  { _id: false },
);

const parcelaSchema = new mongoose.Schema(
  {
    dias: { type: Number, required: true },
    data: { type: Date, required: true },
    valor: { type: Number, required: true },
    forma: {
      type: String,
      enum: [
        'Dinheiro',
        'PIX',
        'Boleto',
        'Cheque',
        'Cartão de Crédito',
        'Cartão de Débito',
        'Depósito',
        'Transferência',
      ],
      default: 'PIX',
    },
    observacao: { type: String, default: '' },
  },
  { _id: false },
);

const enderecoEntregaSchema = new mongoose.Schema(
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

const romaneioSchema = new mongoose.Schema(
  {
    numero: { type: Number, unique: true }, // auto-incrementado

    // ── Cliente ──
    // Pode ser Cliente (direto) ou User (ecommerce)
    clienteRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'clienteModel',
      default: null,
    },
    clienteModel: {
      type: String,
      enum: ['Cliente', 'User'],
      default: 'Cliente',
    },
    clienteNome: { type: String, required: true },
    clienteTipo: {
      type: String,
      enum: ['PJ', 'PF', 'Ecommerce'],
      required: true,
    },
    clienteCpfCnpj: { type: String, default: '' },
    clienteEmail: { type: String, default: '' },
    clienteTelefone: { type: String, default: '' },

    // ── Itens ──
    itens: { type: [itemRomaneioSchema], required: true },

    // ── Totais ──
    totalItens: { type: Number, required: true },
    descontoTotal: { type: Number, default: 0 },
    outrasDespesas: { type: Number, default: 0 },
    frete: { type: Number, default: 0 },
    totalVenda: { type: Number, required: true },

    // ── Datas ──
    dataVenda: { type: Date, default: Date.now },
    dataSaida: { type: Date, default: null },
    dataPrevista: { type: Date, default: null },

    // ── Pagamento ──
    condicaoPagamento: { type: String, default: 'À Vista' },
    parcelas: { type: [parcelaSchema], default: [] },

    // ── Transporte ──
    transportador: { type: String, default: '' },
    fretePorConta: {
      type: String,
      enum: ['CIF', 'FOB'],
      default: 'CIF',
    },
    quantidadeVolumes: { type: Number, default: 0 },
    pesoBruto: { type: Number, default: 0 },
    enderecoEntregaDiferente: { type: Boolean, default: false },
    enderecoEntrega: { type: enderecoEntregaSchema, default: null },

    // ── Status ──
    status: {
      type: String,
      enum: ['Rascunho', 'Confirmado', 'Faturado', 'Cancelado'],
      default: 'Rascunho',
    },

    // ── Estoque ──
    estoqueDecrementado: { type: Boolean, default: false },

    // ── Observações ──
    observacoes: { type: String, default: '' },
    observacoesInternas: { type: String, default: '' },
  },
  { timestamps: true },
);

// Auto-incremento do número do pedido
romaneioSchema.pre('save', async function (next) {
  if (this.isNew) {
    const last = await this.constructor.findOne(
      {},
      {},
      { sort: { numero: -1 } },
    );
    this.numero = last ? last.numero + 1 : 1000;
  }
  next();
});

romaneioSchema.index({ numero: -1 });
romaneioSchema.index({ status: 1 });
romaneioSchema.index({ clienteRef: 1 });
romaneioSchema.index({ createdAt: -1 });

const Romaneio = mongoose.model('Romaneio', romaneioSchema);
export default Romaneio;

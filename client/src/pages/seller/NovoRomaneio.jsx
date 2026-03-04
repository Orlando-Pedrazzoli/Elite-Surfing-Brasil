import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  X,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  Check,
  Building2,
  User,
  Package,
  DollarSign,
  Truck,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formasPagamento = [
  'Dinheiro',
  'PIX',
  'Boleto',
  'Cheque',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Depósito',
  'Transferência',
];

const NovoRomaneio = ({ isOpen, onClose, onSaved, romaneioEditando }) => {
  const { axios } = useAppContext();

  // ─── STEP ───
  const [step, setStep] = useState(1); // 1=tipo, 2=cliente, 3=itens/pagamento

  // ─── CLIENTE ───
  const [tipoCliente, setTipoCliente] = useState(null); // 'PJ' | 'PF'
  const [buscaCliente, setBuscaCliente] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const buscaTimeout = useRef(null);

  // ─── ITENS ───
  const [itens, setItens] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosResultado, setProdutosResultado] = useState([]);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const produtoTimeout = useRef(null);

  // ─── PAGAMENTO ───
  const [condicaoPagamento, setCondicaoPagamento] = useState('À Vista');
  const [parcelas, setParcelas] = useState([
    { dias: 0, data: '', valor: '', forma: 'PIX', observacao: '' },
  ]);

  // ─── TRANSPORTE ───
  const [transportador, setTransportador] = useState('');
  const [fretePorConta, setFretePorConta] = useState('CIF');
  const [frete, setFrete] = useState(0);
  const [pesoBruto, setPesoBruto] = useState(0);
  const [quantidadeVolumes, setQuantidadeVolumes] = useState(0);
  const [endEntregaDiferente, setEndEntregaDiferente] = useState(false);
  const [endEntrega, setEndEntrega] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    pais: 'Brasil',
  });

  // ─── OUTROS ───
  const [observacoes, setObservacoes] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [dataSaida, setDataSaida] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Preencher se edição ───
  useEffect(() => {
    if (romaneioEditando) {
      setTipoCliente(
        romaneioEditando.clienteTipo === 'Ecommerce'
          ? 'PF'
          : romaneioEditando.clienteTipo,
      );
      setClienteSelecionado({
        nome: romaneioEditando.clienteNome,
        cpfCnpj: romaneioEditando.clienteCpfCnpj,
        email: romaneioEditando.clienteEmail,
        telefone: romaneioEditando.clienteTelefone,
        _id: romaneioEditando.clienteRef,
        origem: romaneioEditando.clienteModel,
        tipo: romaneioEditando.clienteTipo,
      });
      setItens(
        romaneioEditando.itens.map(i => ({
          produto: i.produto?._id || i.produto,
          nome: i.nome,
          sku: i.sku,
          unidade: i.unidade,
          quantidade: i.quantidade,
          precoLista: i.precoLista,
          desconto: i.desconto,
          precoUnitario: i.precoUnitario,
          precoTotal: i.precoTotal,
          stockDisponivel: 999,
          imagem: i.produto?.image?.[0] || null,
        })),
      );
      setCondicaoPagamento(romaneioEditando.condicaoPagamento || 'À Vista');
      setParcelas(
        romaneioEditando.parcelas?.length
          ? romaneioEditando.parcelas
          : [{ dias: 0, data: '', valor: '', forma: 'PIX', observacao: '' }],
      );
      setTransportador(romaneioEditando.transportador || '');
      setFretePorConta(romaneioEditando.fretePorConta || 'CIF');
      setFrete(romaneioEditando.frete || 0);
      setPesoBruto(romaneioEditando.pesoBruto || 0);
      setQuantidadeVolumes(romaneioEditando.quantidadeVolumes || 0);
      setObservacoes(romaneioEditando.observacoes || '');
      setObservacoesInternas(romaneioEditando.observacoesInternas || '');
      setDataVenda(
        romaneioEditando.dataVenda
          ? romaneioEditando.dataVenda.split('T')[0]
          : new Date().toISOString().split('T')[0],
      );
      setStep(2);
    }
  }, [romaneioEditando]);

  // ─── BUSCA DE CLIENTES ───
  useEffect(() => {
    if (!buscaCliente.trim() || buscaCliente.length < 2) {
      setResultadosBusca([]);
      return;
    }
    clearTimeout(buscaTimeout.current);
    buscaTimeout.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const params = new URLSearchParams({ q: buscaCliente });
        if (tipoCliente) params.append('tipo', tipoCliente);
        const { data } = await axios.get(`/api/clientes/busca?${params}`);
        if (data.success) setResultadosBusca(data.resultado);
      } catch {
      } finally {
        setBuscando(false);
      }
    }, 350);
  }, [buscaCliente, tipoCliente]);

  // ─── BUSCA DE PRODUTOS ───
  useEffect(() => {
    if (!buscaProduto.trim() || buscaProduto.length < 2) {
      setProdutosResultado([]);
      return;
    }
    clearTimeout(produtoTimeout.current);
    produtoTimeout.current = setTimeout(async () => {
      setBuscandoProduto(true);
      try {
        const { data } = await axios.get(`/api/product/list?all=true`);
        if (data.success) {
          const q = buscaProduto.toLowerCase();
          const filtrado = data.products
            .filter(
              p =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)),
            )
            .slice(0, 10);
          setProdutosResultado(filtrado);
        }
      } catch {
      } finally {
        setBuscandoProduto(false);
      }
    }, 350);
  }, [buscaProduto]);

  // ─── CALCULOS ───
  const calcTotais = () => {
    const totalItens = itens.reduce((s, i) => s + i.precoTotal, 0);
    const totalVenda = totalItens + Number(frete || 0);
    return { totalItens, totalVenda };
  };

  const addItem = produto => {
    const jaExiste = itens.find(i => i.produto === produto._id);
    if (jaExiste) {
      setItens(prev =>
        prev.map(i =>
          i.produto === produto._id
            ? {
                ...i,
                quantidade: i.quantidade + 1,
                precoTotal: (i.quantidade + 1) * i.precoUnitario,
              }
            : i,
        ),
      );
      toast.success(`+1 ${produto.name}`);
    } else {
      const precoLista = produto.price || produto.offerPrice;
      const precoUnitario = produto.offerPrice || produto.price;
      setItens(prev => [
        ...prev,
        {
          produto: produto._id,
          nome: produto.name,
          sku: produto.sku || '',
          unidade: 'UN',
          quantidade: 1,
          precoLista,
          desconto:
            precoLista > precoUnitario
              ? Math.round(((precoLista - precoUnitario) / precoLista) * 100)
              : 0,
          precoUnitario,
          precoTotal: precoUnitario,
          stockDisponivel: produto.stock,
          imagem: produto.image?.[0] || null,
        },
      ]);
    }
    setBuscaProduto('');
    setProdutosResultado([]);
  };

  const updateItem = (idx, field, val) => {
    setItens(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        if (
          field === 'quantidade' ||
          field === 'desconto' ||
          field === 'precoLista'
        ) {
          const desc = field === 'desconto' ? Number(val) : updated.desconto;
          const lista =
            field === 'precoLista' ? Number(val) : updated.precoLista;
          const qty = field === 'quantidade' ? Number(val) : updated.quantidade;
          updated.precoUnitario = lista * (1 - desc / 100);
          updated.precoTotal = updated.precoUnitario * qty;
        }
        if (field === 'precoUnitario') {
          updated.precoTotal = Number(val) * updated.quantidade;
          updated.desconto =
            updated.precoLista > 0
              ? Math.round(
                  ((updated.precoLista - Number(val)) / updated.precoLista) *
                    100,
                )
              : 0;
        }
        return updated;
      }),
    );
  };

  const removeItem = idx => setItens(prev => prev.filter((_, i) => i !== idx));

  // ─── PARCELAS AUTO ───
  const gerarParcelas = () => {
    const { totalVenda } = calcTotais();
    const match = condicaoPagamento.match(/\d+/g);
    if (!match) {
      setParcelas([
        {
          dias: 0,
          data: new Date().toISOString().split('T')[0],
          valor: totalVenda.toFixed(2),
          forma: 'PIX',
          observacao: '',
        },
      ]);
      return;
    }
    const diasArr = match.map(Number);
    const valorParcela = totalVenda / diasArr.length;
    const base = new Date(dataVenda);
    setParcelas(
      diasArr.map((d, idx) => {
        const dt = new Date(base);
        dt.setDate(dt.getDate() + d);
        return {
          dias: d,
          data: dt.toISOString().split('T')[0],
          valor:
            idx === diasArr.length - 1
              ? (totalVenda - valorParcela * (diasArr.length - 1)).toFixed(2)
              : valorParcela.toFixed(2),
          forma: 'PIX',
          observacao: 'Depósito em conta',
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!clienteSelecionado) return toast.error('Selecione um cliente');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');

    const { totalItens, totalVenda } = calcTotais();
    setSaving(true);
    try {
      const payload = {
        clienteRef: clienteSelecionado._id || null,
        clienteModel: clienteSelecionado.origem === 'User' ? 'User' : 'Cliente',
        clienteNome: clienteSelecionado.nome,
        clienteTipo: clienteSelecionado.tipo || tipoCliente,
        clienteCpfCnpj: clienteSelecionado.cpfCnpj || '',
        clienteEmail: clienteSelecionado.email || '',
        clienteTelefone: clienteSelecionado.telefone || '',
        itens: itens.map(i => ({
          produto: i.produto,
          sku: i.sku,
          nome: i.nome,
          unidade: i.unidade,
          quantidade: Number(i.quantidade),
          precoLista: Number(i.precoLista),
          desconto: Number(i.desconto),
          precoUnitario: Number(i.precoUnitario),
          precoTotal: Number(i.precoTotal),
        })),
        totalItens,
        frete: Number(frete),
        totalVenda,
        condicaoPagamento,
        parcelas,
        transportador,
        fretePorConta,
        quantidadeVolumes: Number(quantidadeVolumes),
        pesoBruto: Number(pesoBruto),
        enderecoEntregaDiferente: endEntregaDiferente,
        enderecoEntrega: endEntregaDiferente ? endEntrega : null,
        observacoes,
        observacoesInternas,
        dataVenda,
        dataSaida: dataSaida || null,
        dataPrevista: dataPrevista || null,
      };

      let res;
      if (romaneioEditando?._id) {
        res = await axios.put(
          `/api/romaneios/${romaneioEditando._id}`,
          payload,
        );
      } else {
        res = await axios.post('/api/romaneios', payload);
      }

      if (res.data.success) {
        toast.success(res.data.message);
        onSaved();
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      toast.error('Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const { totalItens, totalVenda } = calcTotais();
  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[97vh] flex flex-col'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>
              {romaneioEditando
                ? `Editar Pedido #${romaneioEditando.numero}`
                : 'Novo Pedido — Venda Direta'}
            </h2>
            <p className='text-sm text-gray-500'>
              {step === 1 && 'Selecione o tipo de cliente'}
              {step === 2 && 'Selecione o cliente'}
              {step === 3 && `Cliente: ${clienteSelecionado?.nome}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Steps indicator */}
        <div className='flex px-5 py-3 gap-2 border-b border-gray-100 flex-shrink-0'>
          {[
            { n: 1, label: 'Tipo' },
            { n: 2, label: 'Cliente' },
            { n: 3, label: 'Pedido' },
          ].map(s => (
            <div key={s.n} className='flex items-center gap-2'>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s.n
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s.n}
              </div>
              <span
                className={`text-xs font-medium hidden md:block ${step >= s.n ? 'text-primary' : 'text-gray-400'}`}
              >
                {s.label}
              </span>
              {s.n < 3 && (
                <div
                  className={`w-8 h-px mx-1 ${step > s.n ? 'bg-primary' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Conteúdo scrollável */}
        <div className='flex-1 overflow-y-auto p-5'>
          {/* ══ STEP 1: Tipo ══ */}
          {step === 1 && (
            <div className='max-w-lg mx-auto py-8'>
              <p className='text-center text-gray-600 mb-6'>
                Qual é o tipo de cliente para este pedido?
              </p>
              <div className='grid grid-cols-2 gap-4'>
                {[
                  {
                    value: 'PJ',
                    label: 'Pessoa Jurídica',
                    icon: Building2,
                    desc: 'Loja, empresa, distribuidor',
                  },
                  {
                    value: 'PF',
                    label: 'Pessoa Física',
                    icon: User,
                    desc: 'Cliente individual, presencial',
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTipoCliente(opt.value);
                      setStep(2);
                    }}
                    className='flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-center'
                  >
                    <div className='w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center'>
                      <opt.icon className='w-7 h-7 text-gray-600' />
                    </div>
                    <div>
                      <p className='font-semibold text-gray-900'>{opt.label}</p>
                      <p className='text-xs text-gray-500 mt-0.5'>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ STEP 2: Cliente ══ */}
          {step === 2 && (
            <div className='max-w-2xl mx-auto'>
              <div className='flex items-center gap-3 mb-4'>
                <button
                  onClick={() => setStep(1)}
                  className='text-xs text-gray-400 hover:text-gray-600'
                >
                  ← Voltar
                </button>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipoCliente === 'PJ' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}
                >
                  {tipoCliente === 'PJ'
                    ? '🏢 Pessoa Jurídica'
                    : '👤 Pessoa Física'}
                </span>
              </div>

              {/* Busca */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  autoFocus
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  placeholder={
                    tipoCliente === 'PJ'
                      ? 'Buscar por razão social, nome fantasia ou CNPJ...'
                      : 'Buscar por nome, CPF ou email...'
                  }
                  className='w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary outline-none'
                />
                {buscando && (
                  <Loader2 className='absolute right-3 top-3.5 w-4 h-4 animate-spin text-primary' />
                )}
              </div>

              {/* Resultados */}
              {resultadosBusca.length > 0 && (
                <div className='mt-2 border border-gray-200 rounded-xl overflow-hidden'>
                  {resultadosBusca.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setClienteSelecionado(c);
                        setStep(3);
                        setBuscaCliente('');
                        setResultadosBusca([]);
                      }}
                      className='w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left'
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.tipo === 'PJ' ? 'bg-blue-50' : 'bg-green-50'}`}
                      >
                        {c.tipo === 'PJ' ? (
                          <Building2 className='w-4 h-4 text-blue-600' />
                        ) : (
                          <User className='w-4 h-4 text-green-600' />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {c.nome}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {c.cpfCnpj || c.email || ''}
                        </p>
                      </div>
                      <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0'>
                        {c.origem === 'User' ? 'Ecommerce' : c.tipo}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {buscaCliente.length > 1 &&
                !buscando &&
                resultadosBusca.length === 0 && (
                  <p className='text-sm text-gray-500 mt-3 text-center'>
                    Nenhum cliente encontrado.{' '}
                    <a
                      href='/seller/clientes'
                      target='_blank'
                      className='text-primary underline'
                    >
                      Cadastrar novo cliente
                    </a>
                  </p>
                )}

              {/* Cliente selecionado (edição) */}
              {clienteSelecionado && (
                <div className='mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between'>
                  <div>
                    <p className='font-semibold text-gray-900'>
                      {clienteSelecionado.nome}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {clienteSelecionado.cpfCnpj || clienteSelecionado.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className='px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold'
                  >
                    Continuar →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 3: Pedido ══ */}
          {step === 3 && (
            <div className='space-y-6'>
              {/* Datas */}
              <div>
                <p className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-primary' /> Datas
                </p>
                <div className='grid grid-cols-3 gap-3'>
                  {[
                    {
                      label: 'Data da Venda *',
                      key: 'dataVenda',
                      val: dataVenda,
                      set: setDataVenda,
                    },
                    {
                      label: 'Data de Saída',
                      key: 'dataSaida',
                      val: dataSaida,
                      set: setDataSaida,
                    },
                    {
                      label: 'Data Prevista',
                      key: 'dataPrevista',
                      val: dataPrevista,
                      set: setDataPrevista,
                    },
                  ].map(d => (
                    <div key={d.key}>
                      <label className={labelCls}>{d.label}</label>
                      <input
                        type='date'
                        className={inputCls}
                        value={d.val}
                        onChange={e => d.set(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Busca de produtos */}
              <div>
                <p className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                  <Package className='w-4 h-4 text-primary' /> Itens do Pedido
                </p>
                <div className='relative mb-3'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    value={buscaProduto}
                    onChange={e => setBuscaProduto(e.target.value)}
                    placeholder='Buscar produto por nome ou SKU...'
                    className='w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary outline-none'
                  />
                  {buscandoProduto && (
                    <Loader2 className='absolute right-3 top-3 w-4 h-4 animate-spin text-primary' />
                  )}
                </div>

                {/* Dropdown produtos */}
                {produtosResultado.length > 0 && (
                  <div className='border border-gray-200 rounded-xl overflow-hidden mb-3'>
                    {produtosResultado.map(p => (
                      <button
                        key={p._id}
                        onClick={() => addItem(p)}
                        className='w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left'
                      >
                        {p.image?.[0] && (
                          <img
                            src={p.image[0]}
                            className='w-10 h-10 rounded-lg object-cover border border-gray-100'
                            alt={p.name}
                          />
                        )}
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {p.name}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {p.sku && `SKU: ${p.sku} · `}Estoque: {p.stock}
                          </p>
                        </div>
                        <div className='text-right flex-shrink-0'>
                          <p className='text-sm font-bold text-primary'>
                            R$ {p.offerPrice?.toFixed(2)}
                          </p>
                          {p.stock <= 0 && (
                            <p className='text-xs text-red-500'>Esgotado</p>
                          )}
                          {p.stock > 0 && p.stock <= 5 && (
                            <p className='text-xs text-amber-600'>
                              Baixo estoque
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tabela de itens */}
                {itens.length > 0 ? (
                  <div className='border border-gray-200 rounded-xl overflow-hidden'>
                    <table className='w-full text-sm'>
                      <thead className='bg-gray-50 border-b border-gray-200'>
                        <tr>
                          <th className='text-left text-xs font-semibold text-gray-500 px-3 py-2'>
                            Produto
                          </th>
                          <th className='text-center text-xs font-semibold text-gray-500 px-2 py-2 w-20'>
                            Qtd
                          </th>
                          <th className='text-right text-xs font-semibold text-gray-500 px-2 py-2 w-24 hidden md:table-cell'>
                            Preço Lista
                          </th>
                          <th className='text-center text-xs font-semibold text-gray-500 px-2 py-2 w-16 hidden md:table-cell'>
                            Desc%
                          </th>
                          <th className='text-right text-xs font-semibold text-gray-500 px-2 py-2 w-24'>
                            Preço Un.
                          </th>
                          <th className='text-right text-xs font-semibold text-gray-500 px-2 py-2 w-24'>
                            Total
                          </th>
                          <th className='w-8'></th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100'>
                        {itens.map((item, idx) => (
                          <tr
                            key={idx}
                            className={
                              item.stockDisponivel <= 0 ? 'bg-red-50' : ''
                            }
                          >
                            <td className='px-3 py-2'>
                              <div className='flex items-center gap-2'>
                                {item.imagem && (
                                  <img
                                    src={item.imagem}
                                    className='w-8 h-8 rounded object-cover hidden md:block'
                                    alt=''
                                  />
                                )}
                                <div className='min-w-0'>
                                  <p className='font-medium text-gray-900 truncate text-xs'>
                                    {item.nome}
                                  </p>
                                  {item.sku && (
                                    <p className='text-xs text-gray-400'>
                                      {item.sku}
                                    </p>
                                  )}
                                  {item.stockDisponivel !== undefined &&
                                    item.stockDisponivel <= 5 && (
                                      <p
                                        className={`text-xs font-medium ${item.stockDisponivel <= 0 ? 'text-red-500' : 'text-amber-500'}`}
                                      >
                                        <AlertTriangle className='w-3 h-3 inline mr-0.5' />
                                        {item.stockDisponivel <= 0
                                          ? 'Esgotado!'
                                          : `${item.stockDisponivel} em stock`}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </td>
                            <td className='px-2 py-2'>
                              <input
                                type='number'
                                min='1'
                                value={item.quantidade}
                                onChange={e =>
                                  updateItem(idx, 'quantidade', e.target.value)
                                }
                                className='w-full text-center px-2 py-1 border border-gray-200 rounded text-xs focus:border-primary outline-none'
                              />
                            </td>
                            <td className='px-2 py-2 hidden md:table-cell'>
                              <input
                                type='number'
                                min='0'
                                step='0.01'
                                value={item.precoLista}
                                onChange={e =>
                                  updateItem(idx, 'precoLista', e.target.value)
                                }
                                className='w-full text-right px-2 py-1 border border-gray-200 rounded text-xs focus:border-primary outline-none'
                              />
                            </td>
                            <td className='px-2 py-2 hidden md:table-cell'>
                              <input
                                type='number'
                                min='0'
                                max='100'
                                value={item.desconto}
                                onChange={e =>
                                  updateItem(idx, 'desconto', e.target.value)
                                }
                                className='w-full text-center px-2 py-1 border border-gray-200 rounded text-xs focus:border-primary outline-none'
                              />
                            </td>
                            <td className='px-2 py-2 text-right text-xs font-medium text-gray-900'>
                              R$ {Number(item.precoUnitario).toFixed(2)}
                            </td>
                            <td className='px-2 py-2 text-right text-xs font-bold text-gray-900'>
                              R$ {Number(item.precoTotal).toFixed(2)}
                            </td>
                            <td className='px-2 py-2'>
                              <button
                                onClick={() => removeItem(idx)}
                                className='p-1 text-gray-300 hover:text-red-500 transition-colors'
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400'>
                    <Package className='w-8 h-8 mx-auto mb-2 opacity-40' />
                    <p className='text-sm'>
                      Pesquise e adicione produtos acima
                    </p>
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div>
                <p className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                  <DollarSign className='w-4 h-4 text-primary' /> Pagamento
                </p>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mb-3'>
                  <div>
                    <label className={labelCls}>Condição de Pagamento</label>
                    <input
                      className={inputCls}
                      value={condicaoPagamento}
                      onChange={e => setCondicaoPagamento(e.target.value)}
                      placeholder='Ex: À Vista, 30/60/90'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Frete (R$)</label>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      className={inputCls}
                      value={frete}
                      onChange={e => setFrete(e.target.value)}
                    />
                  </div>
                  <div className='flex items-end'>
                    <button
                      onClick={gerarParcelas}
                      className='w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors'
                    >
                      Gerar Parcelas
                    </button>
                  </div>
                </div>

                {/* Parcelas */}
                <div className='space-y-2'>
                  {parcelas.map((p, idx) => (
                    <div
                      key={idx}
                      className='grid grid-cols-5 gap-2 items-center p-2 bg-gray-50 rounded-lg'
                    >
                      <div>
                        <label className={labelCls}>Dias</label>
                        <input
                          type='number'
                          className={inputCls}
                          value={p.dias}
                          onChange={e =>
                            setParcelas(prev =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, dias: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Data</label>
                        <input
                          type='date'
                          className={inputCls}
                          value={p.data}
                          onChange={e =>
                            setParcelas(prev =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, data: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Valor (R$)</label>
                        <input
                          type='number'
                          step='0.01'
                          className={inputCls}
                          value={p.valor}
                          onChange={e =>
                            setParcelas(prev =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, valor: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Forma</label>
                        <select
                          className={inputCls}
                          value={p.forma}
                          onChange={e =>
                            setParcelas(prev =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, forma: e.target.value } : x,
                              ),
                            )
                          }
                        >
                          {formasPagamento.map(f => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='flex items-end gap-1'>
                        <div className='flex-1'>
                          <label className={labelCls}>Obs.</label>
                          <input
                            className={inputCls}
                            value={p.observacao}
                            onChange={e =>
                              setParcelas(prev =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? { ...x, observacao: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                        {parcelas.length > 1 && (
                          <button
                            onClick={() =>
                              setParcelas(prev =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className='p-2 text-gray-300 hover:text-red-500 mb-0.5'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setParcelas(prev => [
                        ...prev,
                        {
                          dias: 0,
                          data: '',
                          valor: '',
                          forma: 'PIX',
                          observacao: '',
                        },
                      ])
                    }
                    className='text-xs text-primary hover:underline flex items-center gap-1'
                  >
                    <Plus className='w-3.5 h-3.5' /> Adicionar parcela
                  </button>
                </div>
              </div>

              {/* Transporte */}
              <div>
                <p className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                  <Truck className='w-4 h-4 text-primary' /> Transporte
                </p>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  <div className='col-span-2'>
                    <label className={labelCls}>Transportador</label>
                    <input
                      className={inputCls}
                      value={transportador}
                      onChange={e => setTransportador(e.target.value)}
                      placeholder='Nome da transportadora'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Frete por conta</label>
                    <select
                      className={inputCls}
                      value={fretePorConta}
                      onChange={e => setFretePorConta(e.target.value)}
                    >
                      <option value='CIF'>CIF (Remetente)</option>
                      <option value='FOB'>FOB (Destinatário)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Nº Volumes</label>
                    <input
                      type='number'
                      min='0'
                      className={inputCls}
                      value={quantidadeVolumes}
                      onChange={e => setQuantidadeVolumes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Peso Bruto (kg)</label>
                    <input
                      type='number'
                      min='0'
                      step='0.001'
                      className={inputCls}
                      value={pesoBruto}
                      onChange={e => setPesoBruto(e.target.value)}
                    />
                  </div>
                </div>

                <label className='flex items-center gap-2 cursor-pointer mt-3'>
                  <input
                    type='checkbox'
                    checked={endEntregaDiferente}
                    onChange={e => setEndEntregaDiferente(e.target.checked)}
                    className='w-4 h-4 accent-primary'
                  />
                  <span className='text-sm text-gray-700'>
                    Endereço de entrega diferente do cliente
                  </span>
                </label>

                {endEntregaDiferente && (
                  <div className='mt-3 grid grid-cols-3 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200'>
                    {[
                      { label: 'CEP', key: 'cep', col: 1 },
                      { label: 'Rua', key: 'rua', col: 2 },
                      { label: 'Número', key: 'numero', col: 1 },
                      { label: 'Complemento', key: 'complemento', col: 1 },
                      { label: 'Bairro', key: 'bairro', col: 1 },
                      { label: 'Cidade', key: 'cidade', col: 1 },
                      { label: 'Estado', key: 'estado', col: 1 },
                    ].map(f => (
                      <div key={f.key} className={`col-span-${f.col}`}>
                        <label className={labelCls}>{f.label}</label>
                        <input
                          className={inputCls}
                          value={endEntrega[f.key] || ''}
                          onChange={e =>
                            setEndEntrega(p => ({
                              ...p,
                              [f.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className={labelCls}>
                    Observações (visível ao cliente)
                  </label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={2}
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Observações Internas</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={2}
                    value={observacoesInternas}
                    onChange={e => setObservacoesInternas(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo com totais + botões */}
        {step === 3 && (
          <div className='border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
              {/* Totais */}
              <div className='flex gap-6 text-sm'>
                <div>
                  <span className='text-gray-500'>Itens:</span>{' '}
                  <span className='font-semibold'>
                    R$ {totalItens.toFixed(2)}
                  </span>
                </div>
                {Number(frete) > 0 && (
                  <div>
                    <span className='text-gray-500'>Frete:</span>{' '}
                    <span className='font-semibold'>
                      R$ {Number(frete).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className='text-base'>
                  <span className='text-gray-700 font-medium'>Total:</span>{' '}
                  <span className='font-bold text-primary text-lg'>
                    R$ {totalVenda.toFixed(2)}
                  </span>
                </div>
                <div className='text-xs text-gray-400'>
                  {itens.length} produto(s) ·{' '}
                  {itens.reduce((s, i) => s + Number(i.quantidade), 0)} unid.
                </div>
              </div>

              {/* Botões */}
              <div className='flex gap-3'>
                <button
                  onClick={() => setStep(2)}
                  className='px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-white transition-colors text-sm'
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || itens.length === 0}
                  className='px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm'
                >
                  {saving ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className='w-4 h-4' /> Salvar Rascunho
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovoRomaneio;

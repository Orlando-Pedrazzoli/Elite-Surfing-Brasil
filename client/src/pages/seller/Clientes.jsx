import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const estadosBR = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const camposVazios = tipo => ({
  tipo,
  // PJ
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  ie: '',
  responsavel: '',
  // PF
  nome: '',
  cpf: '',
  rg: '',
  // Comum
  telefone: '',
  email: '',
  endereco: {
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    pais: 'Brasil',
  },
  enderecoEntregaDiferente: false,
  enderecoEntrega: {
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    pais: 'Brasil',
  },
  limiteCredito: '',
  condicaoPagamentoPadrao: '',
  observacoes: '',
});

const formatCnpj = v => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length > 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
};

const formatCpf = v => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
};

const formatPhone = v => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
};

const fetchCep = async (cep, callback) => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (!data.erro) callback(data);
  } catch {}
};

// ══════════════════════════════════════════════
// MODAL FORMULÁRIO
// ══════════════════════════════════════════════
const ClienteModal = ({ isOpen, onClose, onSaved, editando }) => {
  const { axios } = useAppContext();
  const [tipoSelecionado, setTipoSelecionado] = useState(
    editando?.tipo || null,
  );
  const [form, setForm] = useState(camposVazios(editando?.tipo || 'PF'));
  const [saving, setSaving] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  useEffect(() => {
    if (editando) {
      setTipoSelecionado(editando.tipo);
      setForm({ ...camposVazios(editando.tipo), ...editando });
    } else {
      setTipoSelecionado(null);
      setForm(camposVazios('PF'));
    }
  }, [editando, isOpen]);

  if (!isOpen) return null;

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setEnd = (field, val) =>
    setForm(p => ({ ...p, endereco: { ...p.endereco, [field]: val } }));
  const setEndEnt = (field, val) =>
    setForm(p => ({
      ...p,
      enderecoEntrega: { ...p.enderecoEntrega, [field]: val },
    }));

  const handleCepChange = async (val, tipo) => {
    const fmt = val.replace(/\D/g, '').slice(0, 8);
    const cepFmt = fmt.length > 5 ? `${fmt.slice(0, 5)}-${fmt.slice(5)}` : fmt;
    if (tipo === 'principal') {
      setEnd('cep', cepFmt);
      if (fmt.length === 8) {
        setFetchingCep(true);
        await fetchCep(fmt, d => {
          setForm(p => ({
            ...p,
            endereco: {
              ...p.endereco,
              rua: d.logradouro || '',
              bairro: d.bairro || '',
              cidade: d.localidade || '',
              estado: d.uf || '',
            },
          }));
        });
        setFetchingCep(false);
      }
    } else {
      setEndEnt('cep', cepFmt);
      if (fmt.length === 8) {
        await fetchCep(fmt, d => {
          setForm(p => ({
            ...p,
            enderecoEntrega: {
              ...p.enderecoEntrega,
              rua: d.logradouro || '',
              bairro: d.bairro || '',
              cidade: d.localidade || '',
              estado: d.uf || '',
            },
          }));
        });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tipo: tipoSelecionado };
      let res;
      if (editando?._id) {
        res = await axios.put(`/api/clientes/${editando._id}`, payload);
      } else {
        res = await axios.post('/api/clientes', payload);
      }
      if (res.data.success) {
        toast.success(res.data.message);
        onSaved();
        onClose();
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      toast.error('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between z-10'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p className='text-sm text-gray-500 mt-0.5'>
              Preencha os dados do cliente
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-5 space-y-5'>
          {/* Tipo */}
          {!editando && (
            <div>
              <p className={labelCls}>Tipo de Cliente *</p>
              <div className='grid grid-cols-2 gap-3'>
                {[
                  {
                    value: 'PJ',
                    label: 'Pessoa Jurídica',
                    icon: Building2,
                    desc: 'Empresa / Loja',
                  },
                  {
                    value: 'PF',
                    label: 'Pessoa Física',
                    icon: User,
                    desc: 'Cliente individual',
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTipoSelecionado(opt.value);
                      setForm(camposVazios(opt.value));
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      tipoSelecionado === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoSelecionado === opt.value ? 'bg-primary/10' : 'bg-gray-100'}`}
                    >
                      <opt.icon
                        className={`w-5 h-5 ${tipoSelecionado === opt.value ? 'text-primary' : 'text-gray-500'}`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${tipoSelecionado === opt.value ? 'text-primary' : 'text-gray-800'}`}
                      >
                        {opt.label}
                      </p>
                      <p className='text-xs text-gray-500'>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tipoSelecionado && (
            <>
              {/* Dados PJ */}
              {tipoSelecionado === 'PJ' && (
                <div className='space-y-3'>
                  <p className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                    <Building2 className='w-4 h-4 text-primary' /> Dados da
                    Empresa
                  </p>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='col-span-2'>
                      <label className={labelCls}>Razão Social *</label>
                      <input
                        className={inputCls}
                        value={form.razaoSocial}
                        onChange={e => set('razaoSocial', e.target.value)}
                        placeholder='Nome empresarial completo'
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Nome Fantasia</label>
                      <input
                        className={inputCls}
                        value={form.nomeFantasia}
                        onChange={e => set('nomeFantasia', e.target.value)}
                        placeholder='Nome comercial'
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CNPJ *</label>
                      <input
                        className={inputCls}
                        value={form.cnpj}
                        onChange={e => set('cnpj', formatCnpj(e.target.value))}
                        placeholder='00.000.000/0000-00'
                        maxLength={18}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Inscrição Estadual</label>
                      <input
                        className={inputCls}
                        value={form.ie}
                        onChange={e => set('ie', e.target.value)}
                        placeholder='IE'
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contato Responsável</label>
                      <input
                        className={inputCls}
                        value={form.responsavel}
                        onChange={e => set('responsavel', e.target.value)}
                        placeholder='Nome do responsável'
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dados PF */}
              {tipoSelecionado === 'PF' && (
                <div className='space-y-3'>
                  <p className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                    <User className='w-4 h-4 text-primary' /> Dados Pessoais
                  </p>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='col-span-2'>
                      <label className={labelCls}>Nome Completo *</label>
                      <input
                        className={inputCls}
                        value={form.nome}
                        onChange={e => set('nome', e.target.value)}
                        placeholder='Nome completo'
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CPF</label>
                      <input
                        className={inputCls}
                        value={form.cpf}
                        onChange={e => set('cpf', formatCpf(e.target.value))}
                        placeholder='000.000.000-00'
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>RG</label>
                      <input
                        className={inputCls}
                        value={form.rg}
                        onChange={e => set('rg', e.target.value)}
                        placeholder='RG'
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contato */}
              <div className='space-y-3'>
                <p className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                  <Phone className='w-4 h-4 text-primary' /> Contato
                </p>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className={labelCls}>Telefone / WhatsApp</label>
                    <input
                      className={inputCls}
                      value={form.telefone}
                      onChange={e =>
                        set('telefone', formatPhone(e.target.value))
                      }
                      placeholder='(21) 99999-9999'
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      className={inputCls}
                      type='email'
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder='email@exemplo.com'
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className='space-y-3'>
                <p className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                  <FileText className='w-4 h-4 text-primary' /> Endereço de
                  Cobrança
                </p>
                <div className='grid grid-cols-3 gap-3'>
                  <div>
                    <label className={labelCls}>CEP *</label>
                    <div className='relative'>
                      <input
                        className={inputCls}
                        value={form.endereco.cep}
                        onChange={e =>
                          handleCepChange(e.target.value, 'principal')
                        }
                        placeholder='00000-000'
                        maxLength={9}
                      />
                      {fetchingCep && (
                        <Loader2 className='absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary' />
                      )}
                    </div>
                  </div>
                  <div className='col-span-2'>
                    <label className={labelCls}>Rua</label>
                    <input
                      className={inputCls}
                      value={form.endereco.rua}
                      onChange={e => setEnd('rua', e.target.value)}
                      placeholder='Rua / Avenida'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Número</label>
                    <input
                      className={inputCls}
                      value={form.endereco.numero}
                      onChange={e => setEnd('numero', e.target.value)}
                      placeholder='Nº'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Complemento</label>
                    <input
                      className={inputCls}
                      value={form.endereco.complemento}
                      onChange={e => setEnd('complemento', e.target.value)}
                      placeholder='Sala, Apto...'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input
                      className={inputCls}
                      value={form.endereco.bairro}
                      onChange={e => setEnd('bairro', e.target.value)}
                      placeholder='Bairro'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cidade</label>
                    <input
                      className={inputCls}
                      value={form.endereco.cidade}
                      onChange={e => setEnd('cidade', e.target.value)}
                      placeholder='Cidade'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Estado</label>
                    <select
                      className={inputCls}
                      value={form.endereco.estado}
                      onChange={e => setEnd('estado', e.target.value)}
                    >
                      <option value=''>UF</option>
                      {estadosBR.map(uf => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Endereço entrega diferente */}
              <div>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={form.enderecoEntregaDiferente}
                    onChange={e =>
                      set('enderecoEntregaDiferente', e.target.checked)
                    }
                    className='w-4 h-4 accent-primary'
                  />
                  <span className='text-sm text-gray-700'>
                    Endereço de entrega diferente do de cobrança
                  </span>
                </label>
              </div>

              {form.enderecoEntregaDiferente && (
                <div className='space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200'>
                  <p className='text-sm font-semibold text-blue-800'>
                    Endereço de Entrega
                  </p>
                  <div className='grid grid-cols-3 gap-3'>
                    <div>
                      <label className={labelCls}>CEP</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.cep}
                        onChange={e =>
                          handleCepChange(e.target.value, 'entrega')
                        }
                        placeholder='00000-000'
                        maxLength={9}
                      />
                    </div>
                    <div className='col-span-2'>
                      <label className={labelCls}>Rua</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.rua}
                        onChange={e => setEndEnt('rua', e.target.value)}
                        placeholder='Rua / Avenida'
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Número</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.numero}
                        onChange={e => setEndEnt('numero', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Complemento</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.complemento}
                        onChange={e => setEndEnt('complemento', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Bairro</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.bairro}
                        onChange={e => setEndEnt('bairro', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Cidade</label>
                      <input
                        className={inputCls}
                        value={form.enderecoEntrega.cidade}
                        onChange={e => setEndEnt('cidade', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Estado</label>
                      <select
                        className={inputCls}
                        value={form.enderecoEntrega.estado}
                        onChange={e => setEndEnt('estado', e.target.value)}
                      >
                        <option value=''>UF</option>
                        {estadosBR.map(uf => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dados comerciais */}
              <div className='space-y-3'>
                <p className='text-sm font-semibold text-gray-700'>
                  Dados Comerciais
                </p>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className={labelCls}>Limite de Crédito (R$)</label>
                    <input
                      className={inputCls}
                      type='number'
                      min='0'
                      value={form.limiteCredito}
                      onChange={e => set('limiteCredito', e.target.value)}
                      placeholder='0,00'
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Condição de Pagamento Padrão
                    </label>
                    <input
                      className={inputCls}
                      value={form.condicaoPagamentoPadrao}
                      onChange={e =>
                        set('condicaoPagamentoPadrao', e.target.value)
                      }
                      placeholder='Ex: 30/60/90'
                    />
                  </div>
                  <div className='col-span-2'>
                    <label className={labelCls}>Observações</label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={2}
                      value={form.observacoes}
                      onChange={e => set('observacoes', e.target.value)}
                      placeholder='Observações sobre o cliente...'
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className='flex gap-3 pt-2'>
                <button
                  onClick={onClose}
                  className='flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className='flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50'
                >
                  {saving ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className='w-4 h-4' />{' '}
                      {editando ? 'Atualizar' : 'Cadastrar'}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════
const Clientes = () => {
  const { axios } = useAppContext();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tipoFiltro !== 'all') params.append('tipo', tipoFiltro);
      if (busca.trim()) params.append('q', busca.trim());
      const { data } = await axios.get(`/api/clientes?${params}`);
      if (data.success) setClientes(data.clientes);
    } catch (e) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [tipoFiltro, busca]);

  const handleDesativar = async id => {
    if (!window.confirm('Desativar este cliente?')) return;
    try {
      const { data } = await axios.delete(`/api/clientes/${id}`);
      if (data.success) {
        toast.success('Cliente desativado');
        fetchClientes();
      }
    } catch {
      toast.error('Erro ao desativar');
    }
  };

  const totalPJ = clientes.filter(c => c.tipo === 'PJ').length;
  const totalPF = clientes.filter(c => c.tipo === 'PF').length;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Clientes</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Gerencie clientes de vendas diretas
            </p>
          </div>
          <button
            onClick={() => {
              setEditando(null);
              setModalOpen(true);
            }}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
          >
            <Plus className='w-5 h-5' />
            Novo Cliente
          </button>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-4 mb-6'>
          {[
            {
              label: 'Total',
              value: clientes.length,
              icon: Users,
              color: 'gray',
            },
            {
              label: 'Empresas (PJ)',
              value: totalPJ,
              icon: Building2,
              color: 'blue',
            },
            {
              label: 'Pessoas (PF)',
              value: totalPF,
              icon: User,
              color: 'green',
            },
          ].map(s => (
            <div
              key={s.label}
              className='bg-white border border-gray-200 rounded-xl p-4'
            >
              <div className='flex items-center gap-3'>
                <div
                  className={`w-10 h-10 bg-${s.color}-50 rounded-lg flex items-center justify-center`}
                >
                  <s.icon className={`w-5 h-5 text-${s.color}-600`} />
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900'>{s.value}</p>
                  <p className='text-xs text-gray-500'>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className='bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder='Buscar por nome, CNPJ, CPF, email...'
              className='w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary outline-none'
            />
          </div>
          <div className='flex gap-2'>
            {[
              { val: 'all', label: 'Todos' },
              { val: 'PJ', label: 'PJ' },
              { val: 'PF', label: 'PF' },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setTipoFiltro(f.val)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tipoFiltro === f.val ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-primary' />
          </div>
        ) : clientes.length === 0 ? (
          <div className='bg-white border border-gray-200 rounded-xl p-12 text-center'>
            <Users className='w-12 h-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-500'>Nenhum cliente encontrado</p>
            <button
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
              className='mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium'
            >
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className='bg-white border border-gray-200 rounded-xl overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-gray-50 border-b border-gray-200'>
                <tr>
                  <th className='text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3'>
                    Cliente
                  </th>
                  <th className='text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 hidden md:table-cell'>
                    CPF / CNPJ
                  </th>
                  <th className='text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 hidden lg:table-cell'>
                    Contato
                  </th>
                  <th className='text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 hidden lg:table-cell'>
                    Cidade/UF
                  </th>
                  <th className='text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3'>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {clientes.map(c => (
                  <tr
                    key={c._id}
                    className='hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.tipo === 'PJ' ? 'bg-blue-50' : 'bg-green-50'}`}
                        >
                          {c.tipo === 'PJ' ? (
                            <Building2 className='w-4 h-4 text-blue-600' />
                          ) : (
                            <User className='w-4 h-4 text-green-600' />
                          )}
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-900'>
                            {c.tipo === 'PJ'
                              ? c.nomeFantasia || c.razaoSocial
                              : c.nome}
                          </p>
                          {c.tipo === 'PJ' && c.nomeFantasia && (
                            <p className='text-xs text-gray-400'>
                              {c.razaoSocial}
                            </p>
                          )}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.tipo === 'PJ' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}
                          >
                            {c.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className='px-5 py-3 text-sm text-gray-600 hidden md:table-cell'>
                      {c.tipo === 'PJ' ? c.cnpj : c.cpf || '—'}
                    </td>
                    <td className='px-5 py-3 hidden lg:table-cell'>
                      <p className='text-sm text-gray-600'>
                        {c.telefone || '—'}
                      </p>
                      <p className='text-xs text-gray-400'>{c.email || ''}</p>
                    </td>
                    <td className='px-5 py-3 text-sm text-gray-600 hidden lg:table-cell'>
                      {c.endereco?.cidade
                        ? `${c.endereco.cidade}/${c.endereco.estado}`
                        : '—'}
                    </td>
                    <td className='px-5 py-3'>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={() => {
                            setEditando(c);
                            setModalOpen(true);
                          }}
                          className='p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors'
                        >
                          <Edit2 className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => handleDesativar(c._id)}
                          className='p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClienteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        onSaved={fetchClientes}
        editando={editando}
      />
    </div>
  );
};

export default Clientes;

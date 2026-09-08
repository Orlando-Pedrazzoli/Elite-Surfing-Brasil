// client/src/pages/MyAccount.jsx
// ═══════════════════════════════════════════════════════════════
// 👤 MINHA CONTA — Área do Cliente
// ═══════════════════════════════════════════════════════════════
// Padrão de mercado (Amazon/Mercado Livre/Shopify): um hub com
//   • Dados Pessoais  (nome editável; email é a chave da conta)
//   • Meus Endereços  (CRUD completo, reutiliza o AddressFormModal)
//   • Segurança       (alterar senha)
//   • Atalhos         (Meus Pedidos, Escrever Avaliações)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import AddressFormModal from '../components/AddressFormModal';
import toast from 'react-hot-toast';
import { SEO } from '../components/seo';
import {
  User,
  MapPin,
  Lock,
  Package,
  Star,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ChevronRight,
  Save,
} from 'lucide-react';

const getInitials = name => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'ES';
};

const MyAccount = () => {
  const {
    user,
    setUser,
    axios,
    navigate,
    isLoading,
    setShowUserLogin,
    saveUserToStorage,
  } = useAppContext();

  // ─── Dados pessoais ───
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ─── Endereços ───
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ─── Segurança ───
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Guard: página exclusiva para logados
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
      setShowUserLogin(true);
      toast('Faça login para acessar sua conta', { icon: '🔑' });
    }
  }, [user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      loadAddresses();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const { data } = await axios.post(
        '/api/address/get',
        {},
        { withCredentials: true },
      );
      if (data.success) setAddresses(data.addresses);
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  // ─── Salvar nome ───
  const handleSaveName = async e => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 3 || !clean.includes(' ')) {
      toast.error('Informe nome e sobrenome.');
      return;
    }
    if (clean === user.name) return;

    setSavingName(true);
    try {
      const { data } = await axios.post('/api/user/update-profile', {
        name: clean,
      });
      if (data.success) {
        setUser(data.user);
        saveUserToStorage(data.user);
        toast.success('Dados atualizados!');
      } else {
        toast.error(data.message || 'Erro ao atualizar.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar.');
    } finally {
      setSavingName(false);
    }
  };

  // ─── Endereços: salvar (add/update) ───
  const getUserPrefill = () => {
    const parts = String(user?.name || '')
      .trim()
      .split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: user?.email || '',
    };
  };

  const handleSaveAddress = async addressData => {
    setSavingAddress(true);
    try {
      if (editingAddress?._id) {
        const { data } = await axios.put(
          `/api/address/update/${editingAddress._id}`,
          { address: addressData },
        );
        if (data.success) {
          toast.success('Endereço atualizado!');
        } else {
          toast.error(data.message || 'Erro ao atualizar endereço.');
        }
      } else {
        const { data } = await axios.post('/api/address/add', {
          address: addressData,
        });
        if (data.success) {
          toast.success('Endereço adicionado!');
        } else {
          toast.error(data.message || 'Erro ao adicionar endereço.');
        }
      }
      setShowAddressModal(false);
      setEditingAddress(null);
      loadAddresses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar endereço.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async address => {
    const label = `${address.street}${address.number ? `, ${address.number}` : ''}`;
    if (!window.confirm(`Excluir o endereço "${label}"?`)) return;

    setDeletingId(address._id);
    try {
      const { data } = await axios.delete(`/api/address/delete/${address._id}`);
      if (data.success) {
        toast.success('Endereço excluído.');
        setAddresses(prev => prev.filter(a => a._id !== address._id));
      } else {
        toast.error(data.message || 'Erro ao excluir.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao excluir.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Alterar senha ───
  const handleChangePassword = async e => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação não confere com a nova senha.');
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await axios.post('/api/user/change-password', {
        currentPassword,
        newPassword,
      });
      if (data.success) {
        toast.success('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Erro ao alterar a senha.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <Loader2 className='w-10 h-10 animate-spin text-primary' />
      </div>
    );
  }

  const inputClasses =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-colors';

  return (
    <div className='min-h-screen bg-gray-50 pt-24 md:pt-28 pb-16'>
      <SEO
        title='Minha Conta | Elite Surfing'
        description='Gerencie seus dados, endereços de entrega e segurança da sua conta Elite Surfing.'
      />
      <div className='max-w-4xl mx-auto px-4'>
        {/* ═══ HEADER ═══ */}
        <div className='flex items-center gap-4 mb-8'>
          <span className='flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dull text-white text-xl font-bold ring-2 ring-green-500 ring-offset-2 shadow-[0_0_14px_rgba(34,197,94,0.35)]'>
            {getInitials(user.name)}
          </span>
          <div className='min-w-0'>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 truncate'>
              Minha Conta
            </h1>
            <p className='text-gray-500 text-sm truncate'>{user.email}</p>
          </div>
        </div>

        {/* ═══ ATALHOS ═══ */}
        <div className='grid grid-cols-2 gap-3 mb-8'>
          <button
            onClick={() => navigate('/my-orders')}
            className='flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary/50 hover:shadow transition-all group'
          >
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center'>
                <Package className='w-5 h-5 text-primary' />
              </div>
              <span className='font-semibold text-gray-800 text-sm md:text-base'>
                Meus Pedidos
              </span>
            </div>
            <ChevronRight className='w-4 h-4 text-gray-300 group-hover:text-primary transition-colors' />
          </button>
          <button
            onClick={() => navigate('/write-review')}
            className='flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary/50 hover:shadow transition-all group'
          >
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center'>
                <Star className='w-5 h-5 text-amber-500' />
              </div>
              <span className='font-semibold text-gray-800 text-sm md:text-base'>
                Escrever Avaliações
              </span>
            </div>
            <ChevronRight className='w-4 h-4 text-gray-300 group-hover:text-primary transition-colors' />
          </button>
        </div>

        {/* ═══ DADOS PESSOAIS ═══ */}
        <div className='bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6 mb-6'>
          <div className='flex items-center gap-2 mb-4'>
            <User className='w-5 h-5 text-primary' />
            <h2 className='font-bold text-gray-800'>Dados Pessoais</h2>
          </div>
          <form
            onSubmit={handleSaveName}
            className='grid md:grid-cols-2 gap-4 items-end'
          >
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Nome completo
              </label>
              <input
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClasses}
                placeholder='Nome e sobrenome'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Email
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='email'
                  value={user.email}
                  disabled
                  className='w-full pl-9 pr-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed'
                />
              </div>
              <p className='text-[11px] text-gray-400 mt-1'>
                O email é a chave da sua conta e não pode ser alterado.
              </p>
            </div>
            <div className='md:col-span-2'>
              <button
                type='submit'
                disabled={savingName || name.trim() === user.name}
                className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-200 disabled:text-gray-400'
              >
                {savingName ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                Salvar dados
              </button>
            </div>
          </form>
        </div>

        {/* ═══ MEUS ENDEREÇOS ═══ */}
        <div className='bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <MapPin className='w-5 h-5 text-primary' />
              <h2 className='font-bold text-gray-800'>Meus Endereços</h2>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setShowAddressModal(true);
              }}
              className='flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors'
            >
              <Plus className='w-4 h-4' />
              Adicionar
            </button>
          </div>

          {addressesLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='w-6 h-6 animate-spin text-primary' />
            </div>
          ) : addresses.length === 0 ? (
            <div className='text-center py-8 border-2 border-dashed border-gray-200 rounded-xl'>
              <MapPin className='w-8 h-8 text-gray-300 mx-auto mb-2' />
              <p className='text-sm text-gray-500'>
                Nenhum endereço salvo ainda. Adicione um para agilizar suas
                próximas compras!
              </p>
            </div>
          ) : (
            <div className='grid md:grid-cols-2 gap-3'>
              {addresses.map(addr => (
                <div
                  key={addr._id}
                  className='border border-gray-200 rounded-xl p-4 hover:border-primary/40 transition-colors'
                >
                  <p className='font-semibold text-gray-800 text-sm'>
                    {addr.firstName} {addr.lastName}
                  </p>
                  <p className='text-sm text-gray-600 mt-1 leading-relaxed'>
                    {addr.street}
                    {addr.number ? `, ${addr.number}` : ''}
                    {addr.complement ? ` — ${addr.complement}` : ''}
                    <br />
                    {addr.neighborhood ? `${addr.neighborhood}, ` : ''}
                    {addr.city}/{addr.state}
                    <br />
                    CEP: {addr.zipcode}
                  </p>
                  <div className='flex items-center gap-2 mt-3'>
                    <button
                      onClick={() => {
                        setEditingAddress(addr);
                        setShowAddressModal(true);
                      }}
                      className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors'
                    >
                      <Edit3 className='w-3.5 h-3.5' />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr)}
                      disabled={deletingId === addr._id}
                      className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50'
                    >
                      {deletingId === addr._id ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        <Trash2 className='w-3.5 h-3.5' />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ SEGURANÇA ═══ */}
        <div className='bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Lock className='w-5 h-5 text-primary' />
            <h2 className='font-bold text-gray-800'>Segurança</h2>
          </div>
          <form
            onSubmit={handleChangePassword}
            className='grid md:grid-cols-3 gap-4 items-end'
          >
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Senha atual
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={inputClasses}
                autoComplete='current-password'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Nova senha
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputClasses}
                autoComplete='new-password'
                placeholder='Mínimo 6 caracteres'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Confirmar nova senha
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputClasses}
                autoComplete='new-password'
              />
            </div>
            <div className='md:col-span-3 flex items-center gap-4'>
              <button
                type='submit'
                disabled={
                  savingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-200 disabled:text-gray-400'
              >
                {savingPassword ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Lock className='w-4 h-4' />
                )}
                Alterar senha
              </button>
              <button
                type='button'
                onClick={() => setShowPasswords(v => !v)}
                className='flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors'
              >
                {showPasswords ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
                {showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de endereço (reutilizado do checkout) */}
      <AddressFormModal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        initialAddress={editingAddress || getUserPrefill()}
        isGuest={false}
        isLoading={savingAddress}
      />
    </div>
  );
};

export default MyAccount;

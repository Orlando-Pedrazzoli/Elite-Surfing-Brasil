import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Mail, Phone, Home, Building, Hash, Loader2, Check, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

// Estados do Brasil
const brazilStates = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const AddressFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialAddress = null,
  isGuest = false,
  isLoading = false 
}) => {
  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cpf: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'Brasil',
    phone: '',
  });
  
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  // Animação de entrada
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 50);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Carregar endereço inicial se existir
  useEffect(() => {
    if (initialAddress) {
      setAddress({
        firstName: initialAddress.firstName || '',
        lastName: initialAddress.lastName || '',
        email: initialAddress.email || '',
        cpf: initialAddress.cpf || '',
        street: initialAddress.street || '',
        number: initialAddress.number || '',
        complement: initialAddress.complement || '',
        neighborhood: initialAddress.neighborhood || '',
        city: initialAddress.city || '',
        state: initialAddress.state || '',
        zipcode: initialAddress.zipcode || '',
        country: initialAddress.country || 'Brasil',
        phone: initialAddress.phone || '',
      });
    }
  }, [initialAddress]);

  // ========== CEP AUTO-FILL via ViaCEP ==========
  const fetchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setAddress(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));

      // Limpar erros dos campos preenchidos
      setErrors(prev => {
        const newErrors = { ...prev };
        if (data.logradouro) delete newErrors.street;
        if (data.bairro) delete newErrors.neighborhood;
        if (data.localidade) delete newErrors.city;
        if (data.uf) delete newErrors.state;
        return newErrors;
      });

      toast.success('Endereço preenchido pelo CEP!');
      
      // Focar no campo número após preencher
      setTimeout(() => {
        const numberInput = document.querySelector('input[name="number"]');
        if (numberInput) numberInput.focus();
      }, 100);

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  // ========== FORMATADORES ==========
  const formatCep = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    } else if (digits.length > 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else if (digits.length > 3) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    return digits;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return digits;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Aplicar formatação
    if (name === 'zipcode') {
      formattedValue = formatCep(value);
      // Auto-buscar CEP quando completo
      const cleanCep = formattedValue.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep);
      }
    } else if (name === 'cpf') {
      formattedValue = formatCpf(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }
    
    setAddress(prev => ({ ...prev, [name]: formattedValue }));
    
    // Limpar erro ao digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // ========== VALIDAÇÃO ==========
  const validateCpf = (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (parseInt(digits[9]) !== check) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (parseInt(digits[10]) !== check) return false;
    
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!address.firstName.trim()) newErrors.firstName = 'Nome obrigatório';
    if (!address.lastName.trim()) newErrors.lastName = 'Sobrenome obrigatório';
    if (!address.email.trim()) {
      newErrors.email = 'Email obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
      newErrors.email = 'Email inválido';
    }
    if (address.cpf && !validateCpf(address.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    if (!address.zipcode.trim()) {
      newErrors.zipcode = 'CEP obrigatório';
    } else if (!/^\d{5}-?\d{3}$/.test(address.zipcode)) {
      newErrors.zipcode = 'Formato: 00000-000';
    }
    if (!address.street.trim()) newErrors.street = 'Rua obrigatória';
    if (!address.number.trim()) newErrors.number = 'Número obrigatório';
    if (!address.neighborhood.trim()) newErrors.neighborhood = 'Bairro obrigatório';
    if (!address.city.trim()) newErrors.city = 'Cidade obrigatória';
    if (!address.state) newErrors.state = 'Estado obrigatório';
    if (!address.phone.trim()) {
      newErrors.phone = 'Celular obrigatório';
    } else {
      const phoneDigits = address.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        newErrors.phone = 'Número inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    onSave(address);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  if (!isOpen) return null;

  const inputClasses = (fieldName) => `
    w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none text-gray-900 placeholder:text-gray-400
    ${errors[fieldName] 
      ? 'border-red-300 bg-red-50' 
      : focusedField === fieldName
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
    }
  `;

  const inputClassesNoIcon = (fieldName) => `
    w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none text-gray-900 placeholder:text-gray-400
    ${errors[fieldName] 
      ? 'border-red-300 bg-red-50' 
      : focusedField === fieldName
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
    }
  `;

  const iconClasses = (fieldName) => `
    absolute left-4 top-1/2 -translate-y-1/2 transition-colors w-5 h-5
    ${errors[fieldName] ? 'text-red-400' : focusedField === fieldName ? 'text-primary' : 'text-gray-400'}
  `;

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg max-h-[95vh] overflow-hidden bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className='bg-gradient-to-r from-primary to-primary/80 p-5 text-white'>
          <button
            onClick={handleClose}
            className='absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
          
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center'>
              <MapPin className='w-6 h-6' />
            </div>
            <div>
              <h2 className='text-xl font-bold'>
                {initialAddress ? 'Editar Endereço' : 'Endereço de Entrega'}
              </h2>
              <p className='text-white/80 text-sm'>
                {isGuest 
                  ? 'Adicione seus dados para continuar' 
                  : 'Preencha os dados de entrega'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-5 overflow-y-auto max-h-[calc(95vh-180px)]'>
          <div className='space-y-4'>
            
            {/* Nome e Sobrenome */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Nome *
                </label>
                <div className='relative'>
                  <User className={iconClasses('firstName')} />
                  <input
                    type='text'
                    name='firstName'
                    value={address.firstName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='João'
                    className={inputClasses('firstName')}
                  />
                </div>
                {errors.firstName && (
                  <p className='text-xs text-red-500 mt-1'>{errors.firstName}</p>
                )}
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Sobrenome *
                </label>
                <div className='relative'>
                  <User className={iconClasses('lastName')} />
                  <input
                    type='text'
                    name='lastName'
                    value={address.lastName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='Silva'
                    className={inputClasses('lastName')}
                  />
                </div>
                {errors.lastName && (
                  <p className='text-xs text-red-500 mt-1'>{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Email *
              </label>
              <div className='relative'>
                <Mail className={iconClasses('email')} />
                <input
                  type='email'
                  name='email'
                  value={address.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder='joao@email.com'
                  className={inputClasses('email')}
                />
              </div>
              {errors.email && (
                <p className='text-xs text-red-500 mt-1'>{errors.email}</p>
              )}
            </div>

            {/* CPF e Celular */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  CPF
                </label>
                <div className='relative'>
                  <FileText className={iconClasses('cpf')} />
                  <input
                    type='text'
                    name='cpf'
                    value={address.cpf}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('cpf')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='000.000.000-00'
                    maxLength={14}
                    className={inputClasses('cpf')}
                  />
                </div>
                {errors.cpf && (
                  <p className='text-xs text-red-500 mt-1'>{errors.cpf}</p>
                )}
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Celular *
                </label>
                <div className='relative'>
                  <Phone className={iconClasses('phone')} />
                  <input
                    type='tel'
                    name='phone'
                    value={address.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='(11) 99999-9999'
                    maxLength={15}
                    className={inputClasses('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className='text-xs text-red-500 mt-1'>{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Divisor - Endereço */}
            <div className='flex items-center gap-2 pt-2'>
              <Home className='w-4 h-4 text-primary' />
              <span className='text-sm font-semibold text-gray-700'>Endereço</span>
              <div className='flex-1 h-px bg-gray-200'></div>
            </div>

            {/* CEP */}
            <div className='w-1/2'>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                CEP *
              </label>
              <div className='relative'>
                <Hash className={iconClasses('zipcode')} />
                <input
                  type='text'
                  name='zipcode'
                  value={address.zipcode}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('zipcode')}
                  onBlur={() => setFocusedField(null)}
                  placeholder='00000-000'
                  maxLength={9}
                  className={inputClasses('zipcode')}
                />
                {isFetchingCep && (
                  <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin' />
                )}
              </div>
              {errors.zipcode && (
                <p className='text-xs text-red-500 mt-1'>{errors.zipcode}</p>
              )}
              <p className='text-xs text-gray-400 mt-1'>Digite o CEP para preencher automaticamente</p>
            </div>

            {/* Rua e Número */}
            <div className='grid grid-cols-3 gap-3'>
              <div className='col-span-2'>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Rua *
                </label>
                <div className='relative'>
                  <Home className={iconClasses('street')} />
                  <input
                    type='text'
                    name='street'
                    value={address.street}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('street')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='Rua das Flores'
                    className={inputClasses('street')}
                  />
                </div>
                {errors.street && (
                  <p className='text-xs text-red-500 mt-1'>{errors.street}</p>
                )}
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Número *
                </label>
                <input
                  type='text'
                  name='number'
                  value={address.number}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('number')}
                  onBlur={() => setFocusedField(null)}
                  placeholder='123'
                  className={inputClassesNoIcon('number')}
                />
                {errors.number && (
                  <p className='text-xs text-red-500 mt-1'>{errors.number}</p>
                )}
              </div>
            </div>

            {/* Complemento e Bairro */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Complemento
                </label>
                <input
                  type='text'
                  name='complement'
                  value={address.complement}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('complement')}
                  onBlur={() => setFocusedField(null)}
                  placeholder='Apto 101, Bloco A'
                  className={inputClassesNoIcon('complement')}
                />
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Bairro *
                </label>
                <div className='relative'>
                  <Building className={iconClasses('neighborhood')} />
                  <input
                    type='text'
                    name='neighborhood'
                    value={address.neighborhood}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('neighborhood')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='Centro'
                    className={inputClasses('neighborhood')}
                  />
                </div>
                {errors.neighborhood && (
                  <p className='text-xs text-red-500 mt-1'>{errors.neighborhood}</p>
                )}
              </div>
            </div>

            {/* Cidade e Estado */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Cidade *
                </label>
                <div className='relative'>
                  <Building className={iconClasses('city')} />
                  <input
                    type='text'
                    name='city'
                    value={address.city}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('city')}
                    onBlur={() => setFocusedField(null)}
                    placeholder='São Paulo'
                    className={inputClasses('city')}
                  />
                </div>
                {errors.city && (
                  <p className='text-xs text-red-500 mt-1'>{errors.city}</p>
                )}
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Estado *
                </label>
                <div className='relative'>
                  <MapPin className={iconClasses('state')} />
                  <select
                    name='state'
                    value={address.state}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('state')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('state')} cursor-pointer`}
                  >
                    <option value=''>Selecionar...</option>
                    {brazilStates.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.state && (
                  <p className='text-xs text-red-500 mt-1'>{errors.state}</p>
                )}
              </div>
            </div>

            {/* País (fixo) */}
            <div className='w-1/2'>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                País
              </label>
              <div className='relative'>
                <MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  name='country'
                  value={address.country}
                  disabled
                  className='w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                />
              </div>
            </div>
          </div>

          {/* Guest info */}
          {isGuest && (
            <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl'>
              <p className='text-sm text-blue-700 flex items-start gap-2'>
                <span className='text-lg'>💡</span>
                <span>
                  Você pode comprar sem criar conta. Após a compra, poderá criar sua conta para acompanhar o pedido.
                </span>
              </p>
            </div>
          )}

          {/* Botões */}
          <div className='mt-6 flex gap-3'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={isLoading}
              className='flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className='w-5 h-5' />
                  <span>{initialAddress ? 'Atualizar' : 'Confirmar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressFormModal;
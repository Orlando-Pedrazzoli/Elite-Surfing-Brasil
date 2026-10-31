// client/src/pages/Revendedores.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🏪 SEJA UM REVENDEDOR — landing + cadastro de lojista (/revendedores)
// ═══════════════════════════════════════════════════════════════════════
// Pedido do admin em 31/10/2026, nos moldes da página de revendedores da
// Pro-Lite. Estrutura: hero (só texto) → como funciona → formulário → FAQ →
// encerramento. Em 31/10 o admin pediu para tirar os botões do hero e a
// secção de benefícios.
//
// Copy: tom profissional, foco no lojista. NÃO promete margem, desconto,
// exclusividade territorial, frete ou pedido mínimo — as condições
// comerciais são apresentadas pela equipe depois da aprovação.
//
//   • CNPJ com máscara e AUTOPREENCHIMENTO via BrasilAPI (razão social,
//     nome fantasia, endereço, telefone/e-mail) — o lojista só confere;
//   • CEP com autopreenchimento via ViaCEP;
//   • honeypot invisível (website_url) + validação no cliente espelhando a
//     do servidor (POST /api/reseller);
//   • estado de SUCESSO substitui o formulário.
//
// SEO: página indexável (seoConfig.resellers), BreadcrumbSchema e
// FAQSchema; está no sitemap-static.xml e liberada no robots.txt.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ClipboardList,
  Mail,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { SEO, BreadcrumbSchema, FAQSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import COMPANY from '../utils/companyConfig';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

const emptyForm = {
  companyName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  storeType: 'fisica',
  website: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  contactName: '',
  email: '',
  phone: '',
  message: '',
  website_url: '', // honeypot — humanos nunca veem/preenchem
};

// ─── Máscaras e validações (espelham o servidor) ───
const onlyDigits = v => String(v || '').replace(/\D/g, '');

const maskCNPJ = v =>
  onlyDigits(v)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

const maskCEP = v => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

const maskPhone = v => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10)
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const isValidCNPJ = value => {
  const c = onlyDigits(value);
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

const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));
const isValidPhone = v => [10, 11].includes(onlyDigits(v).length);

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:bg-gray-50';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const STEPS = [
  { icon: ClipboardList, text: 'Preencha o cadastro com os dados da sua loja' },
  { icon: Mail, text: 'Nossa equipe analisa o cadastro e entra em contato' },
  {
    icon: FileSpreadsheet,
    text: 'Aprovado, você recebe a tabela de preços para lojistas',
  },
];

const FAQS = [
  {
    question: 'Quem pode ser revendedor Elite Surfing?',
    answer:
      'Lojas físicas e online com CNPJ ativo que vendam produtos de surf, esportes de prancha ou moda praia. O cadastro é analisado pela nossa equipe comercial.',
  },
  {
    question: 'Como recebo a tabela de preços para lojistas?',
    answer:
      'Depois de aprovado, enviamos por e-mail a tabela de preços exclusiva para revendedores, com fotos e códigos de todos os produtos.',
  },
  {
    question: 'Vocês atendem lojas em todo o Brasil?',
    answer:
      'Sim. O estoque fica no Rio de Janeiro e enviamos para lojistas de qualquer estado.',
  },
  {
    question: 'Em quanto tempo recebo resposta?',
    answer:
      'Normalmente em até 2 dias úteis. Para urgências, fale com a equipe comercial pelo WhatsApp.',
  },
];

const whatsappUrl = `https://wa.me/${COMPANY.whatsapp.number}?text=${encodeURIComponent(
  'Olá! Tenho interesse em revender os produtos Elite Surfing na minha loja.',
)}`;

const Revendedores = () => {
  const { axios } = useAppContext();

  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [cnpjFilled, setCnpjFilled] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // ── Autopreenchimento por CNPJ (BrasilAPI) ──
  useEffect(() => {
    const d = onlyDigits(form.cnpj);
    if (d.length !== 14 || !isValidCNPJ(d) || cnpjFilled) return;
    let cancelled = false;
    (async () => {
      setLookingUp(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setForm(f => ({
          ...f,
          companyName: f.companyName || data.razao_social || '',
          tradeName: f.tradeName || data.nome_fantasia || '',
          cep: f.cep || maskCEP(String(data.cep || '')),
          street:
            f.street ||
            [data.descricao_tipo_de_logradouro, data.logradouro]
              .filter(Boolean)
              .join(' '),
          number: f.number || String(data.numero || ''),
          complement: f.complement || String(data.complemento || ''),
          neighborhood: f.neighborhood || data.bairro || '',
          city: f.city || data.municipio || '',
          state: f.state || data.uf || '',
          phone:
            f.phone ||
            (data.ddd_telefone_1 ? maskPhone(String(data.ddd_telefone_1)) : ''),
          email: f.email || (data.email ? String(data.email).toLowerCase() : ''),
        }));
        setCnpjFilled(true);
        toast.success('Dados da empresa preenchidos — confira e complete.');
      } catch {
        /* sem bloqueio: o lojista preenche à mão */
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.cnpj, cnpjFilled]);

  // ── Autopreenchimento por CEP (ViaCEP) ──
  const lookupCep = async cep => {
    const d = onlyDigits(cep);
    if (d.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j?.erro) return;
      setForm(f => ({
        ...f,
        street: j.logradouro || f.street,
        neighborhood: j.bairro || f.neighborhood,
        city: j.localidade || f.city,
        state: j.uf || f.state,
      }));
    } catch {
      /* ignorar */
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (form.companyName.trim().length < 3)
      return toast.error('Informe a razão social.');
    if (!isValidCNPJ(form.cnpj)) return toast.error('CNPJ inválido.');
    if (form.city.trim().length < 2 || form.state.length !== 2)
      return toast.error('Informe cidade e estado da loja.');
    if (form.contactName.trim().length < 3)
      return toast.error('Informe o nome do responsável.');
    if (!isValidEmail(form.email)) return toast.error('E-mail inválido.');
    if (!isValidPhone(form.phone))
      return toast.error('Informe o WhatsApp com DDD.');

    setSending(true);
    try {
      const { data } = await axios.post('/api/reseller', {
        companyName: form.companyName,
        tradeName: form.tradeName,
        cnpj: form.cnpj,
        stateRegistration: form.stateRegistration,
        storeType: form.storeType,
        website: form.website,
        address: {
          cep: form.cep,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        },
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        message: form.message,
        website_url: form.website_url,
      });
      if (data?.success) {
        setSent(true);
        toast.success('Cadastro enviado!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data?.message || 'Não foi possível enviar. Tente novamente.');
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Falha de conexão. Tente novamente ou chame no WhatsApp.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO
        title={seoConfig.resellers.title}
        description={seoConfig.resellers.description}
        url={seoConfig.resellers.url}
      >
        <BreadcrumbSchema
          items={[{ name: 'Home', url: '/' }, { name: 'Seja um Revendedor' }]}
        />
        <FAQSchema faqs={FAQS} />
      </SEO>

      <div className='bg-gray-50'>
        {/* ═══ HERO ═══ */}
        <section className='relative bg-gray-900 text-white overflow-hidden'>
          <div
            className='absolute inset-0 opacity-30 bg-cover bg-center'
            style={{ backgroundImage: "url('/hero-surf.jpg')" }}
            aria-hidden='true'
          />
          <div className='absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/85 to-primary/60' />
          <div className='relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20'>
            <nav className='text-xs text-gray-400 mb-6' aria-label='breadcrumb'>
              <Link to='/' className='hover:text-white'>
                Início
              </Link>
              <span className='mx-2'>/</span>
              <span className='text-gray-200'>Seja um Revendedor</span>
            </nav>
            <p className='text-sky-300 font-bold uppercase tracking-widest text-xs mb-3'>
              Programa de revendedores
            </p>
            <h1 className='text-3xl md:text-5xl font-black leading-tight max-w-3xl'>
              Seja um Revendedor Elite Surfing
            </h1>
            <p className='text-gray-300 mt-4 max-w-2xl text-base md:text-lg'>
              Leve para a sua loja uma marca com história no surf brasileiro e
              produtos que o surfista já conhece. Cadastre-se para conhecer as
              condições comerciais para lojistas e ampliar o seu mix.
            </p>
          </div>
        </section>

        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
          {/* ═══ COMO FUNCIONA ═══ */}
          <section className='mb-12'>
            <h2 className='text-xl font-black text-gray-900 mb-4'>
              Como funciona
            </h2>
            <ol className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {STEPS.map((s, i) => (
                <li
                  key={s.text}
                  className='flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm'
                >
                  <span className='shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center'>
                    {i + 1}
                  </span>
                  <div className='flex items-center gap-2 text-sm text-gray-700 pt-1'>
                    <s.icon className='w-4 h-4 text-primary shrink-0' />
                    {s.text}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ═══ CHAMADA + FORMULÁRIO / SUCESSO ═══ */}
          <section id='cadastro' className='scroll-mt-28'>
            {!sent && (
              <div className='mb-6 max-w-3xl'>
                <h2 className='text-2xl md:text-3xl font-black text-gray-900'>
                  Quer vender Elite Surfing na sua loja?
                </h2>
                <p className='text-gray-600 mt-2'>
                  Preencha o formulário de cadastro. Nossa equipe comercial
                  entra em contato com os próximos passos para você se tornar
                  um revendedor.
                </p>
              </div>
            )}

            {sent ? (
              <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-8 md:p-12 text-center max-w-2xl mx-auto'>
                <CheckCircle2 className='w-14 h-14 text-green-500 mx-auto mb-4' />
                <h2 className='text-2xl font-black text-gray-900 mb-2'>
                  Cadastro enviado!
                </h2>
                <p className='text-gray-600 mb-6'>
                  Recebemos os dados da{' '}
                  <strong>{form.tradeName || form.companyName}</strong>. Nossa
                  equipe comercial vai analisar o cadastro e responder por
                  e-mail em até 2 dias úteis. Assim que aprovado, você recebe
                  a tabela de preços para lojistas.
                </p>
                <a
                  href={whatsappUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold px-6 py-3 rounded-lg transition-colors'
                >
                  <MessageCircle className='w-[18px] h-[18px]' /> Falar com a
                  equipe no WhatsApp
                </a>
              </div>
            ) : (
              <div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8'>
                <form
                  onSubmit={handleSubmit}
                  className='relative bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6'
                  noValidate
                >
                  <div>
                    <h2 className='text-xl font-black text-gray-900'>
                      Cadastro de revendedor
                    </h2>
                    <p className='text-sm text-gray-500 mt-1'>
                      Digite o CNPJ e preenchemos os dados da empresa para
                      você conferir.
                    </p>
                  </div>

                  {/* honeypot */}
                  <div
                    className='absolute -left-[9999px] opacity-0'
                    aria-hidden='true'
                  >
                    <label htmlFor='website_url'>Não preencha</label>
                    <input
                      id='website_url'
                      name='website_url'
                      tabIndex={-1}
                      autoComplete='off'
                      value={form.website_url}
                      onChange={e => set('website_url', e.target.value)}
                    />
                  </div>

                  {/* ── Empresa ── */}
                  <fieldset className='space-y-4'>
                    <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                      Empresa
                    </legend>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <label htmlFor='cnpj' className={labelCls}>
                          CNPJ *
                        </label>
                        <div className='relative'>
                          <input
                            id='cnpj'
                            inputMode='numeric'
                            className={inputCls}
                            placeholder='00.000.000/0000-00'
                            value={form.cnpj}
                            onChange={e => {
                              set('cnpj', maskCNPJ(e.target.value));
                              setCnpjFilled(false);
                            }}
                            required
                          />
                          {lookingUp && (
                            <Loader2 className='absolute right-3 top-3 w-4 h-4 animate-spin text-primary' />
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor='stateRegistration' className={labelCls}>
                          Inscrição estadual
                        </label>
                        <input
                          id='stateRegistration'
                          className={inputCls}
                          placeholder='Isento ou número'
                          value={form.stateRegistration}
                          onChange={e => set('stateRegistration', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor='companyName' className={labelCls}>
                          Razão social *
                        </label>
                        <input
                          id='companyName'
                          className={inputCls}
                          value={form.companyName}
                          onChange={e => set('companyName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor='tradeName' className={labelCls}>
                          Nome fantasia (nome da loja)
                        </label>
                        <input
                          id='tradeName'
                          className={inputCls}
                          value={form.tradeName}
                          onChange={e => set('tradeName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor='storeType' className={labelCls}>
                          Tipo de loja *
                        </label>
                        <select
                          id='storeType'
                          className={inputCls}
                          value={form.storeType}
                          onChange={e => set('storeType', e.target.value)}
                        >
                          <option value='fisica'>Loja física</option>
                          <option value='online'>Loja online</option>
                          <option value='ambas'>Física + online</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor='website' className={labelCls}>
                          Site ou Instagram
                        </label>
                        <input
                          id='website'
                          className={inputCls}
                          placeholder='@sualoja ou www.sualoja.com.br'
                          value={form.website}
                          onChange={e => set('website', e.target.value)}
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Endereço ── */}
                  <fieldset className='space-y-4'>
                    <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                      Endereço da loja
                    </legend>
                    <div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
                      <div className='col-span-2 md:col-span-2'>
                        <label htmlFor='cep' className={labelCls}>
                          CEP
                        </label>
                        <input
                          id='cep'
                          inputMode='numeric'
                          className={inputCls}
                          placeholder='00000-000'
                          value={form.cep}
                          onChange={e => set('cep', maskCEP(e.target.value))}
                          onBlur={e => lookupCep(e.target.value)}
                        />
                      </div>
                      <div className='col-span-2 md:col-span-4'>
                        <label htmlFor='street' className={labelCls}>
                          Rua / Avenida
                        </label>
                        <input
                          id='street'
                          className={inputCls}
                          value={form.street}
                          onChange={e => set('street', e.target.value)}
                        />
                      </div>
                      <div className='col-span-1 md:col-span-1'>
                        <label htmlFor='number' className={labelCls}>
                          Número
                        </label>
                        <input
                          id='number'
                          className={inputCls}
                          value={form.number}
                          onChange={e => set('number', e.target.value)}
                        />
                      </div>
                      <div className='col-span-1 md:col-span-2'>
                        <label htmlFor='complement' className={labelCls}>
                          Complemento
                        </label>
                        <input
                          id='complement'
                          className={inputCls}
                          value={form.complement}
                          onChange={e => set('complement', e.target.value)}
                        />
                      </div>
                      <div className='col-span-2 md:col-span-3'>
                        <label htmlFor='neighborhood' className={labelCls}>
                          Bairro
                        </label>
                        <input
                          id='neighborhood'
                          className={inputCls}
                          value={form.neighborhood}
                          onChange={e => set('neighborhood', e.target.value)}
                        />
                      </div>
                      <div className='col-span-2 md:col-span-4'>
                        <label htmlFor='city' className={labelCls}>
                          Cidade *
                        </label>
                        <input
                          id='city'
                          className={inputCls}
                          value={form.city}
                          onChange={e => set('city', e.target.value)}
                          required
                        />
                      </div>
                      <div className='col-span-2 md:col-span-2'>
                        <label htmlFor='state' className={labelCls}>
                          Estado *
                        </label>
                        <select
                          id='state'
                          className={inputCls}
                          value={form.state}
                          onChange={e => set('state', e.target.value)}
                          required
                        >
                          <option value=''>UF</option>
                          {UFS.map(uf => (
                            <option key={uf} value={uf}>
                              {uf}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Contato ── */}
                  <fieldset className='space-y-4'>
                    <legend className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>
                      Responsável pelo contato
                    </legend>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='md:col-span-2'>
                        <label htmlFor='contactName' className={labelCls}>
                          Nome completo *
                        </label>
                        <input
                          id='contactName'
                          className={inputCls}
                          value={form.contactName}
                          onChange={e => set('contactName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor='email' className={labelCls}>
                          E-mail *
                        </label>
                        <input
                          id='email'
                          type='email'
                          className={inputCls}
                          placeholder='Para onde enviamos a tabela de preços'
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor='phone' className={labelCls}>
                          WhatsApp *
                        </label>
                        <input
                          id='phone'
                          inputMode='tel'
                          className={inputCls}
                          placeholder='(21) 99999-9999'
                          value={form.phone}
                          onChange={e => set('phone', maskPhone(e.target.value))}
                          required
                        />
                      </div>
                      <div className='md:col-span-2'>
                        <label htmlFor='message' className={labelCls}>
                          Conte um pouco sobre a sua loja (opcional)
                        </label>
                        <textarea
                          id='message'
                          rows={3}
                          className={`${inputCls} resize-none`}
                          placeholder='Há quanto tempo existe, que marcas já trabalha, volume estimado…'
                          value={form.message}
                          onChange={e => set('message', e.target.value)}
                          maxLength={2000}
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className='flex flex-col sm:flex-row sm:items-center gap-3 pt-2'>
                    <button
                      type='submit'
                      disabled={sending}
                      className='inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dull disabled:opacity-60 text-white font-bold px-6 py-3 rounded-lg transition-colors whitespace-nowrap shrink-0'
                    >
                      {sending ? (
                        <Loader2 className='w-[18px] h-[18px] animate-spin' />
                      ) : (
                        <Send className='w-[18px] h-[18px]' />
                      )}
                      {sending ? 'Enviando…' : 'Quero ser revendedor'}
                    </button>
                    <p className='text-xs text-gray-400'>
                      Ao enviar, você concorda com a nossa{' '}
                      <Link to='/privacy' className='underline hover:text-primary'>
                        política de privacidade
                      </Link>
                      . Venda exclusiva para pessoa jurídica.
                    </p>
                  </div>
                </form>

                {/* ── Lateral ── */}
                <aside className='space-y-4'>
                  <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6'>
                    <h3 className='font-bold text-gray-900 mb-3'>
                      Já é revendedor?
                    </h3>
                    <p className='text-sm text-gray-500 leading-relaxed'>
                      A tabela de preços atualizada é enviada por e-mail pela
                      equipe comercial. Precisa de uma nova? Peça em{' '}
                      <a
                        href={`mailto:${COMPANY.email}`}
                        className='text-primary underline'
                      >
                        {COMPANY.email}
                      </a>{' '}
                      ou pelo WhatsApp.
                    </p>
                  </div>
                  <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6'>
                    <h3 className='font-bold text-gray-900 mb-3'>
                      Atendimento comercial
                    </h3>
                    <ul className='text-sm text-gray-600 space-y-2'>
                      <li>
                        <a
                          href={whatsappUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:text-primary'
                        >
                          WhatsApp {COMPANY.phone}
                        </a>
                      </li>
                      <li>
                        <a
                          href={`mailto:${COMPANY.email}`}
                          className='hover:text-primary'
                        >
                          {COMPANY.email}
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div className='bg-primary/5 border border-primary/15 rounded-xl p-6'>
                    <p className='text-sm text-gray-700 leading-relaxed'>
                      <strong>Elite Surfing</strong> — acessórios de surf desde
                      2010, com sede e estoque no {COMPANY.address.city} -{' '}
                      {COMPANY.address.state}. Envio para todo o Brasil.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </section>

          {/* ═══ FAQ ═══ */}
          <section className='mt-14'>
            <h2 className='text-xl font-black text-gray-900 mb-4'>
              Perguntas frequentes de lojistas
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {FAQS.map(f => (
                <div
                  key={f.question}
                  className='bg-white rounded-xl border border-gray-100 shadow-sm p-5'
                >
                  <h3 className='font-bold text-gray-900 mb-1'>{f.question}</h3>
                  <p className='text-sm text-gray-500 leading-relaxed'>
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ ENCERRAMENTO ═══ */}
        <section className='bg-gray-900 text-white'>
          <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center'>
            <p className='text-2xl md:text-3xl font-black'>
              Elite Surfing. Equipamento de surf feito para o mar brasileiro.
            </p>
            <p className='text-gray-300 mt-3 max-w-2xl mx-auto'>
              Decks, leashes, capas e acessórios desenvolvidos para acompanhar
              cada sessão, da preparação ao retorno da água.
            </p>
            <a
              href='#cadastro'
              className='mt-8 inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-bold px-6 py-3 rounded-lg transition-colors'
            >
              <Store className='w-[18px] h-[18px]' /> Cadastrar minha loja
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default Revendedores;

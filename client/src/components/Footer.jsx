import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';
import COMPANY from '../utils/companyConfig';
import {
  Facebook,
  Instagram,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Shield,
  Lock,
  Truck,
  RotateCcw,
} from 'lucide-react';
import PaymentMethods, {
  PaymentConditions,
  MercadoPagoSeal,
} from './PaymentMethods';

const trustBadges = [
  {
    icon: Lock,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Pagamento Seguro',
    subtitle: 'Criptografia SSL 256-bit',
  },
  {
    icon: Truck,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    title: 'Envio para todo Brasil',
    subtitleFn: c =>
      `Entrega em ${c.policies.shippingDaysMin}-${c.policies.shippingDaysMax} dias úteis`,
  },
  {
    icon: RotateCcw,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: 'Devolução Fácil',
    subtitleFn: c => `${c.policies.returnDays} dias para devolver`,
  },
  {
    icon: Phone,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    title: 'Atendimento',
    subtitleFn: c => c.businessHours.formatted,
  },
];

const Footer = () => {
  const { address, whatsapp, social, developer, businessHours } = COMPANY;
  const [badgeIndex, setBadgeIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeIndex(prev => (prev + 1) % trustBadges.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className='bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200'>
      {/* Trust Badges Bar - Garantias */}
      <div className='bg-white border-b border-gray-200'>
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-6'>
          {/* Desktop: grid normal */}
          <div className='hidden md:grid md:grid-cols-4 gap-8'>
            {trustBadges.map((badge, i) => {
              const Icon = badge.icon;
              const sub =
                badge.subtitle ||
                (badge.subtitleFn ? badge.subtitleFn(COMPANY) : '');
              return (
                <div key={i} className='flex items-center gap-3'>
                  <div
                    className={`w-12 h-12 ${badge.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-6 h-6 ${badge.iconColor}`} />
                  </div>
                  <div>
                    <p className='font-bold text-gray-800 text-sm'>
                      {badge.title}
                    </p>
                    <p className='text-xs text-gray-500'>{sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: carousel auto-rotating */}
          <div className='md:hidden relative h-12 overflow-hidden'>
            {trustBadges.map((badge, i) => {
              const Icon = badge.icon;
              const sub =
                badge.subtitle ||
                (badge.subtitleFn ? badge.subtitleFn(COMPANY) : '');
              return (
                <div
                  key={i}
                  className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-500 ease-in-out ${
                    i === badgeIndex
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-6 pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-10 h-10 ${badge.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${badge.iconColor}`} />
                  </div>
                  <div>
                    <p className='font-bold text-gray-800 text-sm'>
                      {badge.title}
                    </p>
                    <p className='text-xs text-gray-500'>{sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8'>
          {/* Coluna 1 - Logo e Redes Sociais */}
          <div className='lg:col-span-1'>
            <Link to='/' className='inline-block mb-5'>
              <img
                className='w-28 hover:opacity-80 transition-opacity'
                src={assets.logo_es}
                alt={COMPANY.name}
              />
            </Link>

            <p className='text-sm text-gray-600 mb-4'>
              Sua loja de acessórios de surf no Brasil. Qualidade e paixão pelo
              mar.
            </p>

            <div className='space-y-3'>
              <h3 className='font-bold text-gray-900 text-xs uppercase tracking-wide'>
                Siga-nos
              </h3>
              <div className='flex items-center gap-2'>
                <a
                  href={social.instagram}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group relative w-9 h-9 bg-white rounded-lg flex items-center justify-center text-gray-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 hover:border-transparent overflow-hidden'
                  aria-label='Instagram'
                >
                  <div className='absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  <Instagram className='w-4 h-4 relative z-10' />
                </a>
                <a
                  href={social.facebook}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group relative w-9 h-9 bg-white rounded-lg flex items-center justify-center text-gray-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 hover:border-transparent overflow-hidden'
                  aria-label='Facebook'
                >
                  <div className='absolute inset-0 bg-[#1877F2] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  <Facebook className='w-4 h-4 relative z-10' />
                </a>
              </div>
            </div>
          </div>

          {/* Coluna 2 - Institucional */}
          <div>
            <h3 className='font-bold text-gray-900 text-sm uppercase tracking-wide mb-5 pb-2 border-b-2 border-primary/20'>
              Institucional
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  to='/institucional/quem-somos'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Quem Somos
                </Link>
              </li>
              <li>
                <Link
                  to='/institucional/catalogo'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Catálogo
                </Link>
              </li>
              <li>
                <Link
                  to='/institucional/frete-gratis'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Frete Grátis
                </Link>
              </li>
              <li>
                <Link
                  to='/institucional/representantes'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Representantes
                </Link>
              </li>
              <li>
                <Link
                  to='/revendedores'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Seja um Revendedor
                </Link>
              </li>
              <li>
                <Link
                  to='/institucional/trocas-devolucoes-garantia'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3 - Informação Legal */}
          <div>
            <h3 className='font-bold text-gray-900 text-sm uppercase tracking-wide mb-5 pb-2 border-b-2 border-primary/20'>
              Informações Legais
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  to='/privacy'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to='/refund-policy'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Política de Devolução
                </Link>
              </li>
              <li>
                <Link
                  to='/terms'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Termos e Condições
                </Link>
              </li>
              <li>
                <Link
                  to='/faq'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Perguntas Frequentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4 - Conta */}
          <div>
            <h3 className='font-bold text-gray-900 text-sm uppercase tracking-wide mb-5 pb-2 border-b-2 border-primary/20'>
              Minha Conta
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  to='/my-orders'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link
                  to='/cart'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 5 - Contato */}
          <div className='lg:col-span-2'>
            <h3 className='font-bold text-gray-900 text-sm uppercase tracking-wide mb-5 pb-2 border-b-2 border-primary/20'>
              Contato
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  to='/contact'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-center gap-2 group'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary transition-colors'></span>
                  Fale Conosco
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-start gap-2 group'
                >
                  <Mail className='w-4 h-4 mt-0.5 flex-shrink-0 text-primary' />
                  <span className='break-all'>{COMPANY.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={whatsapp.linkClean}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-gray-600 hover:text-primary transition-colors text-sm flex items-start gap-2 group'
                >
                  <Phone className='w-4 h-4 mt-0.5 flex-shrink-0 text-primary' />
                  <span>{COMPANY.phone}</span>
                  <span className='text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium'>
                    WhatsApp
                  </span>
                </a>
              </li>
              <li className='flex items-start gap-2 text-gray-600 text-sm'>
                <MapPin className='w-4 h-4 mt-0.5 flex-shrink-0 text-primary' />
                <span>
                  {address.street}, {address.number}
                  <br />
                  {address.complement} - {address.building}
                  <br />
                  {address.neighborhood}, {address.city}/{address.state}
                  <br />
                  CEP: {address.cep}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods & Security Bar */}
      <div className='border-t border-gray-200 bg-white'>
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-6'>
          <div className='flex flex-col lg:flex-row items-center justify-between gap-6'>
            {/* Métodos de Pagamento */}
            <div className='flex flex-col items-center lg:items-start gap-3'>
              <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                Formas de Pagamento
              </p>
              <PaymentMethods className='justify-center lg:justify-start' />
              <PaymentConditions className='text-center lg:text-left' />
            </div>

            {/* Segurança */}
            <div className='flex flex-col items-center lg:items-end gap-3'>
              <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                Compra Segura
              </p>
              <div className='flex flex-wrap items-center justify-center lg:justify-end gap-3'>
                {/* SSL Badge */}
                <div className='flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full'>
                  <Lock className='w-4 h-4 text-green-600' />
                  <span className='text-xs font-semibold text-green-700'>
                    SSL Seguro
                  </span>
                </div>

                {/* Mercado Pago */}
                <MercadoPagoSeal />

                {/* Dados Protegidos */}
                <div className='hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full'>
                  <Shield className='w-4 h-4 text-blue-600' />
                  <span className='text-xs font-semibold text-blue-700'>
                    Dados Protegidos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Copyright */}
      <div className='border-t border-gray-200 bg-gray-50'>
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-5'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            <div className='flex flex-col md:flex-row items-center gap-2 md:gap-4'>
              <p className='text-sm text-gray-500 text-center md:text-left'>
                © {new Date().getFullYear()} {COMPANY.name}. Todos os direitos
                reservados.
              </p>
              <span className='hidden md:inline text-gray-300'>|</span>
              <p className='text-xs text-gray-400'>CNPJ: {COMPANY.cnpj}</p>
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-500'>
              <span>Desenvolvido por</span>
              <a
                href={developer.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:underline font-semibold inline-flex items-center gap-1.5'
              >
                <img
                  src='/pedrazzoli-logo.png'
                  alt='Pedrazzoli Digital'
                  className='w-4 h-4 object-contain'
                />
                pedrazzolidigital.com
                <ExternalLink className='w-3 h-3' />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

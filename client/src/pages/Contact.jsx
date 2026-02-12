import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { SEO, LocalBusinessSchema, BreadcrumbSchema, ContactPageSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import COMPANY from '../utils/companyConfig';

const Contact = () => {
  const form = useRef();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  const sendEmail = e => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setError(false);

    emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY).then(
      () => {
        setSuccess(true);
        setError(false);
        form.current.reset();
        setIsSubmitting(false);
      },
      err => {
        setSuccess(false);
        setError(true);
        setIsSubmitting(false);
        console.error('Erro ao enviar e-mail:', err.text);
      }
    );
  };

  return (
    <>
      {/* SEO */}
      <SEO 
        title={seoConfig.contact.title}
        description={seoConfig.contact.description}
        url={seoConfig.contact.url}
      >
        <LocalBusinessSchema />
        <ContactPageSchema />
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Contato' }
        ]} />
      </SEO>

      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12'>
        
        {/* Header */}
        <div className='mb-10 text-center'>
          <h1 className='text-3xl md:text-4xl font-bold text-gray-900'>
            Entre em Contato
          </h1>
          <p className='text-gray-500 mt-3 max-w-lg mx-auto'>
            Tem alguma dúvida ou precisa de ajuda? Estamos aqui para você. 
            Escolha a melhor forma de nos contatar.
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-5 gap-8'>

          {/* ═══ Coluna Esquerda: Informações de Contato ═══ */}
          <div className='lg:col-span-2 space-y-5'>

            {/* WhatsApp */}
            <a
              href={COMPANY.whatsapp.linkClean}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group'
            >
              <div className='w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform'>
                <Phone className='w-5 h-5 text-white' />
              </div>
              <div>
                <p className='font-semibold text-gray-900 text-sm'>WhatsApp</p>
                <p className='text-green-700 font-medium'>{COMPANY.phone}</p>
                <p className='text-xs text-gray-500 mt-1'>Resposta rápida</p>
              </div>
            </a>

            {/* E-mail */}
            <a
              href={`mailto:${COMPANY.email}`}
              className='flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors group'
            >
              <div className='w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors'>
                <Mail className='w-5 h-5 text-primary' />
              </div>
              <div>
                <p className='font-semibold text-gray-900 text-sm'>E-mail</p>
                <p className='text-primary font-medium text-sm break-all'>{COMPANY.email}</p>
                <p className='text-xs text-gray-500 mt-1'>Resposta em até 24h úteis</p>
              </div>
            </a>

            {/* Endereço */}
            <div className='flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl'>
              <div className='w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0'>
                <MapPin className='w-5 h-5 text-blue-600' />
              </div>
              <div>
                <p className='font-semibold text-gray-900 text-sm'>Endereço</p>
                <p className='text-gray-600 text-sm leading-relaxed'>
                  {COMPANY.address.street}, {COMPANY.address.number}<br />
                  {COMPANY.address.complement} — {COMPANY.address.building}<br />
                  {COMPANY.address.neighborhood}, {COMPANY.address.city}/{COMPANY.address.state}<br />
                  CEP: {COMPANY.address.cep}
                </p>
              </div>
            </div>

            {/* Horário */}
            <div className='flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl'>
              <div className='w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0'>
                <Clock className='w-5 h-5 text-purple-600' />
              </div>
              <div>
                <p className='font-semibold text-gray-900 text-sm'>Horário de Atendimento</p>
                <p className='text-gray-600 text-sm'>{COMPANY.businessHours.formatted}</p>
              </div>
            </div>
          </div>

          {/* ═══ Coluna Direita: Formulário ═══ */}
          <div className='lg:col-span-3'>
            <div className='bg-white rounded-xl shadow-md border border-gray-100 p-6 sm:p-8'>
              <div className='mb-6'>
                <h2 className='text-xl font-semibold text-gray-900'>
                  Envie sua mensagem
                </h2>
                <p className='text-gray-500 text-sm mt-1'>
                  Preencha o formulário e entraremos em contato o mais breve possível.
                </p>
              </div>

              <form ref={form} onSubmit={sendEmail} className='space-y-5'>
                <div>
                  <label
                    htmlFor='name'
                    className='block text-sm font-medium text-gray-700 mb-1.5'
                  >
                    Seu nome
                  </label>
                  <input
                    type='text'
                    id='name'
                    name='name'
                    placeholder='Ex: João Silva'
                    required
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition duration-200 text-sm'
                  />
                </div>

                <div>
                  <label
                    htmlFor='email'
                    className='block text-sm font-medium text-gray-700 mb-1.5'
                  >
                    Seu e-mail
                  </label>
                  <input
                    type='email'
                    id='email'
                    name='email'
                    placeholder='Ex: joao@exemplo.com'
                    required
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition duration-200 text-sm'
                  />
                </div>

                <div>
                  <label
                    htmlFor='subject'
                    className='block text-sm font-medium text-gray-700 mb-1.5'
                  >
                    Assunto
                  </label>
                  <input
                    type='text'
                    id='subject'
                    name='subject'
                    placeholder='Ex: Dúvida sobre produto'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition duration-200 text-sm'
                  />
                </div>

                <div>
                  <label
                    htmlFor='message'
                    className='block text-sm font-medium text-gray-700 mb-1.5'
                  >
                    Sua mensagem
                  </label>
                  <textarea
                    id='message'
                    name='message'
                    placeholder='Escreva sua mensagem aqui...'
                    required
                    rows={5}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition duration-200 text-sm resize-none'
                  ></textarea>
                </div>

                <div className='pt-1'>
                  <button
                    type='submit'
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-dull text-white font-semibold rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className='w-4 h-4' />
                        Enviar Mensagem
                      </>
                    )}
                  </button>
                </div>
              </form>

              {success && (
                <div className='mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3'>
                  <span className='text-green-600 text-lg'>✓</span>
                  <div>
                    <p className='text-green-700 font-semibold text-sm'>
                      Mensagem enviada com sucesso!
                    </p>
                    <p className='text-green-600 text-sm mt-0.5'>
                      Entraremos em contato em breve.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3'>
                  <span className='text-red-600 text-lg'>✕</span>
                  <div>
                    <p className='text-red-700 font-semibold text-sm'>Erro ao enviar mensagem</p>
                    <p className='text-red-600 text-sm mt-0.5'>
                      Por favor, tente novamente mais tarde ou entre em contato pelo WhatsApp.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
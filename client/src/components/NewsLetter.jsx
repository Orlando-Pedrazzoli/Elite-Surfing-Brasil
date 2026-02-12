import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

const NewsLetter = () => {
  const form = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  const sendSubscriptionEmail = async e => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY);

      toast.success(
        '🎉 Bem-vindo à nossa comunidade! Em breve você receberá ofertas e novidades exclusivas diretamente no seu e-mail. Fique ligado!',
        {
          duration: 6000,
          position: 'bottom-center',
        }
      );

      form.current.reset();
    } catch (error) {
      console.error('Erro ao inscrever e-mail:', error);
      toast.error(
        '❌ Ops! Não foi possível completar a inscrição. Por favor, tente novamente mais tarde.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center text-center space-y-2 mt-24 pb-14 px-6 md:px-16 lg:px-24 xl:px-32'>
      <h1 className='md:text-4xl text-2xl font-semibold'>
        Não perca nenhuma oportunidade!
      </h1>
      <p className='md:text-lg text-gray-500/70 pb-8'>
        Inscreva-se para receber as últimas ofertas, novidades e descontos
        exclusivos.
      </p>
      <form
        ref={form}
        onSubmit={sendSubscriptionEmail}
        className='flex items-center justify-between max-w-2xl w-full md:h-13 h-12'
      >
        <input
          className='border border-gray-300 rounded-md h-full border-r-0 outline-none w-full rounded-r-none px-3 text-gray-500'
          type='email'
          name='user_email'
          placeholder='Seu melhor e-mail'
          required
        />
        <button
          type='submit'
          disabled={isSubmitting}
          className={`md:px-12 px-8 h-full text-white bg-primary hover:bg-primary-dull transition-all cursor-pointer rounded-md rounded-l-none ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Inscrevendo...' : 'Inscrever'}
        </button>
      </form>
    </div>
  );
};

export default NewsLetter;
// client/src/components/priceTables/OrderEmailModal.jsx
// ═══════════════════════════════════════════════════════════════════════
// ✉️ ENVIAR PEDIDO POR EMAIL (PDF em anexo + resumo no corpo)
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { X, Loader2, Send, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidEmail, splitEmails } from '../../utils/priceTableUtils';
import { ORDER_API, formatOrderNumber } from '../../utils/priceTableOrderUtils';

const MAX_RECIPIENTS = 5;

const defaultMessage = name =>
  `Olá${name ? `, ${name}` : ''}!\n\nSegue o seu pedido para conferir os itens e os valores. Se estiver tudo certo, é só responder a este email confirmando.\n\nAbraço,\nEquipe Elite Surfing`;

const OrderEmailModal = ({
  open,
  onClose,
  axios,
  order,
  withImages,
  emailConfigured,
  onSent,
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !order) return;
    setTo(order.customer?.email || '');
    setSubject(
      `Pedido nº ${formatOrderNumber(order.number)} — Elite Surfing Brasil`,
    );
    setMessage(defaultMessage(order.customer?.name));
    setError('');
    setSending(false);
  }, [open, order]);

  if (!open || !order) return null;

  const submit = async e => {
    e.preventDefault();
    const recipients = [...new Set(splitEmails(to))];
    if (!recipients.length) return setError('Informe o email do cliente.');
    if (recipients.length > MAX_RECIPIENTS)
      return setError(`No máximo ${MAX_RECIPIENTS} emails de cada vez.`);
    const invalid = recipients.filter(email => !isValidEmail(email));
    if (invalid.length)
      return setError(`Email inválido: ${invalid.join(', ')}`);

    setError('');
    setSending(true);
    try {
      const { data } = await axios.post(
        `${ORDER_API}/${order._id}/send`,
        { recipients, subject, message, images: withImages },
        { timeout: 70000 },
      );
      if (!data.success) {
        const failed = (data.results || []).find(r => r.status === 'failed');
        throw new Error(failed?.error || data.message);
      }
      const missingImages =
        data.imageStats &&
        data.imageStats.requested - data.imageStats.loaded > 0;
      toast.success(data.message || 'Pedido enviado');
      if (missingImages)
        toast(
          `${data.imageStats.requested - data.imageStats.loaded} imagem(ns) não carregaram e saíram em branco no PDF.`,
          { icon: '⚠️' },
        );
      onSent?.(data.order);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Não foi possível enviar',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4'
      onClick={() => !sending && onClose()}
    >
      <form
        role='dialog'
        aria-modal='true'
        aria-labelledby='order-email-title'
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className='bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col'
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
          <h2
            id='order-email-title'
            className='text-lg font-bold text-gray-900'
          >
            Enviar pedido por email
          </h2>
          <button
            type='button'
            onClick={onClose}
            disabled={sending}
            aria-label='Fechar'
            className='p-2 text-gray-400 hover:text-gray-700 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-5 space-y-4 overflow-y-auto'>
          {!emailConfigured && (
            <p className='flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2'>
              <AlertTriangle className='w-4 h-4 flex-shrink-0 mt-0.5' />O envio
              de email não está configurado no servidor.
            </p>
          )}
          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>Para</span>
            <input
              type='text'
              inputMode='email'
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder='email@loja.com.br'
              className='mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
            <span className='text-xs text-gray-400'>
              Separe vários emails com vírgula.
            </span>
          </label>
          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>Assunto</span>
            <input
              type='text'
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={150}
              className='mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
          </label>
          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>Mensagem</span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              maxLength={3000}
              className='mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
          </label>
          <p className='text-xs text-gray-500'>
            O email leva a lista de itens com o total no corpo e o pedido em PDF
            anexado{withImages ? ' (com fotos)' : ''}.
          </p>
          {error && (
            <p className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2'>
              {error}
            </p>
          )}
        </div>

        <div className='flex justify-end gap-2 px-5 py-4 border-t border-gray-200'>
          <button
            type='button'
            onClick={onClose}
            disabled={sending}
            className='px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50'
          >
            Cancelar
          </button>
          <button
            type='submit'
            disabled={sending || !emailConfigured}
            className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50'
          >
            {sending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Send className='w-4 h-4' />
            )}
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderEmailModal;

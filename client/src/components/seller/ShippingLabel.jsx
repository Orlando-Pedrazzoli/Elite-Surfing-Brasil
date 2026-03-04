import React from 'react';
import { X, Printer, Package, MapPin, Phone } from 'lucide-react';
import { assets } from '../../assets/assets';

const ShippingLabel = ({ order, onClose }) => {
  // ← ALTERADO: Dados do remetente atualizados para o Brasil
  const sender = {
    name: 'Elite Surfing Brasil',
    address: 'Av. das Américas, 12900, Bloco 1, Sala 203C',
    apartment: 'Ed. Argentina — Recreio dos Bandeirantes',
    zipcode: '22790-702',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brasil',
    phone: '(21) 96435-8058',
  };

  // Dados do destinatário (do pedido)
  const recipient = {
    name: `${order.address?.firstName || ''} ${order.address?.lastName || ''}`.trim(),
    address: order.address?.street || '',
    number: order.address?.number || '',
    complement: order.address?.complement || '',
    neighborhood: order.address?.neighborhood || '',
    zipcode: order.address?.zipcode || '',
    city: order.address?.city || '',
    state: order.address?.state || '',
    country: order.address?.country || '',
    phone: order.address?.phone || order.guestPhone || '',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden'
        onClick={onClose}
      >
        <div
          className='bg-white rounded-2xl shadow-2xl max-w-xl w-full'
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className='flex items-center justify-between p-5 border-b border-gray-200'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center'>
                <Package className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-gray-900'>
                  Etiqueta de Envio {order.shippingCarrier || 'Melhor Envio'}
                </h2>
                <p className='text-sm text-gray-500'>
                  Pedido #{order._id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <button
                onClick={handlePrint}
                className='flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded-lg font-medium transition-colors'
              >
                <Printer className='w-4 h-4' />
                Imprimir
              </button>
              <button
                onClick={onClose}
                className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className='p-6 bg-gray-50 flex justify-center overflow-auto max-h-[75vh]'>
            <div className='bg-white p-2 rounded-lg shadow-lg'>
              <LabelContent
                sender={sender}
                recipient={recipient}
                order={order}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only version */}
      <div className='hidden print:block'>
        <LabelContent sender={sender} recipient={recipient} order={order} />
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          @page {
            size: 105mm 148mm portrait;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
};

// Componente da etiqueta em si
const LabelContent = ({ sender, recipient, order }) => {
  const orderId = order._id.slice(-8).toUpperCase();

  return (
    <div
      className='relative bg-white'
      style={{
        width: '105mm',
        height: '148mm',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div className='w-full h-full p-4 flex flex-col'>
        {/* Header - Logo Elite Surfing */}
        <div className='flex items-center justify-center mb-4 pb-4 border-b-2 border-gray-300'>
          <img src={assets.logo_es} alt='Elite Surfing' className='h-10' />
        </div>

        {/* REMETENTE */}
        <div className='mb-6'>
          <div className='bg-gray-50 rounded-lg p-3 border-2 border-gray-300 max-w-[65%]'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-5 h-5 bg-blue-100 rounded flex items-center justify-center flex-shrink-0'>
                <MapPin className='w-3 h-3 text-blue-600' />
              </div>
              <h3 className='text-xs font-bold text-gray-700 uppercase'>
                Remetente
              </h3>
            </div>

            <div className='space-y-0.5'>
              <p className='text-sm font-bold text-gray-900'>{sender.name}</p>
              <p className='text-xs text-gray-700 leading-tight'>
                {sender.address}
              </p>
              <p className='text-xs text-gray-700 leading-tight'>
                {sender.apartment}
              </p>
              <p className='text-xs text-gray-700 leading-tight'>
                CEP {sender.zipcode} — {sender.city}/{sender.state}
              </p>
              <p className='text-xs text-gray-700 font-medium'>
                {sender.country}
              </p>
              {/* ← NOVO: telefone do remetente */}
              <p className='text-xs text-gray-600 pt-1'>📞 {sender.phone}</p>
            </div>
          </div>
        </div>

        {/* Espaço flexível */}
        <div className='flex-1'></div>

        {/* DESTINATÁRIO */}
        <div className='flex justify-end mb-4'>
          <div className='bg-white rounded-lg p-4 border-4 border-red-600 relative max-w-[75%]'>
            <div className='absolute -top-3 right-3 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold'>
              DESTINATÁRIO
            </div>

            <div className='mt-1 space-y-1.5'>
              <p className='text-lg font-bold text-gray-900 leading-tight'>
                {recipient.name || 'Nome não informado'}
              </p>

              <div className='space-y-0.5'>
                {/* ← ALTERADO: endereço completo com número, complemento e bairro */}
                <p className='text-sm text-gray-800 leading-tight'>
                  {recipient.address}
                  {recipient.number ? `, ${recipient.number}` : ''}
                </p>
                {recipient.complement && (
                  <p className='text-xs text-gray-600 leading-tight'>
                    {recipient.complement}
                  </p>
                )}
                {recipient.neighborhood && (
                  <p className='text-xs text-gray-700 leading-tight'>
                    {recipient.neighborhood}
                  </p>
                )}
                <p className='text-base font-bold text-gray-900'>
                  CEP {recipient.zipcode} — {recipient.city}
                </p>
                {recipient.state && (
                  <p className='text-sm text-gray-700'>{recipient.state}</p>
                )}
                <p className='text-sm font-semibold text-gray-900 uppercase'>
                  {recipient.country || 'País não informado'}
                </p>
              </div>

              {recipient.phone && (
                <div className='pt-2 mt-2 border-t-2 border-gray-200'>
                  <p className='text-sm text-gray-700 flex items-center gap-2'>
                    <Phone className='w-4 h-4 text-red-600 flex-shrink-0' />
                    <span className='font-medium'>{recipient.phone}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='mt-auto pt-3 border-t-2 border-gray-300'>
          <div className='flex justify-between items-center text-xs'>
            <div className='space-y-0.5'>
              <p className='text-gray-600'>
                <span className='font-semibold'>Pedido:</span> #{orderId}
              </p>
              <p className='text-gray-600'>
                <span className='font-semibold'>Itens:</span>{' '}
                {order.items.length}
              </p>
              {order.shippingCarrier && (
                <p className='text-gray-600'>
                  <span className='font-semibold'>Transportadora:</span>{' '}
                  {order.shippingCarrier}
                </p>
              )}
            </div>
          </div>

          {/* ← ALTERADO: transportadora dinâmica via Melhor Envio */}
          <div className='mt-3 pt-2 border-t border-gray-200 text-center'>
            <p className='text-xs text-gray-500 font-semibold'>
              {order.shippingCarrier || 'Melhor Envio'}
            </p>
            <p className='text-xs text-gray-400'>www.melhorenvio.com.br</p>
          </div>
        </div>
      </div>

      {/* Linhas de corte (apenas no preview) */}
      <div className='print:hidden absolute inset-0 pointer-events-none'>
        <div className='absolute top-0 left-0 right-0 h-px border-t-2 border-dashed border-gray-400'></div>
        <div className='absolute bottom-0 left-0 right-0 h-px border-b-2 border-dashed border-gray-400'></div>
        <div className='absolute top-0 bottom-0 left-0 w-px border-l-2 border-dashed border-gray-400'></div>
        <div className='absolute top-0 bottom-0 right-0 w-px border-r-2 border-dashed border-gray-400'></div>
      </div>
    </div>
  );
};

export default ShippingLabel;

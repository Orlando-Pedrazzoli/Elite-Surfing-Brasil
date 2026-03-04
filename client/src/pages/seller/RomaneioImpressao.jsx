import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  X,
  Printer,
  Share2,
  Mail,
  MessageCircle,
  Loader2,
  Building2,
  User,
  Package,
  DollarSign,
  Truck,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { assets } from '../../assets/assets';

const statusConfig = {
  Rascunho: { label: 'Rascunho', color: '#64748b' },
  Confirmado: { label: 'Confirmado', color: '#2563eb' },
  Faturado: { label: 'Faturado', color: '#16a34a' },
  Cancelado: { label: 'Cancelado', color: '#dc2626' },
};

const formatCurrency = v =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    v || 0,
  );

const formatDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const RomaneioImpressao = ({ romaneioId, onClose }) => {
  const { axios } = useAppContext();
  const [romaneio, setRomaneio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`/api/romaneios/${romaneioId}`);
        if (data.success) setRomaneio(data.romaneio);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [romaneioId]);

  if (!romaneioId) return null;

  const handlePrint = () => window.print();

  const buildTexto = () => {
    if (!romaneio) return '';
    const linhas = [
      `*PEDIDO #${romaneio.numero} — Elite Surfing Brasil*`,
      `Data: ${formatDate(romaneio.dataVenda)}`,
      `Status: ${romaneio.status}`,
      ``,
      `*CLIENTE*`,
      `${romaneio.clienteNome}`,
      romaneio.clienteCpfCnpj ? `CPF/CNPJ: ${romaneio.clienteCpfCnpj}` : '',
      romaneio.clienteEmail ? `Email: ${romaneio.clienteEmail}` : '',
      romaneio.clienteTelefone ? `Tel: ${romaneio.clienteTelefone}` : '',
      ``,
      `*ITENS*`,
      ...romaneio.itens.map(
        i =>
          `• ${i.nome}${i.sku ? ` (${i.sku})` : ''} — ${i.quantidade} un × ${formatCurrency(i.precoUnitario)} = ${formatCurrency(i.precoTotal)}`,
      ),
      ``,
      `*TOTAIS*`,
      `Subtotal: ${formatCurrency(romaneio.totalItens)}`,
      romaneio.frete > 0 ? `Frete: ${formatCurrency(romaneio.frete)}` : '',
      `*TOTAL: ${formatCurrency(romaneio.totalVenda)}*`,
      ``,
      `*PAGAMENTO*`,
      `Condição: ${romaneio.condicaoPagamento || 'À Vista'}`,
      ...(romaneio.parcelas?.length > 1
        ? romaneio.parcelas.map(
            (p, i) =>
              `Parcela ${i + 1}: ${formatCurrency(p.valor)} — ${formatDate(p.data)} — ${p.forma}`,
          )
        : []),
    ].filter(l => l !== null && l !== undefined);

    return linhas.join('\n');
  };

  const handleWhatsApp = () => {
    const texto = encodeURIComponent(buildTexto());
    const telefone = romaneio?.clienteTelefone?.replace(/\D/g, '');
    const url = telefone
      ? `https://wa.me/55${telefone}?text=${texto}`
      : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    if (!romaneio) return;
    const assunto = encodeURIComponent(
      `Pedido #${romaneio.numero} — Elite Surfing Brasil`,
    );
    const corpo = encodeURIComponent(buildTexto().replace(/\*/g, ''));
    const dest = romaneio.clienteEmail || '';
    window.open(`mailto:${dest}?subject=${assunto}&body=${corpo}`, '_blank');
  };

  const sc = romaneio
    ? statusConfig[romaneio.status] || statusConfig.Rascunho
    : null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden'
        onClick={onClose}
      >
        <div
          className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col'
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center'>
                <FileText className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-gray-900'>
                  {loading ? 'Carregando...' : `Pedido #${romaneio?.numero}`}
                </h2>
                <p className='text-sm text-gray-500'>
                  Romaneio de Venda Direta
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {!loading && romaneio && (
                <>
                  <button
                    onClick={handleWhatsApp}
                    className='flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm'
                  >
                    <MessageCircle className='w-4 h-4' />
                    <span className='hidden sm:inline'>WhatsApp</span>
                  </button>
                  <button
                    onClick={handleEmail}
                    className='flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm'
                  >
                    <Mail className='w-4 h-4' />
                    <span className='hidden sm:inline'>Email</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className='flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors text-sm'
                  >
                    <Printer className='w-4 h-4' />
                    <span className='hidden sm:inline'>Imprimir</span>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
          </div>

          {/* Preview scrollável */}
          <div className='flex-1 overflow-y-auto p-6 bg-gray-50'>
            {loading ? (
              <div className='flex justify-center py-16'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
              </div>
            ) : romaneio ? (
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-1'>
                <PrintContent romaneio={romaneio} />
              </div>
            ) : (
              <p className='text-center text-gray-500 py-16'>
                Erro ao carregar romaneio
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Versão só de impressão */}
      <div className='hidden print:block'>
        {romaneio && <PrintContent romaneio={romaneio} />}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </>
  );
};

// ══════════════════════════════════════════════
// CONTEÚDO IMPRIMÍVEL
// ══════════════════════════════════════════════
const PrintContent = ({ romaneio }) => {
  const sc = statusConfig[romaneio.status] || statusConfig.Rascunho;
  const totalQtd = romaneio.itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#1e293b',
        padding: '24px',
        maxWidth: '700px',
        margin: '0 auto',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          <img
            src={assets.logo_es}
            alt='Elite Surfing Brasil'
            style={{ height: '36px', marginBottom: '4px' }}
          />
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
            Av. das Américas, 12900, Bloco 1, Sala 203C
          </p>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
            Recreio dos Bandeirantes — Rio de Janeiro/RJ
          </p>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
            CEP 22790-702 · (21) 96435-8058
          </p>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
            atendimento@elitesurfing.com.br
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 4px 0',
              color: '#0f172a',
            }}
          >
            PEDIDO #{romaneio.numero}
          </p>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#fff',
              backgroundColor: sc.color,
              marginBottom: '6px',
            }}
          >
            {sc.label}
          </div>
          <p
            style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}
          >
            Data: {formatDate(romaneio.dataVenda)}
          </p>
          {romaneio.dataSaida && (
            <p
              style={{
                fontSize: '10px',
                color: '#64748b',
                margin: '1px 0 0 0',
              }}
            >
              Saída: {formatDate(romaneio.dataSaida)}
            </p>
          )}
          {romaneio.dataPrevista && (
            <p
              style={{
                fontSize: '10px',
                color: '#64748b',
                margin: '1px 0 0 0',
              }}
            >
              Prev.: {formatDate(romaneio.dataPrevista)}
            </p>
          )}
        </div>
      </div>

      {/* ── Cliente ── */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 8px 0',
          }}
        >
          DADOS DO CLIENTE
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
          }}
        >
          <div>
            <p
              style={{
                fontWeight: 'bold',
                fontSize: '13px',
                margin: '0 0 2px 0',
              }}
            >
              {romaneio.clienteNome}
            </p>
            {romaneio.clienteCpfCnpj && (
              <p style={{ margin: '0 0 1px 0', color: '#475569' }}>
                {romaneio.clienteTipo === 'PJ' ? 'CNPJ' : 'CPF'}:{' '}
                {romaneio.clienteCpfCnpj}
              </p>
            )}
            {romaneio.clienteEmail && (
              <p style={{ margin: '0 0 1px 0', color: '#475569' }}>
                Email: {romaneio.clienteEmail}
              </p>
            )}
            {romaneio.clienteTelefone && (
              <p style={{ margin: '0', color: '#475569' }}>
                Tel: {romaneio.clienteTelefone}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                backgroundColor:
                  romaneio.clienteTipo === 'PJ' ? '#dbeafe' : '#dcfce7',
                color: romaneio.clienteTipo === 'PJ' ? '#1d4ed8' : '#15803d',
              }}
            >
              {romaneio.clienteTipo === 'PJ'
                ? '🏢 Pessoa Jurídica'
                : '👤 Pessoa Física'}
            </span>
          </div>
        </div>

        {/* Endereço de entrega */}
        {romaneio.enderecoEntregaDiferente && romaneio.enderecoEntrega && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px dashed #cbd5e1',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#64748b',
                margin: '0 0 4px 0',
              }}
            >
              ENDEREÇO DE ENTREGA
            </p>
            <p style={{ margin: 0, color: '#475569' }}>
              {romaneio.enderecoEntrega.rua}
              {romaneio.enderecoEntrega.numero
                ? `, ${romaneio.enderecoEntrega.numero}`
                : ''}
              {romaneio.enderecoEntrega.complemento
                ? ` — ${romaneio.enderecoEntrega.complemento}`
                : ''}
            </p>
            <p style={{ margin: 0, color: '#475569' }}>
              {romaneio.enderecoEntrega.bairro} —{' '}
              {romaneio.enderecoEntrega.cidade}/
              {romaneio.enderecoEntrega.estado} · CEP{' '}
              {romaneio.enderecoEntrega.cep}
            </p>
          </div>
        )}
      </div>

      {/* ── Itens ── */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 8px 0',
          }}
        >
          ITENS DO PEDIDO
        </p>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                }}
              >
                Descrição
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '50px',
                }}
              >
                Cód.
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '30px',
                }}
              >
                Un
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '50px',
                }}
              >
                Qtd
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '80px',
                }}
              >
                Preço Lista
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '50px',
                }}
              >
                Desc%
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '80px',
                }}
              >
                Preço Un
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '6px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: '600',
                  color: '#475569',
                  width: '90px',
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {romaneio.itens.map((item, idx) => (
              <tr
                key={idx}
                style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    fontWeight: '500',
                  }}
                >
                  {item.nome}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '10px',
                  }}
                >
                  {item.sku || '—'}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  {item.unidade || 'UN'}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'center',
                    fontWeight: '600',
                  }}
                >
                  {item.quantidade}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'right',
                    color: '#64748b',
                  }}
                >
                  {formatCurrency(item.precoLista)}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'center',
                    color: item.desconto > 0 ? '#dc2626' : '#64748b',
                  }}
                >
                  {item.desconto > 0 ? `${item.desconto}%` : '—'}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'right',
                  }}
                >
                  {formatCurrency(item.precoUnitario)}
                </td>
                <td
                  style={{
                    padding: '5px 8px',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  {formatCurrency(item.precoTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totais ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Resumo qtd */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#64748b',
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
            }}
          >
            RESUMO
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: '#64748b' }}>Nº de itens:</span>
            <span style={{ fontWeight: '600' }}>{romaneio.itens.length}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: '#64748b' }}>Total unidades:</span>
            <span style={{ fontWeight: '600' }}>{totalQtd}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: '#64748b' }}>Subtotal itens:</span>
            <span style={{ fontWeight: '600' }}>
              {formatCurrency(romaneio.totalItens)}
            </span>
          </div>
          {romaneio.frete > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span style={{ color: '#64748b' }}>Frete:</span>
              <span style={{ fontWeight: '600' }}>
                {formatCurrency(romaneio.frete)}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px solid #e2e8f0',
              marginTop: '6px',
              paddingTop: '6px',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
              TOTAL DA VENDA:
            </span>
            <span
              style={{ fontWeight: 'bold', fontSize: '14px', color: '#358f61' }}
            >
              {formatCurrency(romaneio.totalVenda)}
            </span>
          </div>
        </div>

        {/* Pagamento */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#64748b',
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
            }}
          >
            PAGAMENTO
          </p>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Condição: </span>
            <span style={{ fontWeight: '600' }}>
              {romaneio.condicaoPagamento || 'À Vista'}
            </span>
          </div>
          {romaneio.parcelas?.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#475569',
                marginBottom: '3px',
                borderBottom: '1px dashed #e2e8f0',
                paddingBottom: '3px',
              }}
            >
              <span>
                {p.dias > 0 ? `${p.dias} dias` : 'À Vista'} —{' '}
                {formatDate(p.data)}
              </span>
              <span style={{ fontWeight: '600' }}>
                {formatCurrency(p.valor)} ({p.forma})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transporte ── */}
      {(romaneio.transportador || romaneio.pesoBruto > 0) && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#64748b',
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
            }}
          >
            TRANSPORTE
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            {romaneio.transportador && (
              <div>
                <span style={{ color: '#64748b' }}>Transportador:</span>
                <br />
                <strong>{romaneio.transportador}</strong>
              </div>
            )}
            <div>
              <span style={{ color: '#64748b' }}>Frete por conta:</span>
              <br />
              <strong>{romaneio.fretePorConta}</strong>
            </div>
            {romaneio.quantidadeVolumes > 0 && (
              <div>
                <span style={{ color: '#64748b' }}>Volumes:</span>
                <br />
                <strong>{romaneio.quantidadeVolumes}</strong>
              </div>
            )}
            {romaneio.pesoBruto > 0 && (
              <div>
                <span style={{ color: '#64748b' }}>Peso bruto:</span>
                <br />
                <strong>{romaneio.pesoBruto} kg</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Observações ── */}
      {(romaneio.observacoes || romaneio.observacoesInternas) && (
        <div style={{ marginBottom: '16px' }}>
          {romaneio.observacoes && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '8px',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#92400e',
                  margin: '0 0 4px 0',
                }}
              >
                OBSERVAÇÕES
              </p>
              <p style={{ margin: 0, color: '#78350f', fontSize: '11px' }}>
                {romaneio.observacoes}
              </p>
            </div>
          )}
          {romaneio.observacoesInternas && (
            <div
              style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '10px',
              }}
              className='print:hidden'
            >
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#0c4a6e',
                  margin: '0 0 4px 0',
                }}
              >
                OBS. INTERNAS (não impresso para o cliente)
              </p>
              <p style={{ margin: 0, color: '#0369a1', fontSize: '11px' }}>
                {romaneio.observacoesInternas}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Assinaturas ── */}
      <div
        style={{
          borderTop: '2px solid #e2e8f0',
          paddingTop: '24px',
          marginTop: '8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #1e293b',
              paddingTop: '8px',
              marginTop: '32px',
            }}
          >
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              Responsável — Elite Surfing Brasil
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #1e293b',
              paddingTop: '8px',
              marginTop: '32px',
            }}
          >
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              {romaneio.clienteNome}
            </p>
            {romaneio.clienteCpfCnpj && (
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '10px',
                  color: '#94a3b8',
                }}
              >
                {romaneio.clienteCpfCnpj}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Rodapé ── */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
          Elite Surfing Brasil · atendimento@elitesurfing.com.br · (21)
          96435-8058 · www.elitesurfing.com.br
        </p>
        <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#cbd5e1' }}>
          Documento gerado em {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default RomaneioImpressao;

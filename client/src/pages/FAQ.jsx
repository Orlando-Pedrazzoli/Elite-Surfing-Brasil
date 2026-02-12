import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react';
import { SEO, FAQSchema, BreadcrumbSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  // 🎯 FAQs - Usadas tanto para exibição quanto para o Schema
  const faqs = [
    {
      question: 'Como faço um pedido?',
      answer: `Escolha o produto que deseja comprar, selecione o tamanho ou cor (se disponível) e clique em "Adicionar ao Carrinho".

Você será direcionado ao carrinho de compras. Se quiser adicionar mais itens, clique em "Continuar Comprando". Quando estiver tudo certo, clique em "Finalizar Pedido".

Escolha se deseja finalizar como visitante ou como usuário cadastrado. Preencha os dados de entrega com atenção (endereço completo, e-mail válido e telefone). Finalize a compra escolhendo a forma de pagamento.

Você receberá um e-mail de confirmação com os detalhes do pedido. Após a confirmação do pagamento, é só aguardar a entrega!`
    },
    {
      question: 'Preciso me cadastrar para fazer um pedido?',
      answer: 'O cadastro não é obrigatório, mas recomendamos que se cadastre. Ter uma conta torna as próximas compras mais rápidas, permite acompanhar seus pedidos e acessar o histórico de compras a qualquer momento.'
    },
    {
      question: 'Quais são as formas de pagamento?',
      answer: `Cartão de Crédito: Aceitamos Visa e Mastercard em até 10x sem juros. Seus dados são protegidos com criptografia SSL 256-bit via Stripe.

PIX: Pagamento instantâneo com 10% de desconto. Após finalizar o pedido, o QR Code será exibido na tela e enviado por e-mail.

Boleto Bancário: O boleto tem validade de 24 horas. Após o pagamento, a compensação pode levar até 2 dias úteis.`
    },
    {
      question: 'Por que meu pagamento pode ser recusado?',
      answer: `Existem alguns motivos possíveis: O cartão pode estar vencido — confira a validade. O limite do cartão pode ter sido atingido — entre em contato com seu banco. Os dados podem estar incorretos — verifique se preencheu tudo corretamente. A autenticação 3D Secure pode não ter sido concluída — confirme com seu banco ou tente novamente.`
    },
    {
      question: 'É seguro pagar com cartão de crédito?',
      answer: 'Sim! Utilizamos o Stripe como processador de pagamentos, com criptografia SSL 256-bit. Seus dados de cartão nunca são armazenados em nossos servidores. Todas as transações são protegidas contra fraude.'
    },
    {
      question: 'Até quando posso pagar meu pedido?',
      answer: 'Para pagamentos via boleto, o prazo é de 24 horas. Após esse período, o pedido será automaticamente cancelado. Pagamentos por PIX e cartão de crédito são processados imediatamente.'
    },
    {
      question: 'Como funciona o frete?',
      answer: `Compras a partir de R$ 199,00: frete grátis para as regiões Sul e Sudeste.

Compras a partir de R$ 299,00: frete grátis para todo o Brasil.

Entrega expressa: Em compras de qualquer valor, realizadas até 11:30h, por apenas R$ 9,99, a entrega é feita no mesmo dia útil para a Grande Rio de Janeiro (produtos selecionados).

Para mais detalhes, consulte nossa página de Frete Grátis na seção Institucional.`
    },
    {
      question: 'Quais são os prazos de entrega?',
      answer: `Grande Rio de Janeiro: 1 a 3 dias úteis.
Capitais e regiões metropolitanas: 3 a 7 dias úteis.
Interior e demais localidades: 5 a 12 dias úteis.

Os prazos começam a contar a partir da confirmação do pagamento e podem variar conforme a região e a disponibilidade da transportadora. Todos os envios possuem código de rastreamento.`
    },
    {
      question: 'Como rastreio meu pedido?',
      answer: 'Após o despacho, você receberá o código de rastreamento por e-mail. Também é possível acompanhar o status da entrega na área "Meus Pedidos" do site, em tempo real.'
    },
    {
      question: 'Posso trocar um produto?',
      answer: `Sim! Você tem 7 dias corridos após o recebimento para solicitar a troca, conforme o Código de Defesa do Consumidor.

Para iniciar a troca, entre em contato pelo e-mail atendimento@elitesurfing.com.br ou pelo WhatsApp (21) 96435-8058, informando o número do pedido e o motivo.

O produto deve estar em sua embalagem original, sem sinais de uso e com todos os acessórios.`
    },
    {
      question: 'Posso devolver um produto?',
      answer: `Sim! De acordo com o Art. 49 do CDC, você tem 7 dias corridos após o recebimento para devolver o produto por arrependimento, sem necessidade de justificativa.

Para iniciar a devolução, entre em contato pelo e-mail atendimento@elitesurfing.com.br ou pelo WhatsApp (21) 96435-8058.

O reembolso será processado em até 3 dias úteis após o recebimento e análise do produto.`
    },
    {
      question: 'Como funciona o reembolso?',
      answer: `Cartão de crédito: O estorno segue as regras da administradora do cartão e depende da data de vencimento da sua fatura.

PIX ou Boleto: O valor é reembolsado em conta corrente ou poupança informada pelo cliente.

Todos os ressarcimentos são processados em até 3 dias úteis após o recebimento e análise técnica do produto em nosso centro de distribuição.`
    },
    {
      question: 'Qual a garantia dos produtos?',
      answer: `Todos os produtos possuem garantia legal de 90 dias contra defeitos de fabricação, conforme o Código de Defesa do Consumidor.

A Elite Surfing oferece garantias de até 12 meses, dependendo do produto. Em caso de defeito confirmado, fazemos a troca sem custo adicional. Consulte a descrição de cada produto para detalhes específicos.`
    },
    {
      question: 'Como uso um cupom de desconto?',
      answer: 'No carrinho de compras, insira o código no campo "Cupom de Desconto" e clique em "Aplicar". O desconto será aplicado automaticamente ao valor total. Cupons não são cumulativos, salvo indicação expressa.'
    },
    {
      question: 'Como entro em contato com vocês?',
      answer: `Você pode nos contatar pelos seguintes canais:

📧 E-mail: atendimento@elitesurfing.com.br
📱 WhatsApp: (21) 96435-8058

Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Respondemos em até 24 horas úteis.`
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* SEO - Página FAQ com FAQPage Schema para Rich Snippets */}
      <SEO 
        title={seoConfig.faq.title}
        description={seoConfig.faq.description}
        url={seoConfig.faq.url}
      >
        <FAQSchema faqs={faqs} />
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Perguntas Frequentes' }
        ]} />
      </SEO>

      <div className='min-h-screen bg-gray-50'>
        {/* Hero Section */}
        <div className='bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16'>
          <div className='max-w-4xl mx-auto px-4'>
            <div className='flex items-center gap-3 mb-4'>
              <HelpCircle className='w-10 h-10' />
              <h1 className='text-3xl md:text-4xl font-bold'>
                Perguntas Frequentes
              </h1>
            </div>
            <p className='text-white/90 text-lg'>
              Confira as respostas para as dúvidas mais comuns sobre nossos 
              produtos e serviços.
            </p>
            <p className='text-white/80 text-sm mt-2'>
              Não encontrou o que procura? Entre em contato — estamos aqui para ajudar!
            </p>
          </div>
        </div>

        {/* FAQ Content */}
        <div className='max-w-4xl mx-auto px-4 py-12'>
          <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
            {faqs.map((faq, index) => (
              <div key={index} className='border-b border-gray-200 last:border-b-0'>
                <button
                  onClick={() => toggleFAQ(index)}
                  className='w-full text-left p-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4'
                >
                  <h3 className='text-lg font-semibold text-gray-900 pr-4'>
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <ChevronUp className='w-5 h-5 text-primary flex-shrink-0' />
                  ) : (
                    <ChevronDown className='w-5 h-5 text-gray-400 flex-shrink-0' />
                  )}
                </button>
                
                {openIndex === index && (
                  <div className='px-6 pb-6'>
                    <div className='text-gray-700 leading-relaxed whitespace-pre-line'>
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className='mt-12 bg-white rounded-xl shadow-sm p-8'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              Ainda tem dúvidas?
            </h2>
            <p className='text-gray-700 mb-6'>
              Se não encontrou a resposta que procurava, entre em contato diretamente:
            </p>
            
            <div className='grid md:grid-cols-2 gap-4'>
              <div className='bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6'>
                <div className='flex items-center gap-3 mb-2'>
                  <Mail className='w-5 h-5 text-primary' />
                  <h3 className='font-semibold text-gray-900'>E-mail</h3>
                </div>
                <a 
                  href='mailto:atendimento@elitesurfing.com.br'
                  className='text-primary hover:underline font-medium'
                >
                  atendimento@elitesurfing.com.br
                </a>
                <p className='text-sm text-gray-600 mt-2'>
                  Resposta em até 24 horas úteis
                </p>
              </div>

              <div className='bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6'>
                <div className='flex items-center gap-3 mb-2'>
                  <Phone className='w-5 h-5 text-primary' />
                  <h3 className='font-semibold text-gray-900'>WhatsApp</h3>
                </div>
                <a 
                  href='https://wa.me/5521964358058'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:underline font-medium'
                >
                  (21) 96435-8058
                </a>
                <p className='text-sm text-gray-600 mt-2'>
                  Seg-Sex: 9h às 18h
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className='text-center mt-8'>
            <Link
              to='/'
              className='inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dull text-white rounded-lg font-semibold transition-colors'
            >
              Voltar à Página Inicial
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;
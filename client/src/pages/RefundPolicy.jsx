import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Package, Clock, AlertCircle } from 'lucide-react';
import { SEO, BreadcrumbSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';

const RefundPolicy = () => {
  return (
    <>
      {/* SEO - Página de Política de Reembolso */}
      <SEO 
        title={seoConfig.refund.title}
        description={seoConfig.refund.description}
        url={seoConfig.refund.url}
      >
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Política de Devolução' }
        ]} />
      </SEO>

      <div className='min-h-screen bg-gray-50'>
        {/* Hero Section */}
        <div className='bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16'>
          <div className='max-w-4xl mx-auto px-4'>
            <div className='flex items-center gap-3 mb-4'>
              <Package className='w-10 h-10' />
              <h1 className='text-3xl md:text-4xl font-bold'>
                Política de Devolução
              </h1>
            </div>
            <p className='text-white/90 text-lg'>
              Sua satisfação é a nossa prioridade — Conforme o Código de Defesa do Consumidor
            </p>
            <p className='text-white/80 text-sm mt-2'>
              Última atualização: {new Date().toLocaleDateString('pt-BR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className='max-w-4xl mx-auto px-4 py-12'>
          <div className='bg-white rounded-xl shadow-sm p-8 space-y-8'>
            
            {/* Direito de Arrependimento */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Direito de Arrependimento
              </h2>
              <p className='text-gray-700 leading-relaxed mb-4'>
                De acordo com o <strong>Art. 49 do Código de Defesa do Consumidor (CDC)</strong>, 
                você tem o prazo de <strong>7 (sete) dias corridos</strong> após o recebimento 
                do produto para desistir da compra, sem necessidade de justificativa.
              </p>
              <div className='bg-blue-50 border-l-4 border-primary rounded p-4'>
                <p className='text-sm text-gray-700'>
                  <strong>Importante:</strong> Para ser elegível para a devolução, o produto 
                  deve estar em sua embalagem original, sem sinais de uso, com todas as 
                  etiquetas e acessórios. É necessário apresentar a nota fiscal ou comprovante 
                  de compra.
                </p>
              </div>
            </section>

            {/* Como Solicitar */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Como Solicitar uma Devolução
              </h2>
              <p className='text-gray-700 mb-4'>
                Para iniciar uma devolução, entre em contato conosco informando:
              </p>
              <ul className='space-y-1 mb-4'>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>Nome completo</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>Número do pedido</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>Motivo da devolução</span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>Fotos do produto (quando aplicável)</span>
                </li>
              </ul>
              <div className='bg-gray-50 rounded-lg p-6 space-y-3'>
                <div className='flex items-start gap-3'>
                  <Mail className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-900'>E-mail</p>
                    <a 
                      href='mailto:atendimento@elitesurfing.com.br' 
                      className='text-primary hover:underline'
                    >
                      atendimento@elitesurfing.com.br
                    </a>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Shield className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-900'>WhatsApp</p>
                    <p className='text-gray-600'>(21) 96435-8058</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Package className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-900'>Endereço para Devolução</p>
                    <p className='text-gray-600'>
                      AMÉRICAS AVENUE BUSINESS SQUARE<br />
                      Av. das Américas, 12900, Bloco 1, Sala 203C<br />
                      Edifício Argentina — Recreio dos Bandeirantes<br />
                      Rio de Janeiro — RJ, CEP 22790-702
                    </p>
                  </div>
                </div>
              </div>
              <div className='mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>Atenção:</strong> Produtos devolvidos sem solicitação prévia não 
                  serão aceitos. Nossa equipe analisará sua solicitação e responderá em até 
                  3 dias úteis com as instruções para devolução.
                </p>
              </div>
            </section>

            {/* Processo de Devolução */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Processo de Devolução
              </h2>
              <div className='space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0'>
                    1
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 mb-1'>
                      Entre em Contato
                    </h3>
                    <p className='text-gray-600 text-sm'>
                      Envie um e-mail ou WhatsApp com o número do pedido e motivo da devolução.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0'>
                    2
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 mb-1'>
                      Aguarde a Aprovação
                    </h3>
                    <p className='text-gray-600 text-sm'>
                      Se a devolução for aprovada, enviaremos as instruções de como enviar 
                      o produto de volta.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0'>
                    3
                  </div>
                  <div>
                    <h3 className='font-semibold text-gray-900 mb-1'>
                      Envie o Produto
                    </h3>
                    <p className='text-gray-600 text-sm'>
                      Envie o produto para o endereço indicado. Após o recebimento, faremos 
                      uma análise técnica em até 3 dias úteis.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Motivos para Devolução */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Motivos para Troca ou Devolução
              </h2>
              <div className='space-y-4'>
                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-1'>Defeito de Fabricação</h3>
                  <p className='text-gray-700 text-sm'>
                    Caso o produto apresente defeito, realizaremos a substituição por outro 
                    igual ou emitiremos um reembolso, conforme sua preferência. O frete de 
                    devolução será por nossa conta.
                  </p>
                </div>
                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-1'>Arrependimento da Compra</h3>
                  <p className='text-gray-700 text-sm'>
                    Se desistir da compra dentro do prazo de 7 dias (Art. 49, CDC), poderá 
                    devolver o produto e receber o reembolso total, incluindo o frete.
                  </p>
                </div>
                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-1'>Produto Incorreto</h3>
                  <p className='text-gray-700 text-sm'>
                    Caso receba um item diferente do solicitado, realizaremos a troca sem 
                    custos adicionais.
                  </p>
                </div>
                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-1'>Produto Avariado na Entrega</h3>
                  <p className='text-gray-700 text-sm'>
                    Confira a mercadoria no ato da entrega. Se o produto apresentar avarias, 
                    recuse o recebimento e avise imediatamente nossa central de atendimento.
                  </p>
                </div>
              </div>
            </section>

            {/* Frete de Devolução */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Custos de Frete na Devolução
              </h2>
              <div className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Por defeito ou erro no envio:</strong> os custos de frete serão 
                    arcados pela Elite Surfing.
                  </p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Por arrependimento:</strong> o cliente será responsável pelo custo 
                    do envio do produto de volta.
                  </p>
                </div>
              </div>
            </section>

            {/* Garantia */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Garantia dos Produtos
              </h2>
              <p className='text-gray-700 mb-4'>
                Conforme o <strong>Código de Defesa do Consumidor</strong>, todos os nossos 
                produtos possuem:
              </p>
              <div className='grid md:grid-cols-2 gap-4'>
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>Garantia Legal</h3>
                  <p className='text-sm text-gray-600'>
                    90 dias contra defeitos de fabricação (Art. 26 do CDC para produtos 
                    não duráveis).
                  </p>
                </div>
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>Garantia Estendida</h3>
                  <p className='text-sm text-gray-600'>
                    A Elite Surfing oferece garantia de até 12 meses, dependendo do produto. 
                    Consulte a descrição de cada item.
                  </p>
                </div>
              </div>
              <div className='mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>Exclusões:</strong> A garantia não cobre desgaste natural pelo uso, 
                  mau uso, modificações no produto ou danos causados por fatores externos.
                </p>
              </div>
            </section>

            {/* Reembolsos */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
                <Clock className='w-6 h-6 text-green-600' />
                Reembolso
              </h2>
              <p className='text-gray-700 mb-4'>
                Você será notificado após recebermos e inspecionarmos o produto devolvido. 
                Se o reembolso for aprovado:
              </p>
              <div className='bg-green-50 border-l-4 border-green-500 rounded p-4 space-y-2'>
                <p className='text-sm text-gray-700'>
                  <strong>Cartão de crédito:</strong> O prazo do estorno seguirá as regras da 
                  administradora do cartão e dependerá da data de vencimento da sua fatura.
                </p>
                <p className='text-sm text-gray-700'>
                  <strong>PIX ou Boleto:</strong> O valor será reembolsado em conta corrente 
                  ou poupança informada pelo cliente.
                </p>
                <p className='text-sm text-gray-700'>
                  <strong>Prazo:</strong> Todos os ressarcimentos serão processados em até 
                  <strong> 3 dias úteis</strong> após o recebimento e análise técnica do produto.
                </p>
              </div>
              <div className='mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>Importante:</strong> Caso seja detectado mau uso ou má fé por parte 
                  do cliente, a liberação do ressarcimento poderá ser negada.
                </p>
              </div>
            </section>

            {/* Exceções */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
                <AlertCircle className='w-6 h-6 text-red-600' />
                Exceções — Itens que Não Podem Ser Devolvidos
              </h2>
              <ul className='space-y-2'>
                <li className='flex items-start gap-2'>
                  <span className='text-red-600'>•</span>
                  <span className='text-gray-700'>
                    Produtos personalizados ou sob encomenda
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-600'>•</span>
                  <span className='text-gray-700'>
                    Produtos com sinais de uso, sem embalagem original ou sem acessórios
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-red-600'>•</span>
                  <span className='text-gray-700'>
                    <strong>Itens em promoção ou outlet</strong> (exceto defeito de fabricação)
                  </span>
                </li>
              </ul>
            </section>

            {/* Contato */}
            <section className='border-t pt-8'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Entre em Contato
              </h2>
              <p className='text-gray-700 mb-6'>
                Se tiver dúvidas sobre nossa política de devolução, entre em contato:
              </p>
              
              <div className='bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 space-y-4'>
                <div className='flex items-center gap-3'>
                  <Mail className='w-5 h-5 text-primary' />
                  <a 
                    href='mailto:atendimento@elitesurfing.com.br'
                    className='text-primary hover:underline font-medium'
                  >
                    atendimento@elitesurfing.com.br
                  </a>
                </div>
                <div className='flex items-center gap-3'>
                  <Shield className='w-5 h-5 text-primary' />
                  <span className='text-gray-700'>
                    WhatsApp: (21) 96435-8058
                  </span>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div className='text-center pt-8 border-t'>
              <Link
                to='/'
                className='inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dull text-white rounded-lg font-semibold transition-colors'
              >
                Voltar à Página Inicial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RefundPolicy;
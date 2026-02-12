import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { SEO, BreadcrumbSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';

const Terms = () => {
  return (
    <>
      {/* SEO - Página de Termos e Condições */}
      <SEO 
        title={seoConfig.terms.title}
        description={seoConfig.terms.description}
        url={seoConfig.terms.url}
      >
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Termos e Condições' }
        ]} />
      </SEO>

      <div className='min-h-screen bg-gray-50'>
        {/* Hero Section */}
        <div className='bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16'>
          <div className='max-w-4xl mx-auto px-4'>
            <div className='flex items-center gap-3 mb-4'>
              <FileText className='w-10 h-10' />
              <h1 className='text-3xl md:text-4xl font-bold'>
                Termos e Condições
              </h1>
            </div>
            <p className='text-white/90 text-lg'>
              Condições gerais de venda e uso da Elite Surfing Brasil
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
            
            {/* Introdução */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                1. Introdução
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Bem-vindo à Elite Surfing Brasil. Ao acessar e utilizar este site, você 
                concorda com estes termos e condições de uso. Se não concordar com alguma 
                parte destes termos, pedimos que não utilize o nosso site.
              </p>
            </section>

            {/* Identificação */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                2. Identificação da Empresa
              </h2>
              <div className='bg-gray-50 rounded-lg p-6 space-y-2'>
                <p className='text-gray-700'>
                  <strong>Razão Social:</strong> Elite Surfing Brasil
                </p>
                <p className='text-gray-700'>
                  <strong>Endereço:</strong> Av. das Américas, 12900, Bloco 1, Sala 203C, 
                  Edifício Argentina — Recreio dos Bandeirantes, Rio de Janeiro — RJ, CEP 22790-702
                </p>
                <p className='text-gray-700'>
                  <strong>E-mail:</strong> atendimento@elitesurfing.com.br
                </p>
                <p className='text-gray-700'>
                  <strong>WhatsApp:</strong> (21) 96435-8058
                </p>
              </div>
            </section>

            {/* Objeto */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                3. Objeto
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Os presentes termos e condições regulam a utilização do site Elite Surfing Brasil 
                e a aquisição de produtos através da nossa loja online. Ao efetuar uma compra, 
                o cliente declara ter lido, compreendido e aceito os presentes termos e condições, 
                em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990).
              </p>
            </section>

            {/* Pedidos e Pagamento */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                4. Pedidos e Pagamento
              </h2>
              <div className='space-y-4'>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>4.1. Processo de Compra</h3>
                  <p className='text-gray-700'>
                    Ao efetuar um pedido, o cliente receberá um e-mail de confirmação com todos 
                    os detalhes. O pedido só será processado após a confirmação do pagamento.
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>4.2. Prazo de Pagamento</h3>
                  <p className='text-gray-700'>
                    O cliente tem 24 horas para efetuar o pagamento via boleto. Pagamentos por 
                    PIX e cartão de crédito são processados imediatamente. Caso o pagamento não 
                    seja confirmado no prazo, o pedido será automaticamente cancelado.
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>4.3. Métodos de Pagamento</h3>
                  <ul className='list-disc list-inside text-gray-700 space-y-1'>
                    <li>Cartão de Crédito (Visa, Mastercard) — em até 10x sem juros</li>
                    <li>PIX — com 10% de desconto</li>
                    <li>Boleto Bancário</li>
                  </ul>
                </div>

                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>4.4. Nota Fiscal</h3>
                  <p className='text-gray-700'>
                    Conforme a legislação brasileira, a nota fiscal eletrônica (NF-e) será 
                    emitida para todos os pedidos e enviada por e-mail ao cliente.
                  </p>
                </div>
              </div>
            </section>

            {/* Preços */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                5. Preços e Promoções
              </h2>
              <p className='text-gray-700 leading-relaxed mb-4'>
                Todos os preços apresentados no site são em Reais (R$) e incluem todos os 
                impostos aplicáveis. Os preços podem ser alterados sem aviso prévio, porém 
                a alteração não afetará pedidos já confirmados.
              </p>
              <p className='text-gray-700 leading-relaxed'>
                As promoções são válidas durante o período indicado e sujeitas à disponibilidade 
                de estoque. Descontos e cupons não são cumulativos, salvo indicação expressa.
              </p>
            </section>

            {/* Envio e Entrega */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                6. Envio e Entrega
              </h2>
              <div className='space-y-4'>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>6.1. Frete</h3>
                  <ul className='list-disc list-inside text-gray-700 space-y-1'>
                    <li>Compras a partir de R$ 199,00: frete grátis para Sul e Sudeste</li>
                    <li>Compras a partir de R$ 299,00: frete grátis para todo o Brasil</li>
                    <li>Entrega expressa no mesmo dia para Grande Rio de Janeiro (consulte condições)</li>
                  </ul>
                </div>

                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>6.2. Prazos de Entrega</h3>
                  <ul className='list-disc list-inside text-gray-700 space-y-1'>
                    <li>Grande Rio de Janeiro: 1 a 3 dias úteis</li>
                    <li>Capitais e regiões metropolitanas: 3 a 7 dias úteis</li>
                    <li>Interior e demais localidades: 5 a 12 dias úteis</li>
                  </ul>
                  <p className='text-gray-600 text-sm mt-2'>
                    Os prazos começam a contar após confirmação do pagamento e podem variar 
                    conforme a região e disponibilidade da transportadora.
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold text-gray-900 mb-2'>6.3. Responsabilidade</h3>
                  <p className='text-gray-700'>
                    Não nos responsabilizamos por atrasos causados por fatores externos 
                    (greves, condições climáticas, endereços incorretos, etc.). Todos os envios 
                    possuem código de rastreamento.
                  </p>
                </div>
              </div>
            </section>

            {/* Devoluções */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                7. Direito de Devolução
              </h2>
              <p className='text-gray-700 leading-relaxed mb-4'>
                De acordo com o Art. 49 do Código de Defesa do Consumidor, você tem o direito 
                de devolver os produtos adquiridos no prazo de <strong>7 dias corridos</strong> após 
                o recebimento, sem necessidade de justificativa (direito de arrependimento).
              </p>
              <div className='bg-blue-50 border-l-4 border-primary rounded p-4'>
                <p className='text-sm text-gray-700'>
                  Para mais informações, consulte a nossa{' '}
                  <Link to='/refund-policy' className='text-primary hover:underline font-semibold'>
                    Política de Devolução
                  </Link>{' '}
                  e a página de{' '}
                  <Link to='/institucional/trocas-devolucoes-garantia' className='text-primary hover:underline font-semibold'>
                    Trocas, Devoluções e Garantia
                  </Link>.
                </p>
              </div>
            </section>

            {/* Garantias */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                8. Garantias
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Todos os produtos comercializados pela Elite Surfing Brasil possuem garantia 
                legal de <strong>90 dias</strong> contra defeitos de fabricação, conforme previsto 
                no Código de Defesa do Consumidor (Art. 26). A Elite Surfing oferece garantias 
                estendidas de até 12 meses, dependendo do produto. Em caso de defeito, o cliente 
                pode solicitar troca, reparo ou reembolso.
              </p>
            </section>

            {/* Propriedade Intelectual */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                9. Propriedade Intelectual
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Todos os conteúdos presentes neste site (textos, imagens, logotipos, design) 
                são propriedade da Elite Surfing Brasil e estão protegidos pela Lei de Direitos 
                Autorais (Lei nº 9.610/1998) e pela Lei de Propriedade Industrial (Lei nº 9.279/1996). 
                É proibida a reprodução, distribuição ou utilização sem autorização prévia e 
                expressa.
              </p>
            </section>

            {/* Proteção de Dados */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                10. Proteção de Dados Pessoais
              </h2>
              <p className='text-gray-700 leading-relaxed mb-4'>
                Os dados pessoais coletados são tratados de acordo com a Lei Geral de Proteção 
                de Dados (LGPD — Lei nº 13.709/2018) e demais legislações aplicáveis.
              </p>
              <div className='bg-blue-50 border-l-4 border-primary rounded p-4'>
                <p className='text-sm text-gray-700'>
                  Para mais informações, consulte a nossa{' '}
                  <Link to='/privacy' className='text-primary hover:underline font-semibold'>
                    Política de Privacidade
                  </Link>.
                </p>
              </div>
            </section>

            {/* Resolução de Conflitos */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                11. Resolução de Conflitos
              </h2>
              <p className='text-gray-700 leading-relaxed mb-4'>
                Em caso de conflito, o consumidor pode recorrer aos seguintes canais:
              </p>
              <div className='space-y-3'>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-700'>
                    <strong>Procon:</strong> Órgão de Proteção e Defesa do Consumidor do seu 
                    estado ou município.
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-700'>
                    <strong>Consumidor.gov.br:</strong>{' '}
                    <a 
                      href='https://www.consumidor.gov.br' 
                      target='_blank' 
                      rel='noopener noreferrer'
                      className='text-primary hover:underline'
                    >
                      www.consumidor.gov.br
                    </a>{' '}
                    — Plataforma do governo federal para resolução de conflitos de consumo.
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-700'>
                    <strong>Juizado Especial Cível:</strong> Para causas de até 40 salários 
                    mínimos, sem necessidade de advogado para causas de até 20 salários mínimos.
                  </p>
                </div>
              </div>
            </section>

            {/* Lei Aplicável */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                12. Lei Aplicável e Foro
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                Os presentes termos e condições são regidos pelas leis da República Federativa 
                do Brasil. Fica eleito o foro da comarca do domicílio do consumidor para 
                dirimir quaisquer controvérsias, conforme o Art. 101, I, do Código de Defesa 
                do Consumidor.
              </p>
            </section>

            {/* Alterações */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
                <AlertCircle className='w-6 h-6 text-yellow-600' />
                13. Alterações aos Termos
              </h2>
              <p className='text-gray-700 leading-relaxed'>
                A Elite Surfing Brasil reserva-se o direito de alterar estes termos e condições 
                a qualquer momento. As alterações entram em vigor no momento da sua publicação 
                no site. O uso continuado do site após qualquer alteração constitui a aceitação 
                dos novos termos.
              </p>
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

export default Terms;
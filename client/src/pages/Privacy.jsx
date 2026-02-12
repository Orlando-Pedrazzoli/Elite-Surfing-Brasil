import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { SEO, BreadcrumbSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';

const Privacy = () => {
  return (
    <>
      {/* SEO - Página de Privacidade */}
      <SEO 
        title={seoConfig.privacy.title}
        description={seoConfig.privacy.description}
        url={seoConfig.privacy.url}
      >
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Política de Privacidade' }
        ]} />
      </SEO>

      <div className='min-h-screen bg-gray-50'>
        {/* Hero Section */}
        <div className='bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16'>
          <div className='max-w-4xl mx-auto px-4'>
            <div className='flex items-center gap-3 mb-4'>
              <Shield className='w-10 h-10' />
              <h1 className='text-3xl md:text-4xl font-bold'>
                Política de Privacidade
              </h1>
            </div>
            <p className='text-white/90 text-lg'>
              Comprometidos com a proteção dos seus dados pessoais
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
                A Elite Surfing Brasil, com sede no Rio de Janeiro, respeita a sua privacidade 
                e está comprometida em proteger os seus dados pessoais. Esta política de 
                privacidade informa como tratamos os seus dados pessoais quando você visita 
                o nosso site e seus direitos de privacidade garantidos pela legislação brasileira.
              </p>
              <div className='mt-4 p-4 bg-blue-50 border-l-4 border-primary rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>LGPD:</strong> Esta política está em conformidade com a Lei Geral de 
                  Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), que regula o tratamento 
                  de dados pessoais no Brasil, e com o Marco Civil da Internet (Lei nº 12.965/2014).
                </p>
              </div>
            </section>

            {/* Controlador de Dados */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                2. Controlador de Dados
              </h2>
              <p className='text-gray-700 mb-4'>
                O controlador responsável pelo tratamento dos seus dados pessoais é:
              </p>
              <div className='bg-gray-50 rounded-lg p-6 space-y-3'>
                <div className='flex items-start gap-3'>
                  <MapPin className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='font-semibold text-gray-900'>Elite Surfing Brasil</p>
                    <p className='text-gray-600'>
                      Av. das Américas, 12900, Bloco 1, Sala 203C<br />
                      Edifício Argentina — Recreio dos Bandeirantes<br />
                      Rio de Janeiro — RJ, CEP 22790-702
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Mail className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='text-gray-600'>
                      E-mail: <a href='mailto:atendimento@elitesurfing.com.br' className='text-primary hover:underline'>
                        atendimento@elitesurfing.com.br
                      </a>
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Phone className='w-5 h-5 text-primary mt-1 flex-shrink-0' />
                  <div>
                    <p className='text-gray-600'>WhatsApp: (21) 96435-8058</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados que Coletamos */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                3. Dados Pessoais que Coletamos
              </h2>
              <p className='text-gray-700 mb-4'>
                Podemos coletar, usar, armazenar e transferir diferentes tipos de dados 
                pessoais sobre você, conforme descrito abaixo:
              </p>
              
              <div className='space-y-4'>
                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    a) Dados de Identificação
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Nome completo, CPF, nome de usuário ou identificador similar.
                  </p>
                </div>

                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    b) Dados de Contato
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Endereço de e-mail, endereço de entrega, números de telefone.
                  </p>
                </div>

                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    c) Dados de Transação
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Detalhes sobre pagamentos e informações de produtos e serviços 
                    que você adquiriu conosco.
                  </p>
                </div>

                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    d) Dados Técnicos
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Endereço IP, dados de login, tipo e versão do navegador, configuração 
                    de fuso horário e localização, sistema operacional e plataforma.
                  </p>
                </div>

                <div className='border-l-4 border-primary pl-4'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    e) Dados de Navegação
                  </h3>
                  <p className='text-gray-600 text-sm'>
                    Informações sobre como você usa o nosso site, produtos e serviços.
                  </p>
                </div>
              </div>
            </section>

            {/* Como Usamos os Dados */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                4. Como Usamos os Seus Dados Pessoais
              </h2>
              <p className='text-gray-700 mb-4'>
                Utilizamos os seus dados pessoais com base nas hipóteses legais previstas 
                na LGPD, nas seguintes circunstâncias:
              </p>
              
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Execução de contrato:</strong> Para processar e entregar o seu 
                    pedido, gerenciar pagamentos e nos comunicar com você sobre sua compra.
                  </p>
                </li>
                <li className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Legítimo interesse:</strong> Para melhorar o nosso site, 
                    produtos, serviços, marketing e experiência do cliente.
                  </p>
                </li>
                <li className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Consentimento:</strong> Para enviar comunicações de marketing 
                    (apenas se você nos der o seu consentimento expresso).
                  </p>
                </li>
                <li className='flex items-start gap-3'>
                  <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0'></div>
                  <p className='text-gray-700'>
                    <strong>Cumprimento de obrigação legal:</strong> Para atender obrigações 
                    fiscais, tributárias e regulatórias previstas na legislação brasileira.
                  </p>
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                5. Cookies
              </h2>
              <p className='text-gray-700 mb-4'>
                Utilizamos cookies e tecnologias semelhantes para:
              </p>
              <ul className='space-y-2 mb-4'>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>
                    <strong>Cookies Estritamente Necessários:</strong> Essenciais para o 
                    funcionamento do site (ex: carrinho de compras, autenticação).
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>
                    <strong>Cookies de Desempenho:</strong> Analisam como os visitantes usam 
                    o site para melhorar o seu funcionamento.
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>
                    <strong>Cookies de Funcionalidade:</strong> Reconhecem você quando retorna 
                    ao nosso site e permitem personalizar o conteúdo.
                  </span>
                </li>
              </ul>
              <p className='text-gray-700'>
                Você pode gerenciar as suas preferências de cookies através do banner de cookies 
                que aparece ao visitar o nosso site pela primeira vez.
              </p>
            </section>

            {/* Compartilhamento de Dados */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                6. Compartilhamento dos Seus Dados Pessoais
              </h2>
              <p className='text-gray-700 mb-4'>
                Podemos compartilhar os seus dados pessoais com:
              </p>
              <ul className='space-y-2'>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>
                    <strong>Prestadores de serviço:</strong> Empresas que prestam serviços 
                    de TI, processamento de pagamentos (Stripe), transportadoras e marketing.
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-primary'>•</span>
                  <span className='text-gray-700'>
                    <strong>Autoridades:</strong> Quando exigido por lei, ordem judicial ou 
                    para proteger nossos direitos legais.
                  </span>
                </li>
              </ul>
              <div className='mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>Garantia:</strong> Exigimos que todos os terceiros respeitem a 
                  segurança dos seus dados pessoais e os tratem de acordo com a LGPD. Não 
                  permitimos que nossos prestadores de serviço usem seus dados pessoais 
                  para fins próprios.
                </p>
              </div>
            </section>

            {/* Segurança */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                7. Segurança dos Dados
              </h2>
              <p className='text-gray-700'>
                Implementamos medidas de segurança técnicas e administrativas adequadas para 
                proteger seus dados pessoais contra acesso não autorizado, destruição, perda, 
                alteração ou qualquer forma de tratamento inadequado. Utilizamos criptografia 
                SSL 256-bit em todas as transações e limitamos o acesso aos seus dados apenas 
                aos colaboradores que necessitam deles para exercer suas funções.
              </p>
            </section>

            {/* Retenção de Dados */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                8. Retenção de Dados
              </h2>
              <p className='text-gray-700'>
                Reteremos os seus dados pessoais apenas pelo tempo necessário para cumprir 
                as finalidades para as quais foram coletados, incluindo obrigações legais, 
                fiscais e regulatórias. Dados relacionados a compras são mantidos pelo prazo 
                de 5 anos conforme legislação tributária brasileira. Após esse período, os 
                dados serão eliminados ou anonimizados de forma segura.
              </p>
            </section>

            {/* Direitos do Titular */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                9. Seus Direitos como Titular dos Dados
              </h2>
              <p className='text-gray-700 mb-4'>
                De acordo com a LGPD (Art. 18), você tem os seguintes direitos:
              </p>
              
              <div className='grid md:grid-cols-2 gap-4'>
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Confirmação e Acesso
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Confirmar se tratamos seus dados e acessar os dados que temos sobre você.
                  </p>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Correção
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Corrigir dados pessoais incompletos, inexatos ou desatualizados.
                  </p>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Eliminação
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Solicitar a eliminação dos dados tratados com base no seu consentimento.
                  </p>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Portabilidade
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Solicitar a portabilidade dos seus dados a outro fornecedor de serviço.
                  </p>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Revogação do Consentimento
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Revogar o consentimento a qualquer momento, de forma fácil e gratuita.
                  </p>
                </div>

                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='font-semibold text-gray-900 mb-2'>
                    ✓ Oposição
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Opor-se ao tratamento quando realizado em desconformidade com a LGPD.
                  </p>
                </div>
              </div>

              <div className='mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded'>
                <p className='text-sm text-gray-700'>
                  <strong>Como exercer seus direitos:</strong> Para exercer qualquer um 
                  desses direitos, entre em contato pelo e-mail{' '}
                  <a href='mailto:atendimento@elitesurfing.com.br' className='text-primary hover:underline'>
                    atendimento@elitesurfing.com.br
                  </a>. Responderemos no prazo de 15 dias, conforme previsto na LGPD.
                </p>
              </div>
            </section>

            {/* Reclamações */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                10. Direito de Reclamação
              </h2>
              <p className='text-gray-700 mb-4'>
                Se você não estiver satisfeito com a forma como tratamos os seus dados pessoais, 
                tem o direito de apresentar uma reclamação junto à Autoridade Nacional de 
                Proteção de Dados:
              </p>
              <div className='bg-gray-50 rounded-lg p-6'>
                <h3 className='font-semibold text-gray-900 mb-3'>
                  ANPD — Autoridade Nacional de Proteção de Dados
                </h3>
                <div className='space-y-2 text-sm text-gray-700'>
                  <p><strong>Website:</strong>{' '}
                    <a 
                      href='https://www.gov.br/anpd' 
                      target='_blank' 
                      rel='noopener noreferrer'
                      className='text-primary hover:underline'
                    >
                      www.gov.br/anpd
                    </a>
                  </p>
                  <p>A ANPD é o órgão federal responsável por zelar pela proteção de dados 
                  pessoais e fiscalizar o cumprimento da LGPD no Brasil.</p>
                </div>
              </div>
            </section>

            {/* Alterações */}
            <section>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                11. Alterações a Esta Política
              </h2>
              <p className='text-gray-700'>
                Podemos atualizar esta política de privacidade periodicamente. Quaisquer 
                alterações serão publicadas nesta página com uma data de "última atualização" 
                revisada. Recomendamos que consulte esta página regularmente para se manter 
                informado sobre como protegemos os seus dados.
              </p>
            </section>

            {/* Contato */}
            <section className='border-t pt-8'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                12. Entre em Contato
              </h2>
              <p className='text-gray-700 mb-6'>
                Se tiver dúvidas sobre esta política de privacidade ou sobre o tratamento 
                dos seus dados pessoais, entre em contato conosco:
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
                  <Phone className='w-5 h-5 text-primary' />
                  <span className='text-gray-700 font-medium'>(21) 96435-8058</span>
                </div>
                <div className='flex items-center gap-3'>
                  <Clock className='w-5 h-5 text-primary' />
                  <span className='text-gray-700'>
                    Prazo de resposta: até 15 dias
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

export default Privacy;
/**
 * useMetaPixel — Hook para disparar eventos do Meta Pixel (Facebook/Instagram)
 *
 * Eventos e-commerce implementados:
 *   PageView    → automático (base code no index.html)
 *   ViewContent → página de produto
 *   AddToCart   → adicionar ao carrinho
 *   InitiateCheckout → ir para checkout/pagamento
 *   Purchase    → compra concluída
 *   Search      → busca de produtos
 *
 * Configuração:
 *   1. Criar Pixel em https://business.facebook.com/events_manager
 *   2. Copiar o Pixel ID (15-16 dígitos)
 *   3. Adicionar VITE_META_PIXEL_ID=123456789012345 no .env do client
 *   4. Descomentar o bloco do Meta Pixel no index.html
 *
 * Se o Pixel não estiver carregado, todos os métodos são no-op silenciosos.
 */

const useMetaPixel = () => {
  const fbq = (...args) => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq(...args);
    }
  };

  /**
   * ViewContent — quando o user vê uma página de produto
   * @param {Object} product - Objeto do produto com _id, name, offerPrice, category
   */
  const trackViewContent = product => {
    if (!product) return;
    fbq('track', 'ViewContent', {
      content_name: product.name,
      content_ids: [product._id],
      content_type: 'product',
      value: product.offerPrice || product.price || 0,
      currency: 'BRL',
      content_category: product.category || '',
    });
  };

  /**
   * AddToCart — quando o user adiciona um produto ao carrinho
   * @param {Object} product - Objeto do produto
   * @param {number} quantity - Quantidade adicionada
   */
  const trackAddToCart = (product, quantity = 1) => {
    if (!product) return;
    fbq('track', 'AddToCart', {
      content_name: product.name,
      content_ids: [product._id],
      content_type: 'product',
      value: (product.offerPrice || product.price || 0) * quantity,
      currency: 'BRL',
      num_items: quantity,
    });
  };

  /**
   * InitiateCheckout — quando o user seleciona pagamento e vai finalizar
   * @param {Object} cartItems - { productId: quantity }
   * @param {number} totalValue - Valor total do carrinho
   */
  const trackInitiateCheckout = (cartItems, totalValue) => {
    const contentIds = Object.keys(cartItems || {});
    const numItems = Object.values(cartItems || {}).reduce((s, q) => s + q, 0);
    fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      content_type: 'product',
      value: totalValue || 0,
      currency: 'BRL',
      num_items: numItems,
    });
  };

  /**
   * Purchase — na página de sucesso após pagamento confirmado
   * @param {Object} order - Objeto do pedido com items, amount
   */
  const trackPurchase = order => {
    if (!order) return;
    const contentIds = (order.items || []).map(item =>
      (item.product?._id || item.product || '').toString(),
    );
    const numItems = (order.items || []).reduce(
      (s, item) => s + (item.quantity || 1),
      0,
    );
    fbq('track', 'Purchase', {
      content_ids: contentIds,
      content_type: 'product',
      value: order.amount || 0,
      currency: 'BRL',
      num_items: numItems,
    });
  };

  /**
   * Search — quando o user faz uma busca
   * @param {string} query - Termo de busca
   */
  const trackSearch = query => {
    if (!query) return;
    fbq('track', 'Search', {
      search_string: query,
      content_type: 'product',
    });
  };

  return {
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackSearch,
  };
};

export default useMetaPixel;

import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
  // ✅ FIX IPHONE/SAFARI: Cookie primeiro, depois header customizado
  // Safari bloqueia cookies cross-site (ITP), então o frontend envia
  // o token via header 'x-seller-token' como fallback.
  let token = req.cookies?.sellerToken || null;

  // Fallback: header customizado (para Safari mobile / iPhone)
  if (!token) {
    token = req.headers['x-seller-token'] || null;
  }

  if (!token) {
    // ✅ FIX: Retornar status 401 para que o frontend possa tratar corretamente
    // Antes retornava 200 com success:false, o que não ativava o interceptor de erro
    return res.status(401).json({ success: false, message: 'Not Authorized' });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

    if (tokenDecode.email === process.env.SELLER_EMAIL) {
      next();
    } else {
      return res
        .status(401)
        .json({ success: false, message: 'Not Authorized' });
    }
  } catch (error) {
    // ✅ FIX: Token expirado ou inválido = 401
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default authSeller;

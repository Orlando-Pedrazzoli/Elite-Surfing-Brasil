// server/routes/socialRoute.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import authSeller from '../middlewares/authSeller.js';
import {
  health,
  getSettings,
  updateSettings,
  getSources,
  getMediaTemplates,
  generate,
  rewrite,
  listPosts,
  getPost,
  updatePost,
  deletePost,
} from '../controllers/socialController.js';

const socialRouter = express.Router();

// 🛡️ A geração custa dinheiro (tokens) — limita a 20 gerações/min por IP
// mesmo com sessão de seller válida (protege contra loops no front).
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas gerações seguidas. Aguarde um minuto.',
  },
});

// Tudo é admin
socialRouter.use(authSeller);

socialRouter.get('/health', health);

socialRouter.get('/settings', getSettings);
socialRouter.put('/settings', updateSettings);

socialRouter.get('/sources', getSources);
socialRouter.get('/media/templates', getMediaTemplates);

socialRouter.post('/generate', aiLimiter, generate);
socialRouter.post('/rewrite', aiLimiter, rewrite);

socialRouter.get('/posts', listPosts);
socialRouter.get('/posts/:id', getPost);
socialRouter.put('/posts/:id', updatePost);
socialRouter.delete('/posts/:id', deletePost);

export default socialRouter;

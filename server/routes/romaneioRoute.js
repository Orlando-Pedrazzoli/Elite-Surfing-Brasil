import express from 'express';
import {
  listarRomaneios,
  obterRomaneio,
  criarRomaneio,
  atualizarRomaneio,
  confirmarRomaneio,
  cancelarRomaneio,
  faturarRomaneio,
  statsRomaneios,
} from '../controllers/romaneioController.js';
import authSeller from '../middlewares/authSeller.js';

const romaneioRouter = express.Router();

romaneioRouter.get('/stats', authSeller, statsRomaneios);
romaneioRouter.get('/', authSeller, listarRomaneios);
romaneioRouter.get('/:id', authSeller, obterRomaneio);
romaneioRouter.post('/', authSeller, criarRomaneio);
romaneioRouter.put('/:id', authSeller, atualizarRomaneio);
romaneioRouter.put('/:id/confirmar', authSeller, confirmarRomaneio);
romaneioRouter.put('/:id/cancelar', authSeller, cancelarRomaneio);
romaneioRouter.put('/:id/faturar', authSeller, faturarRomaneio);

export default romaneioRouter;

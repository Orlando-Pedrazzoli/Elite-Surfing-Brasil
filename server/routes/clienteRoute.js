import express from 'express';
import {
  listarClientes,
  buscaUnificada,
  obterCliente,
  criarCliente,
  atualizarCliente,
  desativarCliente,
} from '../controllers/clienteController.js';
import authSeller from '../middlewares/authSeller.js';

const clienteRouter = express.Router();

// Todas as rotas requerem autenticação de seller
clienteRouter.get('/busca', authSeller, buscaUnificada);
clienteRouter.get('/', authSeller, listarClientes);
clienteRouter.get('/:id', authSeller, obterCliente);
clienteRouter.post('/', authSeller, criarCliente);
clienteRouter.put('/:id', authSeller, atualizarCliente);
clienteRouter.delete('/:id', authSeller, desativarCliente);

export default clienteRouter;

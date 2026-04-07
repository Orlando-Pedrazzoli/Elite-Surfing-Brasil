/**
 * ═══════════════════════════════════════════════════════════════
 * catalogRoute.js — Rotas da API de catálogo para parceiros
 * ═══════════════════════════════════════════════════════════════
 *
 * Montado em: /api/v1/catalog
 * Autenticação: authPartner (API key via header X-API-Key)
 *
 * Rotas:
 *   GET /api/v1/catalog/products      → catálogo paginado
 *   GET /api/v1/catalog/products/:id  → produto individual
 *   GET /api/v1/catalog/categories    → categorias com contagem
 *   GET /api/v1/catalog/stock         → stock resumido (leve)
 *
 * Todas as rotas são GET (read-only) — parceiros nunca
 * conseguem alterar dados da Elite Surfing.
 * ═══════════════════════════════════════════════════════════════
 */

import express from 'express';
import authPartner from '../middlewares/authPartner.js';
import {
  getCatalogProducts,
  getCatalogProductById,
  getCatalogCategories,
  getCatalogStock,
} from '../controllers/catalogController.js';

const catalogRouter = express.Router();

// Todas as rotas requerem API key válida
catalogRouter.use(authPartner);

// Catálogo completo (paginado, com filtros)
catalogRouter.get('/products', getCatalogProducts);

// Produto individual por ID
catalogRouter.get('/products/:id', getCatalogProductById);

// Categorias disponíveis com contagem
catalogRouter.get('/categories', getCatalogCategories);

// Stock resumido — endpoint leve para sync frequente (horário)
catalogRouter.get('/stock', getCatalogStock);

export default catalogRouter;

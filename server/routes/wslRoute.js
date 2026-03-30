import express from 'express';
import {
  getRankings,
  updateRankings,
  getEvents,
  updateEvents,
  updateSingleEvent,
} from '../controllers/wslController.js';
import authSeller from '../middlewares/authSeller.js';

const wslRouter = express.Router();

// Rotas públicas
wslRouter.get('/rankings', getRankings);
wslRouter.get('/events', getEvents);

// Rotas admin (seller)
wslRouter.put('/admin/rankings', authSeller, updateRankings);
wslRouter.put('/admin/events', authSeller, updateEvents);
wslRouter.put('/admin/events/:id', authSeller, updateSingleEvent);

export default wslRouter;

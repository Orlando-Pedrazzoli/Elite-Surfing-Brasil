// server/controllers/wslController.js
// ═══════════════════════════════════════════════════════════════
// 🔧 27/04/2026: Adicionado no-store explícito nas mutações
//    Garante que CDN (Vercel Edge) não sirva resposta antiga após update.
// ═══════════════════════════════════════════════════════════════

import WslRanking from '../models/WslRanking.js';
import WslEvent from '../models/WslEvent.js';

// Helper: força bypass de qualquer camada de cache (browser + CDN)
const setNoStore = res => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, max-age=0',
  );
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

// ============================================================
// RANKINGS
// ============================================================

// GET /api/wsl/rankings?season=2026 — público
export const getRankings = async (req, res) => {
  try {
    const season = req.query.season || '2026';
    const rankings = await WslRanking.find({ season }).sort({ gender: 1 });

    const male = rankings.find(r => r.gender === 'male');
    const female = rankings.find(r => r.gender === 'female');

    res.json({
      success: true,
      male: male?.surfers || [],
      female: female?.surfers || [],
      lastUpdated: male?.lastUpdated || female?.lastUpdated || '',
      season,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/wsl/admin/rankings — seller atualiza rankings
// Body: { season, gender, surfers: [...], lastUpdated }
export const updateRankings = async (req, res) => {
  try {
    setNoStore(res);

    const { season, gender, surfers, lastUpdated } = req.body;

    if (!season || !gender || !surfers || !Array.isArray(surfers)) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: season, gender, surfers[]',
      });
    }

    if (surfers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de surfistas vazia.',
      });
    }

    const ranking = await WslRanking.findOneAndUpdate(
      { season, gender },
      {
        surfers,
        lastUpdated: lastUpdated || new Date().toLocaleDateString('pt-BR'),
      },
      { upsert: true, new: true },
    );

    res.json({
      success: true,
      ranking,
      count: surfers.length,
      message: `Rankings ${gender === 'male' ? 'masculino' : 'feminino'} ${season} atualizados! (${surfers.length} surfistas)`,
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar rankings WSL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// EVENTS / CALENDAR
// ============================================================

// GET /api/wsl/events?season=2026 — público
export const getEvents = async (req, res) => {
  try {
    const season = req.query.season || '2026';
    const events = await WslEvent.find({ season }).sort({ stop: 1 });

    res.json({ success: true, events, season });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/wsl/admin/events — seller atualiza todas as etapas de uma vez
// Body: { season, events: [...] }
export const updateEvents = async (req, res) => {
  try {
    setNoStore(res);

    const { season, events } = req.body;

    if (!season || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: season, events[]',
      });
    }

    if (events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de etapas vazia.',
      });
    }

    // Remove etapas antigas desta season e insere as novas
    await WslEvent.deleteMany({ season });

    const docs = events.map(e => ({ ...e, season }));
    const inserted = await WslEvent.insertMany(docs);

    res.json({
      success: true,
      events: inserted,
      count: inserted.length,
      message: `Calendário ${season} atualizado com ${inserted.length} etapas!`,
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar eventos WSL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/wsl/admin/events/:id — seller edita UMA etapa
export const updateSingleEvent = async (req, res) => {
  try {
    setNoStore(res);

    const event = await WslEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: 'Etapa não encontrada' });
    }

    res.json({ success: true, event, message: 'Etapa atualizada!' });
  } catch (error) {
    console.error('❌ Erro ao atualizar etapa WSL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

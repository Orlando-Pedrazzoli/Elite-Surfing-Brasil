import WslRanking from '../models/WslRanking.js';
import WslEvent from '../models/WslEvent.js';

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
    const { season, gender, surfers, lastUpdated } = req.body;

    if (!season || !gender || !surfers || !Array.isArray(surfers)) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: season, gender, surfers[]',
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
      message: `Rankings ${gender === 'male' ? 'masculino' : 'feminino'} ${season} atualizados!`,
    });
  } catch (error) {
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
    const { season, events } = req.body;

    if (!season || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: season, events[]',
      });
    }

    // Remove etapas antigas desta season e insere as novas
    await WslEvent.deleteMany({ season });
    const docs = events.map(e => ({ ...e, season }));
    const inserted = await WslEvent.insertMany(docs);

    res.json({
      success: true,
      events: inserted,
      message: `Calendário ${season} atualizado com ${inserted.length} etapas!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/wsl/admin/events/:id — seller edita UMA etapa
export const updateSingleEvent = async (req, res) => {
  try {
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
    res.status(500).json({ success: false, message: error.message });
  }
};

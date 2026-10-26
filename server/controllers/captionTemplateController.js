// server/controllers/captionTemplateController.js
// ═══════════════════════════════════════════════════════════════════════
// ✍️ LEGENDAS PRÉ-DEFINIDAS — CRUD + criar post a partir de uma legenda
// ═══════════════════════════════════════════════════════════════════════
//   GET    /api/social/caption-templates?group=decks&all=1
//   POST   /api/social/caption-templates
//   PUT    /api/social/caption-templates/:id
//   DELETE /api/social/caption-templates/:id
//   POST   /api/social/posts/from-template   { templateId, type, goal, productIds, ... }
// ═══════════════════════════════════════════════════════════════════════
import CaptionTemplate, {
  CAPTION_ANGLES,
  CAPTION_ANGLE_LABELS,
} from '../models/CaptionTemplate.js';
import { ensureCaptionTemplatesSeeded } from '../services/instagram/captionTemplateService.js';
import { createPostFromTemplate } from '../services/instagram/postFactory.js';
import { nicheOnly } from '../services/instagram/hashtagPolicy.js';

const noStore = res => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};
const isValidId = id => /^[a-f\d]{24}$/i.test(String(id || ''));

const cleanTag = t =>
  String(t || '')
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase();

const sanitize = body => {
  const out = {};
  if (body.group !== undefined) out.group = String(body.group || 'all').trim().toLowerCase() || 'all';
  if (body.angle !== undefined) out.angle = CAPTION_ANGLES.includes(body.angle) ? body.angle : 'other';
  if (body.name !== undefined) out.name = String(body.name || '').trim().slice(0, 80);
  if (body.usage !== undefined) out.usage = String(body.usage || '').trim().slice(0, 300);
  if (body.caption !== undefined) out.caption = String(body.caption || '').trim().slice(0, 2200);
  if (body.hashtags !== undefined) {
    const tags = (Array.isArray(body.hashtags) ? body.hashtags : String(body.hashtags).split(/[\s,]+/))
      .map(cleanTag)
      .filter(Boolean);
    // guardamos só as de nicho; o bloco fixo entra na publicação
    out.hashtags = [...new Set(nicheOnly(tags))].slice(0, 9);
  }
  if (body.suggestedTypes !== undefined)
    out.suggestedTypes = (Array.isArray(body.suggestedTypes) ? body.suggestedTypes : []).map(String);
  if (body.suggestedGoals !== undefined)
    out.suggestedGoals = (Array.isArray(body.suggestedGoals) ? body.suggestedGoals : []).map(String);
  if (body.isActive !== undefined) out.isActive = !!body.isActive;
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  return out;
};

export const listCaptionTemplates = async (req, res) => {
  try {
    noStore(res);
    await ensureCaptionTemplatesSeeded();
    const { group, all } = req.query;
    const query = {};
    if (!all) query.isActive = true;
    if (group) {
      const groups = String(group)
        .split(',')
        .map(g => g.trim().toLowerCase())
        .filter(Boolean);
      query.group = { $in: [...groups, 'all'] };
    }
    const templates = await CaptionTemplate.find(query).sort({ group: 1, order: 1, createdAt: 1 }).lean();
    res.json({ success: true, templates, angles: CAPTION_ANGLE_LABELS });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createCaptionTemplate = async (req, res) => {
  try {
    const data = sanitize(req.body || {});
    if (!data.name) return res.json({ success: false, message: 'Dê um nome à legenda' });
    if (!data.caption) return res.json({ success: false, message: 'A legenda não pode estar vazia' });
    const template = await CaptionTemplate.create(data);
    res.json({ success: true, template });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateCaptionTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const data = sanitize(req.body || {});
    if (data.name === '') return res.json({ success: false, message: 'Dê um nome à legenda' });
    if (data.caption === '') return res.json({ success: false, message: 'A legenda não pode estar vazia' });
    const template = await CaptionTemplate.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!template) return res.json({ success: false, message: 'Legenda não encontrada' });
    res.json({ success: true, template });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteCaptionTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    await CaptionTemplate.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const postFromTemplate = async (req, res) => {
  try {
    noStore(res);
    const post = await createPostFromTemplate(req.body || {});
    res.json({ success: true, post });
  } catch (error) {
    if (error?.name === 'BriefingError') {
      return res.json({ success: false, message: error.message });
    }
    console.error('[social/posts/from-template]', error);
    res.status(500).json({ success: false, message: error.message || 'Erro ao criar post' });
  }
};

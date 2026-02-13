import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════
// 🔀 REDIRECT MAP: categoria antiga → GroupPage + filtros
// ═══════════════════════════════════════════════════════════════
const categoryRedirectMap = {
  // ═══ DECKS - Shortboard models ═══
  'Deck-Maldivas':    { group: 'decks', filters: { tipo: 'shortboard', modelo: 'maldivas' } },
  'Deck-Mentawai':    { group: 'decks', filters: { tipo: 'shortboard', modelo: 'mentawai' } },
  'Deck-Fiji-Classic':{ group: 'decks', filters: { tipo: 'shortboard', modelo: 'fiji-classic' } },
  'Deck-Hawaii':      { group: 'decks', filters: { tipo: 'shortboard', modelo: 'hawaii' } },
  'Deck-J-Bay':       { group: 'decks', filters: { tipo: 'shortboard', modelo: 'j-bay' } },
  'Deck-Noronha':     { group: 'decks', filters: { tipo: 'shortboard', modelo: 'noronha' } },
  'Deck-Peniche':     { group: 'decks', filters: { tipo: 'shortboard', modelo: 'peniche' } },
  'Deck-Saquarema':   { group: 'decks', filters: { tipo: 'shortboard', modelo: 'saquarema' } },
  'Deck-Combate':     { group: 'decks', filters: { tipo: 'shortboard', modelo: 'combate' } },
  'Deck-Longboard':   { group: 'decks', filters: { tipo: 'longboard' } },
  'Deck-Front':       { group: 'decks', filters: { tipo: 'front' } },
  'Deck-SUP':         { group: 'decks', filters: { tipo: 'sup' } },

  // ═══ LEASHES ═══
  'Leash-Shortboard-Hibridas': { group: 'leashes', filters: { boardType: 'shortboard-hibridas' } },
  'Leash-Fun-MiniLong':   { group: 'leashes', filters: { boardType: 'fun-minilong' } },
  'Leash-Longboard':      { group: 'leashes', filters: { boardType: 'longboard' } },
  'Leash-StandUp':        { group: 'leashes', filters: { boardType: 'standup' } },
  'Leash-Bodyboard':      { group: 'leashes', filters: { boardType: 'bodyboard' } },

  // ═══ CAPAS ═══
  'Refletiva-Combate': { group: 'capas', filters: { modelo: 'refletiva-combate' } },
  'Refletiva-Premium': { group: 'capas', filters: { modelo: 'refletiva-premium' } },
  'Capa-Toalha':       { group: 'capas', filters: { modelo: 'capa-toalha' } },

  // ═══ SARCÓFAGOS ═══
  'Sarcofago-Combate':       { group: 'sarcofagos', filters: { modelo: 'sarcofago-combate' } },
  'Sarcofago-Premium':       { group: 'sarcofagos', filters: { modelo: 'sarcofago-premium' } },
  'Sarcofago-Combate-Rodas': { group: 'sarcofagos', filters: { modelo: 'sarcofago-combate-rodas' } },
  'Sarcofago-Premium-Rodas': { group: 'sarcofagos', filters: { modelo: 'sarcofago-premium-rodas' } },

  // ═══ QUILHAS ═══
  'Quilha-Shortboard': { group: 'quilhas', filters: { tipo: 'shortboard' } },
  'Quilha-Longboard':  { group: 'quilhas', filters: { tipo: 'longboard' } },
  'Quilha-SUP':        { group: 'quilhas', filters: { tipo: 'sup' } },
  'Chave-Parafuso':    { group: 'quilhas', filters: { tipo: 'chave-parafuso' } },

  // ═══ ACESSÓRIOS ═══
  'Racks':           { group: 'acessorios', filters: { tipo: 'racks' } },
  'Parafinas':       { group: 'acessorios', filters: { tipo: 'parafinas' } },
  'Bones':           { group: 'acessorios', filters: { tipo: 'bones' } },
  'Protetor-Rabeta': { group: 'acessorios', filters: { tipo: 'protetor-rabeta' } },
  'Wetsuit-Bag':     { group: 'acessorios', filters: { tipo: 'wetsuit-bag' } },
  'Diversos':        { group: 'acessorios', filters: { tipo: 'diversos' } },
};

const ProductCategory = () => {
  const { category } = useParams();

  // Procurar no map (case-sensitive primeiro, depois case-insensitive)
  const redirect = categoryRedirectMap[category] 
    || Object.entries(categoryRedirectMap).find(
        ([key]) => key.toLowerCase() === (category || '').toLowerCase()
      )?.[1];

  if (redirect) {
    const params = new URLSearchParams();
    Object.entries(redirect.filters).forEach(([key, value]) => {
      params.set(key, value);
    });
    return <Navigate to={`/collections/${redirect.group}?${params.toString()}`} replace />;
  }

  // Fallback: categoria não mapeada → redireciona para produtos
  return <Navigate to="/products" replace />;
};

export default ProductCategory;
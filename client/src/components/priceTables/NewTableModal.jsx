// client/src/components/priceTables/NewTableModal.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 NOVA TABELA DE PREÇOS — escolha do modelo
// ═══════════════════════════════════════════════════════════════════════
// Toda tabela nasce com TODOS os produtos cadastrados, organizados por
// categoria. O modelo só define a regra de preço inicial; tudo pode ser
// ajustado depois no editor.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { X, Loader2, Lock, Store, BookOpen, Check } from 'lucide-react';
import { TABLE_PRESETS, parseDecimal } from '../../utils/priceTableUtils';
import { applyPct, formatBRL, fromCents } from '../../utils/priceTableEngine';

const PRESET_ICONS = { cost: Lock, markup: Store, wholesale: BookOpen };

const NewTableModal = ({ open, initialPreset, catalog, onClose, onCreate }) => {
  const [presetId, setPresetId] = useState('markup');
  const [name, setName] = useState('');
  const [pctText, setPctText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preset = TABLE_PRESETS.find(p => p.id === presetId) || TABLE_PRESETS[1];

  useEffect(() => {
    if (!open) return;
    const start =
      TABLE_PRESETS.find(p => p.id === initialPreset) || TABLE_PRESETS[1];
    setPresetId(start.id);
    setName(start.settings.name);
    setPctText('');
    setError('');
    setSaving(false);
  }, [open, initialPreset]);

  if (!open) return null;

  const choosePreset = next => {
    // Só troca o nome se o admin ainda não o personalizou
    if (!name.trim() || name === preset.settings.name)
      setName(next.settings.name);
    setPresetId(next.id);
    setError('');
  };

  const pct = parseDecimal(pctText);
  const exampleCents =
    pct !== null && pct !== undefined ? applyPct(10000, pct, 'markup') : null;

  const missingBase =
    preset.settings.base === 'wholesale'
      ? catalog?.withoutWholesale
      : catalog?.withoutCost;

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return setError('Dê um nome à tabela.');
    if (preset.askPct && (pct === null || pct === undefined || pct < 0))
      return setError('Informe o markup sobre o custo (ex.: 40).');

    setSaving(true);
    setError('');
    const message = await onCreate({
      ...preset.settings,
      name: name.trim(),
      defaultPct: preset.askPct ? pct : preset.settings.defaultPct,
    });
    if (message) {
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'>
      <form
        onSubmit={submit}
        className='bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col'
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
          <h2 className='text-lg font-bold text-gray-900'>
            Nova tabela de preços
          </h2>
          <button
            type='button'
            onClick={() => !saving && onClose()}
            aria-label='Fechar'
            className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='overflow-y-auto px-6 py-5 space-y-5'>
          <div>
            <p className='text-xs font-semibold text-gray-600 mb-2'>Modelo</p>
            <div className='space-y-2'>
              {TABLE_PRESETS.map(option => {
                const Icon = PRESET_ICONS[option.id] || Store;
                const active = option.id === presetId;
                return (
                  <button
                    type='button'
                    key={option.id}
                    onClick={() => choosePreset(option)}
                    aria-pressed={active}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon className='w-4 h-4' />
                    </span>
                    <span className='flex-1 min-w-0'>
                      <span className='block text-sm font-semibold text-gray-900'>
                        {option.title}
                      </span>
                      <span className='block text-xs text-gray-500 mt-0.5 leading-relaxed'>
                        {option.description}
                      </span>
                    </span>
                    {active && (
                      <Check className='w-4 h-4 text-primary mt-1 flex-shrink-0' />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className={preset.askPct ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <label
                htmlFor='pt-new-name'
                className='block text-xs font-semibold text-gray-600 mb-1'
              >
                Nome da tabela *
              </label>
              <input
                id='pt-new-name'
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
                className='w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
              />
            </div>

            {preset.askPct && (
              <div>
                <label
                  htmlFor='pt-new-pct'
                  className='block text-xs font-semibold text-gray-600 mb-1'
                >
                  Markup sobre o custo *
                </label>
                <div className='relative'>
                  <input
                    id='pt-new-pct'
                    value={pctText}
                    onChange={e => setPctText(e.target.value)}
                    inputMode='decimal'
                    placeholder='ex.: 40'
                    autoFocus
                    className='w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          {preset.askPct && (
            <p className='text-xs text-gray-500 -mt-2'>
              {exampleCents !== null
                ? `Exemplo: um produto com custo de R$ 100,00 sai por ${formatBRL(fromCents(exampleCents))} para o lojista.`
                : 'É a porcentagem somada ao custo do fornecedor. Depois você ajusta por categoria e por produto.'}
            </p>
          )}

          {missingBase > 0 && (
            <div className='text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
              {missingBase}{' '}
              {missingBase === 1 ? 'produto está' : 'produtos estão'} sem{' '}
              {preset.settings.base === 'wholesale'
                ? 'Preço de Tabela'
                : 'Custo do Fornecedor'}{' '}
              no cadastro. Eles entram na tabela, mas ficam fora da exportação
              até terem esse valor (ou um preço fixo).
            </div>
          )}

          {error && (
            <p role='alert' className='text-sm text-red-600'>
              {error}
            </p>
          )}
        </div>

        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100'>
          <button
            type='button'
            onClick={() => !saving && onClose()}
            className='px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            Cancelar
          </button>
          <button
            type='submit'
            disabled={saving}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60'
          >
            {saving && <Loader2 className='w-4 h-4 animate-spin' />}
            Criar tabela
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTableModal;

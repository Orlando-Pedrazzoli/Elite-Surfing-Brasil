import React, { useEffect, useState } from 'react';
import '../../styles/Blog.css';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';

// ── Country flag map (common WSL countries) ──
const FLAG_MAP = {
  BRA: '🇧🇷',
  AUS: '🇦🇺',
  USA: '🇺🇸',
  ZAF: '🇿🇦',
  JPN: '🇯🇵',
  FRA: '🇫🇷',
  PRT: '🇵🇹',
  ITA: '🇮🇹',
  IDN: '🇮🇩',
  MEX: '🇲🇽',
  CRI: '🇨🇷',
  CAN: '🇨🇦',
  HAW: '🇺🇸',
  NZL: '🇳🇿',
  PER: '🇵🇪',
  ESP: '🇪🇸',
  GBR: '🇬🇧',
  DEU: '🇩🇪',
  CHL: '🇨🇱',
  ARG: '🇦🇷',
  RSA: '🇿🇦',
  TAH: '🇵🇫',
  FIJ: '🇫🇯',
};

const getFlag = country =>
  FLAG_MAP[country] || FLAG_MAP[country?.toUpperCase()] || '';

// ── Parse rankings text from WSL site ──
const COUNTRY_NAME_TO_CODE = {
  brazil: 'BRA',
  brasil: 'BRA',
  australia: 'AUS',
  'united states': 'USA',
  usa: 'USA',
  'south africa': 'ZAF',
  japan: 'JPN',
  france: 'FRA',
  portugal: 'PRT',
  italy: 'ITA',
  indonesia: 'IDN',
  mexico: 'MEX',
  'costa rica': 'CRI',
  canada: 'CAN',
  hawaii: 'HAW',
  'new zealand': 'NZL',
  peru: 'PER',
  spain: 'ESP',
  chile: 'CHL',
  argentina: 'ARG',
  tahiti: 'TAH',
  fiji: 'FIJ',
};

const parseRankingsText = text => {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const surfers = [];
  let autoRank = 1;

  for (const line of lines) {
    if (/^(rank|#|pos|surfista|name|athlete)/i.test(line)) continue;
    if (/^-+$/.test(line)) continue;

    let rank,
      name,
      country,
      points = '';

    const cleaned = line
      .replace(/\t+/g, '  ')
      .replace(/\|/g, '  ')
      .replace(/\s{3,}/g, '  ');

    const match1 = cleaned.match(
      /^(\d+|WC|wc)[\s.):-]+(.+?)\s{2,}([A-Z]{2,3})\s*(.*)$/i,
    );
    const match2 = cleaned.match(
      /^(\d+|WC|wc)[\s.):-]+(.+?)\s*\(([A-Z]{2,3})\)\s*[-–]?\s*(.*)$/i,
    );
    const match3 = cleaned.match(/^(.+?)\s{2,}([A-Z]{2,3})\s*(.*)$/i);

    if (match1) {
      rank = match1[1].toUpperCase() === 'WC' ? 'WC' : parseInt(match1[1]);
      name = match1[2].trim();
      country = match1[3].toUpperCase();
      points = match1[4]?.trim() || '';
    } else if (match2) {
      rank = match2[1].toUpperCase() === 'WC' ? 'WC' : parseInt(match2[1]);
      name = match2[2].trim();
      country = match2[3].toUpperCase();
      points = match2[4]?.trim() || '';
    } else if (match3) {
      rank = autoRank;
      name = match3[1].trim();
      country = match3[2].toUpperCase();
      points = match3[3]?.trim() || '';
    } else {
      continue;
    }

    const lowerCountry = country.toLowerCase();
    if (COUNTRY_NAME_TO_CODE[lowerCountry]) {
      country = COUNTRY_NAME_TO_CODE[lowerCountry];
    }

    points = points.replace(/\s*(pts|pontos|points)\s*/gi, '').trim();

    surfers.push({
      rank,
      name,
      country,
      countryFlag: getFlag(country),
      points,
    });

    if (typeof rank === 'number') autoRank = rank + 1;
  }

  return surfers;
};

// ── Empty event template ──
const emptyEvent = {
  stop: 1,
  event: '',
  location: '',
  dates: '',
  tour: 'CT',
  status: 'upcoming',
  winner: null,
  note: '',
};

// ============================================================
// COMPONENT
// ============================================================
const WslManager = () => {
  const [activeTab, setActiveTab] = useState('rankings');
  const [season, setSeason] = useState('2026');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rankings state
  const [maleText, setMaleText] = useState('');
  const [femaleText, setFemaleText] = useState('');
  const [maleParsed, setMaleParsed] = useState([]);
  const [femaleParsed, setFemaleParsed] = useState([]);
  const [rankingsLastUpdated, setRankingsLastUpdated] = useState('');

  // Events state
  const [events, setEvents] = useState([]);

  const token = localStorage.getItem('sellerToken');
  const headers = {
    'Content-Type': 'application/json',
    'x-seller-token': token,
  };

  // ── Fetch data ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const rankRes = await fetch(
        `${API_URL}/api/wsl/rankings?season=${season}`,
      );
      const rankJson = await rankRes.json();
      if (rankJson.success) {
        const toText = surfers =>
          surfers
            .map(s => `${s.rank}\t${s.name}\t${s.country}\t${s.points || ''}`)
            .join('\n');

        setMaleText(toText(rankJson.male));
        setFemaleText(toText(rankJson.female));
        setMaleParsed(rankJson.male);
        setFemaleParsed(rankJson.female);
        setRankingsLastUpdated(rankJson.lastUpdated || '');
      }

      const evtRes = await fetch(`${API_URL}/api/wsl/events?season=${season}`);
      const evtJson = await evtRes.json();
      if (evtJson.success) {
        setEvents(evtJson.events);
      }
    } catch (err) {
      console.error('Erro ao buscar dados WSL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [season]);

  const showMessage = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleMaleTextChange = text => {
    setMaleText(text);
    setMaleParsed(parseRankingsText(text));
  };

  const handleFemaleTextChange = text => {
    setFemaleText(text);
    setFemaleParsed(parseRankingsText(text));
  };

  const saveRankings = async gender => {
    const surfers = gender === 'male' ? maleParsed : femaleParsed;
    if (surfers.length === 0) {
      return showMessage(
        'Nenhum surfista detectado. Verifica o formato do texto.',
        'error',
      );
    }
    try {
      const res = await fetch(`${API_URL}/api/wsl/admin/rankings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          season,
          gender,
          surfers,
          lastUpdated: rankingsLastUpdated,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(json.message);
      } else {
        showMessage(json.message, 'error');
      }
    } catch (err) {
      showMessage('Erro ao salvar rankings', 'error');
    }
  };

  const updateEventField = (index, field, value) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const addEvent = () => {
    const nextStop =
      events.length > 0 ? Math.max(...events.map(e => e.stop)) + 1 : 1;
    setEvents([...events, { ...emptyEvent, stop: nextStop }]);
  };

  const removeEvent = index => {
    if (!window.confirm('Remover esta etapa?')) return;
    setEvents(events.filter((_, i) => i !== index));
  };

  const saveEvents = async () => {
    if (events.length === 0) {
      return showMessage('Adiciona pelo menos uma etapa.', 'error');
    }
    try {
      const res = await fetch(`${API_URL}/api/wsl/admin/events`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ season, events }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(json.message);
        fetchData();
      } else {
        showMessage(json.message, 'error');
      }
    } catch (err) {
      showMessage('Erro ao salvar calendário', 'error');
    }
  };

  // ── Preview table component ──
  const PreviewTable = ({ surfers, label }) => {
    if (surfers.length === 0) return null;
    return (
      <div className='wsl-manager__preview'>
        <h4>
          Preview ({surfers.length} {label} detectados)
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table className='wsl-manager__table'>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>País</th>
                <th>Info</th>
              </tr>
            </thead>
            <tbody>
              {surfers.map((s, i) => (
                <tr key={i}>
                  <td>{s.rank}</td>
                  <td>{s.name}</td>
                  <td>
                    {s.countryFlag} {s.country}
                  </td>
                  <td>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          padding: '20px',
          maxWidth: '1000px',
          margin: '0 auto',
          paddingBottom: '60px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
            WSL — Gerir Dados do Blog
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Temporada:
            </label>
            <select
              value={season}
              onChange={e => setSeason(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
              }}
            >
              <option value='2025'>2025</option>
              <option value='2026'>2026</option>
              <option value='2027'>2027</option>
            </select>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
              color: msg.type === 'error' ? '#dc2626' : '#166534',
              border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: '24px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => setActiveTab('rankings')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px',
              color: activeTab === 'rankings' ? '#2563eb' : '#6b7280',
              borderBottom:
                activeTab === 'rankings'
                  ? '2px solid #2563eb'
                  : '2px solid transparent',
            }}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '-2px',
              color: activeTab === 'events' ? '#2563eb' : '#6b7280',
              borderBottom:
                activeTab === 'events'
                  ? '2px solid #2563eb'
                  : '2px solid transparent',
            }}
          >
            Calendario / Etapas
          </button>
        </div>

        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Carregando...</p>
        ) : activeTab === 'rankings' ? (
          /* ══════════ RANKINGS TAB ══════════ */
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* Info */}
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '14px 18px',
                fontSize: '0.85rem',
                color: '#1e40af',
              }}
            >
              <p style={{ margin: '0 0 6px' }}>
                Cola a lista de rankings do site da{' '}
                <a
                  href='https://www.worldsurfleague.com/athletes/rankings'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  WSL
                </a>
                . Formatos aceites:
              </p>
              <code
                style={{
                  display: 'inline-block',
                  background: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                }}
              >
                1 Yago Dora BRA Campeão Mundial 2025
              </code>
              <br />
              <code
                style={{
                  display: 'inline-block',
                  background: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  marginTop: '4px',
                }}
              >
                WC John John Florence HAW Season Wildcard
              </code>
            </div>

            {/* Updated date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label
                style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Data da atualização:
              </label>
              <input
                type='text'
                value={rankingsLastUpdated}
                onChange={e => setRankingsLastUpdated(e.target.value)}
                placeholder='Ex: 30 Março 2026'
                style={{
                  flex: 1,
                  maxWidth: '300px',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* ─── MASCULINO ─── */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '20px',
                background: '#fff',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>
                Masculino
              </h3>
              <textarea
                value={maleText}
                onChange={e => handleMaleTextChange(e.target.value)}
                placeholder='Cola aqui a lista masculina do site da WSL...'
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                }}
              />
              <PreviewTable surfers={maleParsed} label='surfistas' />
              <button
                onClick={() => saveRankings('male')}
                style={{
                  marginTop: '14px',
                  padding: '10px 28px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Salvar Rankings Masculino
              </button>
            </div>

            {/* ─── FEMININO ─── */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '20px',
                background: '#fff',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>
                Feminino
              </h3>
              <textarea
                value={femaleText}
                onChange={e => handleFemaleTextChange(e.target.value)}
                placeholder='Cola aqui a lista feminina do site da WSL...'
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                }}
              />
              <PreviewTable surfers={femaleParsed} label='surfistas' />
              <button
                onClick={() => saveRankings('female')}
                style={{
                  marginTop: '14px',
                  padding: '10px 28px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Salvar Rankings Feminino
              </button>
            </div>
          </div>
        ) : (
          /* ══════════ EVENTS TAB ══════════ */
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '14px 18px',
                fontSize: '0.85rem',
                color: '#1e40af',
              }}
            >
              <p style={{ margin: 0 }}>
                Edita cada etapa individualmente. Muda o status para "AO VIVO"
                quando estiver a decorrer, "Finalizado" quando terminar, e
                preenche o vencedor.
              </p>
            </div>

            {events.map((evt, index) => (
              <div
                key={evt._id || index}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#1f2937',
                    }}
                  >
                    Stop {evt.stop}
                  </span>
                  <button
                    onClick={() => removeEvent(index)}
                    style={{
                      padding: '4px 12px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Remover
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Stop #
                    </label>
                    <input
                      type='number'
                      value={evt.stop}
                      onChange={e =>
                        updateEventField(
                          index,
                          'stop',
                          parseInt(e.target.value) || 1,
                        )
                      }
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Nome do Evento
                    </label>
                    <input
                      type='text'
                      value={evt.event}
                      onChange={e =>
                        updateEventField(index, 'event', e.target.value)
                      }
                      placeholder='Rip Curl Pro Bells Beach'
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Local
                    </label>
                    <input
                      type='text'
                      value={evt.location}
                      onChange={e =>
                        updateEventField(index, 'location', e.target.value)
                      }
                      placeholder='Bells Beach, Victoria, Austrália'
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Datas
                    </label>
                    <input
                      type='text'
                      value={evt.dates}
                      onChange={e =>
                        updateEventField(index, 'dates', e.target.value)
                      }
                      placeholder='1 - 11 Abril'
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Tour
                    </label>
                    <select
                      value={evt.tour}
                      onChange={e =>
                        updateEventField(index, 'tour', e.target.value)
                      }
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    >
                      <option value='CT'>CT</option>
                      <option value='Postseason'>Postseason</option>
                      <option value='Pipe Masters'>Pipe Masters</option>
                      <option value='Challenger'>Challenger</option>
                    </select>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Status
                    </label>
                    <select
                      value={evt.status}
                      onChange={e =>
                        updateEventField(index, 'status', e.target.value)
                      }
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    >
                      <option value='upcoming'>Em breve</option>
                      <option value='live'>AO VIVO</option>
                      <option value='completed'>Finalizado</option>
                    </select>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Vencedor
                    </label>
                    <input
                      type='text'
                      value={evt.winner || ''}
                      onChange={e =>
                        updateEventField(
                          index,
                          'winner',
                          e.target.value || null,
                        )
                      }
                      placeholder='Nome do vencedor'
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      gridColumn: '1 / -1',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Nota
                    </label>
                    <input
                      type='text'
                      value={evt.note || ''}
                      onChange={e =>
                        updateEventField(index, 'note', e.target.value)
                      }
                      placeholder='Informação extra (opcional)'
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '10px',
              }}
            >
              <button
                onClick={addEvent}
                style={{
                  padding: '10px 24px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                + Adicionar Etapa
              </button>
              <button
                onClick={saveEvents}
                style={{
                  padding: '10px 28px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Salvar Calendario Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WslManager;

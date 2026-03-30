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
// Accepts formats like:
// "1  Yago Dora  BRA  1234"
// "1. Yago Dora (BRA) - 1234 pts"
// "1  Yago Dora  Brazil  Campeão Mundial 2025"
// Or just: "Yago Dora  BRA"
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
    // Skip header lines
    if (/^(rank|#|pos|surfista|name|athlete)/i.test(line)) continue;
    if (/^-+$/.test(line)) continue;

    // Try to parse: optional rank, name, country code/name, optional points
    // Pattern 1: "1  Yago Dora  BRA  1234"
    // Pattern 2: "1. Yago Dora (BRA) - Campeão"
    // Pattern 3: "Yago Dora  BRA"
    // Pattern 4: "WC  John John Florence  HAW  Season Wildcard"

    let rank,
      name,
      country,
      points = '';

    // Clean up common separators
    const cleaned = line
      .replace(/\t+/g, '  ')
      .replace(/\|/g, '  ')
      .replace(/\s{3,}/g, '  ');

    // Try regex patterns
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
      // Can't parse, skip
      continue;
    }

    // Convert country names to codes
    const lowerCountry = country.toLowerCase();
    if (COUNTRY_NAME_TO_CODE[lowerCountry]) {
      country = COUNTRY_NAME_TO_CODE[lowerCountry];
    }

    // Clean points: remove "pts", "pontos" etc
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
    Authorization: `Bearer ${token}`,
  };

  // ── Fetch data ──
  const fetchData = async () => {
    setLoading(true);
    try {
      // Rankings
      const rankRes = await fetch(
        `${API_URL}/api/wsl/rankings?season=${season}`,
      );
      const rankJson = await rankRes.json();
      if (rankJson.success) {
        // Convert stored surfers back to text for the textarea
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

      // Events
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

  // ── Rankings: parse on text change ──
  const handleMaleTextChange = text => {
    setMaleText(text);
    setMaleParsed(parseRankingsText(text));
  };

  const handleFemaleTextChange = text => {
    setFemaleText(text);
    setFemaleParsed(parseRankingsText(text));
  };

  // ── Rankings: save ──
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

  // ── Events: handlers ──
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
        fetchData(); // refresh to get _ids
      } else {
        showMessage(json.message, 'error');
      }
    } catch (err) {
      showMessage('Erro ao salvar calendário', 'error');
    }
  };

  // ── Render ──
  return (
    <div className='wsl-manager'>
      <div className='wsl-manager__header'>
        <h2>WSL — Gerir Dados do Blog</h2>
        <div className='wsl-manager__season'>
          <label>Temporada:</label>
          <select value={season} onChange={e => setSeason(e.target.value)}>
            <option value='2025'>2025</option>
            <option value='2026'>2026</option>
            <option value='2027'>2027</option>
          </select>
        </div>
      </div>

      {msg && (
        <div className={`blog-manager__msg blog-manager__msg--${msg.type}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className='wsl-manager__tabs'>
        <button
          className={`wsl-manager__tab ${activeTab === 'rankings' ? 'wsl-manager__tab--active' : ''}`}
          onClick={() => setActiveTab('rankings')}
        >
          Rankings
        </button>
        <button
          className={`wsl-manager__tab ${activeTab === 'events' ? 'wsl-manager__tab--active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Calendario / Etapas
        </button>
      </div>

      {loading ? (
        <p style={{ padding: '20px', textAlign: 'center' }}>Carregando...</p>
      ) : activeTab === 'rankings' ? (
        /* ══════════════════════════════════════
           RANKINGS TAB
           ══════════════════════════════════════ */
        <div className='wsl-manager__rankings'>
          <div className='wsl-manager__info'>
            <p>
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
            <code>1 Yago Dora BRA Campeão Mundial 2025</code>
            <br />
            <code>WC John John Florence HAW Season Wildcard</code>
          </div>

          <div className='wsl-manager__updated-row'>
            <label>Data da atualização:</label>
            <input
              type='text'
              value={rankingsLastUpdated}
              onChange={e => setRankingsLastUpdated(e.target.value)}
              placeholder='Ex: 30 Março 2026'
            />
          </div>

          {/* Male Rankings */}
          <div className='wsl-manager__ranking-block'>
            <h3>Masculino</h3>
            <textarea
              className='wsl-manager__textarea'
              value={maleText}
              onChange={e => handleMaleTextChange(e.target.value)}
              placeholder='Cola aqui a lista masculina do site da WSL...'
              rows={12}
            />
            {maleParsed.length > 0 && (
              <div className='wsl-manager__preview'>
                <h4>Preview ({maleParsed.length} surfistas detectados)</h4>
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
                    {maleParsed.map((s, i) => (
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
            )}
            <button
              className='wsl-manager__save'
              onClick={() => saveRankings('male')}
            >
              Salvar Rankings Masculino
            </button>
          </div>

          {/* Female Rankings */}
          <div className='wsl-manager__ranking-block'>
            <h3>Feminino</h3>
            <textarea
              className='wsl-manager__textarea'
              value={femaleText}
              onChange={e => handleFemaleTextChange(e.target.value)}
              placeholder='Cola aqui a lista feminina do site da WSL...'
              rows={10}
            />
            {femaleParsed.length > 0 && (
              <div className='wsl-manager__preview'>
                <h4>Preview ({femaleParsed.length} surfistas detectadas)</h4>
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
                    {femaleParsed.map((s, i) => (
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
            )}
            <button
              className='wsl-manager__save'
              onClick={() => saveRankings('female')}
            >
              Salvar Rankings Feminino
            </button>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════
           EVENTS TAB
           ══════════════════════════════════════ */
        <div className='wsl-manager__events'>
          <div className='wsl-manager__info'>
            <p>
              Edita cada etapa individualmente. Muda o status para "live" quando
              estiver a decorrer, "completed" quando terminar, e preenche o
              vencedor.
            </p>
          </div>

          {events.map((evt, index) => (
            <div className='wsl-manager__event-card' key={evt._id || index}>
              <div className='wsl-manager__event-header'>
                <span className='wsl-manager__event-number'>
                  Stop {evt.stop}
                </span>
                <button
                  className='wsl-manager__event-remove'
                  onClick={() => removeEvent(index)}
                  title='Remover etapa'
                >
                  Remover
                </button>
              </div>

              <div className='wsl-manager__event-grid'>
                <div className='wsl-manager__field'>
                  <label>Stop #</label>
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
                  />
                </div>
                <div className='wsl-manager__field'>
                  <label>Nome do Evento</label>
                  <input
                    type='text'
                    value={evt.event}
                    onChange={e =>
                      updateEventField(index, 'event', e.target.value)
                    }
                    placeholder='Rip Curl Pro Bells Beach'
                  />
                </div>
                <div className='wsl-manager__field'>
                  <label>Local</label>
                  <input
                    type='text'
                    value={evt.location}
                    onChange={e =>
                      updateEventField(index, 'location', e.target.value)
                    }
                    placeholder='Bells Beach, Victoria, Austrália'
                  />
                </div>
                <div className='wsl-manager__field'>
                  <label>Datas</label>
                  <input
                    type='text'
                    value={evt.dates}
                    onChange={e =>
                      updateEventField(index, 'dates', e.target.value)
                    }
                    placeholder='1 - 11 Abril'
                  />
                </div>
                <div className='wsl-manager__field'>
                  <label>Tour</label>
                  <select
                    value={evt.tour}
                    onChange={e =>
                      updateEventField(index, 'tour', e.target.value)
                    }
                  >
                    <option value='CT'>CT</option>
                    <option value='Postseason'>Postseason</option>
                    <option value='Pipe Masters'>Pipe Masters</option>
                    <option value='Challenger'>Challenger</option>
                  </select>
                </div>
                <div className='wsl-manager__field'>
                  <label>Status</label>
                  <select
                    value={evt.status}
                    onChange={e =>
                      updateEventField(index, 'status', e.target.value)
                    }
                  >
                    <option value='upcoming'>Em breve</option>
                    <option value='live'>AO VIVO</option>
                    <option value='completed'>Finalizado</option>
                  </select>
                </div>
                <div className='wsl-manager__field'>
                  <label>Vencedor</label>
                  <input
                    type='text'
                    value={evt.winner || ''}
                    onChange={e =>
                      updateEventField(index, 'winner', e.target.value || null)
                    }
                    placeholder='Nome do vencedor (se finalizado)'
                  />
                </div>
                <div className='wsl-manager__field wsl-manager__field--full'>
                  <label>Nota</label>
                  <input
                    type='text'
                    value={evt.note || ''}
                    onChange={e =>
                      updateEventField(index, 'note', e.target.value)
                    }
                    placeholder='Informação extra (opcional)'
                  />
                </div>
              </div>
            </div>
          ))}

          <div className='wsl-manager__events-actions'>
            <button className='wsl-manager__add' onClick={addEvent}>
              + Adicionar Etapa
            </button>
            <button className='wsl-manager__save' onClick={saveEvents}>
              Salvar Calendario Completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WslManager;

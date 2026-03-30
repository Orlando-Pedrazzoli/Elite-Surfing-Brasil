import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';

const statusLabels = {
  completed: { label: 'Finalizado', className: 'schedule-status--completed' },
  live: { label: 'AO VIVO', className: 'schedule-status--live' },
  upcoming: { label: 'Em breve', className: 'schedule-status--upcoming' },
};

const WslSchedule = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/wsl/events?season=2026`);
        const json = await res.json();
        if (json.success) {
          setEvents(json.events);
        }
      } catch (err) {
        console.error('Erro ao buscar calendário:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <section className='blog-section' id='calendario'>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          Carregando calendário...
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className='blog-section' id='calendario'>
      <div className='blog-section__header'>
        <div className='blog-section__icon'>📅</div>
        <div>
          <h2 className='blog-section__title'>Calendário CT 2026</h2>
          <p className='blog-section__desc'>
            Todas as etapas do Championship Tour e WSL Finals
          </p>
        </div>
      </div>

      <div className='schedule-grid'>
        {events.map((event, index) => {
          const status = statusLabels[event.status] || statusLabels.upcoming;
          return (
            <div className='schedule-card' key={event._id || index}>
              <div className='schedule-card__left'>
                <div className='schedule-card__number'>
                  {String(event.stop || index + 1).padStart(2, '0')}
                </div>
                <div className={`schedule-status ${status.className}`}>
                  {event.status === 'live' && (
                    <span className='schedule-status__dot' />
                  )}
                  {status.label}
                </div>
              </div>
              <div className='schedule-card__content'>
                <h3 className='schedule-card__name'>{event.event}</h3>
                <div className='schedule-card__details'>
                  <span className='schedule-card__location'>
                    📍 {event.location}
                  </span>
                  <span className='schedule-card__date'>🗓️ {event.dates}</span>
                </div>
                {event.winner && (
                  <div className='schedule-card__winner'>
                    🏆 Vencedor: <strong>{event.winner}</strong>
                  </div>
                )}
                {event.note && (
                  <div className='schedule-card__note'>ℹ️ {event.note}</div>
                )}
              </div>
              <div className='schedule-card__tour-badge'>{event.tour}</div>
            </div>
          );
        })}
      </div>

      <p className='rankings-source'>
        Fonte:{' '}
        <a
          href='https://www.worldsurfleague.com/events'
          target='_blank'
          rel='noopener noreferrer'
        >
          worldsurfleague.com/events
        </a>
      </p>
    </section>
  );
};

export default WslSchedule;

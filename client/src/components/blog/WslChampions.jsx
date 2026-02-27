import React from "react";
import { worldChampions, wslVideos } from "../../data/wslData";

const WslChampions = () => {
  return (
    <section className="blog-section" id="campeoes">
      <div className="blog-section__header">
        <div className="blog-section__icon">👑</div>
        <div>
          <h2 className="blog-section__title">Campeões Mundiais</h2>
          <p className="blog-section__desc">Histórico recente de títulos da WSL</p>
        </div>
      </div>

      <div className="champions-table">
        <div className="champions-table__header">
          <span>Ano</span>
          <span>Campeão</span>
          <span>Campeã</span>
        </div>
        {worldChampions.map((item) => (
          <div
            className={`champions-table__row ${item.year === worldChampions[0].year ? "champions-table__row--current" : ""}`}
            key={item.year}
          >
            <span className="champions-table__year">{item.year}</span>
            <span className="champions-table__name">
              {item.maleCountry} {item.male}
            </span>
            <span className="champions-table__name">
              {item.femaleCountry} {item.female}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export const WslVideos = () => {
  if (!wslVideos || wslVideos.length === 0) return null;

  return (
    <section className="blog-section" id="videos">
      <div className="blog-section__header">
        <div className="blog-section__icon">🎬</div>
        <div>
          <h2 className="blog-section__title">Vídeos WSL</h2>
          <p className="blog-section__desc">Melhores momentos do circuito mundial</p>
        </div>
      </div>

      <div className="videos-grid">
        {wslVideos.map((video, index) => (
          <div className="video-card" key={index}>
            <div className="video-card__embed">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="video-card__info">
              <h4 className="video-card__title">{video.title}</h4>
              <span className="video-card__date">{video.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WslChampions;
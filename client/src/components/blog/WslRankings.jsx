import React, { useState } from "react";
import { maleRankings, femaleRankings } from "../../data/wslData";

const WslRankings = () => {
  const [activeTab, setActiveTab] = useState("male");
  const [showAll, setShowAll] = useState(false);

  const currentList = activeTab === "male" ? maleRankings : femaleRankings;
  const displayList = showAll ? currentList : currentList.slice(0, 10);

  return (
    <section className="blog-section" id="rankings">
      <div className="blog-section__header">
        <div className="blog-section__icon">🏆</div>
        <div>
          <h2 className="blog-section__title">Rankings WSL 2026</h2>
          <p className="blog-section__desc">Championship Tour — classificação atual</p>
        </div>
      </div>

      <div className="rankings-tabs">
        <button
          className={`rankings-tabs__btn ${activeTab === "male" ? "rankings-tabs__btn--active" : ""}`}
          onClick={() => { setActiveTab("male"); setShowAll(false); }}
        >
          Masculino ({maleRankings.length})
        </button>
        <button
          className={`rankings-tabs__btn ${activeTab === "female" ? "rankings-tabs__btn--active" : ""}`}
          onClick={() => { setActiveTab("female"); setShowAll(false); }}
        >
          Feminino ({femaleRankings.length})
        </button>
      </div>

      <div className="rankings-table">
        <div className="rankings-table__header">
          <span className="rankings-table__col rankings-table__col--rank">#</span>
          <span className="rankings-table__col rankings-table__col--name">Surfista</span>
          <span className="rankings-table__col rankings-table__col--country">País</span>
          <span className="rankings-table__col rankings-table__col--points">Pontos</span>
        </div>

        {displayList.map((surfer) => (
          <div
            className={`rankings-table__row ${typeof surfer.rank === "number" && surfer.rank <= 5 ? "rankings-table__row--top5" : ""}`}
            key={`${surfer.rank}-${surfer.name}`}
          >
            <span className="rankings-table__col rankings-table__col--rank">
              {surfer.rank <= 3 && typeof surfer.rank === "number" ? (
                <span className="rankings-table__medal">
                  {surfer.rank === 1 ? "🥇" : surfer.rank === 2 ? "🥈" : "🥉"}
                </span>
              ) : surfer.rank === "WC" ? (
                <span className="rankings-table__wc">WC</span>
              ) : (
                surfer.rank
              )}
            </span>
            <span className="rankings-table__col rankings-table__col--name">
              <strong>{surfer.name}</strong>
            </span>
            <span className="rankings-table__col rankings-table__col--country">
              {surfer.countryFlag} {surfer.country}
            </span>
            <span className="rankings-table__col rankings-table__col--points">
              {typeof surfer.points === "number"
                ? surfer.points.toLocaleString("pt-BR")
                : surfer.points || "—"}
            </span>
          </div>
        ))}
      </div>

      {currentList.length > 10 && (
        <button
          className="rankings-showmore"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Ver menos ▲" : `Ver todos (${currentList.length}) ▼`}
        </button>
      )}

      <p className="rankings-source">
        Fonte:{" "}
        <a href="https://www.worldsurfleague.com/athletes/rankings" target="_blank" rel="noopener noreferrer">
          worldsurfleague.com
        </a>
      </p>
    </section>
  );
};

export default WslRankings;
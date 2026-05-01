import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import MatchCard from "../components/MatchCard";
import PlayerLeaderboard from "../components/PlayerLeaderboard";
import "./MainPage.css";

const SWEDISH_DAYS = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const SWEDISH_MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

function formatDayHeader(dateStr) {
  const d = new Date(dateStr);
  return `${SWEDISH_DAYS[d.getDay()]} ${d.getDate()} ${SWEDISH_MONTHS[d.getMonth()]}`;
}

function localDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupMatchesByDay(matches) {
  const groups = [];
  const seen = new Map();
  for (const match of matches) {
    const key = localDateKey(match.kickoff);
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ dateKey: key, dateLabel: formatDayHeader(match.kickoff), matches: [] });
    }
    groups[seen.get(key)].matches.push(match);
  }
  return groups;
}

export default function MainPage() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const nextMatchRef = useRef(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    Promise.all([api.get("/matches/"), api.get("/players/")])
      .then(([mRes, pRes]) => {
        setMatches(mRes.data);
        setPlayers(pRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && nextMatchRef.current && !scrolledRef.current) {
      scrolledRef.current = true;
      nextMatchRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const now = Date.now();
  let nextMatchId = null;
  for (const m of matches) {
    if (new Date(m.kickoff) > now) {
      nextMatchId = m.id;
      break;
    }
  }

  const days = groupMatchesByDay(matches);

  return (
    <div className="main-layout">
      <main className="main-matches">
        {loading ? (
          <p className="loading-msg">Laddar matcher...</p>
        ) : days.length === 0 ? (
          <p className="loading-msg">Inga matcher hittades.</p>
        ) : (
          days.map((day) => (
            <section key={day.dateKey} className="day-section">
              <h2 className="day-header">{day.dateLabel}</h2>
              {day.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  innerRef={match.id === nextMatchId ? nextMatchRef : null}
                />
              ))}
            </section>
          ))
        )}
      </main>

      <aside className="main-sidebar">
        <PlayerLeaderboard players={players} />
      </aside>
    </div>
  );
}

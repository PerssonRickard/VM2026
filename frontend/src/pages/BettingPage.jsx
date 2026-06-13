import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import MatchCard from "../components/MatchCard";
import "./BettingPage.css";

const OUTCOME_LABELS = { H: "Hemma", D: "Oavgjort", A: "Borta" };

function BetForm({ match, existingBet, onBetPlaced }) {
  const [outcome, setOutcome] = useState(existingBet?.outcome || "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  const odds = { H: match.odds_home, D: match.odds_draw, A: match.odds_away };

  if (match.betting_closed) {
    if (!existingBet) return null;
    const settled = existingBet.is_settled;
    const won = settled && existingBet.payout > 0;
    return (
      <div className={`existing-bet ${won ? "existing-bet--won" : ""} ${settled && !won ? "existing-bet--lost" : ""}`}>
        <span className="existing-bet-label">Ditt tips:</span>
        <span>{OUTCOME_LABELS[existingBet.outcome]} · {odds[existingBet.outcome]}x</span>
        {!settled && <span className="existing-bet-status">Väntar på resultat</span>}
        {won && <span className="existing-bet-status existing-bet-status--won">+{existingBet.payout} p</span>}
        {settled && !won && <span className="existing-bet-status existing-bet-status--lost">Fel tips</span>}
      </div>
    );
  }

  const options = Object.entries(odds).filter(([, v]) => v !== null);

  const handleSelect = async (key) => {
    if (saving || key === outcome) return;
    const prev = outcome;
    setOutcome(key);
    setSaving(true);
    setJustSaved(false);
    setError("");
    try {
      await api.post("/bets/", { match_id: match.id, outcome: key });
      setJustSaved(true);
      onBetPlaced();
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setOutcome(prev);
      const detail = err.response?.data;
      setError(
        typeof detail === "object"
          ? Object.values(detail).flat().join(" ") || "Kunde inte spara."
          : "Kunde inte spara."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bet-form">
      <div className="bet-form-options">
        {options.map(([key, odd]) => (
          <label
            key={key}
            className={`bet-option ${outcome === key ? "bet-option--selected" : ""} ${saving ? "bet-option--disabled" : ""}`}
          >
            <input
              type="radio"
              name={`outcome-${match.id}`}
              value={key}
              checked={outcome === key}
              onChange={() => handleSelect(key)}
              disabled={saving}
            />
            <span className="bet-option-label">{OUTCOME_LABELS[key]}</span>
            <span className="bet-option-odds">{Math.round(parseFloat(odd) * 100)} p</span>
          </label>
        ))}
      </div>
      <div className="bet-form-status">
        {saving && <span className="bet-status-saving">Sparar...</span>}
        {!saving && justSaved && <span className="bet-status-saved">Sparat</span>}
        {!saving && !justSaved && (
          <span className="bet-odds-note">
            {match.odds_locked
  ? "Odds låsta · dessa avgör vinsten"
  : "Uppdateras löpande · odds låses 1h före avspark · låsta odds avgör vinsten"}
          </span>
        )}
        {error && <span className="bet-error">{error}</span>}
      </div>
    </div>
  );
}

function MatchBetCard({ match, myBets, onBetPlaced }) {
  const existingBet = myBets.find((b) => b.match_id === match.id) || null;
  return (
    <MatchCard match={match}>
      <BetForm match={match} existingBet={existingBet} onBetPlaced={onBetPlaced} />
    </MatchCard>
  );
}

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

export default function BettingPage() {
  const { user, refreshUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [mRes, bRes] = await Promise.all([api.get("/matches/"), api.get("/bets/")]);
    setMatches(mRes.data);
    setMyBets(bRes.data);
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const upcomingMatches = matches.filter(
    (m) => !m.betting_closed && (m.odds_home || m.odds_draw || m.odds_away)
  );
  const dayGroups = groupMatchesByDay(upcomingMatches);

  if (loading) {
    return <div className="betting-page"><p className="loading-msg">Laddar...</p></div>;
  }

  return (
    <div className="betting-page">
      <div className="betting-balance">
        <span className="balance-label">Dina poäng</span>
        <span className="balance-value">{user?.points_balance ?? "–"} p</span>
      </div>

      {upcomingMatches.length === 0 ? (
        <p className="betting-empty">Inga öppna spel just nu.</p>
      ) : (
        dayGroups.map((day) => (
          <section className="day-section" key={day.dateKey}>
            <h2 className="day-header">{day.dateLabel}</h2>
            {day.matches.map((match) => (
              <MatchBetCard
                key={match.id}
                match={match}
                myBets={myBets}
                onBetPlaced={reload}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

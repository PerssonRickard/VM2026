import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import "./BettingPage.css";

const OUTCOME_LABELS = { H: "Hemma", D: "Oavgjort", A: "Borta" };
const SWEDISH_MONTHS = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function formatKickoff(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${SWEDISH_MONTHS[d.getMonth()]} ${d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
}

function teamName(match, side) {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_label : match.away_label;
  return team?.name || label || "TBD";
}

function BetForm({ match, existingBet, onBetPlaced }) {
  const [outcome, setOutcome] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (existingBet) {
    const settled = existingBet.is_settled;
    const won = settled && existingBet.payout > 0;
    return (
      <div className={`existing-bet ${won ? "existing-bet--won" : ""} ${settled && !won ? "existing-bet--lost" : ""}`}>
        <span className="existing-bet-label">Din insats:</span>
        <span>{OUTCOME_LABELS[existingBet.outcome]} · {existingBet.amount} p</span>
        {!settled && <span className="existing-bet-status">Väntar på resultat</span>}
        {won && <span className="existing-bet-status existing-bet-status--won">+{existingBet.payout} p</span>}
        {settled && !won && <span className="existing-bet-status existing-bet-status--lost">Förlorade</span>}
      </div>
    );
  }

  const odds = { H: match.odds_home, D: match.odds_draw, A: match.odds_away };
  const options = Object.entries(odds).filter(([, v]) => v !== null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!outcome) { setError("Välj ett utfall."); return; }
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1) { setError("Ange ett belopp på minst 1000 poäng."); return; }
    setSubmitting(true);
    try {
      await api.post("/bets/", { match_id: match.id, outcome, amount: amt });
      onBetPlaced();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object") {
        const msgs = Object.values(detail).flat().join(" ");
        setError(msgs || "Kunde inte lägga spelet.");
      } else {
        setError("Kunde inte lägga spelet.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="bet-form" onSubmit={handleSubmit}>
      <div className="bet-form-options">
        {options.map(([key, odd]) => (
          <label key={key} className={`bet-option ${outcome === key ? "bet-option--selected" : ""}`}>
            <input
              type="radio"
              name={`outcome-${match.id}`}
              value={key}
              checked={outcome === key}
              onChange={() => setOutcome(key)}
            />
            <span className="bet-option-label">{OUTCOME_LABELS[key]}</span>
            <span className="bet-option-odds">{odd}</span>
          </label>
        ))}
      </div>
      <div className="bet-form-bottom">
        <input
          className="bet-amount-input"
          type="number"
          min="1000"
          placeholder="Poäng"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="bet-submit-btn" type="submit" disabled={submitting}>
          {submitting ? "Skickar..." : "Spela"}
        </button>
      </div>
      {error && <p className="bet-error">{error}</p>}
    </form>
  );
}

function MatchBetCard({ match, myBets, onBetPlaced }) {
  const existingBet = myBets.find((b) => b.match_id === match.id) || null;
  const stageLabel = match.stage === "Group" ? `Grupp ${match.group}` : match.stage;
  const code = (team) => team?.flag_code?.toLowerCase();

  return (
    <div className="bet-match-card">
      <div className="bet-match-header">
        <span className="bet-match-stage">{stageLabel}</span>
        <span className="bet-match-time">{formatKickoff(match.kickoff)}</span>
      </div>
      <div className="bet-match-teams">
        <span className="bet-match-team">
          {code(match.home_team) && (
            <img src={`/flags/${code(match.home_team)}.png`} alt="" className="bet-flag" />
          )}
          {teamName(match, "home")}
        </span>
        <span className="bet-match-vs">vs</span>
        <span className="bet-match-team">
          {teamName(match, "away")}
          {code(match.away_team) && (
            <img src={`/flags/${code(match.away_team)}.png`} alt="" className="bet-flag" />
          )}
        </span>
      </div>
      <BetForm match={match} existingBet={existingBet} onBetPlaced={onBetPlaced} />
    </div>
  );
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

  const openMatches = matches.filter((m) => !m.betting_closed && (m.odds_home || m.odds_draw || m.odds_away));
  const myBetsWithDetails = myBets.map((bet) => {
    const match = matches.find((m) => m.id === bet.match_id);
    return { ...bet, match };
  }).filter((b) => b.match);

  if (loading) {
    return <div className="betting-page"><p className="loading-msg">Laddar...</p></div>;
  }

  return (
    <div className="betting-page">
      <div className="betting-balance">
        <span className="balance-label">Ditt saldo</span>
        <span className="balance-value">{user?.points_balance ?? "–"} p</span>
      </div>

      <section className="betting-section">
        <h2 className="betting-section-title">Kommande matcher</h2>
        {openMatches.length === 0 ? (
          <p className="betting-empty">Inga öppna spel just nu.</p>
        ) : (
          openMatches.map((match) => (
            <MatchBetCard
              key={match.id}
              match={match}
              myBets={myBets}
              onBetPlaced={reload}
            />
          ))
        )}
      </section>

      <section className="betting-section">
        <h2 className="betting-section-title">Mina spel</h2>
        {myBetsWithDetails.length === 0 ? (
          <p className="betting-empty">Du har inga spel ännu.</p>
        ) : (
          <table className="my-bets-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Utfall</th>
                <th>Insats</th>
                <th>Odds</th>
                <th>Resultat</th>
              </tr>
            </thead>
            <tbody>
              {myBetsWithDetails.map((bet) => {
                const won = bet.is_settled && bet.payout > 0;
                const lost = bet.is_settled && bet.payout === 0;
                return (
                  <tr key={bet.id} className={won ? "row--won" : lost ? "row--lost" : ""}>
                    <td>
                      {teamName(bet.match, "home")} vs {teamName(bet.match, "away")}
                      <br />
                      <small>{formatKickoff(bet.match.kickoff)}</small>
                    </td>
                    <td>{OUTCOME_LABELS[bet.outcome]}</td>
                    <td>{bet.amount} p</td>
                    <td>{bet.odds_at_bet}</td>
                    <td>
                      {!bet.is_settled && <span className="status-pending">Väntar</span>}
                      {won && <span className="status-won">+{bet.payout} p</span>}
                      {lost && <span className="status-lost">Förlorade</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

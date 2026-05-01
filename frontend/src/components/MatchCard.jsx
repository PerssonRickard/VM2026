import React from "react";
import CountdownTimer from "./CountdownTimer";
import "./MatchCard.css";

function Flag({ code, name }) {
  if (!code) return <span className="match-flag-placeholder">🏳</span>;
  return (
    <img
      src={`/flags/${code}.png`}
      alt={name}
      className="match-flag"
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}

function outcomeLabel(outcome) {
  if (outcome === "H") return "Hemma";
  if (outcome === "D") return "Oavgjort";
  return "Borta";
}

function BetRow({ bet }) {
  const won = bet.is_settled && bet.payout > 0;
  const lost = bet.is_settled && bet.payout === 0;
  return (
    <div className={`bet-row ${won ? "bet-row--won" : ""} ${lost ? "bet-row--lost" : ""}`}>
      <span className="bet-player">{bet.player_username}</span>
      <span className="bet-pick">{outcomeLabel(bet.outcome)}</span>
      <span className="bet-amount">{bet.amount} p</span>
      {won && <span className="bet-result bet-result--won">+{bet.payout} p</span>}
      {lost && <span className="bet-result bet-result--lost">–</span>}
      {!bet.is_settled && <span className="bet-result bet-result--pending">•</span>}
    </div>
  );
}

export default function MatchCard({ match, innerRef }) {
  const hasResult = match.home_score !== null && match.away_score !== null;
  const stageLabel = match.stage === "Group" ? `Grupp ${match.group}` : match.stage;

  const kickoffDate = new Date(match.kickoff);
  const timeStr = kickoffDate.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  const homeCode = match.home_team?.flag_code?.toLowerCase();
  const awayCode = match.away_team?.flag_code?.toLowerCase();
  const homeName = match.home_team?.name || match.home_label || "TBD";
  const awayName = match.away_team?.name || match.away_label || "TBD";

  const statusClass = hasResult
    ? "match-card--finished"
    : match.betting_closed
    ? "match-card--locked"
    : "";

  return (
    <div className={`match-card ${statusClass}`} ref={innerRef}>
      <div className="match-card-meta">
        <span className="match-stage">{stageLabel}</span>
        <span className="match-time">{timeStr}</span>
      </div>

      <div className="match-main">
        <div className="match-team match-team--home">
          <Flag code={homeCode} name={homeName} />
          <span className="match-team-name">{homeName}</span>
        </div>

        <div className="match-center">
          {hasResult ? (
            <div className="match-score">
              <span>{match.home_score}</span>
              <span className="match-score-sep">–</span>
              <span>{match.away_score}</span>
            </div>
          ) : (
            <div className="match-score match-score--upcoming">
              <span className="match-score-dash">vs</span>
            </div>
          )}
        </div>

        <div className="match-team match-team--away">
          <span className="match-team-name">{awayName}</span>
          <Flag code={awayCode} name={awayName} />
        </div>
      </div>

      {(match.odds_home || match.odds_draw || match.odds_away) && (
        <div className="match-odds">
          {match.odds_home && (
            <div className="odds-chip">
              <span className="odds-label">1</span>
              <span className="odds-value">{match.odds_home}</span>
            </div>
          )}
          {match.odds_draw && (
            <div className="odds-chip">
              <span className="odds-label">X</span>
              <span className="odds-value">{match.odds_draw}</span>
            </div>
          )}
          {match.odds_away && (
            <div className="odds-chip">
              <span className="odds-label">2</span>
              <span className="odds-value">{match.odds_away}</span>
            </div>
          )}
        </div>
      )}

      <CountdownTimer kickoff={match.kickoff} />

      {match.betting_closed && match.bets && match.bets.length > 0 && (
        <div className="match-bets">
          <div className="match-bets-title">Spel</div>
          {match.bets.map((bet) => (
            <BetRow key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}

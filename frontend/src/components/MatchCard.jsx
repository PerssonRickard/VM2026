import React from "react";
import { Link } from "react-router-dom";
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

function OddsChip({ label, points, bets, showBets, correct }) {
  return (
    <div className={`odds-chip ${correct ? "odds-chip--correct" : ""}`}>
      <span className="odds-label">{label}</span>
      <span className="odds-points">{points} p</span>
      {showBets && (
      <div className="odds-bets">
        {bets.map((bet) => {
          const won = bet.is_settled && bet.payout > 0;
          const lost = bet.is_settled && bet.payout === 0;
          return (
            <span
              key={bet.id}
              className={`odds-bet-player ${won ? "odds-bet-player--won" : ""} ${lost ? "odds-bet-player--lost" : ""}`}
            >
              {bet.player_username}
            </span>
          );
        })}
      </div>
      )}
    </div>
  );
}

export default function MatchCard({ match, innerRef, children }) {
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

  const betsByOutcome = { H: [], D: [], A: [] };
  if (match.betting_closed && match.bets) {
    for (const bet of match.bets) {
      betsByOutcome[bet.outcome]?.push(bet);
    }
  }

  const actualOutcome = hasResult
    ? match.home_score > match.away_score
      ? "H"
      : match.home_score < match.away_score
      ? "A"
      : "D"
    : null;

  return (
    <div className={`match-card ${statusClass}`} ref={innerRef}>
      <div className="match-card-meta">
        <span className="match-stage">{stageLabel}</span>
        <span className="match-time">{timeStr}</span>
      </div>

      <div className="match-main">
        <div className="match-team match-team--home">
          <Flag code={homeCode} name={homeName} />
          <div className="match-team-stack">
            <span className="match-team-name">{homeName}</span>
            {match.home_team && (
              <Link to={`/team/${match.home_team.id}`} className="match-team-squad-link">
                Lag
              </Link>
            )}
          </div>
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
          <div className="match-team-stack match-team-stack--away">
            <span className="match-team-name">{awayName}</span>
            {match.away_team && (
              <Link to={`/team/${match.away_team.id}`} className="match-team-squad-link">
                Lag
              </Link>
            )}
          </div>
          <Flag code={awayCode} name={awayName} />
        </div>
      </div>

      {!children && (match.odds_home || match.odds_draw || match.odds_away) && (
        <div className="match-odds">
          {match.odds_locked && (
            <span className="odds-lock-badge">Odds låsta</span>
          )}
          {match.odds_home && (
            <OddsChip label="1" points={Math.round(parseFloat(match.odds_home) * 100)} bets={betsByOutcome.H} showBets={match.betting_closed} correct={actualOutcome === "H"} />
          )}
          {match.odds_draw && (
            <OddsChip label="X" points={Math.round(parseFloat(match.odds_draw) * 100)} bets={betsByOutcome.D} showBets={match.betting_closed} correct={actualOutcome === "D"} />
          )}
          {match.odds_away && (
            <OddsChip label="2" points={Math.round(parseFloat(match.odds_away) * 100)} bets={betsByOutcome.A} showBets={match.betting_closed} correct={actualOutcome === "A"} />
          )}
        </div>
      )}

      <CountdownTimer kickoff={match.kickoff} />

      {children && (
        <div className="match-card-extra">{children}</div>
      )}
    </div>
  );
}

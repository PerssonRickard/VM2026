import React from "react";
import { useAuth } from "../AuthContext";
import "./PlayerLeaderboard.css";

const MEDALS = ["🥇", "🥈", "🥉"];
const PLACES = ["1:a plats", "2:a plats", "3:e plats"];
const PRIZES = ["2 000 kr", "600 kr", "200 kr"];

export default function PlayerLeaderboard({ players }) {
  const { user } = useAuth();

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">Ställning</h2>
      {players.length === 0 ? (
        <p className="leaderboard-empty">Inga spelare ännu.</p>
      ) : (
        <div className="leaderboard-list">
          {players.map((player, idx) => {
            const isMe = user?.username === player.username;
            const medal = MEDALS[idx] ?? null;
            return (
              <div key={player.id} className={`leaderboard-row ${isMe ? "leaderboard-row--me" : ""}`}>
                <span className="leaderboard-rank">
                  {medal ?? <span className="leaderboard-rank-num">{idx + 1}</span>}
                </span>
                <span className="leaderboard-name">{player.username}</span>
                <span className="leaderboard-pts">{player.points_balance.toLocaleString("sv-SE")}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="leaderboard-prizes">
        <h3 className="leaderboard-prizes-title">Vinster</h3>
        <div className="leaderboard-prize-list">
          {PLACES.map((place, idx) => (
            <div key={place} className="leaderboard-prize-row">
              <span className="leaderboard-prize-place">{place}</span>
              <span className="leaderboard-prize-amount">{PRIZES[idx]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

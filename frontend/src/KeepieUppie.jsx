import { useState, useEffect, useRef, useCallback } from "react";

// ─── Game Constants ─────────────────────────────────────────────────────────
const W = 800, H = 520;
const FIELD_TOP = H * 0.72;   // y-coordinate where pitch starts
const BALL_R = 22;
const GRAVITY = 0.36;
const KICK_VY = -13.5;
const KICK_COOLDOWN = 380;    // ms between kicks

// ─── Pre-computed Stable Data (no Math.random in draw loop) ─────────────────
const CROWD_COLORS = ["#e63946","#2196f3","#ffeb3b","#4caf50","#ff9800","#9c27b0","#fff","#f06292"];
const CROWD_DATA = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 52 }, (_, col) => ({
    color: CROWD_COLORS[Math.floor(Math.abs(Math.sin(col * 7.91 + row * 13.37 + 1.23)) * CROWD_COLORS.length)],
  }))
);
const SILHOUETTE = Array.from({ length: 136 }, (_, i) => ({
  h: 8 + Math.abs(Math.sin(i * 1.37) * 5 + Math.sin(i * 0.53) * 3),
}));

// ─── Drawing Helpers ─────────────────────────────────────────────────────────

function drawSky(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD_TOP);
  grad.addColorStop(0, "#060c1e");
  grad.addColorStop(0.55, "#0e1f3d");
  grad.addColorStop(1, "#152e55");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, FIELD_TOP);

  const stars = [
    [0.04,0.06],[0.14,0.11],[0.27,0.04],[0.41,0.09],[0.53,0.05],
    [0.67,0.12],[0.77,0.07],[0.89,0.10],[0.11,0.22],[0.33,0.18],
    [0.59,0.16],[0.84,0.21],[0.21,0.30],[0.47,0.26],[0.71,0.24],
    [0.94,0.18],[0.08,0.38],[0.38,0.35],[0.62,0.32],[0.88,0.29],
    [0.18,0.43],[0.51,0.40],[0.75,0.37],[0.03,0.52],[0.29,0.48],
  ];
  stars.forEach(([sx, sy]) => {
    const b = 0.5 + Math.abs(Math.sin(sx * 100 + sy * 50)) * 0.5;
    ctx.beginPath();
    ctx.arc(sx * W, sy * FIELD_TOP, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${b.toFixed(2)})`;
    ctx.fill();
  });
}

function drawStadium(ctx) {
  const FT = FIELD_TOP;

  // ── Upper dark structures ──
  ctx.fillStyle = "#0f1a2e";
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W * 0.22, 0);
  ctx.lineTo(W * 0.26, FT * 0.30); ctx.lineTo(0, FT * 0.36);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(W, 0); ctx.lineTo(W * 0.78, 0);
  ctx.lineTo(W * 0.74, FT * 0.30); ctx.lineTo(W, FT * 0.36);
  ctx.closePath(); ctx.fill();

  // ── Centre top stand ──
  const topGrad = ctx.createLinearGradient(0, 0, 0, FT * 0.38);
  topGrad.addColorStop(0, "#0a1e0d");
  topGrad.addColorStop(1, "#143320");
  ctx.fillStyle = topGrad;
  ctx.fillRect(W * 0.22, 0, W * 0.56, FT * 0.38);

  // Crowd seat dots
  CROWD_DATA.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      ctx.fillStyle = cell.color;
      ctx.fillRect(
        W * 0.23 + ci * (W * 0.54 / 52),
        FT * 0.03 + ri * FT * 0.046,
        8, 5
      );
    })
  );

  // ── Side stands ──
  const sideLeft = ctx.createLinearGradient(0, FT * 0.36, W * 0.20, FT);
  sideLeft.addColorStop(0, "#0d3018"); sideLeft.addColorStop(1, "#1b5a2e");
  ctx.fillStyle = sideLeft;
  ctx.beginPath();
  ctx.moveTo(0, FT * 0.36); ctx.lineTo(W * 0.26, FT * 0.30);
  ctx.lineTo(W * 0.22, FT); ctx.lineTo(0, FT);
  ctx.closePath(); ctx.fill();

  const sideRight = ctx.createLinearGradient(W * 0.80, FT * 0.36, W, FT);
  sideRight.addColorStop(0, "#0d3018"); sideRight.addColorStop(1, "#1b5a2e");
  ctx.fillStyle = sideRight;
  ctx.beginPath();
  ctx.moveTo(W, FT * 0.36); ctx.lineTo(W * 0.74, FT * 0.30);
  ctx.lineTo(W * 0.78, FT); ctx.lineTo(W, FT);
  ctx.closePath(); ctx.fill();

  // ── Crowd silhouette (bottom of stands) ──
  ctx.beginPath();
  ctx.moveTo(0, FT);
  SILHOUETTE.forEach((b, i) => ctx.lineTo((i / 135) * W, FT - b.h));
  ctx.lineTo(W, FT); ctx.closePath();
  ctx.fillStyle = "#040a04"; ctx.fill();
}

function drawFloodlights(ctx) {
  [W * 0.07, W * 0.93].forEach(fx => {
    // Pole
    const pGrad = ctx.createLinearGradient(fx - 5, 0, fx + 5, 0);
    pGrad.addColorStop(0, "#5a5a5a"); pGrad.addColorStop(0.5, "#aaa"); pGrad.addColorStop(1, "#5a5a5a");
    ctx.fillStyle = pGrad;
    ctx.fillRect(fx - 4, FIELD_TOP * 0.14, 8, FIELD_TOP * 0.86);

    // Cross arm
    ctx.fillStyle = "#888";
    ctx.fillRect(fx - 30, FIELD_TOP * 0.12, 60, 7);

    // Light cone glow
    const lightY = FIELD_TOP * 0.15;
    const cone = ctx.createRadialGradient(fx, lightY, 8, fx, lightY + FIELD_TOP * 0.35, FIELD_TOP * 0.55);
    cone.addColorStop(0, "rgba(255,248,190,0.20)");
    cone.addColorStop(1, "rgba(255,248,190,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(fx - 30, lightY);
    ctx.lineTo(fx - W * 0.24, FIELD_TOP);
    ctx.lineTo(fx + W * 0.24, FIELD_TOP);
    ctx.lineTo(fx + 30, lightY);
    ctx.closePath(); ctx.fill();

    // Bulbs
    for (let i = 0; i < 6; i++) {
      const bx = fx - 24 + i * 10, by = FIELD_TOP * 0.135;
      // Glow halo
      const halo = ctx.createRadialGradient(bx, by, 0, bx, by, 14);
      halo.addColorStop(0, "rgba(255,252,190,0.55)");
      halo.addColorStop(1, "rgba(255,252,190,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fill();
      // Bulb core
      ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,253,210,0.98)"; ctx.fill();
    }
  });
}

function drawField(ctx) {
  const fieldH = H - FIELD_TOP;

  // Base green
  const fGrad = ctx.createLinearGradient(0, FIELD_TOP, 0, H);
  fGrad.addColorStop(0, "#22943a"); fGrad.addColorStop(1, "#175f25");
  ctx.fillStyle = fGrad;
  ctx.fillRect(0, FIELD_TOP, W, fieldH);

  // Alternating stripes
  const sw = W / 12;
  for (let i = 0; i < 12; i += 2) {
    ctx.fillStyle = "rgba(0,0,0,0.065)";
    ctx.fillRect(i * sw, FIELD_TOP, sw, fieldH);
  }

  // White markings
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;

  // Boundary box
  ctx.strokeRect(W * 0.03, FIELD_TOP + 3, W * 0.94, fieldH - 6);

  // Centre line (horizontal)
  ctx.beginPath();
  ctx.moveTo(W * 0.03, FIELD_TOP + fieldH * 0.5);
  ctx.lineTo(W * 0.97, FIELD_TOP + fieldH * 0.5);
  ctx.stroke();

  // Centre circle arc (top half visible above pitch line)
  ctx.beginPath();
  ctx.arc(W / 2, FIELD_TOP, W * 0.115, 0, Math.PI);
  ctx.stroke();

  // Centre spot
  ctx.beginPath(); ctx.arc(W / 2, FIELD_TOP, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.fill();

  ctx.restore();
}

function drawBallShadow(ctx, ballX, ballY) {
  const shadowY = FIELD_TOP - 5;
  if (ballY >= shadowY) return;
  const dist = shadowY - ballY;
  const opacity = Math.max(0, 0.5 - (dist / FIELD_TOP) * 0.48);
  const scaleX = Math.max(0.25, 1 - (dist / FIELD_TOP) * 0.75);
  ctx.save();
  ctx.translate(ballX, shadowY);
  ctx.scale(scaleX, 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, BALL_R * 1.3, BALL_R * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${opacity.toFixed(2)})`;
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // --- Base with shading (3D effect) ---
  const baseGrad = ctx.createRadialGradient(
    -r * 0.3, -r * 0.3, r * 0.1,
    0, 0, r
  );
  baseGrad.addColorStop(0, "#ffffff");
  baseGrad.addColorStop(1, "#dcdcdc");

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // --- Clip for panels ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // --- Pentagon patches ---
  const patches = [
    [0, 0],
    [0, -r * 0.58],
    [r * 0.55, -r * 0.18],
    [r * 0.34, r * 0.47],
    [-r * 0.34, r * 0.47],
    [-r * 0.55, -r * 0.18],
  ];

  patches.forEach(([px, py]) => {
    ctx.save();
    ctx.translate(px, py);

    const pr = r * 0.28;

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const px2 = Math.cos(a) * pr;
      const py2 = Math.sin(a) * pr;
      i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
    }
    ctx.closePath();

    // Slight gradient for depth
    const patchGrad = ctx.createRadialGradient(
      -pr * 0.3, -pr * 0.3, pr * 0.1,
      0, 0, pr
    );
    patchGrad.addColorStop(0, "#333");
    patchGrad.addColorStop(1, "#000");

    ctx.fillStyle = patchGrad;
    ctx.fill();

    ctx.restore();
  });

  // --- Panel seam lines ---
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = r * 0.03;

  patches.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(px, py);
    ctx.stroke();
  });

  ctx.restore(); // end clip

  // --- Outer shadow (depth) ---
  const shadowGrad = ctx.createRadialGradient(
    r * 0.4, r * 0.4, r * 0.2,
    0, 0, r
  );
  shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
  shadowGrad.addColorStop(1, "rgba(0,0,0,0.25)");

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // --- Crisp outline ---
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // --- Stronger highlight ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const shine = ctx.createRadialGradient(
    -r * 0.4, -r * 0.4, r * 0.05,
    -r * 0.2, -r * 0.2, r * 0.8
  );
  shine.addColorStop(0, "rgba(255,255,255,0.9)");
  shine.addColorStop(0.3, "rgba(255,255,255,0.3)");
  shine.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = shine;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.restore();

  ctx.restore();
}

function drawHUD(ctx, score) {
  ctx.fillStyle = "rgba(0,5,20,0.62)";
  ctx.beginPath();
  ctx.rect(W / 2 - 65, 8, 130, 52);
  ctx.fill();

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 36px 'Bebas Neue', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(score, W / 2, 47);

  ctx.fillStyle = "#8899bb";
  ctx.font = "11px 'Oswald', 'Trebuchet MS', sans-serif";
  ctx.fillText("TOUCHES", W / 2, 58);
}

// ─── Main Game Component ─────────────────────────────────────────────────────
export default function KeepieUppie() {
  const canvasRef = useRef(null);
  const gsRef = useRef({
    phase: "idle",
    ball: { x: W / 2, y: H * 0.38, vx: 1.5, vy: -2, angle: 0 },
    mouse: { x: -999, y: -999 },
    lastKick: 0,
    score: 0,
    kickFlash: 0,
    raf: null,
  });

  const [phase, setPhase] = useState("idle");
  const [displayScore, setDisplayScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [highscores, setHighscores] = useState([
    { name: "Ronaldo", score: 147 },
    { name: "Messi", score: 132 },
    { name: "Pelé", score: 98 },
    { name: "Mbappé", score: 67 },
    { name: "Neymar", score: 45 },
  ]);

  // ── API calls ──
  const fetchHighscores = async () => {
    try {
      const res = await fetch('/api/highscores/');
      if (res.ok) setHighscores(await res.json());
    } catch { /* keep defaults */ }
  };

  useEffect(() => { fetchHighscores(); }, []);

  const submitScore = async () => {
    if (!playerName.trim() || submitted) return;
    const entry = { name: playerName.trim(), score: finalScore };
    try {
      const res = await fetch('/api/highscores/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) await fetchHighscores();
      else throw new Error("non-ok");
    } catch {
      setHighscores(prev =>
        [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 10)
      );
    }
    setSubmitted(true);
  };

  // ── Render a static frame (used when not in playing state) ──
  const renderStaticFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { ball } = gsRef.current;
    drawSky(ctx);
    // drawStadium(ctx);
    drawFloodlights(ctx);
    drawField(ctx);
    drawBallShadow(ctx, ball.x, ball.y);
    drawBall(ctx, ball.x, ball.y, BALL_R, ball.angle);
  }, []);

  // ── Main game loop ──
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;

    const ctx = canvas.getContext("2d");
    const b = gs.ball;

    // Physics step
    b.vy += GRAVITY;
    b.x += b.vx;
    b.y += b.vy;
    b.angle += b.vx * 0.042;

    // Wall collisions
    if (b.x - BALL_R < 0)  { b.x = BALL_R;      b.vx =  Math.abs(b.vx) * 0.78; }
    if (b.x + BALL_R > W)  { b.x = W - BALL_R;  b.vx = -Math.abs(b.vx) * 0.78; }
    if (b.y - BALL_R < 18) { b.y = BALL_R + 18; b.vy =  Math.abs(b.vy) * 0.62; }

    // Pitch = game over
    if (b.y + BALL_R >= FIELD_TOP - 2) {
      gs.phase = "dead";
      setFinalScore(gs.score);
      setPhase("dead");
      setSubmitted(false);
      renderStaticFrame();
      return;
    }

    // Mouse proximity kick
    const dx = gs.mouse.x - b.x;
    const dy = gs.mouse.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const now = Date.now();

    if (dist < BALL_R + 20 && now - gs.lastKick > KICK_COOLDOWN) {
      gs.lastKick = now;
      gs.score++;
      gs.kickFlash = 20;
      b.vy = KICK_VY - Math.random() * 1.8;
      b.vx += (dx / (dist + 0.01)) * 2.8;
      b.vx = Math.max(-8, Math.min(8, b.vx));
      setDisplayScore(gs.score);
    }

    if (gs.kickFlash > 0) gs.kickFlash--;

    // ── Draw ──
    drawSky(ctx);
    // drawStadium(ctx);
    drawFloodlights(ctx);
    drawField(ctx);
    drawBallShadow(ctx, b.x, b.y);

    // Kick ring effect
    if (gs.kickFlash > 0) {
      const p = 1 - gs.kickFlash / 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R + p * 32, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,215,0,${(gs.kickFlash / 20).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    drawBall(ctx, b.x, b.y, BALL_R, b.angle);
    drawHUD(ctx, gs.score);

    gs.raf = requestAnimationFrame(gameLoop);
  }, [renderStaticFrame]);

  // ── Start / Restart ──
  const startGame = useCallback(() => {
    const gs = gsRef.current;
    if (gs.raf) cancelAnimationFrame(gs.raf);
    gs.phase = "playing";
    gs.ball = {
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H * 0.37,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -3,
      angle: 0,
    };
    gs.mouse = { x: -999, y: -999 };
    gs.lastKick = 0;
    gs.score = 0;
    gs.kickFlash = 0;
    setDisplayScore(0);
    setPhase("playing");
    setPlayerName("");
    gs.raf = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // Draw a static frame when entering non-playing states
  useEffect(() => {
    if (phase !== "playing") renderStaticFrame();
  }, [phase, renderStaticFrame]);

  // ── Mouse / Touch tracking ──
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gsRef.current.mouse.x = (e.clientX - rect.left) * (W / rect.width);
    gsRef.current.mouse.y = (e.clientY - rect.top)  * (H / rect.height);
  }, []);

  const handleTouch = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !e.touches.length) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    gsRef.current.mouse.x = (t.clientX - rect.left) * (W / rect.width);
    gsRef.current.mouse.y = (t.clientY - rect.top)  * (H / rect.height);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (gsRef.current.raf) cancelAnimationFrame(gsRef.current.raf);
  }, []);

  // ── Render ──
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #07101f 0%, #0c1a30 60%, #071510 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 16px 30px",
      fontFamily: "'Oswald', 'Trebuchet MS', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        input:focus { outline: none; }
      `}</style>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: "clamp(1.8rem, 5vw, 3.2rem)",
        letterSpacing: "7px",
        margin: "0 0 16px",
        background: "linear-gradient(90deg, #ffd700 0%, #ff8c00 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>
        KEEPIE UPPIE
      </h1>

      <div style={{
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {/* ── Canvas ── */}
        <div style={{ position: "relative", lineHeight: 0 }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{
              display: "block",
              borderRadius: "10px",
              border: "2px solid #1e3a60",
              maxWidth: "100%",
              cursor: phase === "playing" ? "default" : "default",
              boxShadow: "0 0 50px rgba(0,60,180,0.35)",
            }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouch}
            onTouchStart={handleTouch}
          />

          {/* ── Idle overlay ── */}
          {phase === "idle" && (
            <Overlay>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "5.5rem", lineHeight: 1, userSelect: "none" }}>⚽</div>
                <p style={{ color: "#7ed96f", margin: "12px 0 24px", fontSize: "1.1rem" }}>
                  Move your cursor over the ball to keep it in the air!
                </p>
                <GameButton color="#2ecc71" onClick={startGame}>KICK OFF!</GameButton>
              </div>
            </Overlay>
          )}

          {/* ── Game Over overlay ── */}
          {phase === "dead" && (
            <Overlay>
              <div style={{ textAlign: "center" }}>
                <h2 style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "3.8rem",
                  color: "#ff4136",
                  margin: "0 0 4px",
                  letterSpacing: "5px",
                }}>
                  GAME OVER
                </h2>
                <p style={{ color: "#88a", fontSize: "0.95rem", margin: "0 0 8px" }}>
                  The ball hit the pitch!
                </p>
                <div style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "5.5rem",
                  color: "#ffd700",
                  lineHeight: 1,
                }}>
                  {finalScore}
                </div>
                <p style={{ color: "#667", fontSize: "0.9rem", margin: "4px 0 18px" }}>touches</p>

                {!submitted ? (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "14px" }}>
                    <input
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && submitScore()}
                      placeholder="Your name..."
                      maxLength={20}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "6px",
                        border: "2px solid #2ecc71",
                        background: "#0a1520",
                        color: "#fff",
                        fontSize: "1rem",
                        fontFamily: "'Oswald', sans-serif",
                        width: "165px",
                      }}
                    />
                    <GameButton color="#2ecc71" onClick={submitScore}>SAVE</GameButton>
                  </div>
                ) : (
                  <p style={{ color: "#2ecc71", marginBottom: "14px", fontSize: "1rem" }}>
                    ✓ Score saved to leaderboard!
                  </p>
                )}

                <GameButton color="#3498db" onClick={startGame}>PLAY AGAIN</GameButton>
              </div>
            </Overlay>
          )}
        </div>

        {/* ── Highscores Panel ── */}
        <div style={{
          background: "#0a1525",
          border: "2px solid #1e3a60",
          borderRadius: "10px",
          padding: "20px 18px",
          minWidth: "215px",
          boxShadow: "0 0 24px rgba(0,60,160,0.28)",
        }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: "2rem",
            letterSpacing: "3px",
            color: "#ffd700",
            margin: "0 0 14px",
            textAlign: "center",
          }}>
            🏆 TOP SCORES
          </h3>

          {highscores.length === 0 ? (
            <p style={{ color: "#445", textAlign: "center", fontSize: "0.9rem" }}>No scores yet!</p>
          ) : (
            highscores.slice(0, 10).map((hs, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
              const col = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#7a8fa8";
              return (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 0",
                  borderBottom: "1px solid #162230",
                  color: col,
                  fontSize: "0.93rem",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "26px", textAlign: "right", flexShrink: 0 }}>{medal}</span>
                    <span style={{ marginLeft: "4px" }}>{hs.name}</span>
                  </span>
                  <span style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: "1.15rem",
                    marginLeft: "8px",
                  }}>
                    {hs.score}
                  </span>
                </div>
              );
            })
          )}

          {/* Live score badge while playing */}
          {phase === "playing" && (
            <div style={{
              marginTop: "16px",
              textAlign: "center",
              padding: "10px",
              background: "#0e1f35",
              borderRadius: "6px",
              border: "1px solid #2a4a70",
            }}>
              <div style={{ color: "#667", fontSize: "0.8rem", marginBottom: "2px" }}>CURRENT</div>
              <div style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "2.5rem",
                color: "#ffd700",
                lineHeight: 1,
              }}>
                {displayScore}
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={{ color: "#2a3a4a", marginTop: "14px", fontSize: "0.78rem", letterSpacing: "1px" }}>
        MOVE CURSOR OVER BALL TO KICK • DON'T LET IT HIT THE PITCH
      </p>
    </div>
  );
}

// ─── Helper UI Components ─────────────────────────────────────────────────────
function Overlay({ children }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(2,8,20,0.74)",
      borderRadius: "10px",
      backdropFilter: "blur(3px)",
    }}>
      {children}
    </div>
  );
}

function GameButton({ color, onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "11px 28px",
        background: hover ? color : "transparent",
        color: hover ? "#fff" : color,
        border: `2px solid ${color}`,
        borderRadius: "6px",
        fontSize: "1.1rem",
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        letterSpacing: "3px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.12s ease, color 0.12s ease",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

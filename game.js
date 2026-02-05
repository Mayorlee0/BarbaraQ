/*
  Barbara's Mini Love Quest 💘
  Vanilla JS canvas game.
*/

// =========================
// Constants
// =========================
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const hudReasons = document.getElementById("hud-reasons");
const hudTimer = document.getElementById("hud-timer");

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const TILE = 60;
const PLAYER_SPEED = 2.2;
const TOKEN_RADIUS = 14;
const GATE_SIZE = { w: 70, h: 30 };

const reasons = [
  "Your smile could fix my whole week.",
  "You make even boring days feel like a movie.",
  "You’re not just beautiful, you’re gorgeous, like gorgeousssssss",
  "You make me a better man",
  "You’re my peace and my favorite person.",
  "How can I forget 150kg",
  "I’d choose you in every universe."
];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// =========================
// State
// =========================
const state = {
  keys: new Set(),
  touchDir: null,
  started: false,
  collected: 0,
  tokens: [],
  gateUnlocked: false,
  showGate: false,
  gateReached: false,
  startTime: null,
  elapsed: 0,
  player: {
    x: 90,
    y: 450,
    size: 26
  },
  confettiNodes: []
};

let soundEnabled = true;
let audioCtx = null;

// =========================
// Map & Collision
// =========================
const walls = [
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 30 },
  { x: 0, y: CANVAS_HEIGHT - 30, w: CANVAS_WIDTH, h: 30 },
  { x: 0, y: 0, w: 30, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 30, y: 0, w: 30, h: CANVAS_HEIGHT },
  { x: 120, y: 120, w: 120, h: 30 },
  { x: 120, y: 150, w: 30, h: 150 },
  { x: 210, y: 270, w: 200, h: 30 },
  { x: 410, y: 120, w: 30, h: 210 },
  { x: 490, y: 210, w: 200, h: 30 },
  { x: 620, y: 120, w: 30, h: 240 },
  { x: 120, y: 360, w: 220, h: 30 },
  { x: 350, y: 420, w: 220, h: 30 },
  { x: 640, y: 420, w: 160, h: 30 }
];

const gate = {
  x: CANVAS_WIDTH / 2 - GATE_SIZE.w / 2,
  y: 40,
  w: GATE_SIZE.w,
  h: GATE_SIZE.h
};

function isColliding(rect) {
  return walls.some(
    (wall) =>
      rect.x < wall.x + wall.w &&
      rect.x + rect.w > wall.x &&
      rect.y < wall.y + wall.h &&
      rect.y + rect.h > wall.y
  );
}

// =========================
// Input
// =========================
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    state.keys.add(key);
    event.preventDefault();
    initAudio();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  state.keys.delete(key);
});

const dpadButtons = document.querySelectorAll(".dpad-btn");
dpadButtons.forEach((button) => {
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    state.touchDir = button.dataset.dir;
  });
  button.addEventListener("touchend", () => {
    state.touchDir = null;
  });
  button.addEventListener("mousedown", () => {
    state.touchDir = button.dataset.dir;
  });
  button.addEventListener("mouseup", () => {
    state.touchDir = null;
  });
});

let swipeStart = null;
canvas.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  swipeStart = { x: touch.clientX, y: touch.clientY };
  initAudio();
});

canvas.addEventListener("touchend", (event) => {
  if (!swipeStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - swipeStart.x;
  const dy = touch.clientY - swipeStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) > 30) {
    if (absX > absY) {
      state.touchDir = dx > 0 ? "right" : "left";
    } else {
      state.touchDir = dy > 0 ? "down" : "up";
    }
    setTimeout(() => {
      state.touchDir = null;
    }, 180);
  }
  swipeStart = null;
});

// =========================
// UI Overlays
// =========================
function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
  overlay.innerHTML = "";
}

function startScreen() {
  showOverlay(`
    <div class="card">
      <h2>Welcome, Barbara 💘</h2>
      <p>Barbara, a tiny heart is on a mission to collect 7 reasons I love you…</p>
      <button id="start-btn">Start Quest</button>
    </div>
  `);
  document.getElementById("start-btn").addEventListener("click", () => {
    initAudio();
    hideOverlay();
    startGame();
  });
}

// =========================
// Audio (Web Audio API)
// =========================
function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return;
  }
  const AudioContextRef = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextRef) {
    soundEnabled = false;
    updateSoundToggleUI();
    return;
  }
  try {
    audioCtx = new AudioContextRef();
  } catch (error) {
    soundEnabled = false;
    updateSoundToggleUI();
  }
}

function playCollectChime() {
  if (!soundEnabled || !audioCtx) return;
  const t = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  gain.connect(audioCtx.destination);

  const o1 = audioCtx.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(523.25, t);
  o1.frequency.exponentialRampToValueAtTime(587.33, t + 0.12);
  o1.connect(gain);
  o1.start(t);
  o1.stop(t + 0.24);

  const o2 = audioCtx.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(659.25, t + 0.06);
  o2.connect(gain);
  o2.start(t + 0.06);
  o2.stop(t + 0.24);
}

function updateSoundToggleUI() {
  const button = document.getElementById("sound-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(soundEnabled));
  button.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
}

const soundToggle = document.getElementById("sound-toggle");
if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    initAudio();
    updateSoundToggleUI();
  });
}

function showReason(reason) {
  showOverlay(`
    <div class="card">
      <h2>Reason ${state.collected} / 7</h2>
      <p>${reason}</p>
      <button id="continue-btn">Continue</button>
    </div>
  `);
  document.getElementById("continue-btn").addEventListener("click", () => {
    hideOverlay();
  });
}

function showFinalAsk() {
  showOverlay(`
    <div class="card">
      <h2>Barbara, will you be my Valentine? 💝</h2>
      <button id="yes-btn">Yes 💘</button>
      <button id="think-btn" class="secondary">Let me think 😅</button>
    </div>
  `);
  document.getElementById("yes-btn").addEventListener("click", showYesFlow);
  document.getElementById("think-btn").addEventListener("click", showThinkFlow);
}

function showThinkFlow() {
  showOverlay(`
    <div class="card">
      <h2>Take your time…</h2>
      <p>Take your time… but the heart is doing backflips over here 😄</p>
      <button id="okay-yes">Okay yes 😭💘</button>
    </div>
  `);
  document.getElementById("okay-yes").addEventListener("click", showYesFlow);
}

function showYesFlow() {
  if (!prefersReducedMotion) {
    launchConfetti();
  }
  showOverlay(`
    <div class="card">
      <h2>Yay!! 💖</h2>
      <p>You just made this tiny heart the happiest. Barbara, you’re my favorite adventure.</p>
      <button id="restart-btn">Restart Quest</button>
    </div>
  `);
  document.getElementById("restart-btn").addEventListener("click", () => {
    resetGame();
    hideOverlay();
  });
}

// =========================
// Game Setup
// =========================
function placeTokens() {
  state.tokens = [
    { x: 80, y: 90 },
    { x: 280, y: 80 },
    { x: 520, y: 120 },
    { x: 720, y: 180 },
    { x: 160, y: 300 },
    { x: 420, y: 340 },
    { x: 720, y: 360 }
  ].map((token, index) => ({ ...token, collected: false, reason: reasons[index] }));
}

function resetGame() {
  state.collected = 0;
  state.gateUnlocked = false;
  state.showGate = false;
  state.gateReached = false;
  state.player.x = 90;
  state.player.y = 450;
  state.startTime = performance.now();
  state.elapsed = 0;
  placeTokens();
}

function startGame() {
  state.started = true;
  resetGame();
  requestAnimationFrame(gameLoop);
}

// =========================
// Movement & Logic
// =========================
function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (state.keys.has("arrowup") || state.keys.has("w") || state.touchDir === "up") dy -= PLAYER_SPEED;
  if (state.keys.has("arrowdown") || state.keys.has("s") || state.touchDir === "down") dy += PLAYER_SPEED;
  if (state.keys.has("arrowleft") || state.keys.has("a") || state.touchDir === "left") dx -= PLAYER_SPEED;
  if (state.keys.has("arrowright") || state.keys.has("d") || state.touchDir === "right") dx += PLAYER_SPEED;

  moveWithCollision(dx, dy);
}

function moveWithCollision(dx, dy) {
  const playerRect = { x: state.player.x, y: state.player.y, w: state.player.size, h: state.player.size };
  const nextX = { ...playerRect, x: playerRect.x + dx };
  if (!isColliding(nextX)) {
    state.player.x += dx;
  }
  const nextY = { ...playerRect, y: playerRect.y + dy };
  if (!isColliding(nextY)) {
    state.player.y += dy;
  }
}

function checkTokens() {
  state.tokens.forEach((token) => {
    if (token.collected) return;
    const dist = Math.hypot(state.player.x - token.x, state.player.y - token.y);
    if (dist < TOKEN_RADIUS + state.player.size * 0.5) {
      token.collected = true;
      state.collected += 1;
      playCollectChime();
      showReason(token.reason);
      if (state.collected === reasons.length) {
        state.gateUnlocked = true;
        state.showGate = true;
      }
    }
  });
}

function checkGate() {
  if (!state.gateUnlocked || state.gateReached) return;
  const playerRect = { x: state.player.x, y: state.player.y, w: state.player.size, h: state.player.size };
  const gateRect = { x: gate.x, y: gate.y, w: gate.w, h: gate.h };
  const hitsGate =
    playerRect.x < gateRect.x + gateRect.w &&
    playerRect.x + playerRect.w > gateRect.x &&
    playerRect.y < gateRect.y + gateRect.h &&
    playerRect.y + playerRect.h > gateRect.y;

  if (hitsGate) {
    state.gateReached = true;
    showFinalAsk();
  }
}

function updateTimer() {
  if (!state.started) return;
  state.elapsed = performance.now() - state.startTime;
  const totalSeconds = Math.floor(state.elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  hudTimer.textContent = `Time: ${minutes}:${seconds}`;
}

// =========================
// Rendering
// =========================
function drawHeart(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(0, topCurveHeight);
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
  ctx.bezierCurveTo(-size / 2, size * 0.7, 0, size, 0, size * 1.1);
  ctx.bezierCurveTo(0, size, size / 2, size * 0.7, size / 2, topCurveHeight);
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWalls() {
  ctx.fillStyle = "rgba(255, 123, 178, 0.3)";
  walls.forEach((wall) => {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  });
}

function drawTokens() {
  state.tokens.forEach((token) => {
    if (token.collected) return;
    drawHeart(token.x, token.y, 18, "#ff7bb2");
  });
}

function drawGate() {
  if (!state.showGate) return;
  ctx.save();
  ctx.fillStyle = state.gateUnlocked ? "#ff4f8a" : "rgba(255, 123, 178, 0.4)";
  ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
  ctx.fillStyle = "#fff";
  ctx.font = "14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Valentine Gate", gate.x + gate.w / 2, gate.y + 20);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "rgba(255, 240, 248, 0.6)";
  for (let x = 0; x < CANVAS_WIDTH; x += TILE) {
    for (let y = 0; y < CANVAS_HEIGHT; y += TILE) {
      ctx.fillRect(x + 8, y + 8, 4, 4);
    }
  }

  drawWalls();
  drawTokens();
  drawGate();

  drawHeart(state.player.x, state.player.y, state.player.size, "#f04f8a");
}

// =========================
// Confetti
// =========================
function launchConfetti() {
  const confetti = document.createElement("div");
  confetti.className = "confetti";
  const colors = ["#ff7bb2", "#ffd166", "#ff6b6b", "#a0c4ff", "#bdb2ff"];

  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement("span");
    const size = 8 + Math.random() * 8;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.4}px`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    confetti.appendChild(piece);
  }

  document.body.appendChild(confetti);
  setTimeout(() => {
    confetti.remove();
  }, 2600);
}

// =========================
// Game Loop
// =========================
function gameLoop() {
  if (!state.started) return;
  updatePlayer();
  checkTokens();
  checkGate();
  updateTimer();
  hudReasons.textContent = `Reasons collected: ${state.collected} / 7`;
  render();
  requestAnimationFrame(gameLoop);
}

startScreen();

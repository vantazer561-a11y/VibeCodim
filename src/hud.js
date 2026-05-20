import { TRACK_CONFIG, formatTime } from './utils.js';

export function createGameState() {
  return {
    phase: 'menu',
    lap: 1,
    totalLaps: TRACK_CONFIG.totalLaps,
    raceTime: 0,
    lapTimes: [],
    bestLap: Infinity,
    lastCheckpoint: 0,
    position: 1,
    countdown: 3,
    countdownTimer: 0,
    finished: false
  };
}

export function updateHUD(gameState, speed, gear) {
  const speedEl = document.getElementById('speed-value');
  if (speedEl) speedEl.textContent = Math.floor(speed);

  const lapEl = document.getElementById('lap-display');
  if (lapEl) lapEl.textContent = `Lap ${gameState.lap}/${gameState.totalLaps}`;

  const timerEl = document.getElementById('timer-display');
  if (timerEl) timerEl.textContent = formatTime(gameState.raceTime);

  const posEl = document.getElementById('position-display');
  if (posEl) posEl.textContent = getOrdinal(gameState.position);

  const gearEl = document.getElementById('gear-display');
  if (gearEl) gearEl.textContent = gear;
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function updateMinimap(canvasId, playerPos, aiCars, trackPoints) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 180;
  const h = 180;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  if (!trackPoints || trackPoints.length === 0) return;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of trackPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const padding = 15;
  const scaleX = (w - padding * 2) / rangeX;
  const scaleZ = (h - padding * 2) / rangeZ;
  const scale = Math.min(scaleX, scaleZ);
  const offsetX = (w - rangeX * scale) / 2;
  const offsetZ = (h - rangeZ * scale) / 2;

  function toCanvas(pos) {
    return {
      x: (pos.x - minX) * scale + offsetX,
      y: (pos.z - minZ) * scale + offsetZ
    };
  }

  ctx.beginPath();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (let i = 0; i < trackPoints.length; i++) {
    const cp = toCanvas(trackPoints[i]);
    if (i === 0) ctx.moveTo(cp.x, cp.y);
    else ctx.lineTo(cp.x, cp.y);
  }
  ctx.closePath();
  ctx.stroke();

  const aiColors = ['#00b4d8', '#fca311', '#2dc653', '#9b5de5'];
  if (aiCars) {
    for (let i = 0; i < aiCars.length; i++) {
      const car = aiCars[i];
      const pos = car.position || car;
      const cp = toCanvas(pos);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = aiColors[i % aiColors.length];
      ctx.fill();
    }
  }

  const pp = toCanvas(playerPos);
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();
}

export function checkLapCompletion(gameState, playerTrackIndex, prevTrackIndex, trackPointsCount) {
  const halfway = Math.floor(trackPointsCount / 2);

  if (prevTrackIndex > halfway && playerTrackIndex < halfway * 0.5) {
    const lapTime = gameState.raceTime - gameState.lapTimes.reduce((a, b) => a + b, 0);
    gameState.lapTimes.push(lapTime);

    if (lapTime < gameState.bestLap) {
      gameState.bestLap = lapTime;
    }

    if (gameState.lap >= gameState.totalLaps) {
      gameState.finished = true;
      return true;
    }

    gameState.lap++;
  }

  return false;
}

export function calculatePosition(playerTrackIndex, aiCars, playerLap, trackPointsCount) {
  let position = 1;

  if (aiCars) {
    for (const car of aiCars) {
      const aiLap = car.lap || 1;
      const aiIndex = car.trackIndex || 0;

      if (aiLap > playerLap) {
        position++;
      } else if (aiLap === playerLap && aiIndex > playerTrackIndex) {
        position++;
      }
    }
  }

  return position;
}

export function runCountdown(gameState, delta) {
  gameState.countdownTimer += delta;

  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return false;

  const elapsed = gameState.countdownTimer;

  if (elapsed < 1) {
    countdownEl.textContent = '3';
    countdownEl.style.display = 'block';
  } else if (elapsed < 2) {
    countdownEl.textContent = '2';
  } else if (elapsed < 3) {
    countdownEl.textContent = '1';
  } else if (elapsed < 4) {
    countdownEl.textContent = 'GO!';
    countdownEl.style.color = '#2dc653';
  } else {
    countdownEl.style.display = 'none';
    countdownEl.style.color = '#e94560';
    gameState.countdown = 0;
    gameState.phase = 'racing';
    return true;
  }

  return false;
}

export function showRaceResult(gameState) {
  const resultDiv = document.getElementById('race-result');
  const statsDiv = document.getElementById('result-stats');
  const hudDiv = document.getElementById('hud');

  if (statsDiv) {
    let html = `<p>Position: ${getOrdinal(gameState.position)}</p>`;
    html += `<p>Total Time: ${formatTime(gameState.raceTime)}</p>`;
    html += `<p>Best Lap: ${gameState.bestLap === Infinity ? '--' : formatTime(gameState.bestLap)}</p>`;
    html += '<h3 style="color:#e94560;margin-top:15px;">Lap Times</h3>';
    gameState.lapTimes.forEach((t, i) => {
      const isBest = t === gameState.bestLap;
      html += `<p${isBest ? ' style="color: #2dc653;"' : ''}>Lap ${i + 1}: ${formatTime(t)}</p>`;
    });
    statsDiv.innerHTML = html;
  }

  if (resultDiv) resultDiv.style.display = 'flex';
  if (hudDiv) hudDiv.style.display = 'none';
}

export function setupUI(callbacks) {
  const btnRace = document.getElementById('btn-race');
  if (btnRace) btnRace.addEventListener('click', callbacks.onStart);

  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) btnRestart.addEventListener('click', callbacks.onRestart);

  const btnMenu = document.getElementById('btn-menu');
  if (btnMenu) btnMenu.addEventListener('click', callbacks.onMenu);
}

import * as THREE from 'three';
import { TRACK_CONFIG, CAR_CONFIG, COLORS, getTrackPoints, distanceToTrack, getTrackDirection, lerp } from './utils.js';
import { createTrack, createEnvironment } from './track.js';
import { createF1Car, createPhysics, updateCarPhysics, createAICar, updateAICar } from './car.js';
import { createGameState, updateHUD, updateMinimap, checkLapCompletion, calculatePosition, runCountdown, showRaceResult, setupUI } from './hud.js';

let scene, camera, renderer;
let playerCar, playerPhysics, trackData;
let aiCars = [];
let gameState;
let prevTrackIndex = 0;
let cameraMode = 0;
const clock = new THREE.Clock();

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
};

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  updateLoadingBar(20);
  createEnvironment(scene);
  updateLoadingBar(50);

  trackData = createTrack(scene);
  updateLoadingBar(70);

  playerCar = createF1Car(COLORS.playerCar);
  scene.add(playerCar);
  playerPhysics = createPhysics();

  const trackPoints = trackData.trackPoints;
  const startDir = getTrackDirection(trackPoints, 0);

  playerPhysics.position.x = trackPoints[0].x;
  playerPhysics.position.z = trackPoints[0].z;
  playerPhysics.position.y = trackPoints[0].y || 0;
  playerPhysics.angle = Math.atan2(startDir.x, startDir.z);

  const aiColors = [COLORS.ai1, COLORS.ai2, COLORS.ai3, COLORS.ai4];
  const aiStartOffsets = [10, 20, 30, 40];
  for (let i = 0; i < 4; i++) {
    const ai = createAICar(aiColors[i], trackPoints, aiStartOffsets[i]);
    const aiPoint = trackPoints[aiStartOffsets[i]];
    ai.mesh.position.set(aiPoint.x, (aiPoint.y || 0) + 0.15, aiPoint.z);
    scene.add(ai.mesh);
    aiCars.push(ai);
  }

  updateLoadingBar(90);
  gameState = createGameState();

  setupUI({
    onStart: startRace,
    onRestart: restartRace,
    onMenu: showMenu,
  });

  setupInput();

  updateLoadingBar(100);
  setTimeout(() => {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('start-screen').style.display = 'flex';
    }, 500);
  }, 500);

  camera.position.set(trackPoints[0].x, 50, trackPoints[0].z + 100);
  camera.lookAt(trackPoints[0].x, 0, trackPoints[0].z);

  animate();
}

function updateLoadingBar(percent) {
  const bar = document.getElementById('loader-bar');
  if (bar) bar.style.width = percent + '%';
}

function setupInput() {
  const keyMap = {
    'KeyW': 'forward', 'ArrowUp': 'forward',
    'KeyS': 'backward', 'ArrowDown': 'backward',
    'KeyA': 'left', 'ArrowLeft': 'left',
    'KeyD': 'right', 'ArrowRight': 'right',
    'Space': 'handbrake',
  };

  window.addEventListener('keydown', (e) => {
    const action = keyMap[e.code];
    if (action) {
      input[action] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyC') {
      cameraMode = (cameraMode + 1) % 3;
    }
  });

  window.addEventListener('keyup', (e) => {
    const action = keyMap[e.code];
    if (action) {
      input[action] = false;
      e.preventDefault();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function startRace() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('race-result').style.display = 'none';

  gameState = createGameState();
  gameState.phase = 'countdown';

  const trackPoints = trackData.trackPoints;
  const startDir = getTrackDirection(trackPoints, 0);
  playerPhysics = createPhysics();
  playerPhysics.position.x = trackPoints[0].x;
  playerPhysics.position.z = trackPoints[0].z;
  playerPhysics.position.y = trackPoints[0].y || 0;
  playerPhysics.angle = Math.atan2(startDir.x, startDir.z);

  const aiStartOffsets = [10, 20, 30, 40];
  for (let i = 0; i < aiCars.length; i++) {
    const aiPoint = trackPoints[aiStartOffsets[i]];
    aiCars[i].trackIndex = aiStartOffsets[i];
    aiCars[i].speed = 0;
    aiCars[i].lap = 1;
    aiCars[i].mesh.position.set(aiPoint.x, (aiPoint.y || 0) + 0.15, aiPoint.z);
  }

  prevTrackIndex = 0;
  clock.getDelta();
}

function restartRace() {
  startRace();
}

function showMenu() {
  document.getElementById('race-result').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  gameState.phase = 'menu';
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const trackPoints = trackData.trackPoints;

  if (gameState.phase === 'countdown') {
    const done = runCountdown(gameState, delta);
    if (done) {
      gameState.phase = 'racing';
    }
    updateCamera(delta);
    renderer.render(scene, camera);
    return;
  }

  if (gameState.phase === 'racing') {
    gameState.raceTime += delta * 1000;

    updateCarPhysics(playerPhysics, input, delta, trackPoints, TRACK_CONFIG.width);

    playerCar.position.set(playerPhysics.position.x, (playerPhysics.position.y || 0) + 0.15, playerPhysics.position.z);
    playerCar.rotation.y = playerPhysics.angle;

    const trackInfo = distanceToTrack(
      { x: playerPhysics.position.x, z: playerPhysics.position.z },
      trackPoints,
      TRACK_CONFIG.width
    );

    const currentTrackIndex = trackInfo.index;
    const raceComplete = checkLapCompletion(gameState, currentTrackIndex, prevTrackIndex, trackPoints.length);

    if (raceComplete) {
      gameState.phase = 'finished';
      gameState.position = calculatePosition(currentTrackIndex, aiCars, gameState.lap, trackPoints.length);
      showRaceResult(gameState);
    }

    prevTrackIndex = currentTrackIndex;

    for (const ai of aiCars) {
      updateAICar(ai, delta, trackPoints);
    }

    gameState.position = calculatePosition(currentTrackIndex, aiCars, gameState.lap, trackPoints.length);
    updateHUD(gameState, Math.abs(playerPhysics.speed), playerPhysics.gear);
    updateMinimap('minimap', playerPhysics.position, aiCars, trackPoints);
  }

  if (gameState.phase === 'menu') {
    const t = performance.now() * 0.0003;
    camera.position.x = Math.sin(t) * 200;
    camera.position.z = Math.cos(t) * 200;
    camera.position.y = 80;
    camera.lookAt(0, 0, 0);
  }

  updateCamera(delta);
  renderer.render(scene, camera);
}

function updateCamera(delta) {
  if (gameState.phase === 'menu') return;

  const px = playerPhysics.position.x;
  const py = (playerPhysics.position.y || 0) + 0.15;
  const pz = playerPhysics.position.z;
  const angle = playerPhysics.angle;

  if (cameraMode === 0) {
    const camDist = 15;
    const camHeight = 6;
    const targetX = px - Math.sin(angle) * camDist;
    const targetZ = pz - Math.cos(angle) * camDist;

    camera.position.x = lerp(camera.position.x, targetX, 5 * delta);
    camera.position.y = lerp(camera.position.y, py + camHeight, 5 * delta);
    camera.position.z = lerp(camera.position.z, targetZ, 5 * delta);

    const lookX = px + Math.sin(angle) * 10;
    const lookZ = pz + Math.cos(angle) * 10;
    camera.lookAt(lookX, py + 1, lookZ);
  } else if (cameraMode === 1) {
    camera.position.set(px, py + 2, pz);
    const lookX = px + Math.sin(angle) * 20;
    const lookZ = pz + Math.cos(angle) * 20;
    camera.lookAt(lookX, py + 1, lookZ);
  } else if (cameraMode === 2) {
    camera.position.set(px, py + 50, pz + 0.01);
    camera.lookAt(px, py, pz);
  }
}

init();

export const TRACK_CONFIG = {
  width: 12,
  barrierHeight: 1.5,
  segments: 200,
  totalLaps: 3,
  checkpoints: 8,
};

export const CAR_CONFIG = {
  maxSpeed: 320,
  acceleration: 80,
  braking: 120,
  turnSpeed: 2.2,
  friction: 0.98,
  offroadFriction: 0.92,
  downforce: 0.3,
};

export const COLORS = {
  playerCar: 0xe94560,
  ai1: 0x00b4d8,
  ai2: 0xfca311,
  ai3: 0x2dc653,
  ai4: 0x9b5de5,
  track: 0x333333,
  curb: 0xff0000,
  grass: 0x2d5a27,
  barrier: 0xcccccc,
  sky: 0x87ceeb,
};

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function getTrackPoints() {
  const points = [];
  const numPoints = TRACK_CONFIG.segments;
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2;
    const x = Math.sin(t) * 150 + Math.sin(t * 2) * 50 + Math.cos(t * 3) * 30;
    const z = Math.cos(t) * 150 + Math.cos(t * 2) * 50 + Math.sin(t * 3) * 30;
    const y = Math.sin(t * 2) * 3 + Math.cos(t * 3) * 2;
    points.push({ x, y, z });
  }
  return points;
}

export function getTrackDirection(points, index) {
  const next = (index + 1) % points.length;
  const dx = points[next].x - points[index].x;
  const dz = points[next].z - points[index].z;
  const len = Math.sqrt(dx * dx + dz * dz);
  return { x: dx / len, z: dz / len };
}

export function getTrackNormal(dir) {
  return { x: -dir.z, z: dir.x };
}

export function distanceToTrack(pos, trackPoints, trackWidth) {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    const dx = pos.x - trackPoints[i].x;
    const dz = pos.z - trackPoints[i].z;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  const dir = getTrackDirection(trackPoints, closestIdx);
  const normal = getTrackNormal(dir);
  const dx = pos.x - trackPoints[closestIdx].x;
  const dz = pos.z - trackPoints[closestIdx].z;
  const lateralDist = Math.abs(dx * normal.x + dz * normal.z);
  return { distance: lateralDist, index: closestIdx, onTrack: lateralDist < trackWidth / 2 };
}

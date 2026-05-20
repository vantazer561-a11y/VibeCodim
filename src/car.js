import * as THREE from 'three';
import { CAR_CONFIG, COLORS, clamp, lerp, getTrackPoints, distanceToTrack, getTrackDirection } from './utils.js';

export function createF1Car(color) {
  const car = new THREE.Group();

  const bodyGeom = new THREE.BoxGeometry(4, 0.4, 1.8);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.4;
  body.castShadow = true;
  car.add(body);

  const noseShape = new THREE.Shape();
  noseShape.moveTo(0, -0.9);
  noseShape.lineTo(1.2, -0.3);
  noseShape.lineTo(1.2, 0.3);
  noseShape.lineTo(0, 0.9);
  noseShape.closePath();
  const noseGeom = new THREE.ExtrudeGeometry(noseShape, { depth: 0.4, bevelEnabled: false });
  const nose = new THREE.Mesh(noseGeom, new THREE.MeshStandardMaterial({ color }));
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(2.0, 0.2, 0);
  nose.castShadow = true;
  car.add(nose);

  const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.4), wingMat);
  frontWing.position.set(2.8, 0.15, 0);
  frontWing.castShadow = true;
  car.add(frontWing);

  const endplateMat = new THREE.MeshStandardMaterial({ color });
  const endplateGeom = new THREE.BoxGeometry(0.4, 0.2, 0.05);
  const leftEndplate = new THREE.Mesh(endplateGeom, endplateMat);
  leftEndplate.position.set(2.8, 0.15, 1.2);
  car.add(leftEndplate);
  const rightEndplate = new THREE.Mesh(endplateGeom, endplateMat);
  rightEndplate.position.set(2.8, 0.15, -1.2);
  car.add(rightEndplate);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 1.6), wingMat);
  rearWing.position.set(-2.0, 1.1, 0);
  rearWing.castShadow = true;
  car.add(rearWing);

  const supportGeom = new THREE.BoxGeometry(0.06, 0.6, 0.06);
  const supportMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const leftSupport = new THREE.Mesh(supportGeom, supportMat);
  leftSupport.position.set(-2.0, 0.7, 0.5);
  car.add(leftSupport);
  const rightSupport = new THREE.Mesh(supportGeom, supportMat);
  rightSupport.position.set(-2.0, 0.7, -0.5);
  car.add(rightSupport);

  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.25, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  cockpit.position.set(0.3, 0.72, 0);
  car.add(cockpit);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.3, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })
  );
  windshield.position.set(0.85, 0.8, 0);
  windshield.rotation.z = Math.PI / 6;
  car.add(windshield);

  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const wheelPositions = [
    { x: 1.4, y: 0.3, z: 1.1 },
    { x: 1.4, y: 0.3, z: -1.1 },
    { x: -1.4, y: 0.3, z: 1.1 },
    { x: -1.4, y: 0.3, z: -1.1 }
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.castShadow = true;
    car.add(wheel);
  });

  return car;
}

export function createPhysics() {
  return {
    speed: 0,
    angle: 0,
    steerAngle: 0,
    position: { x: 0, y: 0, z: 0 },
    gear: 1,
    rpm: 0
  };
}

export function updateCarPhysics(physics, input, delta, trackPoints, trackWidth) {
  const p = physics;

  if (input.forward) {
    p.speed += CAR_CONFIG.acceleration * delta;
  }
  if (input.backward) {
    if (p.speed > 0) {
      p.speed -= CAR_CONFIG.braking * delta;
    } else {
      p.speed -= CAR_CONFIG.acceleration * delta * 0.4;
    }
  }

  if (input.handbrake) {
    p.speed *= 1 - 3 * delta;
  }

  p.speed = clamp(p.speed, -CAR_CONFIG.maxSpeed * 0.3, CAR_CONFIG.maxSpeed);

  const speedFactor = 1 - Math.min(Math.abs(p.speed) / CAR_CONFIG.maxSpeed, 0.9);
  const maxSteer = 0.04;
  const steerSpeed = 3;

  if (input.left) {
    p.steerAngle = lerp(p.steerAngle, maxSteer * speedFactor, steerSpeed * delta);
  } else if (input.right) {
    p.steerAngle = lerp(p.steerAngle, -maxSteer * speedFactor, steerSpeed * delta);
  } else {
    p.steerAngle = lerp(p.steerAngle, 0, steerSpeed * 2 * delta);
  }

  if (Math.abs(p.speed) > 0.5) {
    p.angle += p.steerAngle * (p.speed / CAR_CONFIG.maxSpeed) * delta * 60;
  }

  const trackInfo = distanceToTrack(
    { x: p.position.x, z: p.position.z },
    trackPoints,
    trackWidth
  );

  if (trackInfo.onTrack) {
    p.speed *= Math.pow(CAR_CONFIG.friction, delta * 60);
  } else {
    p.speed *= Math.pow(CAR_CONFIG.offroadFriction, delta * 60);
  }

  const vx = Math.sin(p.angle) * p.speed * delta;
  const vz = Math.cos(p.angle) * p.speed * delta;
  p.position.x += vx;
  p.position.z += vz;

  const speedRatio = Math.abs(p.speed) / CAR_CONFIG.maxSpeed;
  p.gear = clamp(Math.floor(speedRatio * 8) + 1, 1, 8);

  const gearRatio = (speedRatio * 8) % 1;
  p.rpm = lerp(2000, 12000, gearRatio);
  if (Math.abs(p.speed) < 1) {
    p.rpm = lerp(p.rpm, 800, 0.1);
  }

  return p;
}

export function createAICar(color, trackPoints, startOffset) {
  const car = createF1Car(color);
  return {
    mesh: car,
    trackIndex: startOffset,
    speed: 0,
    targetSpeed: 180 + Math.random() * 80,
    wobble: Math.random() * Math.PI * 2,
    lap: 1,
    position: { x: 0, y: 0, z: 0 }
  };
}

export function updateAICar(ai, delta, trackPoints) {
  const numPoints = trackPoints.length;
  if (numPoints === 0) return ai;

  const speedVariation = 1 + (Math.sin(ai.wobble + performance.now() * 0.001) * 0.05);
  ai.speed = lerp(ai.speed, ai.targetSpeed * speedVariation, delta * 2);

  const advance = ai.speed * delta * 0.05;
  const prevIndex = ai.trackIndex;
  ai.trackIndex = (ai.trackIndex + advance) % numPoints;
  if (ai.trackIndex < 0) ai.trackIndex += numPoints;

  if (prevIndex > numPoints * 0.7 && ai.trackIndex < numPoints * 0.3) {
    ai.lap = (ai.lap || 1) + 1;
  }

  const idx = Math.floor(ai.trackIndex);
  const frac = ai.trackIndex - idx;
  const currentPoint = trackPoints[idx % numPoints];
  const nextPoint = trackPoints[(idx + 1) % numPoints];

  const px = lerp(currentPoint.x, nextPoint.x, frac);
  const pz = lerp(currentPoint.z, nextPoint.z, frac);
  const py = lerp(currentPoint.y || 0, nextPoint.y || 0, frac);

  const wobbleAmount = Math.sin(ai.wobble + ai.trackIndex * 0.3) * 0.8;
  const tangentX = nextPoint.x - currentPoint.x;
  const tangentZ = nextPoint.z - currentPoint.z;
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ) || 1;
  const normalX = -tangentZ / tangentLen;
  const normalZ = tangentX / tangentLen;

  ai.mesh.position.x = px + normalX * wobbleAmount;
  ai.mesh.position.z = pz + normalZ * wobbleAmount;
  ai.mesh.position.y = py + 0.15;

  ai.position = { x: ai.mesh.position.x, y: ai.mesh.position.y, z: ai.mesh.position.z };

  const lookAhead = trackPoints[(idx + 3) % numPoints];
  const dirX = lookAhead.x - ai.mesh.position.x;
  const dirZ = lookAhead.z - ai.mesh.position.z;
  ai.mesh.rotation.y = Math.atan2(dirX, dirZ);

  return ai;
}

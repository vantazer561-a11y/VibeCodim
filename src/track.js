import * as THREE from 'three';
import { TRACK_CONFIG, COLORS, getTrackPoints, getTrackDirection, getTrackNormal } from './utils.js';

export function createTrack(scene) {
  const trackPoints = getTrackPoints();
  const numPoints = trackPoints.length;

  const halfWidth = TRACK_CONFIG.width / 2;
  const trackPositions = [];
  const trackNormals = [];
  const trackIndices = [];
  const leftPoints = [];
  const rightPoints = [];

  for (let i = 0; i < numPoints; i++) {
    const p = trackPoints[i];
    const dir = getTrackDirection(trackPoints, i);
    const normal = getTrackNormal(dir);

    const left = new THREE.Vector3(
      p.x + normal.x * (-halfWidth),
      p.y,
      p.z + normal.z * (-halfWidth)
    );
    const right = new THREE.Vector3(
      p.x + normal.x * halfWidth,
      p.y,
      p.z + normal.z * halfWidth
    );

    leftPoints.push(left);
    rightPoints.push(right);

    trackPositions.push(left.x, left.y, left.z);
    trackPositions.push(right.x, right.y, right.z);

    trackNormals.push(0, 1, 0);
    trackNormals.push(0, 1, 0);
  }

  for (let i = 0; i < numPoints - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    trackIndices.push(a, c, b);
    trackIndices.push(b, c, d);
  }

  const lastIdx = (numPoints - 1) * 2;
  trackIndices.push(lastIdx, 0, lastIdx + 1);
  trackIndices.push(lastIdx + 1, 0, 1);

  const trackGeometry = new THREE.BufferGeometry();
  trackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trackPositions, 3));
  trackGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(trackNormals, 3));
  trackGeometry.setIndex(trackIndices);

  const trackMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.track,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  const curbWidth = 1.0;
  const curbs = [];

  for (let side = 0; side < 2; side++) {
    const curbPositions = [];
    const curbNormalsArr = [];
    const curbIndices = [];
    const curbColors = [];

    for (let i = 0; i < numPoints; i++) {
      const p = trackPoints[i];
      const dir = getTrackDirection(trackPoints, i);
      const normal = getTrackNormal(dir);

      let innerEdge, outerEdge;
      if (side === 0) {
        innerEdge = new THREE.Vector3(p.x + normal.x * (-halfWidth), p.y, p.z + normal.z * (-halfWidth));
        outerEdge = new THREE.Vector3(p.x + normal.x * (-halfWidth - curbWidth), p.y, p.z + normal.z * (-halfWidth - curbWidth));
      } else {
        innerEdge = new THREE.Vector3(p.x + normal.x * halfWidth, p.y, p.z + normal.z * halfWidth);
        outerEdge = new THREE.Vector3(p.x + normal.x * (halfWidth + curbWidth), p.y, p.z + normal.z * (halfWidth + curbWidth));
      }

      curbPositions.push(innerEdge.x, innerEdge.y, innerEdge.z);
      curbPositions.push(outerEdge.x, outerEdge.y, outerEdge.z);

      curbNormalsArr.push(0, 1, 0);
      curbNormalsArr.push(0, 1, 0);

      const stripeIndex = Math.floor(i / 2);
      const isRed = stripeIndex % 2 === 0;
      const r = 1.0;
      const g = isRed ? 0.0 : 1.0;
      const b = isRed ? 0.0 : 1.0;
      curbColors.push(r, g, b);
      curbColors.push(r, g, b);
    }

    for (let i = 0; i < numPoints - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      curbIndices.push(a, c, b);
      curbIndices.push(b, c, d);
    }

    const cLastIdx = (numPoints - 1) * 2;
    curbIndices.push(cLastIdx, 0, cLastIdx + 1);
    curbIndices.push(cLastIdx + 1, 0, 1);

    const curbGeometry = new THREE.BufferGeometry();
    curbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
    curbGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormalsArr, 3));
    curbGeometry.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
    curbGeometry.setIndex(curbIndices);

    const curbMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const curbMesh = new THREE.Mesh(curbGeometry, curbMaterial);
    curbMesh.receiveShadow = true;
    scene.add(curbMesh);
    curbs.push(curbMesh);
  }

  const barriers = [];
  const barrierHeight = TRACK_CONFIG.barrierHeight;
  const barrierOffset = halfWidth + curbWidth + 0.5;

  for (let side = 0; side < 2; side++) {
    const barrierPositions = [];
    const barrierNormalsArr = [];
    const barrierIndices = [];

    for (let i = 0; i < numPoints; i++) {
      const p = trackPoints[i];
      const dir = getTrackDirection(trackPoints, i);
      const normal = getTrackNormal(dir);

      const sign = side === 0 ? -1 : 1;
      const baseX = p.x + normal.x * sign * barrierOffset;
      const baseZ = p.z + normal.z * sign * barrierOffset;

      barrierPositions.push(baseX, p.y, baseZ);
      barrierPositions.push(baseX, p.y + barrierHeight, baseZ);

      const faceNx = normal.x * (-sign);
      const faceNz = normal.z * (-sign);
      barrierNormalsArr.push(faceNx, 0, faceNz);
      barrierNormalsArr.push(faceNx, 0, faceNz);
    }

    for (let i = 0; i < numPoints - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      barrierIndices.push(a, c, b);
      barrierIndices.push(b, c, d);
    }

    const bLastIdx = (numPoints - 1) * 2;
    barrierIndices.push(bLastIdx, 0, bLastIdx + 1);
    barrierIndices.push(bLastIdx + 1, 0, 1);

    const barrierGeometry = new THREE.BufferGeometry();
    barrierGeometry.setAttribute('position', new THREE.Float32BufferAttribute(barrierPositions, 3));
    barrierGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(barrierNormalsArr, 3));
    barrierGeometry.setIndex(barrierIndices);

    const barrierMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.barrier,
      roughness: 0.3,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    const barrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;
    scene.add(barrierMesh);
    barriers.push(barrierMesh);
  }

  // Start/finish line
  const startPoint = trackPoints[0];
  const startDir = getTrackDirection(trackPoints, 0);
  const startLineGeo = new THREE.PlaneGeometry(TRACK_CONFIG.width, 1.5);
  const startLineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const startLine = new THREE.Mesh(startLineGeo, startLineMat);
  startLine.rotation.x = -Math.PI / 2;
  startLine.position.set(startPoint.x, startPoint.y + 0.02, startPoint.z);
  startLine.rotation.y = Math.atan2(startDir.x, startDir.z);
  startLine.receiveShadow = true;
  scene.add(startLine);

  // Center line dashes
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < numPoints; i += 4) {
    const p = trackPoints[i];
    const dir = getTrackDirection(trackPoints, i);
    const dashGeo = new THREE.PlaneGeometry(0.5, 2);
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(p.x, p.y + 0.02, p.z);
    dash.rotation.y = Math.atan2(dir.x, dir.z);
    dash.receiveShadow = true;
    scene.add(dash);
  }

  return { trackMesh, barriers, startLine, trackPoints };
}

export function createEnvironment(scene) {
  const lights = [];
  const decorations = [];

  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 100, 800);

  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.grass,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  lights.push(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;
  scene.add(directionalLight);
  lights.push(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
  scene.add(hemisphereLight);
  lights.push(hemisphereLight);

  const trackPoints = getTrackPoints();
  const startPoint = trackPoints[0];
  const startDir = getTrackDirection(trackPoints, 0);
  const startNormal = getTrackNormal(startDir);

  const grandstandColors = [0xcc0000, 0x0044cc, 0xffcc00];

  for (let g = 0; g < 3; g++) {
    const standWidth = 30;
    const standHeight = 8 + g * 2;
    const standDepth = 10;

    const standGeometry = new THREE.BoxGeometry(standWidth, standHeight, standDepth);
    const standMaterial = new THREE.MeshStandardMaterial({
      color: grandstandColors[g],
      roughness: 0.7,
      metalness: 0.1,
    });
    const stand = new THREE.Mesh(standGeometry, standMaterial);

    const lateralOffset = (TRACK_CONFIG.width / 2) + 20 + g * 12;
    const alongOffset = (g - 1) * 35;

    stand.position.set(
      startPoint.x + startNormal.x * lateralOffset + startDir.x * alongOffset,
      startPoint.y + standHeight / 2,
      startPoint.z + startNormal.z * lateralOffset + startDir.z * alongOffset
    );

    const angle = Math.atan2(startNormal.x, startNormal.z);
    stand.rotation.y = angle;

    stand.castShadow = true;
    stand.receiveShadow = true;
    scene.add(stand);
    decorations.push(stand);
  }

  const treeCount = 80;
  const trackCenter = new THREE.Vector3();
  for (const pt of trackPoints) {
    trackCenter.add(new THREE.Vector3(pt.x, 0, pt.z));
  }
  trackCenter.divideScalar(trackPoints.length);

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 80 + Math.random() * 250;
    const tx = trackCenter.x + Math.cos(angle) * radius;
    const tz = trackCenter.z + Math.sin(angle) * radius;

    let tooClose = false;
    for (let j = 0; j < trackPoints.length; j += 5) {
      const dx = trackPoints[j].x - tx;
      const dz = trackPoints[j].z - tz;
      if (Math.sqrt(dx * dx + dz * dz) < TRACK_CONFIG.width + 15) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const treeGroup = new THREE.Group();

    const trunkHeight = 3 + Math.random() * 2;
    const trunkRadius = 0.3 + Math.random() * 0.2;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliageHeight = 4 + Math.random() * 3;
    const foliageRadius = 2 + Math.random() * 1.5;
    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = trunkHeight + foliageHeight / 2 - 0.5;
    foliage.castShadow = true;
    treeGroup.add(foliage);

    treeGroup.position.set(tx, 0, tz);
    scene.add(treeGroup);
    decorations.push(treeGroup);
  }

  return { lights, ground, decorations };
}

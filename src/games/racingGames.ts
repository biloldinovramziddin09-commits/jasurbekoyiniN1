import * as THREE from 'three';
import {
  buildCarModel,
  buildCharacterModel,
  buildTreeModel,
  createProceduralTexture,
  ParticleBurstManager,
  setupThreeWorld,
  startGameLoop,
  VehicleRig,
} from '@/src/engine/threeUtils';
import { UnifiedInputManager } from '@/src/engine/input';
import { soundEngine } from '@/src/engine/audio';
import {
  GameControllerHandle,
  GameEngineCallbacks,
  GameSessionOptions,
} from '@/src/engine/types';
import { GameMetadata, GraphicsQuality } from '@/src/types/platform';

function getCircuitPoint(t: number, radiusX: number, radiusZ: number): THREE.Vector3 {
  const a = t * Math.PI * 2;
  const x = Math.cos(a) * radiusX + Math.sin(a * 2) * 8;
  const z = Math.sin(a) * radiusZ;
  return new THREE.Vector3(x, 0, z);
}

export function initRacingCircuitGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const isTwilight = meta.id === 'ultimate-racing-simulator';
  const isCute = meta.id === 'kichkina-poygachi';

  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: isTwilight ? 0x0b1224 : 0x7dd3fc,
      fogNear: 50,
      fogFar: 200,
      sunColor: isTwilight ? 0xfdba74 : 0xfffbeb,
      sunIntensity: isTwilight ? 1.25 : 1.55,
      hemiSky: isTwilight ? 0x38bdf8 : 0xbae6fd,
      hemiGround: isTwilight ? 0x1e293b : 0x4ade80,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Ground
  const groundTex = createProceduralTexture(
    isTwilight ? 'grid' : 'grass',
    renderer,
    24,
    24,
  );
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.88 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Build smooth closed circuit road ribbons & curbs
  const radiusX = isCute ? 28 : 48;
  const radiusZ = isCute ? 22 : 36;
  const trackHalfWidth = isCute ? 6.0 : 5.4;
  const segments = 96;
  const trackPoints: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    trackPoints.push(getCircuitPoint(i / segments, radiusX, radiusZ));
  }

  const asphaltTex = createProceduralTexture('asphalt', renderer, 1, 24);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: isTwilight ? 0.25 : 0.7,
    metalness: isTwilight ? 0.25 : 0.05,
  });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });

  const roadPositions: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p0 = trackPoints[i % segments];
    const p1 = trackPoints[(i + 1) % segments];
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const leftPt = p0.clone().addScaledVector(right, -trackHalfWidth);
    const rightPt = p0.clone().addScaledVector(right, trackHalfWidth);

    roadPositions.push(leftPt.x, 0.04, leftPt.z, rightPt.x, 0.04, rightPt.z);
    roadUvs.push(0, i / 4, 1, i / 4);
    if (i < segments) {
      const base = i * 2;
      roadIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // Checkered Finish Arch at t=0
  const startPt = trackPoints[0];
  const nextPt = trackPoints[1];
  const startDir = new THREE.Vector3().subVectors(nextPt, startPt).normalize();
  const startYaw = Math.atan2(startDir.x, startDir.z);

  const archGroup = new THREE.Group();
  archGroup.position.copy(startPt);
  archGroup.rotation.y = startYaw;
  const pillarGeo = new THREE.BoxGeometry(0.6, 5.5, 0.6);
  const pLeft = new THREE.Mesh(pillarGeo, curbMat);
  pLeft.position.set(-trackHalfWidth - 0.3, 2.75, 0);
  const pRight = new THREE.Mesh(pillarGeo, curbMat);
  pRight.position.set(trackHalfWidth + 0.3, 2.75, 0);
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(trackHalfWidth * 2 + 1.2, 1.1, 0.5),
    new THREE.MeshStandardMaterial({
      map: createProceduralTexture('checker', renderer, 4, 1),
      roughness: 0.4,
    }),
  );
  banner.position.set(0, 5.2, 0);
  archGroup.add(pLeft, pRight, banner);
  scene.add(archGroup);

  // Trees & Stadium Lights around track
  for (let i = 0; i < 28; i++) {
    const t = i / 28;
    const p = getCircuitPoint(t, radiusX + 16, radiusZ + 16);
    if (isTwilight) {
      if (i % 4 === 0) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 9, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }),
        );
        pole.position.set(p.x, 4.5, p.z);
        scene.add(pole);
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.4, 0.7),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
        );
        lamp.position.set(p.x, 9, p.z);
        scene.add(lamp);
      }
    } else {
      const tree = buildTreeModel(i % 2 === 0 ? 'pine' : 'apple');
      tree.position.set(p.x, 0, p.z);
      scene.add(tree);
    }
  }

  // Boost pads & collectible stars
  interface TrackItem {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    kind: 'star' | 'boost';
    cooldown: number;
  }
  const trackItems: TrackItem[] = [];
  for (let i = 3; i < segments; i += 8) {
    const p = trackPoints[i];
    const isBoost = !isCute && i % 16 === 3;
    const mesh = isBoost
      ? new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.14, 3.2),
          new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x0ea5e9,
            emissiveIntensity: 1.1,
          }),
        )
      : new THREE.Mesh(
          new THREE.OctahedronGeometry(0.75, 0),
          new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.7,
            metalness: 0.5,
          }),
        );
    mesh.position.set(p.x, isBoost ? 0.09 : 1.1, p.z);
    scene.add(mesh);
    trackItems.push({ mesh, pos: p.clone(), kind: isBoost ? 'boost' : 'star', cooldown: 0 });
  }

  // Player Car
  const carColor =
    options.vehicle === 'hyper'
      ? 0x3b82f6
      : options.vehicle === 'rally'
        ? 0xf97316
        : isCute
          ? 0xef4444
          : 0x2563eb;
  const playerCar = buildCarModel(
    carColor,
    isCute ? 'cute' : isTwilight ? 'gt' : 'super',
  );
  playerCar.group.position.copy(startPt);
  playerCar.group.rotation.y = startYaw;
  scene.add(playerCar.group);

  // AI Rivals (for 6-9 and 16-20 races)
  interface AiRacer {
    rig: VehicleRig;
    t: number;
    speed: number;
    laneOffset: number;
    lap: number;
  }
  const rivals: AiRacer[] = [];
  if (!isCute) {
    const rivalColors = [0xf97316, 0x10b981, 0xa855f7];
    const diffMult =
      options.difficulty === 'easy'
        ? 0.8
        : options.difficulty === 'hard'
          ? 1.12
          : 0.96;
    rivalColors.forEach((col, idx) => {
      const rig = buildCarModel(col, isTwilight ? 'gt' : 'super');
      const startT = 0.98 - idx * 0.02;
      const p = getCircuitPoint(startT, radiusX, radiusZ);
      rig.group.position.copy(p);
      scene.add(rig.group);
      rivals.push({
        rig,
        t: startT,
        speed: (0.042 + idx * 0.004) * diffMult,
        laneOffset: (idx - 1) * 2.3,
        lap: 1,
      });
    });
  }

  let speed = 0;
  let yaw = startYaw;
  let boostTimer = 0;
  let score = 0;
  let lap = 1;
  const totalLaps = isCute ? 2 : 3;
  let progressIdx = 0;
  let passedHalfway = false;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  const maxSpeed = isCute ? 22 : options.vehicle === 'hyper' ? 48 : 40;
  const accelRate = isCute ? 18 : options.vehicle === 'hyper' ? 32 : 26;

  soundEngine.startMusic(isCute ? 'cheerful' : 'action');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    const snap = input.getSnapshot();

    // Acceleration & Braking
    if (snap.moveY > 0.05) {
      speed += accelRate * snap.moveY * dt;
    } else if (snap.moveY < -0.05) {
      speed += accelRate * 1.1 * snap.moveY * dt;
    } else {
      speed = THREE.MathUtils.damp(speed, 0, 1.8, dt);
    }

    if (snap.action && Math.abs(speed) > 2) {
      // Handbrake / Drift
      speed = THREE.MathUtils.damp(speed, speed * 0.72, 4, dt);
    }

    if (boostTimer > 0) {
      boostTimer -= dt;
      speed = Math.max(speed, maxSpeed * 1.25);
    }
    speed = THREE.MathUtils.clamp(speed, -14, boostTimer > 0 ? maxSpeed * 1.25 : maxSpeed);

    // Steering
    const turnFactor = Math.min(1, Math.abs(speed) / 8);
    const turnSpeed = (snap.action ? 2.85 : 2.15) * turnFactor;
    const dirSign = speed >= -0.1 ? 1 : -1;
    yaw -= snap.moveX * turnSpeed * dirSign * dt;

    playerCar.group.position.x += Math.sin(yaw) * speed * dt;
    playerCar.group.position.z += Math.cos(yaw) * speed * dt;
    playerCar.group.rotation.y = yaw;

    // Spin wheels
    playerCar.wheels.forEach((w) => {
      w.rotation.x += speed * dt * 1.8;
    });

    // Track boundary & lap tracking
    let closestIdx = 0;
    let closestDistSq = Infinity;
    for (let i = 0; i < segments; i++) {
      const d = playerCar.group.position.distanceToSquared(trackPoints[i]);
      if (d < closestDistSq) {
        closestDistSq = d;
        closestIdx = i;
      }
    }

    const closestPt = trackPoints[closestIdx];
    const distFromCenter = Math.sqrt(closestDistSq);
    const maxAllowed = trackHalfWidth + 2.2;
    if (distFromCenter > maxAllowed) {
      // Gently pull back onto track edge
      const pullDir = new THREE.Vector3()
        .subVectors(closestPt, playerCar.group.position)
        .normalize();
      playerCar.group.position.addScaledVector(pullDir, (distFromCenter - maxAllowed) * 0.55);
      speed *= 0.94;
    }

    if (closestIdx > segments * 0.42 && closestIdx < segments * 0.65) {
      passedHalfway = true;
    }
    if (passedHalfway && progressIdx > segments * 0.8 && closestIdx < segments * 0.15) {
      passedHalfway = false;
      lap += 1;
      score += 250;
      soundEngine.playCollect();
      if (lap > totalLaps) {
        finished = true;
        soundEngine.stopMusic();
        soundEngine.playVictory();
        callbacks.onFinish({
          won: true,
          score: score + Math.max(0, Math.round(600 - elapsed * 4)),
          durationSeconds: elapsed,
          summaryText: `Tabriklaymiz! ${totalLaps} aylanishni ${elapsed.toFixed(1)} soniyada yakunladingiz!`,
        });
        return;
      }
    }
    progressIdx = closestIdx;

    // Update Rivals
    rivals.forEach((rv) => {
      rv.t = (rv.t + rv.speed * dt) % 1;
      const p = getCircuitPoint(rv.t, radiusX, radiusZ);
      const pNext = getCircuitPoint((rv.t + 0.01) % 1, radiusX, radiusZ);
      const dir = new THREE.Vector3().subVectors(pNext, p).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x);
      p.addScaledVector(right, rv.laneOffset);
      rv.rig.group.position.copy(p);
      rv.rig.group.rotation.y = Math.atan2(dir.x, dir.z);
      rv.rig.wheels.forEach((w) => {
        w.rotation.x += 22 * dt;
      });
    });

    // Track Items
    trackItems.forEach((item) => {
      if (item.cooldown > 0) {
        item.cooldown -= dt;
        item.mesh.visible = false;
        return;
      }
      item.mesh.visible = true;
      if (item.kind === 'star') item.mesh.rotation.y += dt * 2.5;
      if (playerCar.group.position.distanceToSquared(item.pos) < 5.5) {
        item.cooldown = 6;
        if (item.kind === 'boost') {
          boostTimer = 1.6;
          score += 50;
          soundEngine.playBoost();
          particles.spawnBurst(playerCar.group.position, 0x38bdf8, 14);
        } else {
          score += 100;
          soundEngine.playCollect();
          particles.spawnBurst(item.pos, 0xfacc15, 12);
        }
      }
    });

    particles.update(dt);

    // Dynamic chase camera + FOV speed sensation
    const targetFov = 60 + Math.min(18, Math.abs(speed) * 0.35);
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
    camera.updateProjectionMatrix();

    const camBack = 9.5;
    const desiredCamPos = new THREE.Vector3(
      playerCar.group.position.x - Math.sin(yaw) * camBack,
      4.4,
      playerCar.group.position.z - Math.cos(yaw) * camBack,
    );
    camera.position.lerp(desiredCamPos, 1 - Math.exp(-8 * dt));
    camera.lookAt(
      playerCar.group.position.x + Math.sin(yaw) * 4,
      playerCar.group.position.y + 1.2,
      playerCar.group.position.z + Math.cos(yaw) * 4,
    );

    hudTimer += dt;
    if (hudTimer >= 0.08) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        speedKmh: Math.round(Math.abs(speed) * 4.5),
        lap: Math.min(lap, totalLaps),
        totalLaps,
        primaryLabel: `Aylanish: ${Math.min(lap, totalLaps)}/${totalLaps}`,
        secondaryLabel: `${Math.round(Math.abs(speed) * 4.5)} km/soat`,
        missionPrompt: isCute
          ? 'Yulduzlarni yig‘ing va marraga yeting!'
          : 'Turbo maydonchalardan o‘tib g‘olib bo‘ling!',
        actionButtonLabel: 'Tormoz',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: (a) => {
      input.pulseAction(a);
    },
    setJoystickVector: (x, y) => {
      input.setJoystick(x, y);
    },
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

// ==================== CITY DRIVER 3D & OPEN WORLD EXPLORER ====================

export function initCityAndOpenWorldGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const isOpenWorld = meta.id === 'open-world-explorer';
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: isOpenWorld ? 0x1e3a5f : 0x60a5fa,
      fogNear: 55,
      fogFar: 185,
      sunColor: 0xfff3db,
      sunIntensity: 1.45,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // City ground
  const gridTex = createProceduralTexture('asphalt', renderer, 22, 22);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.78 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Harbor water edge on one side for Open World
  if (isOpenWorld) {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.4,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.03, -95);
    scene.add(water);
  }

  // City Blocks / Buildings (AABB colliders)
  interface BuildingBox {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }
  const buildings: BuildingBox[] = [];
  const bColors = [0x334155, 0x475569, 0x1e293b, 0x3b4d6b];
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue; // central spawn plaza
      const cx = gx * 26;
      const cz = gz * 26;
      const w = 11 + ((Math.abs(gx * 7 + gz) % 3) * 1.5);
      const d = 11 + ((Math.abs(gz * 5 + gx) % 3) * 1.5);
      const h = 10 + ((Math.abs(gx * 3 + gz * 5) % 5) * 5);

      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color: bColors[(Math.abs(gx + gz)) % bColors.length],
          roughness: 0.65,
          metalness: 0.2,
        }),
      );
      bMesh.position.set(cx, h / 2, cz);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);

      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.2, 0.8, d + 0.2),
        windowMat,
      );
      band.position.set(cx, h - 1.8, cz);
      scene.add(band);

      buildings.push({
        minX: cx - w / 2 - 1.1,
        maxX: cx + w / 2 + 1.1,
        minZ: cz - d / 2 - 1.1,
        maxZ: cz + d / 2 + 1.1,
      });
    }
  }

  // Car + On-foot character (Open world supports switching!)
  const car = buildCarModel(isOpenWorld ? 0xf97316 : 0x0ea5e9, 'super');
  car.group.position.set(0, 0, 0);
  scene.add(car.group);

  const walker = buildCharacterModel(0x2563eb, 0xf97316);
  walker.group.position.set(3, 0, 0);
  walker.group.visible = false;
  scene.add(walker.group);

  // AI Traffic Cars
  interface TrafficCar {
    rig: VehicleRig;
    axis: 'x' | 'z';
    posVal: number;
    dir: 1 | -1;
    laneCoord: number;
    speed: number;
  }
  const traffic: TrafficCar[] = [];
  const trafficCount = options.difficulty === 'hard' ? 8 : 5;
  for (let i = 0; i < trafficCount; i++) {
    const rig = buildCarModel(i % 2 === 0 ? 0xeab308 : 0x94a3b8, 'super');
    const axis = i % 2 === 0 ? 'x' : 'z';
    const laneCoord = ((i % 3) - 1) * 26 + 13;
    const dir = i % 2 === 0 ? 1 : -1;
    scene.add(rig.group);
    traffic.push({
      rig,
      axis,
      posVal: -60 + i * 24,
      dir,
      laneCoord,
      speed: 11 + (i % 3) * 3,
    });
  }

  // Glowing Checkpoints / Landmarks
  const landmarkCoords: [number, number][] = [
    [13, -39],
    [-39, -13],
    [39, 13],
    [-13, 39],
    [65, -13],
    [-65, 13],
  ];
  let targetIndex = 0;
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 14, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  beacon.position.set(landmarkCoords[0][0], 7, landmarkCoords[0][1]);
  scene.add(beacon);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 2.8, 24),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(landmarkCoords[0][0], 0.12, landmarkCoords[0][1]);
  scene.add(ring);

  let inCar = true;
  let speed = 0;
  let yaw = 0;
  let score = 0;
  let health = 100;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  soundEngine.startMusic('action');
  callbacks.onReady();

  const collidesBuilding = (x: number, z: number) => {
    for (const b of buildings) {
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    }
    return false;
  };

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    const snap = input.getSnapshot();

    if (isOpenWorld && snap.auxPressed) {
      if (inCar) {
        inCar = false;
        speed = 0;
        walker.group.position.set(
          car.group.position.x + 2.2,
          0,
          car.group.position.z,
        );
        walker.group.visible = true;
      } else if (walker.group.position.distanceTo(car.group.position) < 5.5) {
        inCar = true;
        walker.group.visible = false;
      }
    }

    const activeObj = inCar ? car.group : walker.group;

    if (inCar) {
      if (snap.moveY > 0.05) speed += 28 * snap.moveY * dt;
      else if (snap.moveY < -0.05) speed += 28 * snap.moveY * dt;
      else speed = THREE.MathUtils.damp(speed, 0, 2.2, dt);

      if (snap.action) speed = THREE.MathUtils.damp(speed, 0, 5, dt);
      speed = THREE.MathUtils.clamp(speed, -14, 38);

      const turnFactor = Math.min(1, Math.abs(speed) / 6);
      yaw -= snap.moveX * 2.2 * turnFactor * (speed >= -0.1 ? 1 : -1) * dt;

      const nx = THREE.MathUtils.clamp(
        car.group.position.x + Math.sin(yaw) * speed * dt,
        -88,
        88,
      );
      const nz = THREE.MathUtils.clamp(
        car.group.position.z + Math.cos(yaw) * speed * dt,
        -88,
        88,
      );

      if (!collidesBuilding(nx, nz)) {
        car.group.position.set(nx, 0, nz);
      } else {
        speed = -speed * 0.35;
        soundEngine.playBump();
      }
      car.group.rotation.y = yaw;
      car.wheels.forEach((w) => {
        w.rotation.x += speed * dt * 1.7;
      });
    } else {
      const walkSpeed = 10;
      const nx = THREE.MathUtils.clamp(
        walker.group.position.x + snap.moveX * walkSpeed * dt,
        -88,
        88,
      );
      const nz = THREE.MathUtils.clamp(
        walker.group.position.z - snap.moveY * walkSpeed * dt,
        -88,
        88,
      );
      if (!collidesBuilding(nx, nz)) {
        walker.group.position.set(nx, 0, nz);
      }
      if (Math.abs(snap.moveX) > 0.1 || Math.abs(snap.moveY) > 0.1) {
        walker.group.rotation.y = Math.atan2(snap.moveX, -snap.moveY);
        const sw = Math.sin(elapsed * 11) * 0.5;
        walker.leftLeg.rotation.x = sw;
        walker.rightLeg.rotation.x = -sw;
      }
    }

    // Update traffic
    traffic.forEach((tr) => {
      tr.posVal += tr.dir * tr.speed * dt;
      if (tr.posVal > 85) tr.posVal = -85;
      if (tr.posVal < -85) tr.posVal = 85;
      if (tr.axis === 'x') {
        tr.rig.group.position.set(tr.posVal, 0, tr.laneCoord);
        tr.rig.group.rotation.y = tr.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        tr.rig.group.position.set(tr.laneCoord, 0, tr.posVal);
        tr.rig.group.rotation.y = tr.dir > 0 ? 0 : Math.PI;
      }
      if (activeObj.position.distanceToSquared(tr.rig.group.position) < 8.5) {
        health = Math.max(0, health - 15);
        speed = -speed * 0.4;
        tr.posVal += tr.dir * 6;
        soundEngine.playBump();
        if (health <= 0) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playGameOver();
          callbacks.onFinish({
            won: false,
            score,
            durationSeconds: elapsed,
            summaryText: `Avtomobil shikastlandi! Siz ${score} ball to'pladingiz.`,
          });
        }
      }
    });

    // Checkpoint arrival
    const [tx, tz] = landmarkCoords[targetIndex];
    const distSq =
      (activeObj.position.x - tx) ** 2 + (activeObj.position.z - tz) ** 2;
    if (distSq < 14) {
      score += 200;
      soundEngine.playCollect();
      particles.spawnBurst(new THREE.Vector3(tx, 1.5, tz), 0x4ade80, 16);
      targetIndex += 1;
      if (targetIndex >= landmarkCoords.length) {
        finished = true;
        soundEngine.stopMusic();
        soundEngine.playVictory();
        callbacks.onFinish({
          won: true,
          score: score + health * 3,
          durationSeconds: elapsed,
          summaryText: `Barcha ${landmarkCoords.length} ta shahar nuqtasi muvaffaqiyatli zabt etildi!`,
        });
        return;
      }
      const [nx, nz] = landmarkCoords[targetIndex];
      beacon.position.set(nx, 7, nz);
      ring.position.set(nx, 0.12, nz);
    }

    particles.update(dt);

    // Camera
    const camYaw = inCar ? yaw : 0;
    const distBack = inCar ? 10 : 9;
    const desired = new THREE.Vector3(
      activeObj.position.x - Math.sin(camYaw) * distBack,
      inCar ? 4.8 : 6.2,
      activeObj.position.z - Math.cos(camYaw) * distBack,
    );
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    camera.lookAt(activeObj.position.x, 1.4, activeObj.position.z);

    hudTimer += dt;
    if (hudTimer >= 0.09) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        health,
        maxHealth: 100,
        speedKmh: inCar ? Math.round(Math.abs(speed) * 4.2) : 12,
        primaryLabel: `Nuqta: ${targetIndex + 1}/${landmarkCoords.length}`,
        secondaryLabel: inCar
          ? `${Math.round(Math.abs(speed) * 4.2)} km/soat`
          : 'Piyoda rejim',
        missionPrompt: isOpenWorld
          ? `Yashil nur tomon boring (${inCar ? 'E — tushish' : 'E — mashinaga chiqish'})`
          : 'Trafikdan ehtiyot bo‘lib yashil nuqtaga yetib boring!',
        actionButtonLabel: isOpenWorld ? (inCar ? 'Tushish (E)' : 'Minish (E)') : 'Tormoz',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: (a) => {
      if (isOpenWorld && a === 'aux') input.pulseAction('aux');
      else input.pulseAction(a);
    },
    setJoystickVector: (x, y) => {
      input.setJoystick(x, y);
    },
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

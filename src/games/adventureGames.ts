import * as THREE from 'three';
import {
  buildCharacterModel,
  buildDinosaurModel,
  buildRocketModel,
  buildTreeModel,
  createProceduralTexture,
  ParticleBurstManager,
  setupThreeWorld,
  startGameLoop,
} from '@/src/engine/threeUtils';
import { UnifiedInputManager } from '@/src/engine/input';
import { soundEngine } from '@/src/engine/audio';
import {
  GameControllerHandle,
  GameEngineCallbacks,
  GameSessionOptions,
} from '@/src/engine/types';
import { GameMetadata, GraphicsQuality } from '@/src/types/platform';

// ==================== 1. MINECRAFT-STYLE VOXEL ADVENTURE ====================

const VOXEL_PALETTE = [
  { name: 'Maysa', color: 0x4ade80 },
  { name: 'Tosh', color: 0x64748b },
  { name: "Yog'och", color: 0xa16207 },
  { name: 'Oltin', color: 0xfacc15 },
];

export function initVoxelAdventureGame(
  container: HTMLElement,
  _meta: GameMetadata,
  quality: GraphicsQuality,
  _options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: 0x7dd3fc,
      fogNear: 35,
      fogFar: 95,
      sunColor: 0xfffbeb,
      sunIntensity: 1.45,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  const voxelFloorTex = createProceduralTexture('voxel-grass', renderer, 18, 18);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ map: voxelFloorTex, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const blockMaterials = VOXEL_PALETTE.map(
    (p) =>
      new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.72,
        metalness: p.name === 'Oltin' ? 0.55 : 0.05,
      }),
  );

  const placedBlocks = new Map<string, THREE.Mesh>();
  const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

  const addBlock = (x: number, y: number, z: number, matIdx: number) => {
    const k = keyOf(x, y, z);
    if (placedBlocks.has(k)) return;
    const mesh = new THREE.Mesh(boxGeo, blockMaterials[matIdx]);
    mesh.position.set(x, y + 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { bx: x, by: y, bz: z };
    scene.add(mesh);
    placedBlocks.set(k, mesh);
  };

  // Starter voxel hill & ruins
  for (let x = -4; x <= 4; x++) {
    for (let z = -6; z <= -2; z++) {
      if (Math.abs(x) + Math.abs(z + 4) <= 4) addBlock(x, 0, z, 0);
      if (Math.abs(x) + Math.abs(z + 4) <= 2) addBlock(x, 1, z, 1);
    }
  }
  addBlock(-6, 0, 2, 2);
  addBlock(-6, 1, 2, 2);
  addBlock(-6, 2, 2, 0);
  addBlock(6, 0, 3, 2);
  addBlock(6, 1, 3, 3);

  // Hidden diamond crystals to collect
  interface Crystal {
    mesh: THREE.Mesh;
    collected: boolean;
  }
  const crystals: Crystal[] = [];
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.5,
  });
  const crystalCoords: [number, number, number][] = [
    [0, 2.8, -4],
    [-8, 1.2, -8],
    [9, 1.2, -7],
    [6, 2.8, 3],
    [-11, 1.2, 6],
    [10, 1.2, 9],
  ];
  crystalCoords.forEach(([cx, cy, cz]) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), crystalMat);
    m.position.set(cx, cy, cz);
    scene.add(m);
    crystals.push({ mesh: m, collected: false });
  });

  // Player
  const player = buildCharacterModel(0x16a34a, 0x38bdf8);
  player.group.position.set(0, 0, 5);
  scene.add(player.group);

  let selectedBlockIdx = 0;
  let camYaw = 0;
  let playerY = 0;
  let velY = 0;
  let score = 0;
  let crystalsFound = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  // Raycasted block cursor preview
  const cursorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 1.04, 1.04),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    }),
  );
  scene.add(cursorMesh);

  const onKeySelect = (e: KeyboardEvent) => {
    if (e.code === 'Digit1') selectedBlockIdx = 0;
    if (e.code === 'Digit2') selectedBlockIdx = 1;
    if (e.code === 'Digit3') selectedBlockIdx = 2;
    if (e.code === 'Digit4') selectedBlockIdx = 3;
  };
  window.addEventListener('keydown', onKeySelect);

  const raycaster = new THREE.Raycaster();
  const placeOrBreakBlock = (remove: boolean) => {
    const forward = new THREE.Vector3(
      -Math.sin(camYaw),
      -0.25,
      -Math.cos(camYaw),
    ).normalize();
    const origin = new THREE.Vector3(
      player.group.position.x,
      player.group.position.y + 1.4,
      player.group.position.z,
    );
    raycaster.set(origin, forward);
    const blockList = Array.from(placedBlocks.values());
    const hits = raycaster.intersectObjects([floor, ...blockList], false);
    if (hits.length > 0 && hits[0].distance < 8) {
      const hit = hits[0];
      if (remove && hit.object !== floor) {
        const { bx, by, bz } = hit.object.userData as {
          bx: number;
          by: number;
          bz: number;
        };
        scene.remove(hit.object);
        placedBlocks.delete(keyOf(bx, by, bz));
        score += 10;
        soundEngine.playBump();
      } else if (!remove && hit.face) {
        const pt = hit.point
          .clone()
          .addScaledVector(hit.face.normal, 0.45);
        const bx = Math.round(pt.x);
        const by = Math.max(0, Math.floor(pt.y));
        const bz = Math.round(pt.z);
        addBlock(bx, by, bz, selectedBlockIdx);
        score += 15;
        soundEngine.playCollect();
      }
    }
  };

  const onCanvasMouseDown = (ev: MouseEvent) => {
    if (paused || finished) return;
    if (ev.button === 0) placeOrBreakBlock(false);
    else if (ev.button === 2) placeOrBreakBlock(true);
  };
  const onContextMenu = (ev: MouseEvent) => ev.preventDefault();
  renderer.domElement.addEventListener('mousedown', onCanvasMouseDown);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);

  soundEngine.startMusic('cheerful');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    const snap = input.getSnapshot();

    if (snap.pointerDeltaX !== 0) {
      camYaw -= snap.pointerDeltaX * 0.006;
    }

    const moveSpeed = 7.5;
    const forwardX = -Math.sin(camYaw);
    const forwardZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);

    const vx = (forwardX * snap.moveY + rightX * snap.moveX) * moveSpeed;
    const vz = (forwardZ * snap.moveY + rightZ * snap.moveX) * moveSpeed;

    player.group.position.x = THREE.MathUtils.clamp(
      player.group.position.x + vx * dt,
      -26,
      26,
    );
    player.group.position.z = THREE.MathUtils.clamp(
      player.group.position.z + vz * dt,
      -26,
      26,
    );

    if (Math.abs(vx) > 0.2 || Math.abs(vz) > 0.2) {
      player.group.rotation.y = Math.atan2(vx, vz);
      const sw = Math.sin(elapsed * 10) * 0.45;
      player.leftLeg.rotation.x = sw;
      player.rightLeg.rotation.x = -sw;
    }

    // Simple block-top height check
    const gx = Math.round(player.group.position.x);
    const gz = Math.round(player.group.position.z);
    let groundH = 0;
    for (let y = 0; y <= 6; y++) {
      if (placedBlocks.has(keyOf(gx, y, gz))) {
        groundH = y + 1;
      }
    }

    if (snap.jump && playerY <= groundH + 0.05) {
      velY = 8.8;
      soundEngine.playJump();
    }
    velY -= 22 * dt;
    playerY = Math.max(groundH, playerY + velY * dt);
    if (playerY <= groundH + 0.01) velY = 0;
    player.group.position.y = playerY;

    // Preview cursor position
    const targetX = Math.round(player.group.position.x + forwardX * 2.4);
    const targetZ = Math.round(player.group.position.z + forwardZ * 2.4);
    cursorMesh.position.set(targetX, Math.floor(playerY) + 0.5, targetZ);

    // Collect crystals
    crystals.forEach((c) => {
      if (c.collected) return;
      c.mesh.rotation.y += dt * 2.2;
      if (player.group.position.distanceTo(c.mesh.position) < 2.0) {
        c.collected = true;
        c.mesh.visible = false;
        crystalsFound += 1;
        score += 150;
        soundEngine.playCollect();
        particles.spawnBurst(c.mesh.position, 0x38bdf8, 16);
        if (crystalsFound >= crystals.length) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playVictory();
          callbacks.onFinish({
            won: true,
            score,
            durationSeconds: elapsed,
            summaryText: `Tabriklaymiz! Barcha ${crystals.length} ta kristall topildi va bloklar qurildi!`,
          });
        }
      }
    });

    particles.update(dt);

    // Follow camera
    const camPos = new THREE.Vector3(
      player.group.position.x + Math.sin(camYaw) * 8.5,
      player.group.position.y + 5.2,
      player.group.position.z + Math.cos(camYaw) * 8.5,
    );
    camera.position.lerp(camPos, 1 - Math.exp(-8 * dt));
    camera.lookAt(
      player.group.position.x,
      player.group.position.y + 1.4,
      player.group.position.z,
    );

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        primaryLabel: `Kristallar: ${crystalsFound}/${crystals.length}`,
        secondaryLabel: `Blok: ${VOXEL_PALETTE[selectedBlockIdx].name}`,
        missionPrompt: "Bloklar quring (1–4) va 6 ta ko‘k kristallni toping!",
        actionButtonLabel: "Blok qo‘yish",
        voxelBlockIndex: selectedBlockIdx,
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: (a) => {
      if (a === 'primary') placeOrBreakBlock(false);
      else if (a === 'aux') placeOrBreakBlock(true);
      else input.pulseAction('secondary');
    },
    setJoystickVector: (x, y) => {
      input.setJoystick(x, y);
    },
    selectVoxelBlock: (idx) => {
      selectedBlockIdx = idx % VOXEL_PALETTE.length;
    },
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      window.removeEventListener('keydown', onKeySelect);
      renderer.domElement.removeEventListener('mousedown', onCanvasMouseDown);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

// ==================== 2. DINO WORLD ====================

export function initDinoIslandGame(
  container: HTMLElement,
  _meta: GameMetadata,
  quality: GraphicsQuality,
  _options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: 0x38bdf8,
      fogNear: 45,
      fogFar: 135,
      sunColor: 0xfef3c7,
      sunIntensity: 1.5,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Tropical Ocean & Island
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.18, metalness: 0.35 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.35;
  scene.add(ocean);

  const sandTex = createProceduralTexture('sand', renderer, 10, 10);
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(34, 38, 1.2, 32),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.9 }),
  );
  island.position.y = -0.5;
  island.receiveShadow = true;
  scene.add(island);

  const grassInner = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 27, 0.25, 28),
    new THREE.MeshStandardMaterial({
      map: createProceduralTexture('grass', renderer, 8, 8),
      roughness: 0.85,
    }),
  );
  grassInner.position.y = 0.08;
  grassInner.receiveShadow = true;
  scene.add(grassInner);

  // Volcano peak
  const volcano = new THREE.Mesh(
    new THREE.ConeGeometry(8.5, 11, 14),
    new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 }),
  );
  volcano.position.set(0, 5.5, -18);
  volcano.castShadow = true;
  scene.add(volcano);

  const lavaGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.4, 12),
    new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  );
  lavaGlow.position.set(0, 10.6, -18);
  scene.add(lavaGlow);

  // Palm trees
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 18 + (i % 3) * 4;
    const palm = buildTreeModel('palm');
    palm.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    scene.add(palm);
  }

  // Player
  const player = buildCharacterModel(0xf59e0b, 0x10b981);
  player.group.position.set(0, 0.2, 18);
  scene.add(player.group);

  // Roaming Dinosaurs
  interface DinoActor {
    mesh: THREE.Group;
    angle: number;
    radius: number;
    speed: number;
  }
  const dinos: DinoActor[] = [
    { mesh: buildDinosaurModel(0x16a34a), angle: 0, radius: 11, speed: 0.55 },
    { mesh: buildDinosaurModel(0x0ea5e9), angle: 2.1, radius: 16, speed: -0.45 },
    { mesh: buildDinosaurModel(0xd97706), angle: 4.2, radius: 9, speed: 0.65 },
  ];
  dinos.forEach((d) => scene.add(d.mesh));

  // Golden Dino Eggs to rescue
  interface EggItem {
    mesh: THREE.Mesh;
    collected: boolean;
  }
  const eggs: EggItem[] = [];
  const eggMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.5,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    const r = 8 + (i % 3) * 6;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), eggMat);
    egg.scale.set(0.85, 1.2, 0.85);
    egg.position.set(Math.cos(a) * r, 0.8, Math.sin(a) * r);
    egg.castShadow = true;
    scene.add(egg);
    eggs.push({ mesh: egg, collected: false });
  }

  let score = 0;
  let collectedCount = 0;
  let health = 100;
  let playerY = 0.2;
  let velY = 0;
  let invuln = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  soundEngine.startMusic('cheerful');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    invuln = Math.max(0, invuln - dt);
    const snap = input.getSnapshot();

    const speed = 9.2;
    const vx = snap.moveX * speed;
    const vz = -snap.moveY * speed;
    const nx = player.group.position.x + vx * dt;
    const nz = player.group.position.z + vz * dt;
    if (nx * nx + nz * nz < 31 * 31) {
      player.group.position.x = nx;
      player.group.position.z = nz;
    }

    if (Math.abs(vx) > 0.2 || Math.abs(vz) > 0.2) {
      player.group.rotation.y = Math.atan2(vx, vz);
      const sw = Math.sin(elapsed * 11) * 0.45;
      player.leftLeg.rotation.x = sw;
      player.rightLeg.rotation.x = -sw;
    }

    if (snap.jump && playerY <= 0.22) {
      velY = 9.0;
      soundEngine.playJump();
    }
    velY -= 22 * dt;
    playerY = Math.max(0.2, playerY + velY * dt);
    if (playerY <= 0.22) velY = 0;
    player.group.position.y = playerY;

    // Update Dinos
    dinos.forEach((d) => {
      d.angle += d.speed * dt;
      const dx = Math.cos(d.angle) * d.radius;
      const dz = Math.sin(d.angle) * d.radius;
      d.mesh.position.set(dx, 0.2, dz);
      d.mesh.rotation.y = d.speed > 0 ? -d.angle : -d.angle + Math.PI;
      if (
        invuln <= 0 &&
        player.group.position.distanceTo(d.mesh.position) < 2.2
      ) {
        health = Math.max(0, health - 25);
        invuln = 1.4;
        soundEngine.playBump();
        if (health <= 0) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playGameOver();
          callbacks.onFinish({
            won: false,
            score,
            durationSeconds: elapsed,
            summaryText: `Dinozavrga duch keldingiz! To'plangan ball: ${score}`,
          });
        }
      }
    });

    // Eggs
    eggs.forEach((e) => {
      if (e.collected) return;
      e.mesh.rotation.y += dt * 2;
      if (player.group.position.distanceTo(e.mesh.position) < 1.9) {
        e.collected = true;
        e.mesh.visible = false;
        collectedCount += 1;
        score += 125;
        soundEngine.playCollect();
        particles.spawnBurst(e.mesh.position, 0xfacc15, 14);
        if (collectedCount >= eggs.length) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playVictory();
          callbacks.onFinish({
            won: true,
            score: score + health * 2,
            durationSeconds: elapsed,
            summaryText: `Ajoyib! Barcha ${eggs.length} ta oltin dinozavr tuxumi qutqarildi!`,
          });
        }
      }
    });

    particles.update(dt);

    camera.position.lerp(
      new THREE.Vector3(
        player.group.position.x,
        player.group.position.y + 8.5,
        player.group.position.z + 12.5,
      ),
      1 - Math.exp(-6 * dt),
    );
    camera.lookAt(player.group.position.x, 1.2, player.group.position.z);

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        health,
        maxHealth: 100,
        primaryLabel: `Tuxumlar: ${collectedCount}/${eggs.length}`,
        missionPrompt: "Dinozavrlardan chaqqonlik bilan o‘tib 8 ta tuxumni yig‘ing!",
        actionButtonLabel: 'Sakrash',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: () => input.pulseAction('secondary'),
    setJoystickVector: (x, y) => input.setJoystick(x, y),
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

// ==================== 3. SPACE EXPLORER ====================

export function initSpaceExplorerGame(
  container: HTMLElement,
  _meta: GameMetadata,
  quality: GraphicsQuality,
  _options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: 0x040711,
      fogDensity: 0.0045,
      sunColor: 0xfffbeb,
      sunIntensity: 1.8,
      hemiSky: 0x38bdf8,
      hemiGround: 0x1e1b4b,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Starfield using InstancedMesh
  const starGeo = new THREE.OctahedronGeometry(0.18, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const starCount = 260;
  const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < starCount; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * 180,
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 180,
    );
    dummy.scale.setScalar(0.6 + Math.random() * 1.4);
    dummy.updateMatrix();
    stars.setMatrixAt(i, dummy.matrix);
  }
  stars.computeBoundingSphere();
  scene.add(stars);

  // Planets
  const planetDefs = [
    { x: -24, y: 4, z: -26, r: 6.5, color: 0xea580c, ring: false },
    { x: 28, y: -3, z: -38, r: 8.2, color: 0xf59e0b, ring: true },
    { x: 0, y: 10, z: -65, r: 9.5, color: 0x3b82f6, ring: false },
    { x: -32, y: -6, z: 18, r: 5.5, color: 0x8b5cf6, ring: true },
  ];
  const planets: { pos: THREE.Vector3; r: number }[] = [];
  planetDefs.forEach((p) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.r, 24, 20),
      new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55 }),
    );
    mesh.position.set(p.x, p.y, p.z);
    scene.add(mesh);
    if (p.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(p.r * 1.3, p.r * 1.85, 32),
        new THREE.MeshStandardMaterial({
          color: 0xfde68a,
          side: THREE.DoubleSide,
          roughness: 0.4,
        }),
      );
      ring.rotation.x = Math.PI / 2.6;
      mesh.add(ring);
    }
    planets.push({ pos: new THREE.Vector3(p.x, p.y, p.z), r: p.r });
  });

  // Asteroids
  const asteroids: THREE.Mesh[] = [];
  const astGeo = new THREE.DodecahedronGeometry(1.4, 0);
  const astMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(astGeo, astMat);
    m.position.set(
      (Math.random() - 0.5) * 75,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 85 - 10,
    );
    scene.add(m);
    asteroids.push(m);
  }

  // Star Energy Cores
  interface EnergyCore {
    mesh: THREE.Mesh;
    collected: boolean;
  }
  const cores: EnergyCore[] = [];
  const coreGeo = new THREE.OctahedronGeometry(0.95, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.2,
  });
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2;
    const r = 12 + (i % 4) * 10;
    const mesh = new THREE.Mesh(coreGeo, coreMat);
    mesh.position.set(
      Math.cos(a) * r,
      Math.sin(i * 1.7) * 6,
      Math.sin(a) * r - 18,
    );
    scene.add(mesh);
    cores.push({ mesh, collected: false });
  }

  // Player Rocket
  const rocket = buildRocketModel(0xf97316);
  rocket.position.set(0, 0, 14);
  rocket.rotation.y = Math.PI;
  scene.add(rocket);

  let yaw = Math.PI;
  let speed = 12;
  let score = 0;
  let collected = 0;
  let health = 100;
  let invuln = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  soundEngine.startMusic('ambient');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    invuln = Math.max(0, invuln - dt);
    const snap = input.getSnapshot();

    yaw -= snap.moveX * 2.1 * dt;
    const targetSpeed = snap.moveY > 0.1 ? 24 : snap.moveY < -0.1 ? 6 : 14;
    speed = THREE.MathUtils.damp(speed, targetSpeed, 4, dt);

    const climb = (snap.jump ? 1 : 0) - (snap.sprint ? 1 : 0);
    rocket.position.x = THREE.MathUtils.clamp(
      rocket.position.x + Math.sin(yaw) * speed * dt,
      -55,
      55,
    );
    rocket.position.z = THREE.MathUtils.clamp(
      rocket.position.z + Math.cos(yaw) * speed * dt,
      -80,
      35,
    );
    rocket.position.y = THREE.MathUtils.clamp(
      rocket.position.y + climb * 11 * dt,
      -15,
      20,
    );
    rocket.rotation.y = yaw;
    rocket.rotation.z = THREE.MathUtils.damp(
      rocket.rotation.z,
      -snap.moveX * 0.45,
      6,
      dt,
    );

    // Asteroid rotation & collision
    asteroids.forEach((ast) => {
      ast.rotation.x += dt * 0.6;
      ast.rotation.y += dt * 0.8;
      if (invuln <= 0 && rocket.position.distanceTo(ast.position) < 2.6) {
        health = Math.max(0, health - 20);
        invuln = 1.2;
        soundEngine.playBump();
        if (health <= 0) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playGameOver();
          callbacks.onFinish({
            won: false,
            score,
            durationSeconds: elapsed,
            summaryText: `Kosmik kema asteroidga urildi! Natija: ${score} ball.`,
          });
        }
      }
    });

    // Core collection
    cores.forEach((c) => {
      if (c.collected) return;
      c.mesh.rotation.y += dt * 2.5;
      if (rocket.position.distanceTo(c.mesh.position) < 2.8) {
        c.collected = true;
        c.mesh.visible = false;
        collected += 1;
        score += 100;
        soundEngine.playCollect();
        particles.spawnBurst(c.mesh.position, 0x38bdf8, 14);
        if (collected >= cores.length) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playVictory();
          callbacks.onFinish({
            won: true,
            score: score + health * 3,
            durationSeconds: elapsed,
            summaryText: `Ajoyib parvoz! Barcha ${cores.length} ta yulduz energiyasi yig‘ildi!`,
          });
        }
      }
    });

    particles.update(dt);

    const camDesired = new THREE.Vector3(
      rocket.position.x - Math.sin(yaw) * 10,
      rocket.position.y + 3.6,
      rocket.position.z - Math.cos(yaw) * 10,
    );
    camera.position.lerp(camDesired, 1 - Math.exp(-7 * dt));
    camera.lookAt(
      rocket.position.x + Math.sin(yaw) * 6,
      rocket.position.y,
      rocket.position.z + Math.cos(yaw) * 6,
    );

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        health,
        maxHealth: 100,
        primaryLabel: `Yulduzlar: ${collected}/${cores.length}`,
        missionPrompt: "Sayyoralar orasidan uchib 15 ta moviy yulduz yadrosini yig‘ing!",
        actionButtonLabel: "Yuqoriga",
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: () => input.pulseAction('secondary'),
    setJoystickVector: (x, y) => input.setJoystick(x, y),
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

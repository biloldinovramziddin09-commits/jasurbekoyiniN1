import * as THREE from 'three';
import {
  buildAnimalModel,
  buildCharacterModel,
  buildTreeModel,
  createProceduralTexture,
  ParticleBurstManager,
  setupThreeWorld,
  startGameLoop,
} from '@/src/engine/threeUtils';
import { UnifiedInputManager } from '@/src/engine/input';
import { soundEngine, speakUzbekHint } from '@/src/engine/audio';
import {
  GameControllerHandle,
  GameEngineCallbacks,
  GameSessionOptions,
} from '@/src/engine/types';
import { GameMetadata, GraphicsQuality } from '@/src/types/platform';

const UZ_COLORS = [
  { name: 'QIZIL', hex: 0xef4444 },
  { name: "KO'K", hex: 0x3b82f6 },
  { name: 'SARIQ', hex: 0xfacc15 },
  { name: 'YASHIL', hex: 0x22c55e },
];

const UZ_SHAPES = [
  { key: 'cube', name: 'KUB', color: 0x3b82f6 },
  { key: 'sphere', name: 'SHAR', color: 0xef4444 },
  { key: 'cone', name: 'KONUS', color: 0xf59e0b },
  { key: 'cylinder', name: 'SILINDR', color: 0x10b981 },
];

const UZ_FRUITS = [
  { key: 'apple', name: 'OLMA', color: 0xef4444 },
  { key: 'orange', name: 'APELSIN', color: 0xf97316 },
  { key: 'banana', name: 'BANAN', color: 0xfacc15 },
  { key: 'melon', name: 'TARVUZ', color: 0x16a34a },
];

const UZ_ANIMALS: {
  kind: 'bunny' | 'bear' | 'duck' | 'puppy' | 'lamb';
  name: string;
  treat: string;
  x: number;
  z: number;
}[] = [
  { kind: 'bunny', name: 'Quyoncha', treat: 'sabzi', x: -9, z: -6 },
  { kind: 'bear', name: 'Ayiqcha', treat: 'asal', x: 9, z: -7 },
  { kind: 'duck', name: "O'rdakcha", treat: 'don', x: 0, z: -13 },
  { kind: 'puppy', name: 'Kuchukcha', treat: 'suyakcha', x: -10, z: 7 },
  { kind: 'lamb', name: "Qo'zichoq", treat: 'olma', x: 10, z: 7 },
];

function createFruitMesh(key: string): THREE.Group {
  const g = new THREE.Group();
  if (key === 'apple') {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }),
    );
    m.position.y = 0.65;
    m.castShadow = true;
    g.add(m);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f }),
    );
    stem.position.y = 1.25;
    g.add(stem);
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x22c55e }),
    );
    leaf.position.set(0.14, 1.26, 0);
    g.add(leaf);
  } else if (key === 'orange') {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }),
    );
    m.position.y = 0.65;
    m.castShadow = true;
    g.add(m);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x15803d }),
    );
    cap.position.y = 1.2;
    g.add(cap);
  } else if (key === 'banana') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const curve = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.16, 10, 16, Math.PI * 0.9),
      mat,
    );
    curve.position.y = 0.72;
    curve.rotation.z = -0.5;
    curve.castShadow = true;
    g.add(curve);
  } else {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 }),
    );
    m.scale.set(1.15, 0.92, 0.95);
    m.position.y = 0.68;
    m.castShadow = true;
    g.add(m);
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.06, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x052e16 }),
    );
    stripe.position.y = 0.68;
    g.add(stripe);
  }
  return g;
}

function createShapeMesh(key: string, colorHex: number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.15,
  });
  let geo: THREE.BufferGeometry;
  if (key === 'cube') geo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  else if (key === 'sphere') geo = new THREE.SphereGeometry(0.7, 18, 14);
  else if (key === 'cone') geo = new THREE.ConeGeometry(0.72, 1.35, 16);
  else geo = new THREE.CylinderGeometry(0.62, 0.62, 1.25, 16);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function initKidsGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  _options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: 0x87ceeb,
      fogNear: 35,
      fogFar: 110,
      sunColor: 0xfff7ed,
      sunIntensity: 1.5,
      hemiSky: 0xbae6fd,
      hemiGround: 0x4ade80,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Sunny Meadow Ground
  const grassTex = createProceduralTexture('grass', renderer, 14, 14);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Decorative wooden fence perimeter (safe play garden 20x20)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
  const bound = 16;
  for (let i = -bound; i <= bound; i += 4) {
    [
      [i, -bound],
      [i, bound],
      [-bound, i],
      [bound, i],
    ].forEach(([fx, fz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), fenceMat);
      post.position.set(fx, 0.7, fz);
      post.castShadow = true;
      scene.add(post);
    });
  }

  // Surrounding cheerful trees
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 20 + (i % 3) * 4;
    const tree = buildTreeModel(i % 2 === 0 ? 'apple' : 'pine');
    tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    scene.add(tree);
  }

  // Player character
  const player = buildCharacterModel(0x3b82f6, 0xf97316);
  player.group.position.set(0, 0, 5);
  scene.add(player.group);

  let playerY = 0;
  let velY = 0;
  let score = 0;
  let round = 1;
  const maxRounds =
    meta.archetype === 'kids-animals-park'
      ? 5
      : meta.archetype === 'kids-shape-match'
        ? 8
        : 10;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  // Game-specific objects
  interface Collectible {
    mesh: THREE.Object3D;
    tag: string;
    label: string;
    active: boolean;
    baseY: number;
  }
  const items: Collectible[] = [];
  let targetTag = '';
  let targetLabel = '';
  let hologramMesh: THREE.Mesh | null = null;

  const setupRoundContent = () => {
    items.forEach((it) => scene.remove(it.mesh));
    items.length = 0;
    if (hologramMesh) {
      scene.remove(hologramMesh);
      hologramMesh = null;
    }

    if (meta.archetype === 'kids-collect-colors') {
      const target = UZ_COLORS[Math.floor(Math.random() * UZ_COLORS.length)];
      targetTag = target.name;
      targetLabel = `${target.name} rangni toping!`;
      speakUzbekHint(`${target.name} rangdagi sharni toping`, true);

      for (let i = 0; i < 8; i++) {
        const c = i < 2 ? target : UZ_COLORS[i % UZ_COLORS.length];
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 16, 14),
          new THREE.MeshStandardMaterial({
            color: c.hex,
            emissive: c.hex,
            emissiveIntensity: 0.25,
            roughness: 0.25,
          }),
        );
        orb.castShadow = true;
        const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
        const r = 6 + (i % 3) * 3;
        orb.position.set(Math.cos(a) * r, 0.9, Math.sin(a) * r);
        scene.add(orb);
        items.push({ mesh: orb, tag: c.name, label: c.name, active: true, baseY: 0.9 });
      }
    } else if (meta.archetype === 'kids-shape-match') {
      const target = UZ_SHAPES[Math.floor(Math.random() * UZ_SHAPES.length)];
      targetTag = target.key;
      targetLabel = `${target.name} shaklini toping!`;
      speakUzbekHint(`${target.name} shaklini toping`, true);

      hologramMesh = createShapeMesh(target.key, target.color);
      hologramMesh.position.set(0, 4.2, -5);
      hologramMesh.scale.setScalar(1.4);
      scene.add(hologramMesh);

      const coords = [
        [-8, -3],
        [-2.8, -5],
        [2.8, -5],
        [8, -3],
      ];
      UZ_SHAPES.forEach((sh, idx) => {
        const pedGroup = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.25, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
        );
        base.position.y = 0.2;
        pedGroup.add(base);

        const shapeObj = createShapeMesh(sh.key, sh.color);
        shapeObj.position.y = 1.35;
        pedGroup.add(shapeObj);

        pedGroup.position.set(coords[idx][0], 0, coords[idx][1]);
        scene.add(pedGroup);
        items.push({
          mesh: pedGroup,
          tag: sh.key,
          label: sh.name,
          active: true,
          baseY: 0,
        });
      });
    } else if (meta.archetype === 'kids-fruit-harvest') {
      const target = UZ_FRUITS[Math.floor(Math.random() * UZ_FRUITS.length)];
      targetTag = target.key;
      targetLabel = `${target.name} mevasini yig'ing!`;
      speakUzbekHint(`${target.name} yig'ing`, true);

      for (let i = 0; i < 8; i++) {
        const fr = i < 2 ? target : UZ_FRUITS[i % UZ_FRUITS.length];
        const fMesh = createFruitMesh(fr.key);
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = 5.5 + (i % 3) * 3.2;
        fMesh.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
        scene.add(fMesh);
        items.push({
          mesh: fMesh,
          tag: fr.key,
          label: fr.name,
          active: true,
          baseY: 0.15,
        });
      }
    }
  };

  if (meta.archetype === 'kids-animals-park') {
    // Pond in center
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.2 }),
    );
    pond.position.set(0, 0.06, -4);
    scene.add(pond);

    UZ_ANIMALS.forEach((an) => {
      const model = buildAnimalModel(an.kind);
      model.position.set(an.x, 0, an.z);
      scene.add(model);
      items.push({
        mesh: model,
        tag: an.kind,
        label: `${an.name} (${an.treat})`,
        active: true,
        baseY: 0,
      });
    });
    targetLabel = "Barcha 5 ta hayvonchaga salom bering!";
    speakUzbekHint("Quvnoq hayvonchalar bilan salomlashing!", true);
  } else {
    setupRoundContent();
  }

  // Click raycasting for shape selection / kids ease
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const onCanvasClick = (ev: MouseEvent) => {
    if (paused || finished) return;
    if (meta.archetype !== 'kids-shape-match') return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    for (const it of items) {
      if (!it.active) continue;
      if (raycaster.intersectObject(it.mesh, true).length > 0) {
        if (it.tag === targetTag) {
          handleSuccess(it);
        } else {
          soundEngine.playBump();
        }
        break;
      }
    }
  };
  renderer.domElement.addEventListener('click', onCanvasClick);

  const handleSuccess = (it: Collectible) => {
    it.active = false;
    soundEngine.playCollect();
    particles.spawnBurst(
      new THREE.Vector3(it.mesh.position.x, 1.2, it.mesh.position.z),
      0xfacc15,
      16,
    );

    if (meta.archetype === 'kids-animals-park') {
      score += 120;
      round += 1;
      // Make animal hop happily
      it.mesh.position.y = 0.8;
      if (round > maxRounds) {
        finishGame(true);
      } else {
        targetLabel = `Ajoyib! Yana ${maxRounds - round + 1} ta hayvoncha qoldi!`;
      }
    } else {
      score += 100;
      round += 1;
      if (round > maxRounds) {
        finishGame(true);
      } else {
        setupRoundContent();
      }
    }
  };

  const finishGame = (won: boolean) => {
    if (finished) return;
    finished = true;
    soundEngine.stopMusic();
    if (won) soundEngine.playVictory();
    callbacks.onFinish({
      won,
      score,
      durationSeconds: elapsed,
      summaryText: `Barakalla! Siz ${score} ball to‘pladingiz va barcha vazifalarni bajardingiz!`,
    });
  };

  soundEngine.startMusic('cheerful');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    const snap = input.getSnapshot();

    // Gentle movement
    const speed = 7.5;
    const vx = snap.moveX * speed;
    const vz = -snap.moveY * speed;
    player.group.position.x = THREE.MathUtils.clamp(
      player.group.position.x + vx * dt,
      -14.5,
      14.5,
    );
    player.group.position.z = THREE.MathUtils.clamp(
      player.group.position.z + vz * dt,
      -14.5,
      14.5,
    );

    if (Math.abs(vx) > 0.2 || Math.abs(vz) > 0.2) {
      const targetAngle = Math.atan2(vx, vz);
      player.group.rotation.y = targetAngle;
      const swing = Math.sin(elapsed * 10) * 0.45;
      player.leftLeg.rotation.x = swing;
      player.rightLeg.rotation.x = -swing;
      player.leftArm.rotation.x = -swing * 0.7;
      player.rightArm.rotation.x = swing * 0.7;
    } else {
      player.leftLeg.rotation.x = 0;
      player.rightLeg.rotation.x = 0;
      player.leftArm.rotation.x = 0;
      player.rightArm.rotation.x = 0;
    }

    // Jump
    if (snap.jump && playerY <= 0.01) {
      velY = 8.2;
      soundEngine.playJump();
    }
    velY -= 22 * dt;
    playerY = Math.max(0, playerY + velY * dt);
    if (playerY <= 0.01) velY = 0;
    player.group.position.y = playerY;

    // Animate collectibles & check collisions
    if (hologramMesh) {
      hologramMesh.rotation.y += dt * 1.4;
      hologramMesh.rotation.x = Math.sin(elapsed * 1.5) * 0.2;
    }

    for (const it of items) {
      if (meta.archetype === 'kids-animals-park') {
        it.mesh.position.y = THREE.MathUtils.damp(it.mesh.position.y, 0, 5, dt);
        it.mesh.lookAt(player.group.position.x, it.mesh.position.y, player.group.position.z);
      } else {
        it.mesh.rotation.y += dt * 1.5;
        it.mesh.position.y = it.baseY + Math.sin(elapsed * 3 + it.mesh.position.x) * 0.14;
      }

      if (!it.active) continue;
      const dx = player.group.position.x - it.mesh.position.x;
      const dz = player.group.position.z - it.mesh.position.z;
      if (dx * dx + dz * dz < 2.2) {
        if (meta.archetype === 'kids-animals-park' || it.tag === targetTag) {
          handleSuccess(it);
          break;
        } else {
          // Gentle bounce back for wrong item
          soundEngine.playBump();
          player.group.position.x += dx * 0.6;
          player.group.position.z += dz * 0.6;
        }
      }
    }

    particles.update(dt);

    // Smooth camera follow
    const camTargetX = player.group.position.x;
    const camTargetZ = player.group.position.z + 10.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetX, 5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 7.2, 5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetZ, 5, dt);
    camera.lookAt(
      player.group.position.x,
      player.group.position.y + 1.1,
      player.group.position.z - 1.5,
    );

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        primaryLabel: `Bosqich: ${Math.min(round, maxRounds)}/${maxRounds}`,
        missionPrompt: targetLabel,
        actionButtonLabel: 'Sakrash',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: () => {
      input.pulseAction('secondary');
    },
    setJoystickVector: (x, y) => {
      input.setJoystick(x, y);
    },
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      renderer.domElement.removeEventListener('click', onCanvasClick);
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

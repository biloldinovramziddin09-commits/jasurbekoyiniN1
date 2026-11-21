import * as THREE from 'three';
import {
  buildCartoonZombie,
  buildCharacterModel,
  buildRobotBot,
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

// ==================== 1. LASER-TAG BATTLE ARENA & TACTICAL ARENA ====================

export function initLaserArenaGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const isTactical = meta.id === 'tactical-arena';
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: isTactical ? 0x090d1a : 0x0f172a,
      fogNear: 35,
      fogFar: 115,
      sunColor: 0xe0f2fe,
      sunIntensity: 1.35,
      hemiSky: 0x38bdf8,
      hemiGround: 0x1e1b4b,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  const floorTex = createProceduralTexture('grid', renderer, 18, 18);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(76, 76),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.25 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Arena Cover Blocks (AABB)
  interface CoverBlock {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }
  const covers: CoverBlock[] = [];
  const coverMat = new THREE.MeshStandardMaterial({
    color: isTactical ? 0x312e81 : 0x1e3a8a,
    roughness: 0.35,
    metalness: 0.5,
  });
  const neonTrimMat = new THREE.MeshBasicMaterial({
    color: isTactical ? 0x06b6d4 : 0x3b82f6,
  });

  const blockCoords: [number, number, number, number, number][] = [
    [-12, -10, 4, 3, 2],
    [12, -10, 4, 3, 2],
    [-12, 10, 4, 3, 2],
    [12, 10, 4, 3, 2],
    [0, 0, 5, 2.5, 5],
    [-20, 0, 2.5, 3, 8],
    [20, 0, 2.5, 3, 8],
  ];
  blockCoords.forEach(([x, z, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), coverMat);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.1),
      neonTrimMat,
    );
    trim.position.set(x, h + 0.05, z);
    scene.add(trim);

    covers.push({
      minX: x - w / 2 - 0.7,
      maxX: x + w / 2 + 0.7,
      minZ: z - d / 2 - 0.7,
      maxZ: z + d / 2 + 0.7,
    });
  });

  // Player (Blue Team)
  const player = buildRobotBot(0x2563eb);
  player.position.set(0, 0, 24);
  scene.add(player);

  // Friendly AI Ally
  const ally = buildRobotBot(0x38bdf8);
  ally.position.set(-8, 0, 22);
  scene.add(ally);

  // Red Team AI Bots
  interface BotEnemy {
    mesh: THREE.Group;
    hp: number;
    fireTimer: number;
    home: THREE.Vector3;
    alive: boolean;
    respawnTimer: number;
  }
  const enemies: BotEnemy[] = [];
  const enemyCount = isTactical ? 5 : 4;
  for (let i = 0; i < enemyCount; i++) {
    const m = buildRobotBot(0xef4444);
    const home = new THREE.Vector3(-18 + i * 9, 0, -22);
    m.position.copy(home);
    scene.add(m);
    enemies.push({
      mesh: m,
      hp: isTactical ? 3 : 2,
      fireTimer: 1 + i * 0.4,
      home,
      alive: true,
      respawnTimer: 0,
    });
  }

  // Laser Beams
  interface LaserBolt {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    fromPlayer: boolean;
    life: number;
  }
  const bolts: LaserBolt[] = [];
  const boltGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const blueBoltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const redBoltMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  let aimYaw = 0;
  let playerY = 0;
  let velY = 0;
  let fireCooldown = 0;
  let score = 0;
  let tagsCount = 0;
  const targetTags = isTactical ? 12 : 8;
  let shield = 100;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  const fireLaser = (
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    fromPlayer: boolean,
  ) => {
    const mesh = new THREE.Mesh(
      boltGeo,
      fromPlayer ? blueBoltMat : redBoltMat,
    );
    mesh.position.copy(origin);
    scene.add(mesh);
    bolts.push({
      mesh,
      vel: dir.clone().normalize().multiplyScalar(fromPlayer ? 42 : 28),
      fromPlayer,
      life: 1.6,
    });
    if (fromPlayer) soundEngine.playLaser();
  };

  const onCanvasClick = () => {
    if (paused || finished || fireCooldown > 0) return;
    fireCooldown = 0.24;
    const dir = new THREE.Vector3(-Math.sin(aimYaw), 0, -Math.cos(aimYaw));
    fireLaser(
      new THREE.Vector3(player.position.x, player.position.y + 1.25, player.position.z),
      dir,
      true,
    );
  };
  renderer.domElement.addEventListener('click', onCanvasClick);

  const hitsCover = (x: number, z: number) => {
    for (const c of covers) {
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
    }
    return false;
  };

  soundEngine.startMusic('action');
  callbacks.onReady();

  const diffMult =
    options.difficulty === 'easy'
      ? 0.75
      : options.difficulty === 'hard'
        ? 1.25
        : 1.0;

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    fireCooldown = Math.max(0, fireCooldown - dt);
    const snap = input.getSnapshot();

    if (snap.pointerDeltaX !== 0) {
      aimYaw -= snap.pointerDeltaX * 0.007;
    }

    const fwdX = -Math.sin(aimYaw);
    const fwdZ = -Math.cos(aimYaw);
    const rightX = Math.cos(aimYaw);
    const rightZ = -Math.sin(aimYaw);

    const speed = 10.5;
    const nx = THREE.MathUtils.clamp(
      player.position.x + (fwdX * snap.moveY + rightX * snap.moveX) * speed * dt,
      -34,
      34,
    );
    const nz = THREE.MathUtils.clamp(
      player.position.z + (fwdZ * snap.moveY + rightZ * snap.moveX) * speed * dt,
      -34,
      34,
    );
    if (!hitsCover(nx, nz)) {
      player.position.x = nx;
      player.position.z = nz;
    }
    player.rotation.y = aimYaw + Math.PI;

    if (snap.jump && playerY <= 0.02) {
      velY = 8.5;
      soundEngine.playJump();
    }
    velY -= 22 * dt;
    playerY = Math.max(0, playerY + velY * dt);
    if (playerY <= 0.02) velY = 0;
    player.position.y = playerY;

    if (snap.action && fireCooldown <= 0 && !snap.jump) {
      fireCooldown = 0.25;
      fireLaser(
        new THREE.Vector3(player.position.x, player.position.y + 1.25, player.position.z),
        new THREE.Vector3(fwdX, 0, fwdZ),
        true,
      );
    }

    // Ally movement
    const allyTarget = new THREE.Vector3(
      player.position.x - 6,
      0,
      player.position.z - 4,
    );
    const allyDir = allyTarget.sub(ally.position);
    if (allyDir.length() > 2) {
      allyDir.normalize();
      ally.position.addScaledVector(allyDir, 7 * dt);
      ally.rotation.y = Math.atan2(allyDir.x, allyDir.z);
    }

    // Enemy bots AI
    enemies.forEach((en) => {
      if (!en.alive) {
        en.respawnTimer -= dt;
        if (en.respawnTimer <= 0) {
          en.alive = true;
          en.hp = isTactical ? 3 : 2;
          en.mesh.position.copy(en.home);
          en.mesh.visible = true;
        }
        return;
      }

      const toPlayer = new THREE.Vector3().subVectors(player.position, en.mesh.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist > 0.1) {
        toPlayer.normalize();
        en.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        if (dist > 11) {
          const ex = en.mesh.position.x + toPlayer.x * 5.2 * diffMult * dt;
          const ez = en.mesh.position.z + toPlayer.z * 5.2 * diffMult * dt;
          if (!hitsCover(ex, ez)) {
            en.mesh.position.x = ex;
            en.mesh.position.z = ez;
          }
        }
      }

      en.fireTimer -= dt * diffMult;
      if (en.fireTimer <= 0 && dist < 34) {
        en.fireTimer = 1.65 + Math.random() * 0.9;
        fireLaser(
          new THREE.Vector3(en.mesh.position.x, 1.25, en.mesh.position.z),
          toPlayer,
          false,
        );
      }
    });

    // Update Laser Bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);

      let remove = b.life <= 0 || hitsCover(b.mesh.position.x, b.mesh.position.z);

      if (!remove && b.fromPlayer) {
        for (const en of enemies) {
          if (!en.alive) continue;
          if (
            b.mesh.position.distanceTo(
              new THREE.Vector3(en.mesh.position.x, 1.2, en.mesh.position.z),
            ) < 1.25
          ) {
            en.hp -= 1;
            particles.spawnBurst(b.mesh.position, 0x38bdf8, 8);
            soundEngine.playCollect();
            if (en.hp <= 0) {
              en.alive = false;
              en.mesh.visible = false;
              en.respawnTimer = 3.2;
              tagsCount += 1;
              score += 150;
              if (tagsCount >= targetTags) {
                finished = true;
                soundEngine.stopMusic();
                soundEngine.playVictory();
                callbacks.onFinish({
                  won: true,
                  score: score + shield * 3,
                  durationSeconds: elapsed,
                  summaryText: `G‘alaba! Siz ${targetTags} ta raqib robotini lazer nuri bilan belgiladingiz!`,
                });
                return;
              }
            }
            remove = true;
            break;
          }
        }
      } else if (!remove && !b.fromPlayer) {
        if (
          b.mesh.position.distanceTo(
            new THREE.Vector3(player.position.x, player.position.y + 1.1, player.position.z),
          ) < 1.1
        ) {
          shield = Math.max(0, shield - 12);
          soundEngine.playBump();
          particles.spawnBurst(b.mesh.position, 0xf97316, 6);
          remove = true;
          if (shield <= 0) {
            finished = true;
            soundEngine.stopMusic();
            soundEngine.playGameOver();
            callbacks.onFinish({
              won: false,
              score,
              durationSeconds: elapsed,
              summaryText: `Qalqon quvvati tugadi! To‘plangan ball: ${score}`,
            });
            return;
          }
        }
      }

      if (remove) {
        scene.remove(b.mesh);
        bolts.splice(i, 1);
      }
    }

    particles.update(dt);

    const camTarget = new THREE.Vector3(
      player.position.x - fwdX * 9.5,
      player.position.y + 5.8,
      player.position.z - fwdZ * 9.5,
    );
    camera.position.lerp(camTarget, 1 - Math.exp(-9 * dt));
    camera.lookAt(
      player.position.x + fwdX * 8,
      player.position.y + 1.3,
      player.position.z + fwdZ * 8,
    );

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        health: shield,
        maxHealth: 100,
        primaryLabel: `Nishon: ${tagsCount}/${targetTags}`,
        missionPrompt: "Sichqonchani surib nishon oling va lazer nuri bilan raqiblarni belgilang!",
        actionButtonLabel: 'Lazer',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: (a) => {
      if (a === 'primary') onCanvasClick();
      else input.pulseAction('secondary');
    },
    setJoystickVector: (x, y) => input.setJoystick(x, y),
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

// ==================== 2. ZOMBIE SURVIVAL (CARTOON NON-GRAPHIC) ====================

export function initZombieSurvivalGame(
  container: HTMLElement,
  _meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: 0x1e1b4b,
      fogNear: 30,
      fogFar: 95,
      sunColor: 0xc4b5fd,
      sunIntensity: 1.25,
      hemiSky: 0x6366f1,
      hemiGround: 0x1e293b,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 110),
    new THREE.MeshStandardMaterial({
      map: createProceduralTexture('grid', renderer, 20, 20),
      roughness: 0.85,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Stylized cartoon houses
  const houseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5 });
  [
    [-16, -14],
    [16, -14],
    [-16, 14],
    [16, 14],
  ].forEach(([hx, hz]) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 6), houseMat);
    body.position.set(hx, 2.25, hz);
    body.castShadow = true;
    scene.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.6, 4), roofMat);
    roof.position.set(hx, 5.8, hz);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
  });

  // 5 Energy Beacons to Activate
  interface BeaconNode {
    mesh: THREE.Mesh;
    activated: boolean;
  }
  const beacons: BeaconNode[] = [];
  const beaconCoords: [number, number][] = [
    [0, -18],
    [-20, 0],
    [20, 0],
    [-10, 20],
    [12, 18],
  ];
  beaconCoords.forEach(([bx, bz]) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 3.2, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
      }),
    );
    m.position.set(bx, 1.6, bz);
    scene.add(m);
    beacons.push({ mesh: m, activated: false });
  });

  // Player
  const player = buildCharacterModel(0x3b82f6, 0x38bdf8);
  player.group.position.set(0, 0, 0);
  scene.add(player.group);

  // Cartoon Zombie-Bots
  interface ZombieActor {
    mesh: THREE.Group;
    stunTimer: number;
  }
  const zombies: ZombieActor[] = [];
  const zCount = options.difficulty === 'hard' ? 7 : 5;
  for (let i = 0; i < zCount; i++) {
    const z = buildCartoonZombie();
    const a = (i / zCount) * Math.PI * 2;
    z.position.set(Math.cos(a) * 22, 0, Math.sin(a) * 22);
    scene.add(z);
    zombies.push({ mesh: z, stunTimer: 0 });
  }

  let score = 0;
  let activeCount = 0;
  let health = 100;
  let invuln = 0;
  let pulseCooldown = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  const triggerStunWave = () => {
    if (paused || finished || pulseCooldown > 0) return;
    pulseCooldown = 0.9;
    soundEngine.playLaser();
    particles.spawnBurst(
      new THREE.Vector3(player.group.position.x, 1.1, player.group.position.z),
      0x38bdf8,
      18,
    );
    zombies.forEach((z) => {
      if (z.mesh.position.distanceTo(player.group.position) < 7.5) {
        z.stunTimer = 3.5;
        score += 40;
      }
    });
  };
  renderer.domElement.addEventListener('click', triggerStunWave);

  soundEngine.startMusic('action');
  callbacks.onReady();

  const zSpeed =
    options.difficulty === 'easy'
      ? 2.8
      : options.difficulty === 'hard'
        ? 4.6
        : 3.6;

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    invuln = Math.max(0, invuln - dt);
    pulseCooldown = Math.max(0, pulseCooldown - dt);
    const snap = input.getSnapshot();

    const speed = 9.2;
    const vx = snap.moveX * speed;
    const vz = -snap.moveY * speed;
    player.group.position.x = THREE.MathUtils.clamp(
      player.group.position.x + vx * dt,
      -28,
      28,
    );
    player.group.position.z = THREE.MathUtils.clamp(
      player.group.position.z + vz * dt,
      -28,
      28,
    );
    if (Math.abs(vx) > 0.2 || Math.abs(vz) > 0.2) {
      player.group.rotation.y = Math.atan2(vx, vz);
      const sw = Math.sin(elapsed * 11) * 0.45;
      player.leftLeg.rotation.x = sw;
      player.rightLeg.rotation.x = -sw;
    }

    if (snap.action && pulseCooldown <= 0) {
      triggerStunWave();
    }

    // Activate beacons
    beacons.forEach((b) => {
      if (b.activated) return;
      b.mesh.rotation.y += dt * 1.5;
      if (player.group.position.distanceTo(b.mesh.position) < 2.6) {
        b.activated = true;
        activeCount += 1;
        score += 200;
        (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
        (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x16a34a);
        soundEngine.playCollect();
        particles.spawnBurst(b.mesh.position, 0x4ade80, 16);
        if (activeCount >= beacons.length) {
          finished = true;
          soundEngine.stopMusic();
          soundEngine.playVictory();
          callbacks.onFinish({
            won: true,
            score: score + health * 2,
            durationSeconds: elapsed,
            summaryText: `Shaharcha qutqarildi! Barcha ${beacons.length} ta energiya minorasi yoqildi!`,
          });
        }
      }
    });

    // Zombies chase
    zombies.forEach((z) => {
      if (z.stunTimer > 0) {
        z.stunTimer -= dt;
        z.mesh.rotation.y += dt * 6;
        return;
      }
      const dir = new THREE.Vector3().subVectors(player.group.position, z.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.3) {
        dir.normalize();
        z.mesh.position.addScaledVector(dir, zSpeed * dt);
        z.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
      if (invuln <= 0 && z.mesh.position.distanceTo(player.group.position) < 1.5) {
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
            summaryText: `Energiya tugadi! To'plangan ball: ${score}`,
          });
        }
      }
    });

    particles.update(dt);

    camera.position.lerp(
      new THREE.Vector3(
        player.group.position.x,
        10.5,
        player.group.position.z + 13,
      ),
      1 - Math.exp(-6 * dt),
    );
    camera.lookAt(player.group.position.x, 1, player.group.position.z);

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        health,
        maxHealth: 100,
        primaryLabel: `Minoralar: ${activeCount}/${beacons.length}`,
        missionPrompt: "5 ta sariq energiya minorasini yoqing! (Probel/Bosish — Impuls to'lqini)",
        actionButtonLabel: 'Impuls',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: () => triggerStunWave(),
    setJoystickVector: (x, y) => input.setJoystick(x, y),
    dispose: () => {
      stopLoop();
      soundEngine.stopMusic();
      renderer.domElement.removeEventListener('click', triggerStunWave);
      particles.dispose();
      input.dispose();
      disposeAll();
    },
  };
}

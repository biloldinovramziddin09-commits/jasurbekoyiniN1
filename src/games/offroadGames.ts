import * as THREE from 'three';
import {
  buildCarModel,
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

function terrainHeightAt(x: number, z: number, extreme: boolean): number {
  const amp = extreme ? 3.8 : 2.3;
  return (
    Math.sin(x * 0.08) * Math.cos(z * 0.08) * amp +
    Math.sin(x * 0.19 + z * 0.12) * (amp * 0.4)
  );
}

export function initOffroadGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  _options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const isExtreme = meta.id === 'extreme-offroad';
  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: isExtreme ? 0x1e293b : 0x7dd3fc,
      fogNear: 40,
      fogFar: 145,
      sunColor: isExtreme ? 0xfdba74 : 0xfffbeb,
      sunIntensity: 1.45,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Deformed Terrain Mesh
  const size = 180;
  const segs = 56;
  const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, terrainHeightAt(vx, vz, isExtreme));
  }
  terrainGeo.computeVertexNormals();

  const terrainTex = createProceduralTexture(
    isExtreme ? 'sand' : 'grass',
    renderer,
    18,
    18,
  );
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.92 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Pine trees & boulders grounded on terrainHeightAt
  const rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  const boulders: { pos: THREE.Vector3; r: number }[] = [];

  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 24 + (i % 4) * 14;
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r;
    const ty = terrainHeightAt(tx, tz, isExtreme);
    const tree = buildTreeModel('pine');
    tree.position.set(tx, ty - 0.1, tz);
    scene.add(tree);
  }

  for (let i = 0; i < (isExtreme ? 16 : 8); i++) {
    const rx = ((i * 37) % 110) - 55;
    const rz = ((i * 53) % 110) - 55;
    if (Math.hypot(rx, rz) < 10) continue;
    const ry = terrainHeightAt(rx, rz, isExtreme);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(rx, ry + 0.6, rz);
    rock.castShadow = true;
    scene.add(rock);
    boulders.push({ pos: rock.position.clone(), r: 1.9 });
  }

  // 4x4 Offroad Truck
  const truck = buildCarModel(isExtreme ? 0xea580c : 0xd97706, 'offroad');
  truck.group.position.set(0, terrainHeightAt(0, 0, isExtreme), 0);
  scene.add(truck.group);

  // Mountain Checkpoints
  const checkpoints: [number, number][] = [
    [16, -22],
    [-20, -34],
    [-42, -8],
    [-28, 28],
    [12, 36],
    [42, 16],
    [52, -32],
  ];
  let cpIdx = 0;

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 12, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    }),
  );
  const updateMarker = () => {
    const [cx, cz] = checkpoints[cpIdx];
    const cy = terrainHeightAt(cx, cz, isExtreme);
    marker.position.set(cx, cy + 6, cz);
  };
  updateMarker();
  scene.add(marker);

  let speed = 0;
  let yaw = 0;
  let score = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;

  soundEngine.startMusic('action');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    const snap = input.getSnapshot();

    const lowGear = snap.sprint;
    const maxSpd = lowGear ? 20 : 28;
    const power = lowGear ? 32 : 22;

    if (snap.moveY > 0.05) speed += power * snap.moveY * dt;
    else if (snap.moveY < -0.05) speed += power * snap.moveY * dt;
    else speed = THREE.MathUtils.damp(speed, 0, 2.0, dt);

    if (snap.action) speed = THREE.MathUtils.damp(speed, 0, 5.5, dt);
    speed = THREE.MathUtils.clamp(speed, -12, maxSpd);

    const turnFactor = Math.min(1, Math.abs(speed) / 4);
    yaw -= snap.moveX * 2.0 * turnFactor * (speed >= -0.1 ? 1 : -1) * dt;

    const nx = THREE.MathUtils.clamp(
      truck.group.position.x + Math.sin(yaw) * speed * dt,
      -76,
      76,
    );
    const nz = THREE.MathUtils.clamp(
      truck.group.position.z + Math.cos(yaw) * speed * dt,
      -76,
      76,
    );

    // Boulder bump check
    let blocked = false;
    for (const b of boulders) {
      if ((nx - b.pos.x) ** 2 + (nz - b.pos.z) ** 2 < b.r * b.r) {
        blocked = true;
        speed = -speed * 0.4;
        soundEngine.playBump();
        break;
      }
    }

    if (!blocked) {
      truck.group.position.x = nx;
      truck.group.position.z = nz;
    }

    const hCenter = terrainHeightAt(
      truck.group.position.x,
      truck.group.position.z,
      isExtreme,
    );
    const hFront = terrainHeightAt(
      truck.group.position.x + Math.sin(yaw) * 1.5,
      truck.group.position.z + Math.cos(yaw) * 1.5,
      isExtreme,
    );
    const hRight = terrainHeightAt(
      truck.group.position.x + Math.cos(yaw) * 1.0,
      truck.group.position.z - Math.sin(yaw) * 1.0,
      isExtreme,
    );

    truck.group.position.y = THREE.MathUtils.damp(
      truck.group.position.y,
      hCenter,
      12,
      dt,
    );

    // Pitch & roll suspension feel
    const pitch = Math.atan2(hCenter - hFront, 1.5);
    const roll = Math.atan2(hRight - hCenter, 1.0);
    truck.group.rotation.order = 'YXZ';
    truck.group.rotation.y = yaw;
    truck.group.rotation.x = THREE.MathUtils.damp(truck.group.rotation.x, pitch, 8, dt);
    truck.group.rotation.z = THREE.MathUtils.damp(truck.group.rotation.z, roll, 8, dt);

    truck.wheels.forEach((w) => {
      w.rotation.x += speed * dt * 1.4;
    });

    // Checkpoint arrival
    const [tx, tz] = checkpoints[cpIdx];
    if ((truck.group.position.x - tx) ** 2 + (truck.group.position.z - tz) ** 2 < 18) {
      score += 180;
      soundEngine.playCollect();
      particles.spawnBurst(truck.group.position, 0xfacc15, 16);
      cpIdx += 1;
      if (cpIdx >= checkpoints.length) {
        finished = true;
        soundEngine.stopMusic();
        soundEngine.playVictory();
        callbacks.onFinish({
          won: true,
          score: score + Math.max(0, Math.round(450 - elapsed * 3)),
          durationSeconds: elapsed,
          summaryText: `Tabriklaymiz! Barcha ${checkpoints.length} ta tog‘ dovoni bosib o‘tildi!`,
        });
        return;
      }
      updateMarker();
    }

    particles.update(dt);

    const desiredCam = new THREE.Vector3(
      truck.group.position.x - Math.sin(yaw) * 11,
      truck.group.position.y + 5.6,
      truck.group.position.z - Math.cos(yaw) * 11,
    );
    camera.position.lerp(desiredCam, 1 - Math.exp(-7 * dt));
    camera.lookAt(
      truck.group.position.x,
      truck.group.position.y + 1.5,
      truck.group.position.z,
    );

    hudTimer += dt;
    if (hudTimer >= 0.09) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score,
        elapsedTime: elapsed,
        speedKmh: Math.round(Math.abs(speed) * 3.5),
        primaryLabel: `Dovon: ${cpIdx + 1}/${checkpoints.length}`,
        secondaryLabel: lowGear ? '4x4 Kuchli rejim' : `${Math.round(Math.abs(speed) * 3.5)} km/soat`,
        missionPrompt: isExtreme
          ? "Qoyalardan chetlanib sariq mayoq tomon ko‘tariling! (Shift — 4x4)"
          : "Tog‘ yo‘llaridan o‘tib barcha 7 ta nazorat nuqtasiga yeting!",
        actionButtonLabel: 'Tormoz',
      });
    }
  });

  return {
    setPaused: (p) => {
      paused = p;
    },
    triggerAction: (a) => input.pulseAction(a),
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

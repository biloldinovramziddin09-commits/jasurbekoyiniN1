import * as THREE from 'three';
import {
  buildCharacterModel,
  createContactShadow,
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

export function initFootballGame(
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
): GameControllerHandle {
  const isPro = meta.id === 'football-pro-3d' || meta.id === 'football-manager-3d';
  const isManager = meta.id === 'football-manager-3d';

  const { scene, camera, renderer, isSoftwareGl, disposeAll } = setupThreeWorld(
    container,
    quality,
    {
      skyColor: isPro ? 0x0f172a : 0x38bdf8,
      fogNear: 50,
      fogFar: 150,
      sunColor: 0xfffbeb,
      sunIntensity: 1.5,
    },
  );

  const input = new UnifiedInputManager(renderer.domElement);
  const particles = new ParticleBurstManager(scene);

  // Pitch dimensions: X [-26, 26], Z [-16, 16]
  const pitchW = 52;
  const pitchH = 32;

  const pitchTex = createProceduralTexture('pitch', renderer, 2, 1);
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(pitchW, pitchH),
    new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.85 }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Stadium outer turf & low stands
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 80),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }),
  );
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.04;
  scene.add(surround);

  const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  [
    [0, 2, -21, 56, 4, 4],
    [0, 2, 21, 56, 4, 4],
  ].forEach(([x, y, z, w, h, d]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), standMat);
    s.position.set(x, y, z);
    scene.add(s);
  });

  // Goals at X = -26 (Home / Player defends) and X = +26 (Away / Player attacks)
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.3 });
  const buildGoal = (xPos: number, dir: number) => {
    const g = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 10);
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(0, 1.6, -3.6);
    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(0, 1.6, 3.6);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.4, 10), postMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 3.2, 0);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 3.1, 7.1),
      new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      }),
    );
    net.position.set(dir * 0.9, 1.55, 0);
    g.add(p1, p2, bar, net);
    g.position.set(xPos, 0, 0);
    scene.add(g);
  };
  buildGoal(-pitchW / 2, -1);
  buildGoal(pitchW / 2, 1);

  // Ball
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
  );
  ball.position.set(0, 0.45, 0);
  ball.castShadow = true;
  ball.add(createContactShadow(0.6, 0.35));
  scene.add(ball);
  const ballVel = new THREE.Vector3();

  // Player (Blue)
  const player = buildCharacterModel(0x2563eb, 0xfacc15);
  player.group.position.set(-8, 0, 0);
  scene.add(player.group);

  // Teammates & Opponents
  interface AiPlayer {
    rig: ReturnType<typeof buildCharacterModel>;
    homePos: THREE.Vector3;
    team: 'home' | 'away';
    role: 'gk' | 'field';
  }
  const aiPlayers: AiPlayer[] = [];

  const allyForwardPos =
    isManager && options.tactic === 'attacking'
      ? new THREE.Vector3(6, 0, -6)
      : isManager && options.tactic === 'defensive'
        ? new THREE.Vector3(-12, 0, -5)
        : new THREE.Vector3(-2, 0, -6);

  const allyDefs: { pos: THREE.Vector3; role: 'gk' | 'field' }[] = [
    { pos: new THREE.Vector3(-23.5, 0, 0), role: 'gk' },
    { pos: allyForwardPos, role: 'field' },
  ];
  allyDefs.forEach((d) => {
    const rig = buildCharacterModel(0x2563eb, 0x38bdf8);
    rig.group.position.copy(d.pos);
    scene.add(rig.group);
    aiPlayers.push({ rig, homePos: d.pos, team: 'home', role: d.role });
  });

  const awayDefs: { pos: THREE.Vector3; role: 'gk' | 'field' }[] = [
    { pos: new THREE.Vector3(23.5, 0, 0), role: 'gk' },
    { pos: new THREE.Vector3(8, 0, 5), role: 'field' },
    { pos: new THREE.Vector3(5, 0, -5), role: 'field' },
  ];
  awayDefs.forEach((d) => {
    const rig = buildCharacterModel(0xef4444, 0xf8fafc);
    rig.group.position.copy(d.pos);
    scene.add(rig.group);
    aiPlayers.push({ rig, homePos: d.pos, team: 'away', role: d.role });
  });

  const aiSpeed =
    options.difficulty === 'easy'
      ? 5.2
      : options.difficulty === 'hard'
        ? 8.5
        : 6.8;

  let homeScore = 0;
  let awayScore = 0;
  let timeRemaining = isPro ? 120 : 90;
  let kickCooldown = 0;
  let paused = false;
  let finished = false;
  let elapsed = 0;
  let hudTimer = 0;
  let goalBannerTimer = 0;

  const resetPositions = () => {
    ball.position.set(0, 0.45, 0);
    ballVel.set(0, 0, 0);
    player.group.position.set(-8, 0, 0);
    aiPlayers.forEach((a) => a.rig.group.position.copy(a.homePos));
  };

  soundEngine.startMusic('action');
  callbacks.onReady();

  const stopLoop = startGameLoop(renderer, scene, camera, isSoftwareGl, (dt) => {
    if (paused || finished) return;
    elapsed += dt;
    timeRemaining = Math.max(0, timeRemaining - dt);
    kickCooldown = Math.max(0, kickCooldown - dt);
    goalBannerTimer = Math.max(0, goalBannerTimer - dt);

    const snap = input.getSnapshot();
    const moveSpeed = snap.sprint ? 12.2 : 8.8;
    const vx = snap.moveX * moveSpeed;
    const vz = -snap.moveY * moveSpeed;
    player.group.position.x = THREE.MathUtils.clamp(
      player.group.position.x + vx * dt,
      -pitchW / 2 + 1,
      pitchW / 2 - 1,
    );
    player.group.position.z = THREE.MathUtils.clamp(
      player.group.position.z + vz * dt,
      -pitchH / 2 + 1,
      pitchH / 2 - 1,
    );

    if (Math.abs(vx) > 0.2 || Math.abs(vz) > 0.2) {
      player.group.rotation.y = Math.atan2(vx, vz);
      const sw = Math.sin(elapsed * 12) * 0.5;
      player.leftLeg.rotation.x = sw;
      player.rightLeg.rotation.x = -sw;
    }

    // Dribble / Kick ball
    const distToBall = player.group.position.distanceTo(ball.position);
    if (distToBall < 1.55) {
      const pushDir = new THREE.Vector3()
        .subVectors(ball.position, player.group.position)
        .setY(0);
      if (pushDir.lengthSq() < 0.001) pushDir.set(1, 0, 0);
      pushDir.normalize();

      if ((snap.action || snap.jump) && kickCooldown <= 0) {
        kickCooldown = 0.35;
        ballVel.copy(pushDir).multiplyScalar(23);
        ballVel.y = 4.2;
        soundEngine.playKick();
        particles.spawnBurst(ball.position, 0xfacc15, 8);
      } else {
        ballVel.x = pushDir.x * moveSpeed * 1.15;
        ballVel.z = pushDir.z * moveSpeed * 1.15;
      }
    }

    // AI movement
    aiPlayers.forEach((ai) => {
      const target = new THREE.Vector3();
      if (ai.role === 'gk') {
        target.set(
          ai.homePos.x,
          0,
          THREE.MathUtils.clamp(ball.position.z, -3.2, 3.2),
        );
      } else {
        const distBall = ai.rig.group.position.distanceTo(ball.position);
        if (distBall < 18) {
          target.copy(ball.position);
        } else {
          target.copy(ai.homePos);
        }
      }
      const dir = new THREE.Vector3().subVectors(target, ai.rig.group.position).setY(0);
      if (dir.length() > 0.4) {
        dir.normalize();
        const spd = ai.team === 'home' ? aiSpeed * 0.95 : aiSpeed;
        ai.rig.group.position.addScaledVector(dir, spd * dt);
        ai.rig.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      if (ai.rig.group.position.distanceTo(ball.position) < 1.45) {
        const kickTarget = ai.team === 'home' ? 26 : -26;
        const kDir = new THREE.Vector3(kickTarget - ball.position.x, 0, (Math.random() - 0.5) * 4).normalize();
        ballVel.copy(kDir).multiplyScalar(15);
        soundEngine.playKick();
      }
    });

    // Ball physics
    ball.position.addScaledVector(ballVel, dt);
    ballVel.x *= Math.exp(-1.5 * dt);
    ballVel.z *= Math.exp(-1.5 * dt);
    if (ball.position.y > 0.45 || ballVel.y > 0) {
      ballVel.y -= 18 * dt;
      if (ball.position.y <= 0.45 && ballVel.y < 0) {
        ball.position.y = 0.45;
        ballVel.y = -ballVel.y * 0.45;
        if (Math.abs(ballVel.y) < 0.8) ballVel.y = 0;
      }
    }
    ball.rotation.z -= ballVel.x * dt * 1.4;
    ball.rotation.x += ballVel.z * dt * 1.4;

    // Sideline bounces
    if (ball.position.z > pitchH / 2 - 0.5 || ball.position.z < -pitchH / 2 + 0.5) {
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -pitchH / 2 + 0.5, pitchH / 2 - 0.5);
      ballVel.z *= -0.75;
    }

    // Goal detection (Z in [-3.5, 3.5])
    if (ball.position.x > pitchW / 2 - 0.2) {
      if (Math.abs(ball.position.z) < 3.6) {
        homeScore += 1;
        goalBannerTimer = 2.0;
        soundEngine.playVictory();
        particles.spawnBurst(ball.position, 0x38bdf8, 22);
        resetPositions();
      } else {
        ball.position.x = pitchW / 2 - 0.5;
        ballVel.x *= -0.75;
      }
    } else if (ball.position.x < -pitchW / 2 + 0.2) {
      if (Math.abs(ball.position.z) < 3.6) {
        awayScore += 1;
        goalBannerTimer = 2.0;
        soundEngine.playBump();
        resetPositions();
      } else {
        ball.position.x = -pitchW / 2 + 0.5;
        ballVel.x *= -0.75;
      }
    }

    particles.update(dt);

    // Broadcast-angle camera tracking ball & player
    const focusX = (player.group.position.x + ball.position.x) * 0.5;
    const focusZ = (player.group.position.z + ball.position.z) * 0.5;
    camera.position.lerp(new THREE.Vector3(focusX - 6, 17, focusZ + 20), 1 - Math.exp(-5 * dt));
    camera.lookAt(focusX, 0.5, focusZ);

    if (timeRemaining <= 0) {
      finished = true;
      soundEngine.stopMusic();
      const won = homeScore >= awayScore;
      if (won) soundEngine.playVictory();
      else soundEngine.playGameOver();
      const finalPts = Math.max(50, homeScore * 250 - awayScore * 50 + (won ? 200 : 0));
      callbacks.onFinish({
        won,
        score: finalPts,
        durationSeconds: elapsed,
        summaryText: `Hisob: Siz ${homeScore} — ${awayScore} Raqib. ${won ? 'Ajoyib g‘alaba!' : 'Keyingi safar albatta yutasiz!'}`,
      });
      return;
    }

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      callbacks.onHudUpdate({
        score: homeScore * 250,
        timeRemaining,
        primaryLabel: `Siz ${homeScore} : ${awayScore} Raqib`,
        secondaryLabel: isManager ? `Taktika: ${options.tactic.toUpperCase()}` : undefined,
        missionPrompt:
          goalBannerTimer > 0
            ? 'GOOOOL! Ajoyib zarba!'
            : "O‘ng darvozaga gol uring! (Probel — Zarba, Shift — Sprint)",
        actionButtonLabel: 'Zarba',
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

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality } from '@/src/types/platform';

export const _vec3A = new THREE.Vector3();
export const _vec3B = new THREE.Vector3();
export const _vec3C = new THREE.Vector3();
export const _mat4 = new THREE.Matrix4();
export const _quat = new THREE.Quaternion();

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface SceneSetupResult {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  sunLight: THREE.DirectionalLight;
  disposeAll: () => void;
}

export function setupThreeWorld(
  container: HTMLElement,
  quality: GraphicsQuality,
  options: {
    skyColor: number;
    fogDensity?: number;
    fogNear?: number;
    fogFar?: number;
    fov?: number;
    far?: number;
    sunColor?: number;
    sunIntensity?: number;
    hemiSky?: number;
    hemiGround?: number;
  },
): SceneSetupResult {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(container.clientHeight, 240);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.skyColor);
  if (options.fogDensity) {
    scene.fog = new THREE.FogExp2(options.skyColor, options.fogDensity);
  } else {
    scene.fog = new THREE.Fog(
      options.skyColor,
      options.fogNear ?? 45,
      options.fogFar ?? 180,
    );
  }

  const camera = new THREE.PerspectiveCamera(
    options.fov ?? 62,
    width / height,
    0.1,
    options.far ?? 400,
  );
  camera.position.set(0, 8, 14);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && quality !== 'low',
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const maxDpr =
    isSoftwareGl || quality === 'low'
      ? 1
      : quality === 'medium'
        ? Math.min(window.devicePixelRatio, 1.5)
        : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(maxDpr);

  const shadowsEnabled = !isSoftwareGl && quality !== 'low';
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // Studio environment reflection via RoomEnvironment (with safe fallback)
  let envTexture: THREE.Texture | null = null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();
  } catch {
    envTexture = null;
  }

  // Warm/Cool 3-point lighting rig
  const hemi = new THREE.HemisphereLight(
    options.hemiSky ?? 0x93c5fd,
    options.hemiGround ?? 0x334155,
    0.85,
  );
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight(
    options.sunColor ?? 0xfff5e4,
    options.sunIntensity ?? 1.45,
  );
  sunLight.position.set(35, 55, 28);
  if (shadowsEnabled) {
    sunLight.castShadow = true;
    const mapSize = quality === 'high' ? 2048 : 1024;
    sunLight.shadow.mapSize.set(mapSize, mapSize);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    const d = 48;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.45);
  rimLight.position.set(-28, 20, -32);
  scene.add(rimLight);

  const onResize = () => {
    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => onResize())
      : null;
  resizeObserver?.observe(container);

  const disposeAll = () => {
    window.removeEventListener('resize', onResize);
    resizeObserver?.disconnect();
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            disposeMaterialTextures(m);
            m.dispose();
          });
        } else if (mesh.material) {
          disposeMaterialTextures(mesh.material);
          mesh.material.dispose();
        }
      }
    });
    envTexture?.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return { scene, camera, renderer, isSoftwareGl, sunLight, disposeAll };
}

function disposeMaterialTextures(mat: THREE.Material) {
  const std = mat as THREE.MeshStandardMaterial;
  std.map?.dispose();
  std.roughnessMap?.dispose();
  std.normalMap?.dispose();
  std.emissiveMap?.dispose();
}

export function startGameLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  isSoftwareGl: boolean,
  onStep: (dt: number, elapsed: number) => void,
): () => void {
  let frameId = 0;
  let stopped = false;
  const clock = new THREE.Clock();

  if (!isSoftwareGl) {
    try {
      renderer.compile(scene, camera);
    } catch {
      // Safe fallback
    }
  }

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (stopped) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 70);
        }
      };
      frameId = window.setTimeout(poll, 5);
    } else {
      frameId = window.setTimeout(cb, 80);
    }
  }

  function tick() {
    if (stopped) return;
    const rawDelta = clock.getDelta();
    const dt = Math.min(Math.max(rawDelta, 0.001), 0.08);
    const elapsed = clock.elapsedTime;
    onStep(dt, elapsed);
    renderer.render(scene, camera);
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  // Render first frame immediately so screen is never blank
  onStep(0.016, 0);
  renderer.render(scene, camera);

  if (isSoftwareGl) {
    frameId = window.setTimeout(tick, 16);
  } else {
    frameId = requestAnimationFrame(tick);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(frameId);
    window.clearTimeout(frameId);
  };
}

// ==================== PROCEDURAL TEXTURES ====================

export function createProceduralTexture(
  kind:
    | 'grass'
    | 'asphalt'
    | 'pitch'
    | 'sand'
    | 'grid'
    | 'wood'
    | 'voxel-grass'
    | 'checker',
  renderer: THREE.WebGLRenderer,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'grass') {
    ctx.fillStyle = '#3b8c47';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#4ca358' : '#2f763a';
      ctx.fillRect(
        (i * 73) % 256,
        (i * 137) % 256,
        3,
        6,
      );
    }
  } else if (kind === 'asphalt') {
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      const shade = 26 + (i % 18);
      ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
      ctx.fillRect((i * 59) % 256, (i * 97) % 256, 2, 2);
    }
    // Subtle lane dash
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(124, 16, 8, 72);
    ctx.fillRect(124, 144, 8, 72);
  } else if (kind === 'pitch') {
    ctx.fillStyle = '#1f8a4c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#259b56';
    for (let y = 0; y < 256; y += 32) {
      if ((y / 32) % 2 === 0) ctx.fillRect(0, y, 256, 32);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.beginPath();
    ctx.moveTo(8, 128);
    ctx.lineTo(248, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 32, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'sand') {
    ctx.fillStyle = '#b48a5a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c99f6d' : '#966d42';
      ctx.fillRect((i * 83) % 256, (i * 131) % 256, 4, 3);
    }
  } else if (kind === 'grid') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  } else if (kind === 'wood') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#73471e';
    for (let y = 0; y < 256; y += 16) {
      ctx.fillRect(0, y, 256, 3);
    }
  } else if (kind === 'voxel-grass') {
    ctx.fillStyle = '#48a842';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      for (let y = 0; y < 256; y += 32) {
        ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? '#52b84b' : '#3e9639';
        ctx.fillRect(x, y, 32, 32);
      }
    }
  } else if (kind === 'checker') {
    for (let x = 0; x < 256; x += 32) {
      for (let y = 0; y < 256; y += 32) {
        ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? '#f8fafc' : '#0f172a';
        ctx.fillRect(x, y, 32, 32);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

// ==================== CONTACT SHADOW ====================

export function createContactShadow(radius = 1.4, opacity = 0.4): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

// ==================== COMPOSITE 3D MODELS (3–12 PARTS) ====================

export interface VehicleRig {
  group: THREE.Group;
  wheels: THREE.Object3D[];
}

export function buildCarModel(
  bodyColor: number,
  style: 'cute' | 'super' | 'gt' | 'offroad' = 'super',
): VehicleRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: style === 'cute' ? 0.15 : 0.65,
    roughness: style === 'cute' ? 0.42 : 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.12,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.4,
    roughness: 0.72,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });

  const isOffroad = style === 'offroad';
  const isCute = style === 'cute';
  const rideHeight = isOffroad ? 0.55 : 0.36;
  const wheelRadius = isOffroad ? 0.48 : isCute ? 0.34 : 0.36;

  // 1. Chassis lower hull
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(isOffroad ? 2.0 : 1.85, isOffroad ? 0.72 : 0.54, 4.0),
    bodyMat,
  );
  hull.position.y = rideHeight + 0.28;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2. Cabin / Roof
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(isOffroad ? 1.72 : 1.5, isCute ? 0.58 : 0.52, isOffroad ? 2.1 : 1.85),
    bodyMat,
  );
  cabin.position.set(0, rideHeight + (isOffroad ? 0.92 : 0.78), -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // 3. Windshield + rear glass wrap
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(isOffroad ? 1.56 : 1.38, 0.38, isOffroad ? 1.92 : 1.68),
    glassMat,
  );
  windshield.position.set(0, rideHeight + (isOffroad ? 0.9 : 0.76), -0.15);
  group.add(windshield);

  // 4. Front bumper & grille
  const frontBumper = new THREE.Mesh(
    new THREE.BoxGeometry(isOffroad ? 2.08 : 1.9, 0.22, 0.28),
    trimMat,
  );
  frontBumper.position.set(0, rideHeight + 0.12, 2.02);
  group.add(frontBumper);

  // 5-6. Headlights
  [-0.62, 0.62].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.12), headlightMat);
    hl.position.set(x, rideHeight + 0.34, 2.02);
    group.add(hl);
  });

  // 7-8. Taillights
  [-0.62, 0.62].forEach((x) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.1), taillightMat);
    tl.position.set(x, rideHeight + 0.36, -2.01);
    group.add(tl);
  });

  // 9. Spoiler (GT/Super) or Rollbar/Rack (Offroad)
  if (style === 'gt' || style === 'super') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 0.36), trimMat);
    wing.position.set(0, rideHeight + 0.86, -1.75);
    wing.castShadow = true;
    group.add(wing);
    [-0.55, 0.55].forEach((x) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.14), trimMat);
      strut.position.set(x, rideHeight + 0.68, -1.75);
      group.add(strut);
    });
  } else if (isOffroad) {
    const roofBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.22), trimMat);
    roofBar.position.set(0, rideHeight + 1.24, 0.6);
    group.add(roofBar);
  }

  // 10-13. 4 Composite Wheel Groups
  const wheelCoords: [number, number][] = [
    [-0.98, 1.28],
    [0.98, 1.28],
    [-0.98, -1.28],
    [0.98, -1.28],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wheelRadius, wz);

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, isOffroad ? 0.38 : 0.28, 18),
      tireMat,
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, isOffroad ? 0.4 : 0.3, 12),
      rimMat,
    );
    rim.rotation.z = Math.PI / 2;
    wGroup.add(rim);

    group.add(wGroup);
    wheels.push(wGroup);
  });

  group.add(createContactShadow(2.2, 0.42));
  return { group, wheels };
}

export function buildCharacterModel(
  shirtColor: number,
  accentColor = 0xfbbf24,
): { group: THREE.Group; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd5b5, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, metalness: 0.2 });

  const legGeo = new THREE.BoxGeometry(0.24, 0.55, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.16, 0.28, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.16, 0.28, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.34), shirtMat);
  torso.position.y = 0.88;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.y = 1.48;
  head.castShadow = true;
  group.add(head);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.52), accentMat);
  cap.position.set(0, 1.72, 0.04);
  group.add(cap);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  [-0.1, 0.1].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), eyeMat);
    eye.position.set(ex, 1.5, 0.23);
    group.add(eye);
  });

  const armGeo = new THREE.BoxGeometry(0.18, 0.54, 0.18);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.44, 0.88, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.44, 0.88, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  group.add(createContactShadow(0.65, 0.38));
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function buildAnimalModel(
  kind: 'bunny' | 'bear' | 'duck' | 'puppy' | 'lamb',
): THREE.Group {
  const group = new THREE.Group();
  const palette: Record<typeof kind, number> = {
    bunny: 0xf8fafc,
    bear: 0xb45309,
    duck: 0xfacc15,
    puppy: 0xd97706,
    lamb: 0xf1f5f9,
  };
  const mainMat = new THREE.MeshStandardMaterial({
    color: palette[kind],
    roughness: 0.72,
  });
  const detailMat = new THREE.MeshStandardMaterial({
    color: kind === 'duck' ? 0xf97316 : kind === 'bunny' ? 0xf472b6 : 0x451a03,
    roughness: 0.6,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.15), mainMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.65), mainMat);
  head.position.set(0, 1.18, 0.58);
  head.castShadow = true;
  group.add(head);

  // Eyes
  [-0.16, 0.16].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
    eye.position.set(ex, 1.24, 0.91);
    group.add(eye);
  });

  // Ears or Beak
  if (kind === 'bunny') {
    [-0.16, 0.16].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.12), mainMat);
      ear.position.set(ex, 1.72, 0.52);
      group.add(ear);
    });
  } else if (kind === 'duck') {
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.3), detailMat);
    beak.position.set(0, 1.12, 0.98);
    group.add(beak);
  } else {
    [-0.24, 0.24].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.14), detailMat);
      ear.position.set(ex, 1.52, 0.55);
      group.add(ear);
    });
  }

  // 4 legs
  [
    [-0.28, 0.35],
    [0.28, 0.35],
    [-0.28, -0.35],
    [0.28, -0.35],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), mainMat);
    leg.position.set(lx, 0.21, lz);
    group.add(leg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), detailMat);
  tail.position.set(0, 0.78, -0.66);
  group.add(tail);

  group.add(createContactShadow(0.85, 0.35));
  return group;
}

export function buildDinosaurModel(colorHex: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
  const crestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 2.0), bodyMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.65), bodyMat);
  neck.position.set(0, 1.85, 0.85);
  neck.rotation.x = 0.25;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 1.05), bodyMat);
  head.position.set(0, 2.25, 1.25);
  head.castShadow = true;
  group.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.8, 6), bodyMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 1.05, -1.75);
  group.add(tail);

  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), crestMat);
    plate.position.set(0, 1.72, 0.6 - i * 0.48);
    group.add(plate);
  }

  [-0.36, 0.36].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), eyeMat);
    eye.position.set(ex, 2.34, 1.55);
    group.add(eye);
  });

  [
    [-0.42, 0.6],
    [0.42, 0.6],
    [-0.42, -0.6],
    [0.42, -0.6],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.34), bodyMat);
    leg.position.set(lx, 0.36, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  group.add(createContactShadow(1.4, 0.4));
  return group;
}

export function buildRocketModel(accentColor = 0xf97316): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    metalness: 0.55,
    roughness: 0.28,
    clearcoat: 0.8,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.35,
    roughness: 0.35,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.8,
  });

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 2.4, 14), hullMat);
  hull.rotation.x = Math.PI / 2;
  group.add(hull);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 14), accentMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.75;
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), visorMat);
  canopy.position.set(0, 0.34, 0.5);
  group.add(canopy);

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.75), accentMat);
    fin.position.set(Math.sin(angle) * 0.72, Math.cos(angle) * 0.72, -0.85);
    fin.rotation.z = -angle;
    group.add(fin);
  }

  const glow = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.9, 12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.z = -1.55;
  group.add(glow);

  return group;
}

export function buildRobotBot(teamColor: number): THREE.Group {
  const group = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({
    color: teamColor,
    metalness: 0.6,
    roughness: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.6,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: teamColor,
    emissiveIntensity: 1.4,
  });

  [-0.22, 0.22].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.28), darkMat);
    leg.position.set(lx, 0.35, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.85, 0.52), armorMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.5), armorMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.08), visorMat);
  visor.position.set(0, 1.84, 0.25);
  group.add(visor);

  const blaster = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), darkMat);
  blaster.rotation.x = Math.PI / 2;
  blaster.position.set(0.55, 1.15, 0.35);
  group.add(blaster);

  group.add(createContactShadow(0.75, 0.38));
  return group;
}

export function buildCartoonZombie(): THREE.Group {
  const group = new THREE.Group();
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.7 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.65 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  [-0.18, 0.18].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.24), clothMat);
    leg.position.set(lx, 0.32, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.78, 0.38), clothMat);
  torso.position.y = 1.04;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.54), greenMat);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);

  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.05), eyeMat);
    eye.position.set(ex, 1.76, 0.27);
    group.add(eye);
  });

  [-0.46, 0.46].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.68), greenMat);
    arm.position.set(ax, 1.25, 0.35);
    group.add(arm);
  });

  group.add(createContactShadow(0.7, 0.35));
  return group;
}

export function buildTreeModel(kind: 'pine' | 'apple' | 'palm' = 'apple'): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });

  if (kind === 'pine') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 2.0, 8), trunkMat);
    trunk.position.y = 1.0;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    [
      [1.7, 2.2, 2.4],
      [1.25, 3.2, 1.9],
      [0.8, 4.1, 1.4],
    ].forEach(([r, y, h]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), leafMat);
      cone.position.y = y;
      cone.castShadow = true;
      group.add(cone);
    });
  } else if (kind === 'palm') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 4.0, 8), trunkMat);
    trunk.position.y = 2.0;
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    group.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 2.2), frondMat);
      const a = (i * Math.PI * 2) / 6;
      frond.position.set(Math.sin(a) * 0.9 - 0.15, 3.9, Math.cos(a) * 0.9);
      frond.rotation.y = a;
      frond.rotation.x = 0.25;
      group.add(frond);
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.2, 8), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.45, 10, 8), canopyMat);
    c1.position.y = 3.0;
    c1.castShadow = true;
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), canopyMat);
    c2.position.set(0.75, 2.6, 0.4);
    group.add(c2);
  }

  return group;
}

// ==================== PARTICLE BURST HELPER ====================

interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleBurstManager {
  private particles: ParticleItem[] = [];
  private scene: THREE.Scene;
  private geo: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  }

  public spawnBurst(pos: THREE.Vector3, colorHex: number, count = 12) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 5.0,
        Math.sin(angle) * speed,
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0, maxLife: 0.6 + Math.random() * 0.35 });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const s = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, s));
    }
  }

  public dispose() {
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
    this.geo.dispose();
  }
}

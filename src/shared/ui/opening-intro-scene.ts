import * as THREE from "three";

export type IntroSceneOptions = {
  canvas: HTMLCanvasElement;
  durationMs: number;
  lowPower?: boolean;
  /** Fired once when the seal lifts and the HTML wordmark should appear */
  onReveal?: () => void;
  onComplete: () => void;
};

export type IntroSceneHandle = {
  dispose: () => void;
};

const EMERALD = 0x3ddc97;
const EMERALD_LIGHT = 0x7af0d0;
const INK = 0x121a2b;
const GOLD = 0xc9a227;

const RING_R = 1.05;
const BUILD_END = 0.72;
const LIFT_START = 0.7;
const LIFT_END = 0.86;
const LABEL_AT = 0.76;
const CRISP_AT = 0.82;
const LIFT_RATIO = 0.07;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function segment(t: number, a: number, b: number) {
  return clamp01((t - a) / (b - a));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBackSoft(t: number) {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function createRingGeometry(lowPower: boolean) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, RING_R, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, RING_R * 0.72, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const depth = 0.22;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: lowPower ? 2 : 4,
    curveSegments: lowPower ? 48 : 96,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function createDiscGeometry(lowPower: boolean) {
  return new THREE.CircleGeometry(RING_R * 0.68, lowPower ? 64 : 96);
}

function createEnvMap() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const elev = y / size;
      const band = 0.25 + 0.75 * Math.max(0, Math.sin(u * Math.PI * 2));
      const sky = 0.05 + elev * 0.5;
      const strip = Math.exp(-Math.pow((elev - 0.72) * 14, 2)) * 0.9;
      const light = Math.min(1, sky * band + strip);
      data[i] = Math.floor(12 + 180 * light);
      data[i + 1] = Math.floor(40 + 210 * light);
      data[i + 2] = Math.floor(50 + 190 * light);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function createMetal(color: number, roughness: number, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.88,
    roughness,
    emissive,
    emissiveIntensity: 0,
    envMapIntensity: 1,
    transparent: true,
    opacity: 0,
  });
}

function setOpacity(material: THREE.MeshStandardMaterial, opacity: number) {
  material.opacity = opacity;
  material.depthWrite = opacity > 0.95;
}

/**
 * QuoteSeal emblem only: wax-seal ring drops and stamps, specular sweep,
 * then lifts and crossfades to a crisp DOM SVG mark (no canvas wordmark).
 */
export function mountIntroScene(options: IntroSceneOptions): IntroSceneHandle {
  const { canvas, durationMs, onComplete, onReveal, lowPower = false } = options;

  const dprCap = lowPower ? 1.75 : 3;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const envMap = createEnvMap();
  scene.environment = envMap;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const baseCameraZ = { value: 6.2 };
  const liftWorld = { value: 0 };

  scene.add(new THREE.AmbientLight(0x0e2a2e, 0.55));
  const key = new THREE.DirectionalLight(0xd8fff4, 1.4);
  key.position.set(-2.2, 3.4, 4.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x3f8a8c, 0.35);
  fill.position.set(3.2, -1.2, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9af0d6, 0.5);
  rim.position.set(0.2, 1.4, -3.2);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  const stampPivot = new THREE.Group();
  root.add(stampPivot);

  const ringGeo = createRingGeometry(lowPower);
  const ringMat = createMetal(EMERALD, 0.28, 0x0d3f3a);
  stampPivot.add(new THREE.Mesh(ringGeo, ringMat));

  const discGeo = createDiscGeometry(lowPower);
  const discMat = createMetal(INK, 0.45, 0x0a1620);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.z = 0.02;
  stampPivot.add(disc);

  const beadGeo = new THREE.TorusGeometry(
    RING_R * 0.9,
    0.035,
    lowPower ? 12 : 16,
    lowPower ? 64 : 128,
  );
  const beadMat = createMetal(GOLD, 0.35, 0x4a3808);
  const bead = new THREE.Mesh(beadGeo, beadMat);
  bead.rotation.x = Math.PI / 2;
  stampPivot.add(bead);

  const coreGeo = new THREE.CircleGeometry(RING_R * 0.28, lowPower ? 48 : 64);
  const coreMat = createMetal(EMERALD_LIGHT, 0.2, 0x2fa98f);
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.z = 0.05;
  stampPivot.add(core);

  const sweepUniforms = {
    uProgress: { value: -1 },
    uOpacity: { value: 0 },
    uRadius: { value: RING_R * 1.35 },
  };
  const sweepMat = new THREE.ShaderMaterial({
    uniforms: sweepUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vLocal;
      void main() {
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uProgress;
      uniform float uOpacity;
      uniform float uRadius;
      varying vec2 vLocal;
      void main() {
        float discMask = 1.0 - smoothstep(uRadius * 0.85, uRadius, length(vLocal));
        if (discMask <= 0.001 || uOpacity <= 0.001) discard;
        float band = vLocal.x * 0.82 + vLocal.y * 0.38;
        float d = abs(band - uProgress);
        float streak = (exp(-d * d * 22.0) * 1.1 + exp(-d * d * 5.0) * 0.4) * discMask * uOpacity;
        vec3 tint = vec3(0.82, 1.0, 0.95);
        gl_FragColor = vec4(tint * streak, min(1.0, streak));
      }
    `,
  });
  const sweepGeo = new THREE.PlaneGeometry(RING_R * 3.0, RING_R * 3.0);
  const sweep = new THREE.Mesh(sweepGeo, sweepMat);
  sweep.position.z = 0.18;
  sweep.renderOrder = 10;
  sweep.visible = false;
  root.add(sweep);

  const materials = [ringMat, discMat, beadMat, coreMat];

  const resize = () => {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    const aspect = w / Math.max(h, 1);
    camera.aspect = aspect;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitHeight = (RING_R * 2.4) / 0.42;
    const fitWidth = (RING_R * 2.6) / 0.62 / aspect;
    baseCameraZ.value = Math.max(fitHeight, fitWidth) / 2 / halfTan;
    camera.updateProjectionMatrix();
    // false = keep CSS size; backing store = CSS * DPR
    renderer.setSize(w, h, false);

    const visibleHeight = 2 * baseCameraZ.value * halfTan;
    liftWorld.value = visibleHeight * LIFT_RATIO;
    const bottomWorld = -RING_R - 0.08 + liftWorld.value;
    const bottomPx = h / 2 - (bottomWorld / (visibleHeight / 2)) * (h / 2);
    const sealCenterY = h / 2 - (liftWorld.value / (visibleHeight / 2)) * (h / 2);
    const sealPx = ((RING_R * 2.15) / visibleHeight) * h;
    parent?.style.setProperty("--qs-intro-label-top", `${Math.round(bottomPx)}px`);
    parent?.style.setProperty("--qs-intro-seal-top", `${Math.round(sealCenterY)}px`);
    parent?.style.setProperty("--qs-intro-seal-size", `${Math.round(sealPx)}px`);
  };
  resize();
  window.addEventListener("resize", resize);

  let finished = false;
  let revealed = false;
  let raf = 0;
  const started = performance.now();

  const finish = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };

  const tick = (now: number) => {
    const t = clamp01((now - started) / durationMs);
    const b = clamp01(t / BUILD_END);

    const dropT = segment(b, 0, 0.42);
    const baseOpacity = {
      ring: easeOutCubic(Math.min(1, dropT / 0.35)),
      disc: easeOutCubic(Math.min(1, dropT / 0.4)),
      bead: easeOutCubic(Math.min(1, dropT / 0.45)),
      core: easeOutCubic(Math.min(1, dropT / 0.5)),
    };

    // Crossfade 3D seal out once the crisp DOM mark takes over.
    const fade3d = 1 - easeInOutCubic(segment(t, CRISP_AT, Math.min(1, CRISP_AT + 0.12)));
    setOpacity(ringMat, baseOpacity.ring * fade3d);
    setOpacity(discMat, baseOpacity.disc * fade3d);
    setOpacity(beadMat, baseOpacity.bead * fade3d);
    setOpacity(coreMat, baseOpacity.core * fade3d);

    stampPivot.position.y = mix(1.8, 0, easeOutCubic(dropT));
    stampPivot.scale.setScalar(mix(0.55, 1, easeOutBackSoft(dropT)));
    stampPivot.rotation.z = mix(-Math.PI * 1.25, 0, easeInOutCubic(dropT));
    stampPivot.rotation.x =
      dropT > 0 && dropT < 1 ? Math.sin(dropT * Math.PI) * 0.35 : 0;

    const settle = easeInOutCubic(segment(b, 0.42, 0.62));
    root.rotation.x = mix(-0.2, 0, settle);
    root.rotation.y = mix(0.18, 0, settle);

    ringMat.emissiveIntensity = 0.12 + easeOutCubic(segment(b, 0.55, 0.8)) * 0.35;
    coreMat.emissiveIntensity = 0.15 + easeOutCubic(segment(b, 0.55, 0.8)) * 0.45;
    beadMat.emissiveIntensity = 0.08 + easeOutCubic(segment(b, 0.55, 0.8)) * 0.2;

    const sweepT = segment(b, 0.62, 0.86);
    sweepUniforms.uProgress.value = mix(-1.6, 1.6, easeInOutCubic(sweepT));
    sweepUniforms.uOpacity.value =
      sweepT > 0 && sweepT < 1 ? Math.sin(sweepT * Math.PI) * 0.9 * fade3d : 0;
    sweep.visible = sweepUniforms.uOpacity.value > 0.01;

    const liftT = easeInOutCubic(segment(t, LIFT_START, LIFT_END));
    root.position.y = liftWorld.value * liftT;
    camera.position.set(0, 0, baseCameraZ.value);
    camera.lookAt(0, 0, 0);

    if (!revealed && t >= LABEL_AT) {
      revealed = true;
      onReveal?.();
    }

    renderer.render(scene, camera);

    if (t >= 1) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  const hardTimer = window.setTimeout(finish, durationMs + 1800);

  return {
    dispose: () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(hardTimer);
      window.removeEventListener("resize", resize);
      ringGeo.dispose();
      discGeo.dispose();
      beadGeo.dispose();
      coreGeo.dispose();
      sweepGeo.dispose();
      for (const mat of materials) mat.dispose();
      sweepMat.dispose();
      envMap.dispose();
      renderer.dispose();
      const gl = renderer.getContext();
      gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    },
  };
}

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

const RING_R = 1.05;
const BUILD_END = 0.72;
const LIFT_START = 0.7;
const LIFT_END = 0.86;
const LABEL_AT = 0.76;
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

/**
 * Accent-only Three.js: specular sweep + CSS vars that drive the one DOM brand mark.
 * No 3D seal geometry - avoids a mid-intro logo swap onto QuoteSealMark.
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const baseCameraZ = { value: 6.2 };
  const liftWorld = { value: 0 };

  const root = new THREE.Group();
  scene.add(root);

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

  const setMarkVars = (
    parent: HTMLElement | null,
    vars: {
      opacity: number;
      scale: number;
      rotateDeg: number;
      offsetYPx: number;
    },
  ) => {
    if (!parent) return;
    parent.style.setProperty("--qs-intro-mark-opacity", String(vars.opacity));
    parent.style.setProperty("--qs-intro-mark-scale", String(vars.scale));
    parent.style.setProperty("--qs-intro-mark-rotate", `${vars.rotateDeg}deg`);
    parent.style.setProperty("--qs-intro-mark-y", `${Math.round(vars.offsetYPx)}px`);
  };

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
    const parent = canvas.parentElement;
    const h = parent?.clientHeight || window.innerHeight;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visibleHeight = 2 * baseCameraZ.value * halfTan;

    const dropT = segment(b, 0, 0.42);
    const stampY = mix(1.8, 0, easeOutCubic(dropT));
    const stampScale = mix(0.55, 1, easeOutBackSoft(dropT));
    const stampRot = mix(-225, 0, easeInOutCubic(dropT));
    const markOpacity = easeOutCubic(Math.min(1, dropT / 0.28));

    const liftT = easeInOutCubic(segment(t, LIFT_START, LIFT_END));
    root.position.y = liftWorld.value * liftT;

    const worldY = stampY + root.position.y;
    const offsetYPx = -(worldY / (visibleHeight / 2)) * (h / 2);

    setMarkVars(parent, {
      opacity: markOpacity,
      scale: stampScale,
      rotateDeg: stampRot,
      offsetYPx,
    });

    const sweepT = segment(b, 0.62, 0.86);
    sweepUniforms.uProgress.value = mix(-1.6, 1.6, easeInOutCubic(sweepT));
    sweepUniforms.uOpacity.value =
      sweepT > 0 && sweepT < 1 ? Math.sin(sweepT * Math.PI) * 0.9 : 0;
    sweep.visible = sweepUniforms.uOpacity.value > 0.01;
    sweep.position.y = stampY;

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
      setMarkVars(canvas.parentElement, {
        opacity: 0,
        scale: 1,
        rotateDeg: 0,
        offsetYPx: 0,
      });
      sweepGeo.dispose();
      sweepMat.dispose();
      renderer.dispose();
      const gl = renderer.getContext();
      gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    },
  };
}

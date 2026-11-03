import * as THREE from "three";

export type IntroSceneOptions = {
  canvas: HTMLCanvasElement;
  durationMs: number;
  lowPower?: boolean;
  /** Fired once when the SVG mark has stamped and the wordmark should appear */
  onReveal?: () => void;
  onComplete: () => void;
};

export type IntroSceneHandle = {
  dispose: () => void;
};

const LABEL_AT = 0.62;
const LABEL_GAP_FRAC = 0.045;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Atmosphere only: soft emerald particles + specular sweep behind the HTML
 * QuoteSealMark. Never draws a competing seal glyph.
 */
export function mountIntroScene(options: IntroSceneOptions): IntroSceneHandle {
  const { canvas, durationMs, onComplete, onReveal, lowPower = false } = options;

  const dprCap = lowPower ? 1.5 : 2.5;
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
  camera.position.set(0, 0, 6.2);

  const particleCount = lowPower ? 28 : 48;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i += 1) {
    const a = (i / particleCount) * Math.PI * 2;
    const r = 0.55 + (i % 7) * 0.18;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r * 0.72;
    positions[i * 3 + 2] = ((i % 5) - 2) * 0.08;
    speeds[i] = 0.12 + (i % 9) * 0.03;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x7af0d0,
    size: lowPower ? 0.045 : 0.055,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  const glowGeo = new THREE.CircleGeometry(1.55, lowPower ? 32 : 48);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x1a6b62,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -0.4;
  scene.add(glow);

  const sweepUniforms = {
    uProgress: { value: -1 },
    uOpacity: { value: 0 },
    uRadius: { value: 1.45 },
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
        float discMask = 1.0 - smoothstep(uRadius * 0.75, uRadius, length(vLocal));
        if (discMask <= 0.001 || uOpacity <= 0.001) discard;
        float band = vLocal.x * 0.82 + vLocal.y * 0.38;
        float d = abs(band - uProgress);
        float streak = (exp(-d * d * 22.0) * 1.1 + exp(-d * d * 5.0) * 0.4) * discMask * uOpacity;
        vec3 tint = vec3(0.82, 1.0, 0.95);
        gl_FragColor = vec4(tint * streak, min(1.0, streak));
      }
    `,
  });
  const sweepGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const sweep = new THREE.Mesh(sweepGeo, sweepMat);
  sweep.position.z = -0.15;
  sweep.visible = false;
  scene.add(sweep);

  const resize = () => {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);

    const sealSize = Math.round(
      Math.min(Math.max(w * 0.16, 88), Math.min(h * 0.22, 132)),
    );
    const sealTop = Math.round(h * 0.46);
    const labelTop = Math.round(sealTop + sealSize * 0.55 + h * LABEL_GAP_FRAC);
    parent?.style.setProperty("--qs-intro-seal-top", `${sealTop}px`);
    parent?.style.setProperty("--qs-intro-seal-size", `${sealSize}px`);
    parent?.style.setProperty("--qs-intro-label-top", `${labelTop}px`);
  };
  resize();
  window.addEventListener("resize", resize);

  let finished = false;
  let revealed = false;
  let raf = 0;
  const started = performance.now();
  const posAttr = particleGeo.getAttribute("position") as THREE.BufferAttribute;

  const finish = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };

  const tick = (now: number) => {
    const t = clamp01((now - started) / durationMs);

    const fadeIn = clamp01(t / 0.18);
    const fadeOut = 1 - clamp01((t - 0.88) / 0.12);
    const atmos = fadeIn * fadeOut;

    particleMat.opacity = 0.55 * atmos;
    glowMat.opacity = 0.28 * atmos;

    const elapsed = (now - started) / 1000;
    for (let i = 0; i < particleCount; i += 1) {
      const ix = i * 3;
      const baseA = (i / particleCount) * Math.PI * 2 + elapsed * speeds[i];
      const r = 0.55 + (i % 7) * 0.18;
      posAttr.array[ix] = Math.cos(baseA) * r;
      posAttr.array[ix + 1] = Math.sin(baseA) * r * 0.72;
    }
    posAttr.needsUpdate = true;
    particles.rotation.z = elapsed * 0.08;

    const sweepT = clamp01((t - 0.28) / 0.38);
    sweepUniforms.uProgress.value = -1.6 + 3.2 * sweepT;
    sweepUniforms.uOpacity.value =
      sweepT > 0 && sweepT < 1 ? Math.sin(sweepT * Math.PI) * 0.75 * atmos : 0;
    sweep.visible = sweepUniforms.uOpacity.value > 0.01;

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
      particleGeo.dispose();
      particleMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      sweepGeo.dispose();
      sweepMat.dispose();
      renderer.dispose();
      const gl = renderer.getContext();
      gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    },
  };
}

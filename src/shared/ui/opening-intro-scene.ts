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

/** Wordmark beat - after stamp settle */
const LABEL_AT = 0.34;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number) {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

function easeInOutCubic(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Light atmosphere only: soft teal glow + sparse particles behind the HTML
 * QuoteSealMark. No shafts, bloom stacks, specular sweep, or camera dolly.
 * Palette: #0c1220 slate + #3ddc97 teal (no blue).
 */
export function mountIntroScene(options: IntroSceneOptions): IntroSceneHandle {
  const { canvas, durationMs, onComplete, onReveal, lowPower = false } = options;

  const dprCap = lowPower ? 1.25 : 1.75;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowPower,
    alpha: true,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c1220, lowPower ? 0.055 : 0.042);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0.02, 6.4);
  camera.lookAt(0, -0.02, 0);

  // Soft teal disc behind the mark (2 layers max)
  const glowLayers: THREE.Mesh[] = [];
  const glowSpecs = lowPower
    ? [{ r: 1.35, opacity: 0.16, color: 0x1a5c48 }]
    : [
        { r: 1.7, opacity: 0.1, color: 0x12352c },
        { r: 0.85, opacity: 0.18, color: 0x3ddc97 },
      ];
  for (const spec of glowSpecs) {
    const geo = new THREE.CircleGeometry(spec.r, lowPower ? 20 : 32);
    const mat = new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -0.55 - glowLayers.length * 0.04;
    mesh.userData.baseOpacity = spec.opacity;
    scene.add(mesh);
    glowLayers.push(mesh);
  }

  // Sparse orbiting particles
  const particleCount = lowPower ? 12 : 22;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i += 1) {
    const a = (i / particleCount) * Math.PI * 2;
    const r = 0.7 + (i % 7) * 0.16;
    radii[i] = r;
    phases[i] = a;
    speeds[i] = 0.07 + (i % 5) * 0.018;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r * 0.62;
    positions[i * 3 + 2] = ((i % 5) - 2) * 0.06;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x3ddc97,
    size: lowPower ? 0.032 : 0.04,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Brief stamp impact ring
  const ringUniforms = {
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
  };
  const ringMat = new THREE.ShaderMaterial({
    uniforms: ringUniforms,
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
      varying vec2 vLocal;
      void main() {
        float r = length(vLocal);
        float radius = 0.3 + uProgress * 1.2;
        float band = abs(r - radius);
        float ring = exp(-band * band * 110.0) * (1.0 - uProgress);
        float a = ring * uOpacity;
        vec3 tint = vec3(0.24, 0.86, 0.59);
        gl_FragColor = vec4(tint * a, min(1.0, a));
      }
    `,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), ringMat);
  ring.position.z = -0.08;
  scene.add(ring);

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
    const labelTop = Math.round(sealTop + sealSize * 0.55 + h * 0.035);
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
    const elapsed = (now - started) / 1000;

    const fadeIn = easeOutCubic(clamp01(t / 0.12));
    const fadeOut = 1 - easeInOutCubic(clamp01((t - 0.88) / 0.12));
    const atmos = fadeIn * fadeOut;

    const stampPulse =
      t > 0.12 && t < 0.32
        ? Math.sin(clamp01((t - 0.12) / 0.2) * Math.PI) * 0.4
        : 0;
    for (const mesh of glowLayers) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (mesh.userData.baseOpacity as number) * atmos * (1 + stampPulse);
      mesh.scale.setScalar(1 + stampPulse * 0.06);
    }

    particleMat.opacity = 0.4 * atmos;
    for (let i = 0; i < particleCount; i += 1) {
      const ix = i * 3;
      const baseA = phases[i] + elapsed * speeds[i];
      const r = radii[i];
      posAttr.array[ix] = Math.cos(baseA) * r;
      posAttr.array[ix + 1] = Math.sin(baseA) * r * 0.62;
      posAttr.array[ix + 2] = ((i % 5) - 2) * 0.06;
    }
    posAttr.needsUpdate = true;

    const ringT = clamp01((t - 0.16) / 0.22);
    ringUniforms.uProgress.value = ringT;
    ringUniforms.uOpacity.value =
      ringT > 0 && ringT < 1 ? (1 - ringT * 0.4) * 0.75 * atmos : 0;

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
  const hardTimer = window.setTimeout(finish, durationMs + 1200);

  return {
    dispose: () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(hardTimer);
      window.removeEventListener("resize", resize);

      for (const mesh of glowLayers) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      particleGeo.dispose();
      particleMat.dispose();
      ring.geometry.dispose();
      ringMat.dispose();
      renderer.dispose();
      const gl = renderer.getContext();
      gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    },
  };
}

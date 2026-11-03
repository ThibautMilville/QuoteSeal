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

/** Wordmark beat - after stamp settle (~1.1s of 4.2s) */
const LABEL_AT = 0.48;
const LABEL_GAP_FRAC = 0.045;

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
 * Atmosphere only: fog, soft shafts, bloom-like glow, particles, camera ease
 * behind the HTML QuoteSealMark. Never draws a competing seal glyph.
 */
export function mountIntroScene(options: IntroSceneOptions): IntroSceneHandle {
  const { canvas, durationMs, onComplete, onReveal, lowPower = false } = options;

  const dprCap = lowPower ? 1.25 : 2;
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
  scene.fog = new THREE.FogExp2(0x02090d, lowPower ? 0.055 : 0.042);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const camStartZ = 8.4;
  const camEndZ = 5.85;
  camera.position.set(0, 0.08, camStartZ);

  // --- Soft bloom disc (fake bloom, mobile-safe) ---
  const glowLayers: THREE.Mesh[] = [];
  const glowSpecs = lowPower
    ? [
        { r: 1.9, opacity: 0.22, color: 0x145a52 },
        { r: 1.15, opacity: 0.32, color: 0x1a6b62 },
      ]
    : [
        { r: 2.35, opacity: 0.16, color: 0x0d3d3a },
        { r: 1.75, opacity: 0.24, color: 0x145a52 },
        { r: 1.1, opacity: 0.36, color: 0x1a6b62 },
        { r: 0.55, opacity: 0.28, color: 0x36b8a6 },
      ];
  for (const spec of glowSpecs) {
    const geo = new THREE.CircleGeometry(spec.r, lowPower ? 24 : 48);
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

  // --- Radial vignette / soft distortion plane ---
  const atmosUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uDistort: { value: lowPower ? 0.35 : 1 },
  };
  const atmosMat = new THREE.ShaderMaterial({
    uniforms: atmosUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uDistort;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float wave = sin(r * 9.0 - uTime * 1.6) * 0.018 * uDistort;
        float ring = smoothstep(0.95, 0.55, r + wave) * smoothstep(0.08, 0.42, r);
        float core = exp(-r * r * 2.8) * 0.45;
        float haze = exp(-r * r * 0.55) * 0.22;
        float a = (ring * 0.55 + core + haze) * uOpacity;
        vec3 tint = mix(vec3(0.08, 0.38, 0.36), vec3(0.48, 0.94, 0.84), core + 0.25);
        gl_FragColor = vec4(tint * a, min(1.0, a));
      }
    `,
  });
  const atmos = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), atmosMat);
  atmos.position.z = -0.7;
  scene.add(atmos);

  // --- Soft light shafts (god-ray wedges) ---
  const shaftMeshes: THREE.Mesh[] = [];
  if (!lowPower) {
    const shaftMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float along = vUv.y;
          float across = abs(vUv.x - 0.5) * 2.0;
          float taper = (1.0 - across) * smoothstep(0.0, 0.2, along) * (1.0 - along);
          float shimmer = 0.85 + 0.15 * sin(uTime * 1.4 + along * 6.0);
          float a = taper * taper * uOpacity * shimmer;
          vec3 tint = vec3(0.55, 0.95, 0.88);
          gl_FragColor = vec4(tint * a, min(1.0, a * 1.2));
        }
      `,
    });
    for (let i = 0; i < 3; i += 1) {
      const geo = new THREE.PlaneGeometry(0.55 + i * 0.12, 3.6);
      const mesh = new THREE.Mesh(geo, shaftMat.clone());
      const angle = -0.55 + i * 0.55;
      mesh.rotation.z = angle;
      mesh.position.set(Math.sin(angle) * 0.35, 0.15, -0.9 - i * 0.05);
      mesh.userData.phase = i * 1.7;
      scene.add(mesh);
      shaftMeshes.push(mesh);
    }
  }

  // --- Orbiting particles ---
  const particleCount = lowPower ? 36 : 72;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i += 1) {
    const a = (i / particleCount) * Math.PI * 2;
    const r = 0.62 + (i % 11) * 0.14 + (i % 3) * 0.05;
    radii[i] = r;
    phases[i] = a;
    speeds[i] = 0.09 + (i % 13) * 0.022;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r * 0.68;
    positions[i * 3 + 2] = ((i % 7) - 3) * 0.07;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x7af0d0,
    size: lowPower ? 0.04 : 0.052,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Outer sparse dust
  const dustCount = lowPower ? 18 : 40;
  const dustPos = new Float32Array(dustCount * 3);
  const dustSpeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.6 + Math.random() * 2.2;
    dustPos[i * 3] = Math.cos(a) * r;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
    dustPos[i * 3 + 2] = -1.2 - Math.random() * 1.8;
    dustSpeed[i] = 0.04 + Math.random() * 0.06;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x5ec8d8,
    size: lowPower ? 0.028 : 0.036,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // --- Specular stamp sweep ---
  const sweepUniforms = {
    uProgress: { value: -1 },
    uOpacity: { value: 0 },
    uRadius: { value: 1.35 },
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
        float discMask = 1.0 - smoothstep(uRadius * 0.72, uRadius, length(vLocal));
        if (discMask <= 0.001 || uOpacity <= 0.001) discard;
        float band = vLocal.x * 0.82 + vLocal.y * 0.38;
        float d = abs(band - uProgress);
        float streak = (exp(-d * d * 28.0) * 1.25 + exp(-d * d * 6.0) * 0.45) * discMask * uOpacity;
        vec3 tint = vec3(0.86, 1.0, 0.96);
        gl_FragColor = vec4(tint * streak, min(1.0, streak));
      }
    `,
  });
  const sweepGeo = new THREE.PlaneGeometry(3.0, 3.0);
  const sweep = new THREE.Mesh(sweepGeo, sweepMat);
  sweep.position.z = -0.12;
  sweep.visible = false;
  scene.add(sweep);

  // --- Impact ring on stamp settle ---
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
        float radius = 0.35 + uProgress * 1.55;
        float band = abs(r - radius);
        float ring = exp(-band * band * 90.0) * (1.0 - uProgress);
        float fill = smoothstep(radius + 0.08, radius - 0.35, r) * (1.0 - uProgress) * 0.18;
        float a = (ring + fill) * uOpacity;
        vec3 tint = vec3(0.48, 0.94, 0.84);
        gl_FragColor = vec4(tint * a, min(1.0, a));
      }
    `,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), ringMat);
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
  const dustAttr = dustGeo.getAttribute("position") as THREE.BufferAttribute;

  const finish = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };

  const tick = (now: number) => {
    const t = clamp01((now - started) / durationMs);
    const elapsed = (now - started) / 1000;

    const fadeIn = easeOutCubic(clamp01(t / 0.16));
    const fadeOut = 1 - easeInOutCubic(clamp01((t - 0.9) / 0.1));
    const atmos = fadeIn * fadeOut;

    // Camera dolly + subtle settle
    const camEase = easeInOutCubic(clamp01(t / 0.55));
    camera.position.z = THREE.MathUtils.lerp(camStartZ, camEndZ, camEase);
    camera.position.y = 0.08 * (1 - camEase) + Math.sin(elapsed * 0.55) * 0.012;
    camera.lookAt(0, -0.02, 0);

    // Glow layers breathe with stamp impact
    const stampPulse =
      t > 0.22 && t < 0.42
        ? Math.sin(clamp01((t - 0.22) / 0.2) * Math.PI) * 0.55
        : 0;
    for (const mesh of glowLayers) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (mesh.userData.baseOpacity as number) * atmos * (1 + stampPulse);
      const s = 1 + stampPulse * 0.08 + Math.sin(elapsed * 0.9) * 0.015;
      mesh.scale.setScalar(s);
    }

    atmosUniforms.uTime.value = elapsed;
    atmosUniforms.uOpacity.value = 0.85 * atmos;

    for (const mesh of shaftMeshes) {
      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = 0.14 * atmos;
      mat.uniforms.uTime.value = elapsed + (mesh.userData.phase as number);
    }

    particleMat.opacity = 0.62 * atmos;
    dustMat.opacity = 0.28 * atmos;

    for (let i = 0; i < particleCount; i += 1) {
      const ix = i * 3;
      const baseA = phases[i] + elapsed * speeds[i];
      const r = radii[i] + Math.sin(elapsed * 0.7 + phases[i]) * 0.04;
      posAttr.array[ix] = Math.cos(baseA) * r;
      posAttr.array[ix + 1] = Math.sin(baseA) * r * 0.68;
      posAttr.array[ix + 2] =
        ((i % 7) - 3) * 0.07 + Math.sin(elapsed * 0.9 + i) * 0.03;
    }
    posAttr.needsUpdate = true;
    particles.rotation.z = elapsed * 0.06;

    for (let i = 0; i < dustCount; i += 1) {
      const ix = i * 3;
      dustAttr.array[ix + 1] += Math.sin(elapsed * dustSpeed[i] + i) * 0.0015;
    }
    dustAttr.needsUpdate = true;
    dust.rotation.y = elapsed * 0.03;

    // Specular sweep across seal plane (beat 1 settle)
    const sweepT = clamp01((t - 0.24) / 0.32);
    sweepUniforms.uProgress.value = -1.55 + 3.1 * sweepT;
    sweepUniforms.uOpacity.value =
      sweepT > 0 && sweepT < 1 ? Math.sin(sweepT * Math.PI) * 0.85 * atmos : 0;
    sweep.visible = sweepUniforms.uOpacity.value > 0.01;

    // Impact ring
    const ringT = clamp01((t - 0.28) / 0.28);
    ringUniforms.uProgress.value = ringT;
    ringUniforms.uOpacity.value =
      ringT > 0 && ringT < 1 ? (1 - ringT * 0.35) * 0.9 * atmos : 0;

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

      for (const mesh of glowLayers) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      atmos.geometry.dispose();
      atmosMat.dispose();
      for (const mesh of shaftMeshes) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      particleGeo.dispose();
      particleMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sweepGeo.dispose();
      sweepMat.dispose();
      ring.geometry.dispose();
      ringMat.dispose();
      renderer.dispose();
      const gl = renderer.getContext();
      gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    },
  };
}

import * as THREE from "three";

// Black hole background.
//
//   event horizon  — matte black sphere, swallows everything behind it
//   photon ring    — the thin bright halo light traces before falling in
//   accretion disk — shader ring: white-hot inside, cooling outward, with
//                    Doppler asymmetry (the side rotating toward you is brighter)
//   star field     — points on slow inward spirals; anything that crosses the
//                    horizon respawns far out, so matter keeps feeding the disk
//   lens glow      — camera-facing sprite that fakes gravitational lensing

const BH_RADIUS = 3.2; // event horizon
const DISK_INNER = BH_RADIUS * 1.35;
const DISK_OUTER = BH_RADIUS * 4.2;

export function initScene(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  );
  camera.position.set(0, 1.8, 24);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // group holds the hole + disk so we can tilt the whole system at once
  const system = new THREE.Group();
  system.rotation.x = -0.42; // tip the disk toward the viewer
  scene.add(system);

  // ---------- event horizon ----------
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(BH_RADIUS, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  system.add(horizon);

  // ---------- photon ring ----------
  const photonRing = new THREE.Mesh(
    new THREE.RingGeometry(BH_RADIUS * 1.02, BH_RADIUS * 1.12, 128),
    new THREE.MeshBasicMaterial({
      color: 0xffe9c4,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  photonRing.rotation.x = -Math.PI / 2;
  system.add(photonRing);

  // ---------- accretion disk ----------
  const diskMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: DISK_INNER },
      uOuter: { value: DISK_OUTER },
      // Gargantua's palette: near-white at the inner rim falling through
      // amber to a deep ember. Closely spaced stops — a big jump between
      // neighbours is what bands once the ramp is quantised to 8 bits.
      uHot: { value: new THREE.Color(0xfff6e2) },
      uMid: { value: new THREE.Color(0xffc074) },
      uCool: { value: new THREE.Color(0xd8823a) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      uniform vec3 uHot;
      uniform vec3 uMid;
      uniform vec3 uCool;
      varying vec2 vUv;
      varying vec3 vPos;

      // cheap value noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
        return v;
      }

      void main() {
        float r = length(vPos.xy);
        float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
        float ang = atan(vPos.y, vPos.x);

        // inner material orbits faster than outer — differential rotation
        float swirl = ang * 2.2 + uTime * (0.45 / (0.35 + t * 2.0));
        // low-contrast, low-frequency turbulence: Gargantua's disk reads as a
        // smooth sheet of light, not a churning plasma
        float turb = fbm(vec2(swirl * 0.7, t * 3.0 - uTime * 0.05));

        // Temperature falls off with radius. Two overlapping weights summed
        // instead of chained mixes: chaining put a hard seam where one
        // smoothstep ended and the next began.
        float wHot  = 1.0 - smoothstep(0.0, 0.62, t);
        float wCool = smoothstep(0.28, 1.0, t);
        float wMid  = 1.0 - wHot - wCool;
        wMid = max(wMid, 0.0);
        float wSum = wHot + wMid + wCool;
        vec3 col = (uHot * wHot + uMid * wMid + uCool * wCool) / wSum;

        // Relativistic beaming. The film dialled this way down for legibility —
        // Gargantua reads as nearly symmetric, with only a gentle lift on one
        // limb rather than one blazing side and one dark one.
        float d = sin(ang) * 0.5 + 0.5;
        float doppler = 0.86 + 0.22 * (d * d * (3.0 - 2.0 * d));

        // brightness: hot inside, fading edges, only lightly textured
        float edge = smoothstep(0.0, 0.14, t) * (1.0 - smoothstep(0.58, 1.0, t));
        float bright = edge * (0.88 + 0.20 * turb) * doppler;
        // inner rim glow — gentle falloff so it blooms instead of banding
        bright *= 1.0 + 1.1 * exp(-t * 3.6);

        // slight dither breaks up any remaining banding in the smooth ramp
        bright += (hash(gl_FragCoord.xy) - 0.5) * 0.015;

        gl_FragColor = vec4(col * bright, clamp(bright, 0.0, 1.0) * 0.9);
      }
    `,
  });
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(DISK_INNER, DISK_OUTER, 256, 64),
    diskMat,
  );
  disk.rotation.x = -Math.PI / 2;
  system.add(disk);

  // a second, thinner disk copy tilted slightly gives the volume some depth
  const diskHalo = disk.clone();
  diskHalo.material = diskMat;
  diskHalo.scale.setScalar(1.06);
  diskHalo.rotation.x = -Math.PI / 2 + 0.06;
  system.add(diskHalo);

  // ---------- gravitationally lensed arcs (the Gargantua signature) ----------
  // Light from the far side of the disk is bent up over the top of the hole and
  // down under the bottom, so the disk appears to wrap vertically around the
  // shadow. Faked with a copy of the disk standing perpendicular to it: the
  // opaque horizon occludes the rear half, leaving exactly the two arcs.
  // Inner radius must stay clear of the horizon *after* the vertical squash,
  // otherwise the arc's inner rim is swallowed by the black sphere and the
  // wrap-around read is lost. 1.42 * 0.82 = 1.16 horizon radii.
  const ARC_SQUASH = 0.82;
  const lensArc = new THREE.Mesh(
    new THREE.RingGeometry(BH_RADIUS * 1.42, DISK_OUTER * 0.92, 256, 32),
    diskMat,
  );
  lensArc.scale.y = ARC_SQUASH;
  system.add(lensArc);

  // a fainter, wider companion arc adds the soft outer halo around the pair
  const lensArcOuter = lensArc.clone();
  lensArcOuter.scale.set(1.16, 0.96, 1.16);
  lensArcOuter.rotation.z = Math.PI;
  system.add(lensArcOuter);

  // ---------- gravitational lens glow ----------
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(BH_RADIUS * 7);
  scene.add(glow);

  // ---------- infalling star field ----------
  const COUNT = 2600;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  // per-star orbital state, kept in plain arrays for speed
  const rad = new Float32Array(COUNT);
  const ang = new Float32Array(COUNT);
  const hgt = new Float32Array(COUNT);
  const spd = new Float32Array(COUNT);

  // infalling matter glows like the disk it is about to join
  const cHot = new THREE.Color(0xfff4de);
  const cCool = new THREE.Color(0xffc98a);
  const cFar = new THREE.Color(0x8aa8d8); // distant field stars stay cold blue

  function seedStar(i, fresh) {
    // fresh stars spawn at the outer edge; the initial fill spreads everywhere
    rad[i] = fresh ? 42 + Math.random() * 26 : DISK_OUTER + Math.random() * 60;
    ang[i] = Math.random() * Math.PI * 2;
    hgt[i] = (Math.random() - 0.5) * 26 * (rad[i] / 60);
    spd[i] = 0.35 + Math.random() * 0.5;
  }
  for (let i = 0; i < COUNT; i++) seedStar(i, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: makeDotTexture(),
    }),
  );
  system.add(stars);

  const tmpColor = new THREE.Color();

  function updateStars(dt) {
    for (let i = 0; i < COUNT; i++) {
      // Keplerian-ish: closer in means faster orbit and faster infall
      const r = rad[i];
      const orbital = (spd[i] * 1.5) / Math.max(r, 2);
      ang[i] += orbital * dt;
      rad[i] -= ((spd[i] * 0.38) / Math.max(r * 0.55, 1)) * dt;
      hgt[i] *= 1 - 0.03 * dt; // orbits flatten into the disk plane as they fall

      // crossed the horizon: recycle it back out at the rim
      if (rad[i] < BH_RADIUS * 1.05) seedStar(i, true);

      // orbit lies in the XZ plane, matching the disk's own orientation;
      // Y is the star's height above/below that plane
      const j = i * 3;
      pos[j] = Math.cos(ang[i]) * rad[i];
      pos[j + 1] = hgt[i];
      pos[j + 2] = Math.sin(ang[i]) * rad[i];

      // Heat up as they spiral in. Weighted blend of all three stops rather
      // than a lerp chain with an `if` — the branch produced a visible seam
      // at the halfway point.
      const t = Math.min(Math.max((rad[i] - DISK_OUTER) / 50, 0), 1);
      const s = t * t * (3 - 2 * t); // smoothstep
      const wHot = Math.max(1 - s * 2, 0);
      const wFar = Math.max(s * 2 - 1, 0);
      const wCool = 1 - wHot - wFar;
      tmpColor
        .setRGB(
          cHot.r * wHot + cCool.r * wCool + cFar.r * wFar,
          cHot.g * wHot + cCool.g * wCool + cFar.g * wFar,
          cHot.b * wHot + cCool.b * wCool + cFar.b * wFar,
        );
      col[j] = tmpColor.r;
      col[j + 1] = tmpColor.g;
      col[j + 2] = tmpColor.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  // ---------- interaction ----------
  const mouse = { x: 0, y: 0 };
  let scrollProgress = 0;

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener(
    "scroll",
    () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
    },
    { passive: true },
  );

  // ---------- loop ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    // read delta first: getElapsedTime() consumes it internally
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    diskMat.uniforms.uTime.value = t;
    disk.rotation.z = t * 0.009;
    diskHalo.rotation.z = -t * 0.006;
    photonRing.rotation.z = t * 0.014;
    lensArc.rotation.z = t * 0.009; // arcs track the disk they're an image of
    lensArcOuter.rotation.z = Math.PI - t * 0.006;
    updateStars(dt);

    // the whole system drifts as you scroll; camera only sways with the mouse
    system.rotation.y = t * 0.003 + mouse.x * 0.12;
    // near edge-on, the way Gargantua is framed on screen
    system.rotation.x = -0.16 + scrollProgress * 0.42 + mouse.y * 0.05;
    system.position.y = -scrollProgress * 10;
    glow.position.copy(system.position);

    camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (1.8 + mouse.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(system.position);

    renderer.render(scene, camera);
  }
  animate();
}

// Radial glow used for the lensing halo.
function makeGlowTexture() {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.25, "rgba(255,220,170,0.28)");
  g.addColorStop(0.6, "rgba(255,180,120,0.07)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.Texture(cv);
  tex.needsUpdate = true;
  return tex;
}

// Soft radial dot so stars look like glowing points, not squares.
function makeDotTexture() {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.Texture(cv);
  tex.needsUpdate = true;
  return tex;
}

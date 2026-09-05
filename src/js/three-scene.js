import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import { BlackHoleCamera } from "./camera.js";

// Background ported faithfully from github.com/vlwkaos/threejs-blackhole: one
// fullscreen fragment shader that integrates each pixel's photon path through a
// Schwarzschild black hole's gravity, using the same disk/star/milkyway
// textures, the same orbiting+drag camera, and the same bloom post pass.

// ---- performance / quality (matching the reference's "medium" preset) ----
const STEP = 0.05;
const NSTEPS = 600;

const VERTEX_SHADER = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  #define STEP ${STEP}
  #define NSTEPS ${NSTEPS}
  precision highp float;
  #define PI 3.141592653589793238462643383279
  #define DEG_TO_RAD (PI/180.0)
  #define ROT_Y(a) mat3(1, 0, 0, 0, cos(a), sin(a), 0, -sin(a), cos(a))
  #define ROT_Z(a) mat3(cos(a), -sin(a), 0, sin(a), cos(a), 0, 0, 0, 1)

  uniform float time;
  uniform vec2 resolution;

  uniform vec3 cam_pos;
  uniform vec3 cam_dir;
  uniform vec3 cam_up;
  uniform float fov;
  uniform vec3 cam_vel;

  const float MIN_TEMPERATURE = 1000.0;
  const float TEMPERATURE_RANGE = 39000.0;

  uniform bool accretion_disk;
  uniform bool use_disk_texture;
  uniform bool hide_hole;
  const float DISK_IN = 2.0;
  const float DISK_WIDTH = 4.0;

  uniform bool doppler_shift;
  uniform bool lorentz_transform;
  uniform bool beaming;

  uniform sampler2D bg_texture;
  uniform sampler2D star_texture;
  uniform sampler2D disk_texture;

  vec2 square_frame(vec2 screen_size){
    vec2 position = 2.0 * (gl_FragCoord.xy / screen_size.xy) - 1.0;
    return position;
  }

  vec2 to_spherical(vec3 cartesian_coord){
    vec2 uv = vec2(atan(cartesian_coord.z,cartesian_coord.x), asin(cartesian_coord.y));
    uv *= vec2(1.0/(2.0*PI), 1.0/PI);
    uv += 0.5;
    return uv;
  }

  vec3 lorentz_transform_velocity(vec3 u, vec3 v){
    float speed = length(v);
    if (speed > 0.0){
      float gamma = 1.0/sqrt(1.0-dot(v,v));
      float denominator = 1.0 - dot(v,u);
      vec3 new_u = (u/gamma - v + (gamma/(gamma+1.0)) * dot(u,v)*v)/denominator;
      return new_u;
    }
    return u;
  }

  vec3 temp_to_color(float temp_kelvin){
    vec3 color;
    temp_kelvin = clamp(temp_kelvin, 1000.0, 40000.0) / 100.0;
    if (temp_kelvin <= 66.0){
      color.r = 255.0;
      color.g = temp_kelvin;
      color.g = 99.4708025861 * log(color.g) - 161.1195681661;
      if (color.g < 0.0) color.g = 0.0;
      if (color.g > 255.0)  color.g = 255.0;
    } else {
      color.r = temp_kelvin - 60.0;
      if (color.r < 0.0) color.r = 0.0;
      color.r = 329.698727446 * pow(color.r, -0.1332047592);
      if (color.r < 0.0) color.r = 0.0;
      if (color.g > 255.0) color.r = 255.0;
      color.g = temp_kelvin - 60.0;
      if (color.g < 0.0) color.g = 0.0;
      color.g = 288.1221695283 * pow(color.g, -0.0755148492);
      if (color.g > 255.0)  color.g = 255.0;
    }
    if (temp_kelvin >= 66.0){
      color.b = 255.0;
    } else if (temp_kelvin <= 19.0){
      color.b = 0.0;
    } else {
      color.b = temp_kelvin - 10.0;
      color.b = 138.5177312231 * log(color.b) - 305.0447927307;
      if (color.b < 0.0) color.b = 0.0;
      if (color.b > 255.0) color.b = 255.0;
    }
    color /= 255.0;
    return color;
  }

  void main()	{
    float uvfov = tan(fov / 2.0 * DEG_TO_RAD);
    vec2 uv = square_frame(resolution);
    uv *= vec2(resolution.x/resolution.y, 1.0);
    vec3 forward = normalize(cam_dir);
    vec3 up = normalize(cam_up);
    vec3 nright = normalize(cross(forward, up));
    up = cross(nright, forward);
    vec3 pixel_pos = cam_pos + forward + nright*uv.x*uvfov + up*uv.y*uvfov;
    vec3 ray_dir = normalize(pixel_pos - cam_pos);

    if (lorentz_transform)
      ray_dir = lorentz_transform_velocity(ray_dir, cam_vel);

    vec4 color = vec4(0.0,0.0,0.0,1.0);

    vec3 point = cam_pos;
    vec3 velocity = ray_dir;
    vec3 c = cross(point,velocity);
    float h2 = dot(c,c);

    float ray_gamma = 1.0/sqrt(1.0-dot(cam_vel,cam_vel));
    float ray_doppler_factor = ray_gamma * (1.0 + dot(ray_dir, -cam_vel));

    float ray_intensity = 1.0;
    if (beaming)
      ray_intensity /= pow(ray_doppler_factor , 3.0);

    if (hide_hole){
      vec2 tex_coord = to_spherical(ray_dir * ROT_Z(45.0 * DEG_TO_RAD));
      vec4 hole_color = vec4(0.0,0.0,0.0,1.0);
      vec4 star_color = texture2D(star_texture, tex_coord);
      if (star_color.g > 0.0){
        float star_temperature = (MIN_TEMPERATURE + TEMPERATURE_RANGE*star_color.r);
        float star_velocity = star_color.b - 0.5;
        float star_doppler_factor = sqrt((1.0+star_velocity)/(1.0-star_velocity));
        if (doppler_shift)
          star_temperature /= ray_doppler_factor*star_doppler_factor;
        hole_color += vec4(temp_to_color(star_temperature),1.0)* star_color.g;
      }
      hole_color += texture2D(bg_texture, tex_coord) * 0.25;
      gl_FragColor = hole_color * ray_intensity;
      return;
    }

    vec3 oldpoint;
    float pointsqr;
    float distance = length(point);

    for (int i=0; i<NSTEPS;i++){
      oldpoint = point;
      point += velocity * STEP;
      vec3 accel = -1.5 * h2 * point / pow(dot(point,point),2.5);
      velocity += accel * STEP;

      distance = length(point);
      if ( distance < 0.0) break;

      bool horizon_mask = distance < 1.0 && length(oldpoint) > 1.0;
      if (horizon_mask) {
        vec4 black = vec4(0.0,0.0,0.0,1.0);
        color += black;
        break;
      }

      if (accretion_disk){
        if (oldpoint.y * point.y < 0.0){
          float lambda = - oldpoint.y/velocity.y;
          vec3 intersection = oldpoint + lambda*velocity;
          float r = length(intersection);
          if (DISK_IN <= r&&r <= DISK_IN+DISK_WIDTH ){
            float phi = atan(intersection.x, intersection.z);

            vec3 disk_velocity = vec3(-intersection.x, 0.0, intersection.z)/sqrt(2.0*(r-1.0))/(r*r);
            phi -= time;
            phi = mod(phi , PI*2.0);
            float disk_gamma = 1.0/sqrt(1.0-dot(disk_velocity, disk_velocity));
            float disk_doppler_factor = disk_gamma*(1.0+dot(ray_dir/distance, disk_velocity));

            if (use_disk_texture){
              vec2 tex_coord = vec2(mod(phi,2.0*PI)/(2.0*PI),1.0-(r-DISK_IN)/(DISK_WIDTH));
              vec4 disk_color = texture2D(disk_texture, tex_coord) / (ray_doppler_factor * disk_doppler_factor);
              float disk_alpha = clamp(dot(disk_color,disk_color)/4.5,0.0,1.0);

              if (beaming)
                disk_alpha /= pow(disk_doppler_factor,3.0);

              color += vec4(disk_color)*disk_alpha;
            } else {
              float disk_temperature = 10000.0*(pow(r/DISK_IN, -3.0/4.0));
              if (doppler_shift)
                disk_temperature /= ray_doppler_factor*disk_doppler_factor;
              vec3 disk_color = temp_to_color(disk_temperature);
              float disk_alpha = clamp(dot(disk_color,disk_color)/3.0,0.0,1.0);
              if (beaming)
                disk_alpha /= pow(disk_doppler_factor,3.0);
              color += vec4(disk_color, 1.0)*disk_alpha;
            }
          }
        }
      }
    }

    if (distance > 1.0){
      ray_dir = normalize(point - oldpoint);
      vec2 tex_coord = to_spherical(ray_dir * ROT_Z(45.0 * DEG_TO_RAD));
      vec4 star_color = texture2D(star_texture, tex_coord);
      if (star_color.g > 0.0){
        float star_temperature = (MIN_TEMPERATURE + TEMPERATURE_RANGE*star_color.r);
        float star_velocity = star_color.b - 0.5;
        float star_doppler_factor = sqrt((1.0+star_velocity)/(1.0-star_velocity));
        if (doppler_shift)
          star_temperature /= ray_doppler_factor*star_doppler_factor;
        color += vec4(temp_to_color(star_temperature),1.0)* star_color.g;
      }
      color += texture2D(bg_texture, tex_coord) * 0.25;
    }

    gl_FragColor = color*ray_intensity;
  }
`;

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setClearColor(0x000000, 1.0);
  renderer.autoClear = false;
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  camera.position.z = 1;

  const uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    accretion_disk: { value: true },
    use_disk_texture: { value: true },
    hide_hole: { value: false },
    lorentz_transform: { value: true },
    doppler_shift: { value: true },
    beaming: { value: true },
    cam_pos: { value: new THREE.Vector3() },
    cam_vel: { value: new THREE.Vector3() },
    cam_dir: { value: new THREE.Vector3() },
    cam_up: { value: new THREE.Vector3() },
    fov: { value: 90.0 },
    bg_texture: { value: null },
    star_texture: { value: null },
    disk_texture: { value: null },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  // ---- bloom (reference defaults: strength 1.0, radius 0.5, threshold 0.6)
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,
    0.5,
    0.6,
  );
  composer.addPass(bloomPass);
  const copyPass = new ShaderPass(CopyShader);
  copyPass.renderToScreen = true;
  composer.addPass(copyPass);

  // ---- camera: gently orbiting observer, always looking at the hole ----
  // On narrow phones (390–440px) the hole fills the whole viewport, so zoom
  // out (wider FOV + pull back) to frame the accretion disk in the hero.
  const compact = window.innerWidth <= 440;
  const observer = new BlackHoleCamera(
    compact ? 130 : 90.0,
    window.innerWidth / window.innerHeight,
    1,
    80000,
  );
  observer.distance = compact ? 13 : 8;
  observer.moving = true; // slow orbit keeps the scene alive

  const textures = { bg: null, star: null, disk: null };
  const textureBase = import.meta.env.BASE_URL || './';
  const loader = new THREE.TextureLoader();
  loader.load(`${textureBase}blackhole/milkyway.jpg`, (t) => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    textures.bg = t;
    uniforms.bg_texture.value = t;
  });
  loader.load(`${textureBase}blackhole/star_noise.png`, (t) => {
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.wrapS = THREE.ClampToEdgeWrapping;
    textures.star = t;
    uniforms.star_texture.value = t;
  });
  loader.load(`${textureBase}blackhole/accretion_disk.png`, (t) => {
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.wrapS = THREE.ClampToEdgeWrapping;
    textures.disk = t;
    uniforms.disk_texture.value = t;
  });

  // The fullscreen ray-march shader runs one NSTEPS-step photon path per
  // pixel, so it is starved for fill rate. Instead of always rendering at full
  // device resolution we draw into a smaller buffer and let the browser
  // upscale it (invisible for a soft background), then adjust the scale as the
  // frame rate dictates so the GPU is never pegged by the background.
  const SCALES = [1, 0.72, 0.52];
  let quality = 0;

  function applySize() {
    const scale = SCALES[quality];
    const w = Math.max(1, Math.round(window.innerWidth * scale));
    const h = Math.max(1, Math.round(window.innerHeight * scale));
    // updateStyle=false keeps the canvas CSS fullscreen; only the drawing
    // buffer shrinks. pixelRatio stays at 1: the shader maps gl_FragCoord
    // (buffer px) to [-1,1], so resolution MUST equal the buffer size or the
    // black hole gets pinned off-center.
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(1);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    uniforms.resolution.value.set(w, h);
    observer.aspect = window.innerWidth / window.innerHeight;
  }
  window.addEventListener("resize", applySize);
  applySize();

  const clock = new THREE.Clock();
  // adaptive-quality bookkeeping: remeasure fps every second, drop quality
  // under load, regain it only after a few sustained fast windows (hysteresis
  // between the thresholds keeps the scale from oscillating).
  let frames = 0;
  let fpsClock = performance.now();
  let upSlack = 0;
  const FPS_WINDOW = 1000;
  // camera-distance tween: pulls the hole out to stars (collapse) or back in
  // to the hero (reset), with an ease and a callback on arrival.
  let tweenFrom = null;
  let tweenTarget = null;
  let tweenStart = 0;
  let tweenEnd = 0;
  let tweenCb = null;
  const TWEEN_MS = 1600;
  const FAR_DISTANCE = 400;
  const ENTRY_DISTANCE = observer.distance;
  // temp vectors reused per frame
  const _dir = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    observer.update(dt);

    if (tweenTarget !== null) {
      const p = Math.min((performance.now() - tweenStart) / (tweenEnd - tweenStart), 1);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      observer.distance = tweenFrom + (tweenTarget - tweenFrom) * ease;
      if (p >= 1) {
        tweenTarget = null;
        const cb = tweenCb;
        tweenCb = null;
        cb?.();
      }
    }

    // aim the camera straight at the hole (origin) so it stays centered
    _dir.copy(observer.position).negate().normalize();
    _right.crossVectors(_dir, _worldUp).normalize();
    _up.crossVectors(_right, _dir).normalize();

    uniforms.time.value = t;
    uniforms.fov.value = observer.fov;
    uniforms.cam_pos.value.copy(observer.position);
    uniforms.cam_dir.value.copy(_dir);
    uniforms.cam_up.value.copy(_up);
    uniforms.cam_vel.value.copy(observer.velocity);

    frames++;
    const now = performance.now();
    if (now - fpsClock >= FPS_WINDOW) {
      const fpsNow = (frames * 1000) / (now - fpsClock);
      frames = 0;
      fpsClock = now;
      if (fpsNow < 35 && quality < SCALES.length - 1) {
        quality++;
        upSlack = 0;
        applySize();
      } else if (fpsNow > 52 && quality > 0) {
        if (upSlack >= 2) {
          quality--;
          upSlack = 0;
          applySize();
        } else {
          upSlack++;
        }
      } else {
        upSlack = 0;
      }
    }

    composer.render();
  }
  animate();

  return {
    setHoleVisible(visible) {
      uniforms.hide_hole.value = !visible;
    },
    collapse(cb) {
      tweenFrom = observer.distance;
      tweenTarget = FAR_DISTANCE;
      tweenStart = performance.now();
      tweenEnd = tweenStart + TWEEN_MS;
      tweenCb = () => {
        uniforms.hide_hole.value = true;
        observer.moving = false;
        observer.angularVelocity = 0;
        observer.velocity.set(0, 0, 0);
        cb?.();
      };
      observer.moving = false;
    },
    reset(cb) {
      tweenFrom = observer.distance;
      tweenTarget = ENTRY_DISTANCE;
      tweenStart = performance.now();
      tweenEnd = tweenStart + TWEEN_MS;
      tweenCb = () => {
        uniforms.hide_hole.value = false;
        observer.moving = true;
        cb?.();
      };
    },
  };
}

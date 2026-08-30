import * as THREE from "three";

// Ported from github.com/vlwkaos/threejs-blackhole (src/camera/Observer.js).
export class BlackHoleCamera extends THREE.PerspectiveCamera {
  constructor(fov, ratio, near, far) {
    super(fov, ratio, near, far);
    this.time = 0;
    this.theta = 0;
    this.angularVelocity = 0;
    this.maxAngularVelocity = 0;
    this.velocity = new THREE.Vector3();

    this.position.set(0, 0, 1);
    this.direction = new THREE.Vector3();

    this.moving = false;
    this.timeDilation = false;
    this.incline = (-5 * Math.PI) / 180;
  }

  set distance(r) {
    this.r = r;
    this.maxAngularVelocity = 1 / Math.sqrt(2.0 * (r - 1.0)) / this.r;
    this.position.normalize().multiplyScalar(r);
  }

  get distance() {
    return this.r;
  }

  setDirection(pitch, yaw) {
    const originalDirection = new THREE.Vector3(0, 0, -1);
    const rotation = new THREE.Euler(0, 0, 0, "YXZ");
    rotation.set(pitch, yaw, 0);
    this.direction.copy(originalDirection).applyEuler(rotation).normalize();
  }

  update(delta) {
    if (this.timeDilation) {
      this.delta = Math.sqrt(
        (delta * delta * (1.0 - this.angularVelocity * this.angularVelocity)) /
          (1 - 1.0 / this.r),
      );
    } else {
      this.delta = delta;
    }

    this.theta += this.angularVelocity * this.delta;
    const cos = Math.cos(this.theta);
    const sin = Math.sin(this.theta);

    this.position.set(this.r * sin, 0, this.r * cos);
    this.velocity.set(cos * this.angularVelocity, 0, -sin * this.angularVelocity);

    const inclineMatrix = new THREE.Matrix4().makeRotationX(this.incline);
    this.position.applyMatrix4(inclineMatrix);
    this.velocity.applyMatrix4(inclineMatrix);

    if (this.moving) {
      if (this.angularVelocity < this.maxAngularVelocity)
        this.angularVelocity += this.delta / this.r;
      else this.angularVelocity = this.maxAngularVelocity;
    } else {
      if (this.angularVelocity > 0.0) this.angularVelocity -= this.delta / this.r;
      else {
        this.angularVelocity = 0;
        this.velocity.set(0.0, 0.0, 0.0);
      }
    }

    this.time += this.delta;
  }
}

// Drag-to-look controls, ported from the reference's CameraDragControls.js.
export class CameraDragControls {
  constructor(observer, domElement) {
    this.domElement = domElement;
    this.observer = observer;

    const inclineMatrix = new THREE.Matrix4().makeRotationZ(observer.incline);
    observer.up.applyMatrix4(inclineMatrix);

    this.enabled = true;
    this.lookSpeed = 0.005;
    this.lookVertical = true;

    this.offsetX = 0;
    this.offsetY = 0;
    this.lastX = 0;
    this.lastY = 0;

    this.pitch = 0;
    this.yaw = 0;
    this.roll = -1;

    this.viewHalfX = 0;
    this.viewHalfY = 0;

    if (domElement && domElement !== document) domElement.setAttribute("tabindex", "-1");

    this.addMouseEventHandlers();
    this.handleResize();
  }

  handleResize() {
    this.viewHalfX = window.innerWidth / 2;
    this.viewHalfY = window.innerHeight / 2;
    this.observer.setDirection(this.pitch, this.yaw);
  }

  update(delta) {
    if (this.enabled === false) return;

    if (this.observer.angularVelocity > 0) this.yaw += this.observer.angularVelocity * delta;

    if (this.mouseDragOn) {
      this.yaw += this.lookSpeed * this.offsetX;

      if (this.lookVertical) {
        this.pitch += this.lookSpeed * this.offsetY;
        this.pitch = Math.min(
          Math.PI / 2 - 0.01,
          Math.max(-Math.PI / 2 + 0.01, this.pitch),
        );
      }
      this.offsetX /= 2;
      this.offsetY /= 2;
    }

    this.observer.setDirection(this.pitch, this.yaw);
  }

  addMouseEventHandlers() {
    this.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

    this.domElement.addEventListener(
      "mousemove",
      (event) => {
        if (!this.mouseDragOn) return;
        const newX = event.pageX - this.viewHalfX;
        const newY = event.pageY - this.viewHalfY;
        this.offsetX = newX - this.lastX;
        this.offsetY = newY - this.lastY;
        this.lastX = newX;
        this.lastY = newY;
      },
      { passive: true },
    );

    this.domElement.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.mouseDragOn = true;
      this.lastX = event.pageX - this.viewHalfX;
      this.lastY = event.pageY - this.viewHalfY;
    });

    window.addEventListener("mouseup", (event) => {
      event.preventDefault();
      this.mouseDragOn = false;
      this.offsetX = 0;
      this.offsetY = 0;
    });
  }
}

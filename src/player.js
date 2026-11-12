import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const RADIUS = 0.3;
const BODY_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const EPSILON = 0.00001;
const STEP = 1 / 120;

export class Player {
  constructor(camera, element, world) {
    this.camera = camera;
    this.world = world;
    this.controls = new PointerLockControls(camera, element);
    this.controls.pointerSpeed = 0.8;
    this.position = new THREE.Vector3(); // Feet, not eye position.
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.grounded = false;
    this.mode = "creative";
    this.health = 20;
    this.hunger = 20;
    this.breath = 10;
    this.damageTimer = 0;
    this.onDeath = null;
    this.accumulator = 0;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
    this.respawn();

    this.onKeyDown = (event) => {
      if (!this.controls.isLocked) return;
      if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code))
        event.preventDefault();
      this.keys.add(event.code);
      if (
        event.code === "Space" &&
        !event.repeat &&
        this.grounded &&
        !this.swimming
      ) {
        this.velocity.y = 8;
        this.grounded = false;
      }
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    this.controls.addEventListener("unlock", () => this.resetInput());
    this.onBlur = () => {
      this.resetInput();
      if (this.controls.isLocked) this.controls.unlock();
    };
    window.addEventListener("blur", this.onBlur);
  }

  dispose() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  collides() {
    const p = this.position;
    for (
      let x = Math.floor(p.x - RADIUS + EPSILON);
      x <= Math.floor(p.x + RADIUS - EPSILON);
      x++
    )
      for (
        let y = Math.floor(p.y + EPSILON);
        y <= Math.floor(p.y + BODY_HEIGHT - EPSILON);
        y++
      )
        for (
          let z = Math.floor(p.z - RADIUS + EPSILON);
          z <= Math.floor(p.z + RADIUS - EPSILON);
          z++
        )
          if (this.world.isSolid(x, y, z)) return true;
    return false;
  }

  resetInput() {
    this.keys.clear();
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.accumulator = 0;
  }

  respawn() {
    this.position.copy(this.world.findSpawn());
    this.health = 20;
    this.hunger = 20;
    this.breath = 10;
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.position).y += EYE_HEIGHT;
  }

  overlapsBlock(x, y, z) {
    const p = this.position;
    return (
      p.x + RADIUS > x &&
      p.x - RADIUS < x + 1 &&
      p.y + BODY_HEIGHT > y &&
      p.y < y + 1 &&
      p.z + RADIUS > z &&
      p.z - RADIUS < z + 1
    );
  }

  moveAxis(axis, distance) {
    if (distance === 0) return;
    this.position[axis] += distance;
    const p = this.position;
    const min = { x: p.x - RADIUS, y: p.y, z: p.z - RADIUS };
    const max = { x: p.x + RADIUS, y: p.y + BODY_HEIGHT, z: p.z + RADIUS };
    for (
      let x = Math.floor(min.x + EPSILON);
      x <= Math.floor(max.x - EPSILON);
      x++
    ) {
      for (
        let y = Math.floor(min.y + EPSILON);
        y <= Math.floor(max.y - EPSILON);
        y++
      ) {
        for (
          let z = Math.floor(min.z + EPSILON);
          z <= Math.floor(max.z - EPSILON);
          z++
        ) {
          if (!this.world.isSolid(x, y, z) || !this.overlapsBlock(x, y, z))
            continue;
          const block = { x, y, z }[axis];
          const lowerExtent = axis === "y" ? 0 : RADIUS;
          const upperExtent = axis === "y" ? BODY_HEIGHT : RADIUS;
          p[axis] =
            distance > 0
              ? Math.min(p[axis], block - upperExtent)
              : Math.max(p[axis], block + 1 + lowerExtent);
          if (
            axis === "y" &&
            distance < 0 &&
            this.velocity.y < -12 &&
            !this.swimming
          )
            this.damage(Math.floor((-this.velocity.y - 12) / 2));
          this.velocity[axis] = 0;
          if (axis === "y" && distance < 0) this.grounded = true;
        }
      }
    }
  }

  damage(amount) {
    if (this.mode !== "survival" || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.respawn();
      this.onDeath?.();
    }
  }

  update(delta) {
    if (!this.controls.isLocked) return;
    // Small fixed steps prevent tunnelling, even when rendering stalls.
    this.accumulator += Math.min(delta, 0.1);
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    this.move.set(0, 0, 0);
    if (this.keys.has("KeyW")) this.move.add(this.forward);
    if (this.keys.has("KeyS")) this.move.sub(this.forward);
    if (this.keys.has("KeyD")) this.move.add(this.right);
    if (this.keys.has("KeyA")) this.move.sub(this.right);
    const sprinting =
      (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ||
        this.keys.has("ControlLeft") || this.keys.has("ControlRight")) &&
      (this.mode === "creative" || this.hunger > 3);
    this.swimming = this.world.isWater(
      this.position.x,
      this.position.y + 0.6,
      this.position.z,
    );
    this.move
      .normalize()
      .multiplyScalar(this.swimming ? 3 : sprinting ? 7.5 : 5);
    while (this.accumulator >= STEP) {
      // Fixed-step acceleration keeps starts responsive without instant turns.
      const response = 1 - Math.exp(-(this.grounded ? 22 : 10) * STEP);
      this.velocity.x += (this.move.x - this.velocity.x) * response;
      this.velocity.z += (this.move.z - this.velocity.z) * response;
      if (this.swimming) {
        this.velocity.y += (this.keys.has("Space") ? 16 : -3) * STEP;
        this.velocity.y *= 1 - 5 * STEP;
        this.velocity.y = Math.min(4, Math.max(-3, this.velocity.y));
      } else this.velocity.y = Math.max(this.velocity.y - 24 * STEP, -30);
      this.moveAxis("x", this.velocity.x * STEP);
      this.moveAxis("z", this.velocity.z * STEP);
      this.grounded = false;
      this.moveAxis("y", this.velocity.y * STEP);
      if (this.mode === "survival") {
        this.hunger = Math.max(
          0,
          this.hunger -
            STEP * (sprinting && this.move.lengthSq() > 0 ? 0.08 : 0.012),
        );
        const submerged = this.world.isWater(
          this.position.x,
          this.position.y + EYE_HEIGHT,
          this.position.z,
        );
        this.breath = submerged ? Math.max(0, this.breath - STEP) : 10;
        this.damageTimer += STEP;
        if (this.damageTimer >= 1) {
          this.damageTimer = 0;
          if (this.breath <= 0) this.damage(2);
          if (this.hunger === 0 && this.health > 1) this.damage(1);
        }
      }
      this.accumulator -= STEP;
    }
    if (this.position.y < -20) this.respawn();
    this.camera.position.copy(this.position).y += EYE_HEIGHT;
  }
}

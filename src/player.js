import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SIZE } from './world.js';

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
    this.accumulator = 0;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
    this.respawn();

    document.addEventListener('keydown', (event) => {
      if (!this.controls.isLocked) return;
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.code === 'Space' && !event.repeat && this.grounded) {
        this.velocity.y = 8;
        this.grounded = false;
      }
    });
    document.addEventListener('keyup', (event) => this.keys.delete(event.code));
    this.controls.addEventListener('unlock', () => this.resetInput());
    window.addEventListener('blur', () => {
      this.resetInput();
      if (this.controls.isLocked) this.controls.unlock();
    });
  }

  resetInput() {
    this.keys.clear();
    this.velocity.set(0, 0, 0);
    this.accumulator = 0;
  }

  respawn() {
    const x = Math.floor(SIZE / 2), z = Math.floor(SIZE / 2);
    this.position.set(x + 0.5, this.world.surfaceHeight(x, z) + 0.01, z + 0.5);
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.position).y += EYE_HEIGHT;
  }

  overlapsBlock(x, y, z) {
    const p = this.position;
    return p.x + RADIUS > x && p.x - RADIUS < x + 1 &&
      p.y + BODY_HEIGHT > y && p.y < y + 1 && p.z + RADIUS > z && p.z - RADIUS < z + 1;
  }

  moveAxis(axis, distance) {
    if (distance === 0) return;
    this.position[axis] += distance;
    const p = this.position;
    const min = { x: p.x - RADIUS, y: p.y, z: p.z - RADIUS };
    const max = { x: p.x + RADIUS, y: p.y + BODY_HEIGHT, z: p.z + RADIUS };
    for (let x = Math.floor(min.x + EPSILON); x <= Math.floor(max.x - EPSILON); x++) {
      for (let y = Math.floor(min.y + EPSILON); y <= Math.floor(max.y - EPSILON); y++) {
        for (let z = Math.floor(min.z + EPSILON); z <= Math.floor(max.z - EPSILON); z++) {
          if (!this.world.isSolid(x, y, z) || !this.overlapsBlock(x, y, z)) continue;
          const block = { x, y, z }[axis];
          const lowerExtent = axis === 'y' ? 0 : RADIUS;
          const upperExtent = axis === 'y' ? BODY_HEIGHT : RADIUS;
          p[axis] = distance > 0 ? Math.min(p[axis], block - upperExtent) : Math.max(p[axis], block + 1 + lowerExtent);
          this.velocity[axis] = 0;
          if (axis === 'y' && distance < 0) this.grounded = true;
        }
      }
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
    if (this.keys.has('KeyW')) this.move.add(this.forward);
    if (this.keys.has('KeyS')) this.move.sub(this.forward);
    if (this.keys.has('KeyD')) this.move.add(this.right);
    if (this.keys.has('KeyA')) this.move.sub(this.right);
    this.move.normalize().multiplyScalar(5);
    while (this.accumulator >= STEP) {
      this.velocity.x = this.move.x;
      this.velocity.z = this.move.z;
      this.velocity.y = Math.max(this.velocity.y - 24 * STEP, -30);
      this.moveAxis('x', this.velocity.x * STEP);
      this.moveAxis('z', this.velocity.z * STEP);
      this.grounded = false;
      this.moveAxis('y', this.velocity.y * STEP);
      this.accumulator -= STEP;
    }
    if (this.position.y < -20) this.respawn();
    this.camera.position.copy(this.position).y += EYE_HEIGHT;
  }
}

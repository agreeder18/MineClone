import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World, SIZE, HEIGHT, BLOCK } from '../src/world.js';
import { Player } from '../src/player.js';

test('terrain fills all 64 × 64 columns with grass, dirt, and stone', () => {
  const world = new World();
  const heights = new Set();
  assert.equal(world.blocks.length, SIZE * SIZE * HEIGHT);
  for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) {
    const top = world.surfaceHeight(x, z) - 1;
    heights.add(top);
    assert.equal(world.getBlock(x, top, z), BLOCK.GRASS);
    for (let y = top - 1; y >= top - 3; y--) assert.equal(world.getBlock(x, y, z), BLOCK.DIRT);
    for (let y = 0; y < top - 3; y++) assert.equal(world.getBlock(x, y, z), BLOCK.STONE);
    assert.equal(world.getBlock(x, top + 1, z), BLOCK.AIR);
  }
  assert.ok(heights.size > 5);
  assert.deepEqual(world.blocks, new World().blocks);
  assert.notDeepEqual(world.blocks, new World(42).blocks);
});

test('meshing removes shared faces and maintains outward triangle winding', () => {
  const world = new World();
  world.blocks.fill(0);
  world.setBlock(2, 2, 2, BLOCK.STONE);
  world.setBlock(3, 2, 2, BLOCK.STONE);
  const scene = new THREE.Scene();
  world.buildMesh(scene);
  assert.equal(world.mesh.geometry.index.count, 10 * 6);
  for (const material of world.materials) {
    assert.equal(material.map.format, THREE.RGBAFormat);
    assert.equal(material.map.image.data.length, 16 * 16 * 4);
    for (let i = 3; i < material.map.image.data.length; i += 4) {
      assert.equal(material.map.image.data[i], 255);
    }
  }
  const { position, normal } = world.mesh.geometry.attributes;
  const index = world.mesh.geometry.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
    const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 1));
    const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 2));
    const n = new THREE.Vector3().fromBufferAttribute(normal, index.getX(i));
    assert.ok(b.sub(a).cross(c.sub(a)).dot(n) > 0);
  }
  world.setBlock(3, 2, 2, BLOCK.AIR);
  world.buildMesh(scene);
  assert.equal(scene.children.length, 1);
  assert.equal(world.mesh.geometry.index.count, 6 * 6);
  assert.equal(world.setBlock(-1, 3, 0, BLOCK.DIRT), false);
});

function makePlayer() {
  const world = new World();
  world.blocks.fill(0);
  for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) world.setBlock(x, 0, z, BLOCK.STONE);
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    world, camera: new THREE.PerspectiveCamera(), controls: { isLocked: true },
    position: new THREE.Vector3(3.5, 4, 3.5), velocity: new THREE.Vector3(),
    keys: new Set(), grounded: false, accumulator: 0,
    forward: new THREE.Vector3(), right: new THREE.Vector3(), move: new THREE.Vector3(),
  });
  return player;
}

test('gravity lands on blocks and jumping returns to the floor', () => {
  const player = makePlayer();
  for (let i = 0; i < 120; i++) player.update(1 / 60);
  assert.equal(player.position.y, 1);
  assert.equal(player.grounded, true);
  player.velocity.y = 8;
  player.grounded = false;
  for (let i = 0; i < 12; i++) player.update(1 / 60);
  assert.ok(player.position.y > 2);
  for (let i = 0; i < 100; i++) player.update(1 / 60);
  assert.equal(player.position.y, 1);
  assert.equal(player.camera.position.y, 2.62);
});

test('walls, ceilings, world bounds, and player placement overlaps', () => {
  const player = makePlayer();
  player.position.set(3.5, 1, 3.5);
  player.world.setBlock(4, 1, 3, BLOCK.STONE);
  player.world.setBlock(4, 2, 3, BLOCK.STONE);
  player.moveAxis('x', 0.4);
  assert.equal(player.position.x, 3.7);
  assert.equal(player.overlapsBlock(4, 1, 3), false);
  assert.equal(player.overlapsBlock(3, 2, 3), true);
  player.world.setBlock(3, 3, 3, BLOCK.STONE);
  player.moveAxis('y', 0.4);
  assert.equal(player.position.y, 1.2);
  player.position.set(0.35, 1, 3.5);
  player.moveAxis('x', -0.1);
  assert.equal(player.position.x, 0.3);
});

test('diagonal speed is normalized and pause stops physics', () => {
  const straight = makePlayer(), diagonal = makePlayer();
  straight.position.y = diagonal.position.y = 1;
  straight.keys.add('KeyW');
  diagonal.keys.add('KeyW'); diagonal.keys.add('KeyD');
  straight.update(0.1); diagonal.update(0.1);
  const distance = (player) => Math.hypot(player.position.x - 3.5, player.position.z - 3.5);
  assert.ok(Math.abs(distance(straight) - distance(diagonal)) < 0.00001);
  const before = diagonal.position.clone();
  diagonal.controls.isLocked = false;
  diagonal.update(1);
  assert.deepEqual(diagonal.position, before);
});

import * as THREE from 'three';
import { World, BLOCK, BLOCK_PALETTE, HEIGHT } from './world.js';
import { Player } from './player.js';
import './style.css';

const menu = document.querySelector('#menu');
const status = document.querySelector('#status');
const play = document.querySelector('#play');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9d5dd');
scene.fog = new THREE.Fog('#b9d5dd', 48, 110);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 160);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  status.textContent = 'WebGL is unavailable. Please enable hardware acceleration and reload.';
  play.disabled = true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x655b40, 2.2));
const sunlight = new THREE.DirectionalLight(0xfff1d5, 2.5);
sunlight.position.set(-30, 65, 25);
scene.add(sunlight);

const world = new World();
world.buildMesh(scene);
const player = new Player(camera, renderer.domElement, world);
camera.rotation.set(-0.15, -Math.PI * 0.7, 0, 'YXZ');

// Quiet, block-shaped clouds give scale without obscuring the playable world.
const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const cloudGeometry = new THREE.BoxGeometry(1, 1, 1);
const cloudRandom = (n) => Math.abs(Math.sin(n * 127.1) * 43758.5453) % 1;
for (let i = 0; i < 18; i++) {
  const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
  cloud.position.set(cloudRandom(i + 1) * 160 - 48, 39 + cloudRandom(i + 2) * 10, cloudRandom(i + 3) * 160 - 48);
  cloud.scale.set(5 + cloudRandom(i + 4) * 8, 1.3, 3 + cloudRandom(i + 5) * 4);
  scene.add(cloud);
}

const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005)),
  new THREE.LineBasicMaterial({ color: 0x233b2a }),
);
outline.visible = false;
scene.add(outline);
const raycaster = new THREE.Raycaster();
raycaster.far = 6;
const center = new THREE.Vector2();
const hitPoint = new THREE.Vector3();
let target = null;
let selectedBlock = BLOCK.GRASS;

const hotbar = document.querySelector('.hotbar');
hotbar.innerHTML = BLOCK_PALETTE.map(({ id, name, style }, index) => `
  <button class="slot${index === 0 ? ' active' : ''}" data-block="${id}"
    aria-label="${name}, key ${(index + 1) % 10}" aria-pressed="${index === 0}" title="${name} (${(index + 1) % 10})">
    <span class="key">${(index + 1) % 10}</span><span class="block ${style}"></span><span>${name}</span>
  </button>`).join('');

function updateTarget() {
  outline.visible = false;
  target = null;
  if (!player.controls.isLocked) return;
  raycaster.setFromCamera(center, camera);
  const hit = raycaster.intersectObject(world.mesh)[0];
  if (!hit) return;
  hitPoint.copy(hit.point).addScaledVector(hit.face.normal, -0.001).floor();
  target = { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z, normal: hit.face.normal.clone() };
  outline.position.copy(hitPoint).addScalar(0.5);
  outline.visible = true;
}

function selectBlock(block) {
  selectedBlock = block;
  document.querySelectorAll('.slot').forEach((slot) => {
    const active = Number(slot.dataset.block) === block;
    slot.classList.toggle('active', active);
    slot.setAttribute('aria-pressed', String(active));
  });
}

document.querySelectorAll('.slot').forEach((slot) => slot.addEventListener('click', () => selectBlock(Number(slot.dataset.block))));
document.addEventListener('keydown', (event) => {
  const match = /^Digit([0-9])$/.exec(event.code);
  if (match) selectBlock(BLOCK_PALETTE[(Number(match[1]) + 9) % 10].id);
});

play.addEventListener('click', () => {
  status.textContent = 'Click to capture your mouse · Esc to pause';
  try {
    const request = player.controls.lock();
    request?.catch(() => { status.textContent = 'Mouse capture was declined. Click Enter world to try again.'; });
  } catch {
    status.textContent = 'Mouse capture was declined. Click Enter world to try again.';
  }
});
document.addEventListener('pointerlockerror', () => {
  status.textContent = 'Mouse capture was declined. Click Enter world to try again.';
});
player.controls.addEventListener('lock', () => {
  menu.classList.add('hidden');
  document.body.classList.add('playing');
});
player.controls.addEventListener('unlock', () => {
  menu.classList.remove('hidden');
  document.body.classList.remove('playing');
  play.innerHTML = 'Back to exploring <span>↗</span>';
  outline.visible = false;
});

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!player.controls.isLocked || ![0, 2].includes(event.button)) return;
  updateTarget();
  if (!target) return;
  let { x, y, z, normal } = target;
  if (event.button === 0) {
    if (y === 0) return; // Keep a solid foundation beneath the world.
    world.setBlock(x, y, z, BLOCK.AIR);
  } else {
    x += normal.x; y += normal.y; z += normal.z;
    if (y >= HEIGHT || !world.inBounds(x, y, z) || world.getBlock(x, y, z) || player.overlapsBlock(x, y, z)) return;
    world.setBlock(x, y, z, selectedBlock);
  }
  world.buildMesh(scene);
  updateTarget();
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

let previousTime = performance.now();
let hudTime = 0;
const coordinates = document.querySelector('#coordinates');
renderer.setAnimationLoop((now) => {
  const delta = (now - previousTime) / 1000;
  previousTime = now;
  player.update(delta);
  updateTarget();
  hudTime += delta;
  if (hudTime > 0.15) {
    const { x, y, z } = player.position;
    coordinates.textContent = `X ${x.toFixed(1)}  /  Y ${y.toFixed(1)}  /  Z ${z.toFixed(1)}`;
    hudTime = 0;
  }
  renderer.render(scene, camera);
});

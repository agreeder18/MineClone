import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export const SIZE = 64;
export const HEIGHT = 40;
export const BLOCK = Object.freeze({ AIR: 0, GRASS: 1, DIRT: 2, STONE: 3 });

// A reproducible world, including the pixel textures.
function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

const faces = [
  { normal: [1, 0, 0], corners: [[1,0,1],[1,0,0],[1,1,1],[1,1,0]] },
  { normal: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,0],[0,1,1]] },
  { normal: [0, 1, 0], corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]] },
  { normal: [0, -1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { normal: [0, 0, 1], corners: [[0,0,1],[1,0,1],[0,1,1],[1,1,1]] },
  { normal: [0, 0, -1], corners: [[1,0,0],[0,0,0],[1,1,0],[0,1,0]] },
];

function makeMaterial(type) {
  const random = randomGenerator(123 + type);
  const data = new Uint8Array(16 * 16 * 4);
  const base = [[112, 151, 66], [115, 87, 58], [131, 135, 133], [115, 87, 58]][type];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = type === 3 && y > 12 + Math.floor(random() * 2) ? [112, 151, 66] : base;
      const shade = 0.83 + random() * 0.34;
      const offset = (y * 16 + x) * 4;
      for (let c = 0; c < 3; c++) data[offset + c] = color[c] * shade;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, 16, 16, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return new THREE.MeshLambertMaterial({ map: texture });
}

export class World {
  constructor(seed = 4815) {
    this.blocks = new Uint8Array(SIZE * HEIGHT * SIZE);
    this.noise = createNoise2D(randomGenerator(seed));
    this.mesh = null;
    this.materials = null;
    this.generate();
  }

  inBounds(x, y, z) {
    return x >= 0 && x < SIZE && z >= 0 && z < SIZE && y >= 0 && y < HEIGHT;
  }

  index(x, y, z) { return x + SIZE * (z + SIZE * y); }

  getBlock(x, y, z) {
    return this.inBounds(x, y, z) ? this.blocks[this.index(x, y, z)] : BLOCK.AIR;
  }

  isSolid(x, y, z) {
    // World edges act as walls so the player cannot walk into the void.
    return x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0 || this.getBlock(x, y, z) !== BLOCK.AIR;
  }

  setBlock(x, y, z, block) {
    if (!this.inBounds(x, y, z)) return false;
    this.blocks[this.index(x, y, z)] = block;
    return true;
  }

  surfaceHeight(x, z) {
    for (let y = HEIGHT - 1; y >= 0; y--) if (this.getBlock(x, y, z)) return y + 1;
    return 0;
  }

  generate() {
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const broad = this.noise(x / 42, z / 42);
        const detail = this.noise(x / 15, z / 15);
        const height = Math.floor(12 + broad * 7 + detail * 2);
        for (let y = 0; y <= height; y++) {
          this.setBlock(x, y, z, y === height ? BLOCK.GRASS : y >= height - 3 ? BLOCK.DIRT : BLOCK.STONE);
        }
      }
    }
  }

  buildMesh(scene) {
    this.materials ??= [0, 1, 2, 3].map(makeMaterial);
    const positions = [], normals = [], uvs = [], indices = [];
    const geometry = new THREE.BufferGeometry();
    // Group faces by material to keep the entire terrain to four draw calls.
    for (let material = 0; material < 4; material++) {
      const start = indices.length;
      for (let y = 0; y < HEIGHT; y++) for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
        const block = this.getBlock(x, y, z);
        if (!block) continue;
        for (const face of faces) {
          const [nx, ny, nz] = face.normal;
          const faceMaterial = block === BLOCK.GRASS ? (ny === 1 ? 0 : ny === -1 ? 1 : 3) : block === BLOCK.DIRT ? 1 : 2;
          if (faceMaterial !== material || this.getBlock(x + nx, y + ny, z + nz)) continue;
          const offset = positions.length / 3;
          for (const [dx, dy, dz] of face.corners) {
            positions.push(x + dx, y + dy, z + dz);
            normals.push(nx, ny, nz);
          }
          uvs.push(0,0, 1,0, 0,1, 1,1);
          indices.push(offset, offset+1, offset+2, offset+2, offset+1, offset+3);
        }
      }
      geometry.addGroup(start, indices.length - start, material);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.mesh = new THREE.Mesh(geometry, this.materials);
    scene.add(this.mesh);
  }
}

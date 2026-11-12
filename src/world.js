import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export const SIZE = 64;
export const HEIGHT = 40;
export const BLOCK = Object.freeze({
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4,
  WOOD: 5, PLANKS: 6, BRICKS: 7, LEAVES: 8, DIAMOND: 9, CRAFTING_TABLE: 10,
});

export const BLOCK_PALETTE = Object.freeze([
  { id: BLOCK.GRASS, name: 'Grass', style: 'grass' },
  { id: BLOCK.DIRT, name: 'Dirt', style: 'dirt' },
  { id: BLOCK.STONE, name: 'Stone', style: 'stone' },
  { id: BLOCK.SAND, name: 'Sand', style: 'sand' },
  { id: BLOCK.WOOD, name: 'Wood', style: 'wood' },
  { id: BLOCK.PLANKS, name: 'Planks', style: 'planks' },
  { id: BLOCK.BRICKS, name: 'Bricks', style: 'bricks' },
  { id: BLOCK.LEAVES, name: 'Leaves', style: 'leaves' },
  { id: BLOCK.DIAMOND, name: 'Diamond ore', style: 'diamond' },
  { id: BLOCK.CRAFTING_TABLE, name: 'Crafting table', style: 'crafting-table' },
]);

const MATERIAL_COLORS = [
  [112, 151, 66], [115, 87, 58], [131, 135, 133], [115, 87, 58],
  [219, 201, 147], [111, 76, 45], [182, 139, 84], [165, 78, 56],
  [65, 122, 53], [131, 135, 133], [157, 105, 57], [190, 142, 83],
];
const TABLE_TOP_MATERIAL = 11;

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
  const base = MATERIAL_COLORS[type];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let color = type === 3 && y > 12 + Math.floor(random() * 2) ? MATERIAL_COLORS[0] : base;
      if (type === BLOCK.WOOD && (x % 5 === 0 || (x + Math.floor(y / 5)) % 7 === 0)) color = [78, 51, 32];
      if (type === BLOCK.PLANKS && (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0)) color = [115, 79, 44];
      if (type === BLOCK.BRICKS && (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0)) color = [194, 180, 157];
      if (type === BLOCK.CRAFTING_TABLE) {
        // Dark corner posts, plank seams, and a hanging metal tool.
        if (x < 2 || x > 13 || y < 2 || y > 13 || y === 6) color = [83, 51, 29];
        if ((x === 5 && y >= 4 && y <= 11) || (y === 11 && x >= 4 && x <= 7)) color = [190, 195, 184];
        if (x === 10 && y >= 4 && y <= 10) color = [73, 47, 29];
      }
      if (type === TABLE_TOP_MATERIAL) {
        // A 3 × 3 crafting grid inside a sturdy wooden rim.
        if (x < 2 || x > 13 || y < 2 || y > 13) color = [102, 64, 34];
        else if (x === 6 || x === 10 || y === 6 || y === 10) color = [88, 53, 29];
      }
      // Five cyan crystal flecks repeat across each stone face.
      if (type === BLOCK.DIAMOND) {
        for (const [cx, cy] of [[3, 3], [11, 4], [7, 8], [3, 12], [12, 12]]) {
          if (Math.abs(x - cx) + Math.abs(y - cy) <= 2) {
            color = x < cx ? [170, 255, 250] : [48, 212, 218];
            break;
          }
        }
      }
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
    this.seed = seed;
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
    this.blocks.fill(BLOCK.AIR);
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
    // Seeded, short random walks replace only deep stone with diamond veins.
    const random = randomGenerator(this.seed ^ 0xD1A);
    for (let vein = 0; vein < 100; vein++) {
      let x = 1 + Math.floor(random() * (SIZE - 2));
      let y = 1 + Math.floor(random() * 8);
      let z = 1 + Math.floor(random() * (SIZE - 2));
      const length = 3 + Math.floor(random() * 5);
      for (let step = 0; step < length; step++) {
        if (y >= 1 && y <= 8 && y <= this.surfaceHeight(x, z) - 6 && this.getBlock(x, y, z) === BLOCK.STONE) {
          this.setBlock(x, y, z, BLOCK.DIAMOND);
        }
        const direction = faces[Math.floor(random() * faces.length)].normal;
        x += direction[0]; y += direction[1]; z += direction[2];
      }
    }
  }

  buildMesh(scene) {
    this.materials ??= MATERIAL_COLORS.map((_, index) => makeMaterial(index));
    const positions = [], normals = [], uvs = [], indices = [];
    const geometry = new THREE.BufferGeometry();
    // Group exposed faces by material instead of drawing individual cubes.
    for (let material = 0; material < this.materials.length; material++) {
      const start = indices.length;
      for (let y = 0; y < HEIGHT; y++) for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
        const block = this.getBlock(x, y, z);
        if (!block) continue;
        for (const face of faces) {
          const [nx, ny, nz] = face.normal;
          const faceMaterial = block === BLOCK.GRASS ? (ny === 1 ? 0 : ny === -1 ? 1 : 3)
            : block === BLOCK.CRAFTING_TABLE ? (ny === 1 ? TABLE_TOP_MATERIAL : ny === -1 ? BLOCK.PLANKS : BLOCK.CRAFTING_TABLE)
            : block === BLOCK.DIRT ? 1 : block === BLOCK.STONE ? 2 : block;
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

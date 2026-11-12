import { createWaterMaterial } from "./water.js";
import * as THREE from "three";
import { createNoise2D, createNoise3D } from "simplex-noise";
import { blocks, byKey, byId, BLOCK, biomes } from "./registry.js";
export { BLOCK } from "./registry.js";
export const CHUNK_SIZE = 16;
export const HEIGHT = 96;
export const SEA_LEVEL = 28;
export const UNLOAD_DISTANCE = 6;
// No fixed map edge; reserve space for the streamed neighborhood within JS
// integer precision. Vertical terrain remains bounded by HEIGHT.
export const WORLD_LIMIT = Number.MAX_SAFE_INTEGER - CHUNK_SIZE * (UNLOAD_DISTANCE + 1);
const biomeMap = Object.fromEntries(biomes.map((b) => [b.key, b]));
const landBiomes = [
  "snowy_forest",
  "taiga",
  "birch_forest",
  "forest",
  "plains",
  "meadow",
  "dark_forest",
  "cherry_grove",
  "swamp",
  "mangrove_swamp",
  "savanna",
  "desert",
  "badlands",
  "jungle",
  "bamboo_jungle",
  "mushroom_island",
];
export function seedHash(value) {
  let hash = 2166136261;
  for (const c of String(value))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export const faces = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [1, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
];
const key3 = (x, y, z) => `${x},${y},${z}`;
export const chunkKey = (cx, cz) => `${cx},${cz}`;
const local = (n) => ((n % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
const index = (x, y, z) => local(x) + CHUNK_SIZE * (local(z) + CHUNK_SIZE * y);

function makeAtlas() {
  const tiles = [
    ...blocks,
    { ...byKey.grass, key: "grass_top", texture: "grass_top" },
    ...blocks.filter((b) => b.texture === "bark").map((b) => ({
      ...b, key: `${b.key}_end`, texture: "rings",
    })),
    { ...byKey.crafting_table, key: "table_top", texture: "grid" },
  ];
  const columns = 16,
    rows = Math.ceil(tiles.length / columns),
    width = columns * 16,
    height = rows * 16;
  const pixels = new Uint8Array(width * height * 4);
  const tileByKey = {};
  tiles.forEach((block, tile) => {
    tileByKey[block.key] = tile;
    const rng = random(seedHash(block.key));
    const base = new THREE.Color(block.color);
    // Color constructor is linear; textures store sRGB bytes.
    base.convertLinearToSRGB();
    const accent = new THREE.Color(
      block.accent ?? "#3e392e",
    ).convertLinearToSRGB();
    // Original deterministic pixel art: clustered grain instead of white noise.
    const grain = Array.from({ length: 64 }, () => rng());
    const grassEdge = Array.from({ length: 16 }, () => 10 + Math.floor(rng() * 4));
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let color = base,
          shade = 0.76 + grain[Math.floor(y / 2) * 8 + Math.floor(x / 2)] * 0.32 + rng() * 0.12;
        if (block.texture === "grass" && y < grassEdge[x])
          color = new THREE.Color("#86623e").convertLinearToSRGB();
        if (block.texture === "grass_top")
          shade *= (x * 3 + y * 7) % 13 < 3 ? 0.82 : 1.05;
        if (block.texture === "rings") {
          const ring = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)));
          color = new THREE.Color(block.color).convertLinearToSRGB();
          shade *= ring === 7 ? 0.55 : ring % 2 === 0 ? 1.3 : 0.85;
        }
        if (block.texture === "cobble") {
          const row = Math.floor(y / 5);
          const cellX = (x + (row % 2) * 3) % 8;
          shade *= y % 5 === 0 || cellX === 0 ? 0.58 : y % 5 === 1 || cellX === 1 ? 1.15 : 0.95;
        }
        if (
          block.texture === "bark" &&
          (x % 5 === 0 || (x + Math.floor(y / 5)) % 7 === 0)
        )
          shade *= 0.65;
        if (
          block.texture === "planks" &&
          (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0)
        )
          shade *= 0.65;
        if (
          block.texture === "bricks" &&
          (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0)
        )
          shade *= 0.65;
        if (
          block.texture === "grid" &&
          (x < 2 ||
            x > 13 ||
            y < 2 ||
            y > 13 ||
            x === 6 ||
            x === 10 ||
            y === 6 ||
            y === 10)
        )
          shade *= 0.45;
        if (
          block.texture === "table" &&
          (x < 2 || x > 13 || y < 2 || y > 13 || y === 6 || (x === 5 && y < 12))
        )
          shade *= 0.5;
        if (
          block.texture === "metal" &&
          (x === 1 || x === 14 || y === 1 || y === 14)
        )
          shade *= 0.7;
        if (block.texture === "glass")
          shade =
            x === 0 || y === 0 || x === 15 || y === 15 || x + y === 15
              ? 1.15
              : 0.75;
        if (block.texture === "ore")
          for (const [cx, cy] of [
            [3, 3],
            [11, 4],
            [7, 8],
            [3, 12],
            [12, 12],
          ]) {
            if (Math.abs(x - cx) + Math.abs(y - cy) <= 2) {
              color = accent;
              break;
            }
          }
        const offset =
          ((Math.floor(tile / columns) * 16 + y) * width +
            (tile % columns) * 16 +
            x) *
          4;
        pixels[offset] = Math.min(255, color.r * 255 * shade);
        pixels[offset + 1] = Math.min(255, color.g * 255 * shade);
        pixels[offset + 2] = Math.min(255, color.b * 255 * shade);
        pixels[offset + 3] = 255;
      }
  });
  const texture = new THREE.DataTexture(
    pixels,
    width,
    height,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return {
    material: new THREE.MeshLambertMaterial({ map: texture }),
    tileByKey,
    columns,
    rows,
  };
}

export class World {
  constructor(seed = "Fieldwork", edits = [], waterLevels = []) {
    this.seed = String(seed);
    this.hash = seedHash(seed);
    this.noise = createNoise2D(random(this.hash));
    this.caves = createNoise3D(random(this.hash ^ 29183));
    this.chunks = new Map();
    this.edits = new Map();
    this.waterLevels = new Map(waterLevels);
    this.waterQueue = new Map();
    this.columns = new Map();
    this.scene = null;
    this.atlas = null;
    this.queue = [];
    this.center = "";
    this.renderDistance = UNLOAD_DISTANCE;
    for (const [key, value] of edits) this.edits.set(key, value);
  }
  inBounds(x, y, z) {
    return (
      Number.isSafeInteger(x) &&
      Number.isInteger(y) &&
      Number.isSafeInteger(z) &&
      Math.abs(x) < WORLD_LIMIT &&
      Math.abs(z) < WORLD_LIMIT &&
      y >= 0 &&
      y < HEIGHT
    );
  }
  column(x, z) {
    const key = `${x},${z}`;
    if (this.columns.has(key)) return this.columns.get(key);
    const continental = this.noise(x / 420, z / 420);
    const hills = this.noise(x / 95, z / 95);
    const ridge =
      Math.pow(Math.max(0, this.noise(x / 200 + 711, z / 200 - 293)), 2) * 34;
    let height = Math.floor(32 + continental * 17 + hills * 5 + ridge);
    const climate = this.noise(x / 310 + 883, z / 310 + 411);
    const moisture = this.noise(x / 260 - 231, z / 260 + 190);
    const band = Math.min(3, Math.max(0, Math.floor((climate + 1) * 2)));
    const wet = Math.min(3, Math.max(0, Math.floor((moisture + 1) * 2)));
    let biome = landBiomes[band * 4 + wet];
    const river = Math.abs(this.noise(x / 260 + 300, z / 260 - 300));
    if (river < 0.035 && height < 48)
      height = Math.min(height, Math.floor(24 + (river / 0.035) * 6));
    if (height < SEA_LEVEL - 3) biome = climate > 0.3 ? "coral_reef" : "ocean";
    else if (height <= SEA_LEVEL + 1) biome = river < 0.035 ? "river" : "beach";
    else if (height > 57) biome = "snowy_peaks";
    else if (height > 48) biome = "mountains";
    height = Math.max(8, Math.min(HEIGHT - 14, height));
    const result = {
      height,
      biome,
      surface: byKey[biomeMap[biome].surface].id,
    };
    this.columns.set(key, result);
    return result;
  }
  biomeAt(x, y, z) {
    const column = this.column(Math.floor(x), Math.floor(z));
    if (y < column.height - 6)
      return y < 12
        ? "deep_dark"
        : this.noise(x / 60, z / 60) > 0.1
          ? "lush_caves"
          : "dripstone_caves";
    return column.biome;
  }
  treeAt(gx, gz) {
    const hash = seedHash(`${this.seed}:${gx}:${gz}`),
      x = gx * 7 + 1 + (hash % 5),
      z = gz * 7 + 1 + ((hash >>> 5) % 5);
    const col = this.column(x, z),
      biome = biomeMap[col.biome];
    const density = [
      "forest",
      "birch_forest",
      "dark_forest",
      "jungle",
      "bamboo_jungle",
      "taiga",
      "snowy_forest",
      "cherry_grove",
      "mangrove_swamp",
    ].includes(col.biome)
      ? 0.75
      : 0.12;
    if (
      !biome.tree ||
      col.height <= SEA_LEVEL ||
      ((hash >>> 12) % 100) / 100 > density
    )
      return null;
    return {
      x,
      z,
      y: col.height + 1,
      height: 4 + (hash % 3),
      wood: biome.tree,
    };
  }
  sampleBlock(x, y, z) {
    if (!this.inBounds(x, y, z)) return BLOCK.AIR;
    if (y === 0) return BLOCK.BEDROCK;
    const col = this.column(x, z);
    if (y > col.height) {
      if (y <= SEA_LEVEL) return BLOCK.WATER;
      if (y <= col.height + 11) {
        const gx = Math.floor(x / 7),
          gz = Math.floor(z / 7);
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            const tree = this.treeAt(gx + dx, gz + dz);
            if (!tree) continue;
            if (
              x === tree.x &&
              z === tree.z &&
              y >= tree.y &&
              y < tree.y + tree.height
            )
              return byKey[`${tree.wood}_log`].id;
            if (
              Math.abs(x - tree.x) <= 2 &&
              Math.abs(z - tree.z) <= 2 &&
              y >= tree.y + tree.height - 2 &&
              y <= tree.y + tree.height &&
              Math.abs(x - tree.x) + Math.abs(z - tree.z) < 4
            )
              return byKey[`${tree.wood}_leaves`].id;
          }
      }
      return BLOCK.AIR;
    }
    if (y === col.height) return col.surface;
    if (y > col.height - 3)
      return col.surface === BLOCK.SAND
        ? BLOCK.SANDSTONE
        : col.surface === BLOCK.TERRACOTTA
          ? BLOCK.TERRACOTTA
          : col.surface === BLOCK.SNOW
            ? BLOCK.DIRT
            : BLOCK.DIRT;
    const cave = this.caves(x / 24, y / 17, z / 24);
    if (y < col.height - 4 && cave > 0.54)
      return y < 10 ? BLOCK.WATER : BLOCK.AIR;
    const vein = this.caves(x / 5 + 113, y / 5, z / 5 - 219);
    if (vein > 0.65) {
      if (y < 13) return BLOCK.DIAMOND_ORE;
      if (y < 20) return BLOCK.GOLD_ORE;
      if (y < 30) return BLOCK.IRON_ORE;
      return BLOCK.COAL_ORE;
    }
    if (vein < -0.72) return y < 20 ? BLOCK.REDSTONE_ORE : BLOCK.COPPER_ORE;
    if (vein > 0.61 && y < 22) return BLOCK.LAPIS_ORE;
    if (vein < -0.68 && col.height > 48) return BLOCK.EMERALD_ORE;
    return y < 12 ? BLOCK.DEEPSLATE : BLOCK.STONE;
  }
  getBlock(x, y, z) {
    if (!this.inBounds(x, y, z)) return BLOCK.AIR;
    const edited = this.edits.get(key3(x, y, z));
    if (edited !== undefined) return edited;
    const chunk = this.chunks.get(
      chunkKey(Math.floor(x / 16), Math.floor(z / 16)),
    );
    return chunk ? chunk.data[index(x, y, z)] : this.sampleBlock(x, y, z);
  }
  isSolid(x, y, z) {
    return (
      y < 0 ||
      Math.abs(x) >= WORLD_LIMIT ||
      Math.abs(z) >= WORLD_LIMIT ||
      Boolean(byId[this.getBlock(x, y, z)]?.solid)
    );
  }
  isWater(x, y, z) {
    return (
      this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === BLOCK.WATER
    );
  }
  surfaceHeight(x, z) {
    x = Math.floor(x);
    z = Math.floor(z);
    for (let y = HEIGHT - 1; y >= 0; y--)
      if (this.isSolid(x, y, z)) return y + 1;
    return 1;
  }
  findSpawn() {
    for (let radius = 0; radius < 128; radius += 4)
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.cos((i * Math.PI) / 4) * radius),
          z = Math.floor(Math.sin((i * Math.PI) / 4) * radius);
        const col = this.column(x, z);
        if (col.height > SEA_LEVEL + 1 && col.height < 50)
          return { x: x + 0.5, y: this.surfaceHeight(x, z) + 0.01, z: z + 0.5 };
      }
    return { x: 0.5, y: SEA_LEVEL + 4, z: 0.5 };
  }
  setBlock(x, y, z, id) {
    if (!this.inBounds(x, y, z) || y === 0 || (id !== 0 && !byId[id]))
      return false;
    if (this.getBlock(x, y, z) === id) return true;
    this.edits.set(key3(x, y, z), id);
    this.waterLevels.delete(key3(x, y, z));
    for (const [dx, dy, dz] of [[0,0,0], [0,1,0], [1,0,0], [-1,0,0], [0,0,1], [0,0,-1]])
      this.queueWater(x + dx, y + dy, z + dz);
    const cx = Math.floor(x / 16),
      cz = Math.floor(z / 16);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (chunk) chunk.data[index(x, y, z)] = id;
    // Interior edits affect only this chunk; seam edits also change the
    // touching neighbor's exposed face, never diagonal or distant chunks.
    if (this.scene)
      for (const [dx, dz] of [
        [0, 0],
        ...(local(x) === 0 ? [[-1, 0]] : []),
        ...(local(x) === 15 ? [[1, 0]] : []),
        ...(local(z) === 0 ? [[0, -1]] : []),
        ...(local(z) === 15 ? [[0, 1]] : []),
      ]) {
        const neighbor = this.chunks.get(chunkKey(cx + dx, cz + dz));
        if (neighbor) this.buildChunk(neighbor);
      }
    return true;
  }
  queueWater(x, y, z) {
    if (!this.inBounds(x, y, z) || this.getBlock(x, y, z) !== BLOCK.WATER) return;
    const below = this.getBlock(x, y - 1, z);
    if ((y > 1 && below === BLOCK.AIR) || (below !== BLOCK.WATER &&
        [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz]) => this.getBlock(x+dx,y,z+dz) === BLOCK.AIR)))
      this.waterQueue.set(key3(x, y, z), [x, y, z]);
  }
  flowWater(budget = 8) {
    const dirty = new Set();
    let changed = false;
    // Only loaded chunks are simulated. Each tick has a bounded work budget.
    while (budget-- > 0 && this.waterQueue.size) {
      const [key, [x, y, z]] = this.waterQueue.entries().next().value;
      this.waterQueue.delete(key);
      if (!this.chunks.has(chunkKey(Math.floor(x / 16), Math.floor(z / 16)))) continue;
      if (this.getBlock(x, y, z) !== BLOCK.WATER) continue;
      const level = this.waterLevels.get(key) ?? 0;
      const below = this.getBlock(x, y - 1, z);
      const targets = below === BLOCK.AIR && y > 1
        ? [[x, y - 1, z, level]]
        : below !== BLOCK.WATER && level < 7
          ? [[x+1,y,z,level+1], [x-1,y,z,level+1], [x,y,z+1,level+1], [x,y,z-1,level+1]] : [];
      for (const [ax, ay, az, nextLevel] of targets) {
        if (!this.inBounds(ax, ay, az) || ay === 0) continue;
        const cx = Math.floor(ax / 16), cz = Math.floor(az / 16);
        const chunk = this.chunks.get(chunkKey(cx, cz));
        if (!chunk || this.getBlock(ax, ay, az) !== BLOCK.AIR) continue;
        const targetKey = key3(ax, ay, az);
        this.edits.set(targetKey, BLOCK.WATER);
        this.waterLevels.set(targetKey, nextLevel);
        chunk.data[index(ax, ay, az)] = BLOCK.WATER;
        this.queueWater(ax, ay, az);
        changed = true;
        dirty.add(chunk);
        for (const [dx, dz] of [
          ...(local(ax) === 0 ? [[-1,0]] : []),
          ...(local(ax) === 15 ? [[1,0]] : []),
          ...(local(az) === 0 ? [[0,-1]] : []),
          ...(local(az) === 15 ? [[0,1]] : []),
        ]) {
          const neighbor = this.chunks.get(chunkKey(cx+dx, cz+dz));
          if (neighbor) dirty.add(neighbor);
        }
      }
    }
    for (const chunk of dirty) this.buildChunk(chunk);
    return changed;
  }
  generateChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key)) return this.chunks.get(key);
    const data = new Uint16Array(16 * 16 * HEIGHT);
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const wx = cx * 16 + x,
          wz = cz * 16 + z,
          top = Math.min(
            HEIGHT - 1,
            Math.max(SEA_LEVEL, this.column(wx, wz).height + 11),
          );
        for (let y = 0; y <= top; y++)
          data[index(x, y, z)] =
            this.edits.get(key3(wx, y, wz)) ?? this.sampleBlock(wx, y, wz);
        // Player builds may extend far above the terrain.
        for (let y = top + 1; y < HEIGHT; y++)
          data[index(x, y, z)] = this.edits.get(key3(wx, y, wz)) ?? 0;
      }
    const chunk = { cx, cz, data, meshes: [] };
    this.chunks.set(key, chunk);
    for (let y = 1; y < HEIGHT; y++)
      for (let z = 0; z < CHUNK_SIZE; z++)
        for (let x = 0; x < CHUNK_SIZE; x++)
          if (data[index(x, y, z)] === BLOCK.WATER)
            this.queueWater(cx * 16 + x, y, cz * 16 + z);
    return chunk;
  }
  attach(scene) {
    this.scene = scene;
    this.atlas ??= makeAtlas();
    this.waterMaterial ??= createWaterMaterial();
  }
  buildChunk(chunk) {
    if (!this.scene) return;
    for (const mesh of chunk.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    chunk.meshes = [];
    // One indexed geometry per chunk, with contiguous terrain/water groups.
    // Four vertices per face share six indices instead of duplicating vertices.
    const positions = [],
      normals = [],
      uvs = [],
      solidIndices = [],
      waterIndices = [];
    for (let y = 0; y < HEIGHT; y++)
      for (let z = 0; z < CHUNK_SIZE; z++)
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const id = chunk.data[index(x, y, z)];
          if (id === BLOCK.AIR) continue;
          const b = byId[id],
            wx = chunk.cx * CHUNK_SIZE + x,
            wz = chunk.cz * CHUNK_SIZE + z;
          for (const { normal, corners } of faces) {
            const [nx, ny, nz] = normal;
            const ax = x + nx,
              ay = y + ny,
              az = z + nz;
            // Only seam faces need a world lookup (possibly unloaded terrain).
            const other = ay < 0 || ay >= HEIGHT
              ? BLOCK.AIR
              : ax >= 0 && ax < CHUNK_SIZE && az >= 0 && az < CHUNK_SIZE
                ? chunk.data[index(ax, ay, az)]
                : this.getBlock(wx + nx, ay, wz + nz);
            if (other !== BLOCK.AIR) continue;
            const texture =
              b.texture === "bark" && ny !== 0
                ? `${b.key}_end`
                : b.key === "grass" && ny === -1
                  ? "dirt"
                  : b.key === "grass" && ny === 1
                ? "grass_top"
                : b.key === "crafting_table" && ny === 1
                  ? "table_top"
                  : b.key;
            const tile = this.atlas.tileByKey[texture],
              u = (tile % this.atlas.columns) / this.atlas.columns,
              v = Math.floor(tile / this.atlas.columns) / this.atlas.rows;
            // Half-pixel inset avoids neighboring tile bleed.
            const du = 0.5 / (this.atlas.columns * 16),
              dv = 0.5 / (this.atlas.rows * 16),
              uv = [
                [u + du, v + dv],
                [u + 1 / this.atlas.columns - du, v + dv],
                [u + du, v + 1 / this.atlas.rows - dv],
                [u + 1 / this.atlas.columns - du, v + 1 / this.atlas.rows - dv],
              ];
            const base = positions.length / 3;
            for (let i = 0; i < 4; i++) {
              const [dx, dy, dz] = corners[i];
              positions.push(wx + dx, y + dy, wz + dz);
              normals.push(...normal);
              uvs.push(...uv[i]);
            }
            const bucket = id === BLOCK.WATER ? waterIndices : solidIndices;
            for (const i of [0, 1, 2, 2, 1, 3]) bucket.push(base + i);
          }
        }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(solidIndices.concat(waterIndices));
    if (solidIndices.length) geometry.addGroup(0, solidIndices.length, 0);
    if (waterIndices.length)
      geometry.addGroup(solidIndices.length, waterIndices.length, 1);
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, [
      this.atlas.material,
      this.waterMaterial,
    ]);
    chunk.meshes.push(mesh);
    this.scene.add(mesh);
  }
  stream(position, budget = 1) {
    const cx = Math.floor(position.x / 16),
      cz = Math.floor(position.z / 16),
      center = `${cx},${cz},${this.renderDistance}`;
    if (center !== this.center) {
      this.center = center;
      this.queue = [];
      for (const [key, chunk] of this.chunks)
        if (
          Math.abs(chunk.cx - cx) > UNLOAD_DISTANCE ||
          Math.abs(chunk.cz - cz) > UNLOAD_DISTANCE
        ) {
          for (const mesh of chunk.meshes) {
            this.scene?.remove(mesh);
            mesh.geometry.dispose();
          }
          this.chunks.delete(key);
        }
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++)
        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
          const chunk = this.chunks.get(chunkKey(cx + dx, cz + dz));
          if (!chunk || !chunk.meshes.length)
            this.queue.push({
              cx: cx + dx,
              cz: cz + dz,
              distance: dx * dx + dz * dz,
            });
        }
      this.queue.sort((a, b) => a.distance - b.distance);
      if (this.columns.size > 30000) this.columns.clear();
    }
    while (budget-- > 0 && this.queue.length) {
      const next = this.queue.shift();
      this.buildChunk(this.generateChunk(next.cx, next.cz));
    }
  }
  get meshes() {
    return [...this.chunks.values()].flatMap((chunk) => chunk.meshes);
  }
  hasWorkbench(position) {
    const x = Math.floor(position.x),
      y = Math.floor(position.y),
      z = Math.floor(position.z);
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++)
        for (let dy = -2; dy <= 2; dy++)
          if (this.getBlock(x + dx, y + dy, z + dz) === BLOCK.CRAFTING_TABLE)
            return true;
    return false;
  }
  dispose() {
    for (const chunk of this.chunks.values())
      for (const mesh of chunk.meshes) {
        this.scene?.remove(mesh);
        mesh.geometry.dispose();
      }
    this.waterQueue.clear();
    this.chunks.clear();
    this.atlas?.material.map.dispose();
    this.atlas?.material.dispose();
    this.waterMaterial?.dispose();
  }
}

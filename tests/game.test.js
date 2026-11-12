import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { World, HEIGHT, CHUNK_SIZE, UNLOAD_DISTANCE, chunkKey } from "../src/world.js";
import {
  blocks,
  byKey,
  BLOCK,
  catalog,
  recipes,
  itemByKey,
  STATUS,
  WOODS,
  COLORS,
} from "../src/registry.js";
import { Inventory, DEFAULT_HOTBAR, miningInfo } from "../src/inventory.js";
import { validateSave, snapshot, DEFAULT_SETTINGS, writeSave, readSave } from "../src/save.js";
import { Player } from "../src/player.js";

test("registry has unique identities, resolved drops/recipes, all wood and dye families, and honest states", () => {
  assert.equal(new Set(blocks.map((b) => b.id)).size, blocks.length);
  assert.equal(new Set(blocks.map((b) => b.key)).size, blocks.length);
  assert.ok(blocks.length > 100);
  for (const block of blocks) {
    assert.ok(itemByKey[block.key]);
    if (block.drop) assert.ok(itemByKey[block.drop], block.drop);
  }
  for (const wood of WOODS)
    for (const shape of ["log", "planks", "leaves"])
      assert.ok(byKey[`${wood}_${shape}`]);
  for (const color of COLORS)
    for (const family of ["wool", "concrete", "terracotta"])
      assert.ok(byKey[`${color}_${family}`]);
  for (const recipe of recipes) {
    assert.ok(itemByKey[recipe.output]);
    for (const ingredient of Object.keys(recipe.ingredients))
      assert.ok(itemByKey[ingredient]);
  }
  for (const entries of Object.values(catalog))
    for (const entry of entries)
      assert.ok(Object.values(STATUS).includes(entry.status));
  assert.equal(catalog.biomes.length, 25);
  assert.ok(catalog.creatures.length > 60);
  assert.ok(
    catalog.blocks.filter((b) => b.status === STATUS.MISSING).length > 500,
  );
});

test("seeded terrain is deterministic across negative and distant chunks", () => {
  const a = new World("test seed"),
    b = new World("test seed"),
    other = new World("another seed");
  let differences = 0;
  for (const x of [-2_000_017, -1024, -17, -1, 0, 15, 16, 900, 2_000_016])
    for (const z of [-800, -16, 0, 16, 384]) {
      assert.deepEqual(a.column(x, z), b.column(x, z));
      if (a.column(x, z).height !== other.column(x, z).height) differences++;
      for (const y of [0, 5, 20, 30, 50, 75])
        assert.equal(a.getBlock(x, y, z), b.getBlock(x, y, z));
    }
  assert.ok(differences > 10);
  assert.equal(a.getBlock(1, 0, 1), BLOCK.BEDROCK);
  assert.equal(a.setBlock(1, 0, 1, 0), false);
  assert.equal(a.setBlock(0, HEIGHT, 0, BLOCK.STONE), false);
});

test("chunk loading preserves samples and edits across chunk seams and reloads", () => {
  const world = new World("boundaries");
  const coords = [
    [-1, 16, -1],
    [0, 16, 0],
    [15, 30, 15],
    [16, 30, 16],
    [-16, 7, -17],
  ];
  const before = coords.map(([x, y, z]) => world.getBlock(x, y, z));
  for (const [x, , z] of coords)
    world.generateChunk(Math.floor(x / 16), Math.floor(z / 16));
  coords.forEach(([x, y, z], i) =>
    assert.equal(world.getBlock(x, y, z), before[i]),
  );
  world.setBlock(-1, 70, -1, BLOCK.DIAMOND_ORE);
  world.setBlock(16, 70, 16, BLOCK.CRAFTING_TABLE);
  world.chunks.clear();
  assert.equal(world.getBlock(-1, 70, -1), BLOCK.DIAMOND_ORE);
  world.generateChunk(-1, -1);
  assert.equal(world.getBlock(-1, 70, -1), BLOCK.DIAMOND_ORE);
  const restored = new World(world.seed, [...world.edits]);
  assert.equal(restored.getBlock(16, 70, 16), BLOCK.CRAFTING_TABLE);
});

test("chunk mesh removes shared faces and uses outward triangle winding", () => {
  const world = new World("mesh"),
    chunk = world.generateChunk(0, 0);
  chunk.data.fill(0);
  world.setBlock(6, 70, 6, BLOCK.STONE);
  world.setBlock(7, 70, 6, BLOCK.STONE);
  const scene = new THREE.Scene();
  world.attach(scene);
  world.buildChunk(chunk);
  assert.equal(chunk.meshes.length, 1);
  const mesh = chunk.meshes[0];
  assert.equal(mesh.geometry.attributes.position.count, 40);
  assert.equal(mesh.geometry.index.count, 60);
  const { position, normal } = mesh.geometry.attributes;
  const indices = mesh.geometry.index;
  for (let i = 0; i < indices.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i)),
      b = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 1)),
      c = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 2)),
      n = new THREE.Vector3().fromBufferAttribute(normal, indices.getX(i));
    assert.ok(b.sub(a).cross(c.sub(a)).dot(n) > 0);
  }
  world.setBlock(7, 70, 6, 0);
  assert.equal(chunk.meshes[0].geometry.attributes.position.count, 24);
  assert.equal(chunk.meshes[0].geometry.index.count, 36);
  assert.equal(scene.children.length, 1);
  world.dispose();
  assert.equal(scene.children.length, 0);
});

test("terrain and water share one mesh and emit only faces touching air", () => {
  const world = new World("water mesh");
  const chunk = world.generateChunk(0, 0);
  chunk.data.fill(BLOCK.AIR);
  world.setBlock(6, 70, 6, BLOCK.STONE);
  world.setBlock(7, 70, 6, BLOCK.WATER);
  world.attach(new THREE.Scene());
  world.buildChunk(chunk);
  assert.equal(chunk.meshes.length, 1);
  const mesh = chunk.meshes[0];
  assert.equal(mesh.geometry.index.count, 60);
  assert.deepEqual(mesh.geometry.groups, [
    { start: 0, count: 30, materialIndex: 0 },
    { start: 30, count: 30, materialIndex: 1 },
  ]);
  // Water still has its transparent material, while mining can skip its group.
  assert.equal(mesh.material[1].transparent, true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(10, 70.5, 6.5),
    new THREE.Vector3(-1, 0, 0),
  );
  assert.equal(ray.intersectObject(mesh)[0].face.materialIndex, 1);
  world.dispose();
});

test("edits rebuild only their chunk, plus touching seam neighbors when needed", () => {
  const world = new World("local edits");
  world.attach(new THREE.Scene());
  const chunks = [[-1, 0], [0, 0], [1, 0], [0, -1], [0, 1], [1, 1]]
    .map(([x, z]) => world.generateChunk(x, z));
  for (const chunk of chunks) {
    chunk.data.fill(BLOCK.AIR);
    world.buildChunk(chunk);
  }
  const rebuilt = [];
  const build = world.buildChunk.bind(world);
  world.buildChunk = (chunk) => {
    rebuilt.push(chunkKey(chunk.cx, chunk.cz));
    build(chunk);
  };
  const oldGeometry = chunks[1].meshes[0].geometry;
  let disposed = false;
  oldGeometry.addEventListener("dispose", () => {
    disposed = true;
  });
  world.setBlock(6, 70, 6, BLOCK.STONE);
  assert.deepEqual(rebuilt, ["0,0"]);
  assert.ok(disposed);
  rebuilt.length = 0;
  world.setBlock(6, 70, 6, BLOCK.STONE);
  assert.deepEqual(rebuilt, []);
  world.setBlock(15, 70, 15, BLOCK.STONE);
  assert.deepEqual(rebuilt, ["0,0", "1,0", "0,1"]);
  assert.equal(world.scene.children.length, chunks.length);
  world.dispose();
});

test("negative chunk seams cull faces and reveal them again after mining", () => {
  const world = new World("seam faces");
  const left = world.generateChunk(-1, 0),
    right = world.generateChunk(0, 0);
  left.data.fill(BLOCK.AIR);
  right.data.fill(BLOCK.AIR);
  world.setBlock(-1, 70, 6, BLOCK.STONE);
  // Query the edit in an unloaded neighbor as well as a loaded one.
  world.chunks.delete("-1,0");
  world.setBlock(0, 70, 6, BLOCK.STONE);
  world.attach(new THREE.Scene());
  world.buildChunk(right);
  assert.equal(right.meshes[0].geometry.index.count, 30);
  world.chunks.set("-1,0", left);
  world.buildChunk(left);
  assert.equal(left.meshes[0].geometry.index.count, 30);
  world.setBlock(-1, 70, 6, BLOCK.AIR);
  assert.equal(right.meshes[0].geometry.index.count, 36);
  assert.equal(left.meshes[0].geometry.index.count, 0);
  world.dispose();
});

test("streaming is budgeted, handles negative coordinates, and unloads distant chunks", () => {
  const world = new World("stream");
  world.renderDistance = 2;
  world.attach(new THREE.Scene());
  world.stream(new THREE.Vector3(-1, 50, -1), 1);
  assert.ok(world.chunks.has(chunkKey(-1, -1)));
  assert.equal(world.chunks.size, 1);
  assert.equal(world.queue.length, 24);
  world.setBlock(-1, 80, -1, BLOCK.BRICKS);
  world.stream(new THREE.Vector3(1000, 50, 1000), 1);
  assert.equal(world.chunks.size, 1);
  assert.ok(!world.chunks.has(chunkKey(-1, -1)));
  assert.equal(world.getBlock(-1, 80, -1), BLOCK.BRICKS);
  world.dispose();
});

test("default streaming queues a six-chunk neighborhood nearest first and replaces stale work", () => {
  const world = new World("infinite stream");
  assert.equal(world.renderDistance, UNLOAD_DISTANCE);
  assert.equal(DEFAULT_SETTINGS.renderDistance, 6);
  world.attach(new THREE.Scene());
  world.stream(new THREE.Vector3(2_000_001, 70, -2_000_001), 1);
  const cx = Math.floor(2_000_001 / CHUNK_SIZE),
    cz = Math.floor(-2_000_001 / CHUNK_SIZE);
  assert.ok(world.chunks.has(chunkKey(cx, cz)));
  assert.equal(world.queue.length, 168);
  assert.ok(world.queue.every((c) => Math.abs(c.cx - cx) <= 6 && Math.abs(c.cz - cz) <= 6));
  for (let i = 1; i < world.queue.length; i++)
    assert.ok(world.queue[i].distance >= world.queue[i - 1].distance);
  world.stream(new THREE.Vector3(0, 70, 0), 0);
  assert.equal(world.chunks.size, 0);
  assert.equal(world.queue.length, 169);
  assert.ok(world.queue.every((c) => Math.abs(c.cx) <= 6 && Math.abs(c.cz) <= 6));
  world.dispose();
});

test("chunks at six are retained; chunks beyond six unload and dispose geometry", () => {
  const world = new World("retention");
  world.attach(new THREE.Scene());
  const retained = world.generateChunk(-6, 6),
    removed = world.generateChunk(7, 0);
  retained.data.fill(BLOCK.AIR);
  removed.data.fill(BLOCK.AIR);
  world.buildChunk(retained);
  world.buildChunk(removed);
  let disposed = false;
  removed.meshes[0].geometry.addEventListener("dispose", () => { disposed = true; });
  const mesh = removed.meshes[0];
  // Retention is independent of the optional lower generation radius.
  world.renderDistance = 2;
  world.stream(new THREE.Vector3(0, 70, 0), 0);
  assert.ok(world.chunks.has("-6,6"));
  assert.ok(!world.chunks.has("7,0"));
  assert.ok(disposed);
  assert.ok(!world.scene.children.includes(mesh));
  world.dispose();
});

test("generated diamond deposits stay below terrain and include adjacent ore", () => {
  const world = new World("ore test");
  let diamonds = 0,
    connected = 0;
  for (let x = -20; x < 20; x++)
    for (let z = -20; z < 20; z++)
      for (let y = 1; y < 13; y++)
        if (world.getBlock(x, y, z) === BLOCK.DIAMOND_ORE) {
          diamonds++;
          assert.ok(y < world.column(x, z).height - 3);
          if (
            [
              [1, 0, 0],
              [-1, 0, 0],
              [0, 1, 0],
              [0, -1, 0],
              [0, 0, 1],
              [0, 0, -1],
            ].some(
              ([dx, dy, dz]) =>
                world.getBlock(x + dx, y + dy, z + dz) === BLOCK.DIAMOND_ORE,
            )
          )
            connected++;
        }
  assert.ok(diamonds > 10);
  assert.ok(connected / diamonds > 0.8);
});

test("inventory uses bounded stacks and does not partially add/remove on failure", () => {
  const inv = new Inventory();
  assert.ok(inv.add("dirt", 65));
  assert.equal(inv.slots[0].count, 64);
  assert.equal(inv.slots[1].count, 1);
  assert.equal(inv.remove("dirt", 66), false);
  assert.equal(inv.count("dirt"), 65);
  assert.ok(inv.remove("dirt", 65));
  assert.equal(inv.slots.filter(Boolean).length, 0);
  assert.equal(inv.add("fake_item"), false);
  assert.equal(inv.add("constructor"), false);
  assert.ok(inv.add("stone", 36 * 64));
  const before = JSON.stringify(inv.slots);
  assert.equal(inv.add("stone"), false);
  assert.equal(JSON.stringify(inv.slots), before);
});

test("every overworld wood can start the survival crafting progression", () => {
  for (const wood of WOODS) {
    const inv = new Inventory();
    inv.add(`${wood}_log`, 4);
    for (let i = 0; i < 4; i++) assert.ok(inv.craft(`${wood}_planks`, false));
    assert.ok(inv.craft(`${wood}_table`, false));
    assert.ok(inv.craft(`${wood}_sticks`, false));
    const recipe = wood === "oak" ? "wooden_pickaxe" : `${wood}_wooden_pickaxe`;
    assert.ok(inv.craft(recipe, true));
    assert.equal(inv.count("crafting_table"), 1);
    assert.equal(inv.count("wooden_pickaxe"), 1);
  }
});

test("workbench recipes unlock only near a placed table and stop after removal", () => {
  const world = new World("workbench");
  const position = new THREE.Vector3(0.5, 80, 0.5);
  assert.equal(world.hasWorkbench(position), false);
  world.setBlock(2, 80, 0, BLOCK.CRAFTING_TABLE);
  assert.equal(world.hasWorkbench(position), true);
  assert.equal(world.hasWorkbench(new THREE.Vector3(12, 80, 0)), false);
  world.setBlock(2, 80, 0, 0);
  assert.equal(world.hasWorkbench(position), false);
});

test("crafting consumes exact ingredients, requires a workbench, and equips durable tools", () => {
  const inv = new Inventory();
  inv.add("oak_log");
  assert.equal(inv.craft("oak_planks", false), true);
  assert.equal(inv.count("oak_log"), 0);
  assert.equal(inv.count("oak_planks"), 4);
  assert.equal(inv.craft("oak_table", false), true);
  assert.equal(inv.count("crafting_table"), 1);
  inv.add("oak_planks", 3);
  inv.add("stick", 2);
  assert.equal(inv.craft("wooden_pickaxe", false), false);
  assert.equal(inv.count("stick"), 2);
  assert.equal(inv.craft("wooden_pickaxe", true), true);
  assert.equal(inv.count("stick"), 0);
  assert.equal(inv.tool("wooden_pickaxe").durability, 60);
  for (let i = 0; i < 60; i++) inv.wear("wooden_pickaxe");
  assert.equal(inv.count("wooden_pickaxe"), 0);
});

test("full inventory craft failures are atomic", () => {
  const inv = new Inventory();
  inv.add("oak_log", 64);
  inv.add("stone", 35 * 64);
  const before = JSON.stringify(inv.slots);
  assert.equal(inv.craft("oak_planks", false), false);
  assert.equal(JSON.stringify(inv.slots), before);
});

test("mining enforces tool tier, drop identity, and matching tool speed", () => {
  assert.equal(miningInfo(byKey.stone, null).drop, null);
  assert.equal(
    miningInfo(byKey.stone, itemByKey.wooden_pickaxe).drop,
    "cobblestone",
  );
  assert.equal(
    miningInfo(byKey.diamond_ore, itemByKey.stone_pickaxe).harvestable,
    false,
  );
  assert.equal(
    miningInfo(byKey.diamond_ore, itemByKey.iron_pickaxe).drop,
    "diamond",
  );
  assert.ok(
    miningInfo(byKey.oak_log, itemByKey.wooden_axe).duration <
      miningInfo(byKey.oak_log, null).duration,
  );
});

function makePlayer() {
  const player = Object.create(Player.prototype);
  const solids = new Set();
  const world = {
    isSolid: (x, y, z) => y <= 0 || solids.has(`${x},${y},${z}`),
    isWater: () => false,
    findSpawn: () => ({ x: 3.5, y: 1, z: 3.5 }),
  };
  Object.assign(player, {
    world,
    camera: new THREE.PerspectiveCamera(),
    controls: { isLocked: true },
    position: new THREE.Vector3(3.5, 4, 3.5),
    velocity: new THREE.Vector3(),
    keys: new Set(),
    grounded: false,
    accumulator: 0,
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    mode: "survival",
    health: 20,
    hunger: 20,
    breath: 10,
    damageTimer: 0,
    solids,
  });
  return player;
}
test("player lands, jumps, collides with walls/ceilings, and normalizes diagonal speed", () => {
  const p = makePlayer();
  for (let i = 0; i < 120; i++) p.update(1 / 60);
  assert.equal(p.position.y, 1);
  assert.equal(p.grounded, true);
  p.velocity.y = 8;
  p.grounded = false;
  for (let i = 0; i < 12; i++) p.update(1 / 60);
  assert.ok(p.position.y > 2);
  for (let i = 0; i < 100; i++) p.update(1 / 60);
  assert.equal(p.position.y, 1);
  p.solids.add("4,1,3");
  p.solids.add("4,2,3");
  p.moveAxis("x", 0.4);
  assert.equal(p.position.x, 3.7);
  assert.equal(p.overlapsBlock(4, 1, 3), false);
  p.solids.add("3,3,3");
  p.moveAxis("y", 0.4);
  assert.equal(p.position.y, 1.2);
  const a = makePlayer(),
    b = makePlayer();
  a.position.y = b.position.y = 1;
  a.keys.add("KeyW");
  b.keys.add("KeyW");
  b.keys.add("KeyD");
  a.update(0.1);
  b.update(0.1);
  const distance = (p) => Math.hypot(p.position.x - 3.5, p.position.z - 3.5);
  assert.ok(Math.abs(distance(a) - distance(b)) < 1e-6);
});
test("sprinting is faster, swimming rises, pause freezes physics, and fall damage respects mode", () => {
  const a = makePlayer(),
    b = makePlayer();
  a.keys.add("KeyW");
  b.keys.add("KeyW");
  b.keys.add("ShiftLeft");
  a.update(0.1);
  b.update(0.1);
  assert.ok(b.position.z < a.position.z);
  const swimmer = makePlayer();
  swimmer.world.isWater = () => true;
  swimmer.keys.add("Space");
  const before = swimmer.position.y;
  for (let i = 0; i < 60; i++) swimmer.update(1 / 60);
  assert.ok(swimmer.position.y > before);
  assert.ok(swimmer.breath < 10);
  swimmer.controls.isLocked = false;
  const pose = swimmer.position.clone();
  swimmer.update(1);
  assert.deepEqual(swimmer.position, pose);
  const fall = makePlayer();
  fall.position.y = 15;
  for (let i = 0; i < 120; i++) fall.update(1 / 60);
  assert.ok(fall.health < 20);
  const creative = makePlayer();
  creative.mode = "creative";
  creative.position.y = 15;
  for (let i = 0; i < 120; i++) creative.update(1 / 60);
  assert.equal(creative.health, 20);
});

test("saving restores seed, negative-coordinate edits, inventory, durability, pose, time and settings", () => {
  const world = new World("portable save");
  world.setBlock(-17, 70, 16, BLOCK.CRAFTING_TABLE);
  world.setBlock(1, 10, 2, 0);
  const inventory = new Inventory();
  inventory.add("diamond_pickaxe");
  inventory.wear("diamond_pickaxe");
  inventory.add("dirt", 17);
  const player = makePlayer(),
    game = {
      world,
      inventory,
      player,
      camera: player.camera,
      hotbar: [...DEFAULT_HOTBAR],
      selected: 4,
      time: 123.5,
      settings: { ...DEFAULT_SETTINGS, volume: 0.3 },
    };
  const data = snapshot(game);
  assert.equal(data.edits[0][1], "crafting_table");
  const restored = validateSave(JSON.parse(JSON.stringify(data)));
  assert.equal(restored.seed, "portable save");
  assert.equal(restored.inventory[0].durability, 1561);
  assert.equal(restored.time, 123.5);
  assert.equal(restored.selected, 4);
  assert.equal(restored.settings.volume, 0.3);
  const loaded = new World(restored.seed, restored.edits);
  assert.equal(loaded.getBlock(-17, 70, 16), BLOCK.CRAFTING_TABLE);
  assert.equal(loaded.getBlock(1, 10, 2), 0);
  const second = { ...game, world: loaded };
  assert.deepEqual(snapshot(second).edits, data.edits);
});
test("localStorage round trip restores placed and mined blocks beyond the former map edge", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(readSave(storage), null);
  const player = makePlayer();
  player.position.set(2_000_016.5, 80, -2_000_017.5);
  const game = {
    world: new World("persistent infinity"), player, camera: player.camera,
    inventory: new Inventory(), time: 0, settings: DEFAULT_SETTINGS,
  };
  game.world.setBlock(2_000_016, 80, -2_000_017, BLOCK.BRICKS);
  writeSave(game, storage);
  // Persist removal explicitly as air, including a block in unloaded terrain.
  game.world.setBlock(-2_000_017, 1, 2_000_016, BLOCK.AIR);
  writeSave(game, storage);
  const saved = readSave(storage);
  assert.equal(saved.player.x, player.position.x);
  const restored = new World(saved.seed, saved.edits);
  assert.equal(restored.getBlock(2_000_016, 80, -2_000_017), BLOCK.BRICKS);
  assert.equal(restored.getBlock(-2_000_017, 1, 2_000_016), BLOCK.AIR);
  const chunk = restored.generateChunk(125001, -125002);
  assert.equal(restored.getBlock(2_000_016, 80, -2_000_017), BLOCK.BRICKS);
  restored.chunks.delete(chunkKey(chunk.cx, chunk.cz));
  restored.generateChunk(chunk.cx, chunk.cz);
  assert.equal(restored.getBlock(2_000_016, 80, -2_000_017), BLOCK.BRICKS);
  assert.equal(saved.settings.renderDistance, 6);
  assert.equal(validateSave({ ...snapshot(game), settings: { ...DEFAULT_SETTINGS, renderDistance: 3 } }).settings.renderDistance, 3);
});

test("malformed saves are rejected before mutating a live world", () => {
  const player = makePlayer();
  const data = snapshot({
    world: new World("validation"),
    inventory: new Inventory(),
    player,
    camera: player.camera,
    time: 0,
    settings: DEFAULT_SETTINGS,
  });
  for (const mutate of [
    (s) => (s.version = 999),
    (s) => (s.player.x = Infinity),
    (s) => (s.edits = [["0,0,0", "dirt"]]),
    (s) => (s.edits = [["x,1,2", "stone"]]),
    (s) => (s.inventory[0] = { key: "fake", count: 1 }),
    (s) => (s.settings = { renderDistance: 100 }),
    (s) => (s.hotbar = ["dirt"]),
    (s) => (s.mode = "unknown"),
  ]) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.throws(() => validateSave(copy));
  }
});

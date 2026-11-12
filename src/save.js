import { itemByKey, byId, byKey } from "./registry.js";
import { HEIGHT, WORLD_LIMIT } from "./world.js";
import { INVENTORY_SIZE, DEFAULT_HOTBAR } from "./inventory.js";
export const SAVE_KEY = "fieldwork.world.v2";
export const DEFAULT_SETTINGS = {
  renderDistance: 3,
  sensitivity: 0.8,
  volume: 0.25,
  fov: 75,
};
const finite = (n, min, max) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
export function validateSave(input) {
  if (!input || input.version !== 2)
    throw new Error("Unsupported world save version.");
  if (
    typeof input.seed !== "string" ||
    !input.seed.length ||
    input.seed.length > 80
  )
    throw new Error("Invalid world seed.");
  if (!["creative", "survival"].includes(input.mode))
    throw new Error("Invalid game mode.");
  if (!Array.isArray(input.edits) || input.edits.length > 500000)
    throw new Error("Invalid world edits.");
  const edits = input.edits.map((entry) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string"
    )
      throw new Error("Invalid edited block.");
    const coords = entry[0].split(",").map(Number);
    const blockId = entry[1] === "air" ? 0 : byKey[entry[1]]?.id;
    if (
      coords.length !== 3 ||
      !coords.every(Number.isInteger) ||
      Math.abs(coords[0]) >= WORLD_LIMIT ||
      Math.abs(coords[2]) >= WORLD_LIMIT ||
      coords[1] <= 0 ||
      coords[1] >= HEIGHT ||
      blockId === undefined
    )
      throw new Error("Edited block is out of range.");
    return [coords.join(","), blockId];
  });
  const pose = input.player;
  if (
    !pose ||
    !finite(pose.x, -WORLD_LIMIT + 2, WORLD_LIMIT - 2) ||
    !finite(pose.y, 0, HEIGHT + 10) ||
    !finite(pose.z, -WORLD_LIMIT + 2, WORLD_LIMIT - 2) ||
    !finite(pose.yaw, -1000, 1000) ||
    !finite(pose.pitch, -Math.PI / 2, Math.PI / 2) ||
    !finite(pose.health, 0, 20) ||
    !finite(pose.hunger, 0, 20)
  )
    throw new Error("Invalid player data.");
  if (
    !Array.isArray(input.inventory) ||
    input.inventory.length !== INVENTORY_SIZE
  )
    throw new Error("Invalid inventory.");
  const inventory = input.inventory.map((slot) => {
    if (slot === null) return null;
    const item = itemByKey[slot?.key];
    if (
      !item ||
      !Number.isInteger(slot.count) ||
      slot.count < 1 ||
      slot.count > (item.durability ? 1 : 64)
    )
      throw new Error("Invalid inventory stack.");
    if (
      item.durability &&
      (!Number.isInteger(slot.durability) ||
        slot.durability < 1 ||
        slot.durability > item.durability)
    )
      throw new Error("Invalid tool durability.");
    return {
      key: slot.key,
      count: slot.count,
      ...(item.durability ? { durability: slot.durability } : {}),
    };
  });
  if (
    !Array.isArray(input.hotbar) ||
    input.hotbar.length !== 10 ||
    !input.hotbar.every((key) => itemByKey[key])
  )
    throw new Error("Invalid hotbar.");
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, min, max] of [
    ["renderDistance", 2, 5],
    ["sensitivity", 0.2, 2],
    ["volume", 0, 1],
    ["fov", 55, 100],
  ]) {
    const n = input.settings?.[key];
    if (n !== undefined) {
      if (
        !finite(n, min, max) ||
        (key === "renderDistance" && !Number.isInteger(n))
      )
        throw new Error("Invalid setting.");
      settings[key] = n;
    }
  }
  if (!finite(input.time, 0, 1e10)) throw new Error("Invalid world time.");
  return {
    version: 2,
    seed: input.seed,
    mode: input.mode,
    edits,
    player: { ...pose },
    inventory,
    hotbar: [...input.hotbar],
    selected:
      Number.isInteger(input.selected) &&
      input.selected >= 0 &&
      input.selected < 10
        ? input.selected
        : 0,
    time: input.time,
    settings,
  };
}
export function snapshot(game) {
  const { player, camera, world, inventory } = game;
  return {
    version: 2,
    seed: world.seed,
    mode: player.mode,
    edits: [...world.edits].map(([key, id]) => [
      key,
      id === 0 ? "air" : byId[id].key,
    ]),
    player: {
      ...Object.fromEntries(
        ["x", "y", "z"].map((axis) => [axis, player.position[axis]]),
      ),
      yaw: Math.atan2(Math.sin(camera.rotation.y), Math.cos(camera.rotation.y)),
      pitch: camera.rotation.x,
      health: player.health,
      hunger: player.hunger,
    },
    inventory: inventory.slots,
    hotbar: game.hotbar ?? DEFAULT_HOTBAR,
    selected: game.selected ?? 0,
    time: game.time,
    settings: game.settings,
  };
}

import { itemByKey, recipes } from "./registry.js";
export const INVENTORY_SIZE = 36;
export const DEFAULT_HOTBAR = [
  "grass",
  "dirt",
  "stone",
  "oak_log",
  "oak_planks",
  "crafting_table",
  "cobblestone",
  "wooden_pickaxe",
  "stone_pickaxe",
  "diamond_ore",
];
export class Inventory {
  constructor(slots = []) {
    this.slots = Array.from({ length: INVENTORY_SIZE }, (_, i) =>
      slots[i] ? { ...slots[i] } : null,
    );
  }
  count(key) {
    return this.slots.reduce(
      (sum, slot) => sum + (slot?.key === key ? slot.count : 0),
      0,
    );
  }
  add(key, count = 1) {
    const item = itemByKey[key];
    if (!item || !Number.isInteger(count) || count < 1) return false;
    const draft = this.slots.map((slot) => (slot ? { ...slot } : null)),
      limit = item.durability ? 1 : 64;
    let remaining = count;
    for (const slot of draft)
      if (slot?.key === key && slot.count < limit) {
        const n = Math.min(limit - slot.count, remaining);
        slot.count += n;
        remaining -= n;
      }
    for (let i = 0; i < draft.length && remaining; i++)
      if (!draft[i]) {
        const n = Math.min(limit, remaining);
        draft[i] = {
          key,
          count: n,
          ...(item.durability ? { durability: item.durability } : {}),
        };
        remaining -= n;
      }
    if (remaining) return false;
    this.slots = draft;
    return true;
  }
  remove(key, count = 1) {
    if (!Number.isInteger(count) || count < 1 || this.count(key) < count)
      return false;
    for (let i = 0; i < this.slots.length && count; i++)
      if (this.slots[i]?.key === key) {
        const n = Math.min(this.slots[i].count, count);
        this.slots[i].count -= n;
        count -= n;
        if (!this.slots[i].count) this.slots[i] = null;
      }
    return true;
  }
  tool(key) {
    return this.slots.find(
      (slot) => slot?.key === key && itemByKey[key]?.durability,
    );
  }
  wear(key) {
    const slot = this.tool(key);
    if (!slot) return false;
    slot.durability--;
    if (slot.durability <= 0) {
      this.slots[this.slots.indexOf(slot)] = null;
      return true;
    }
    return false;
  }
  canCraft(recipe, atTable) {
    return (
      (recipe.station !== "table" || atTable) &&
      Object.entries(recipe.ingredients).every(
        ([key, n]) => this.count(key) >= n,
      )
    );
  }
  craft(recipeKey, atTable) {
    const recipe = recipes.find((r) => r.key === recipeKey);
    if (!recipe || !this.canCraft(recipe, atTable)) return false;
    const draft = new Inventory(this.slots);
    for (const [key, n] of Object.entries(recipe.ingredients))
      draft.remove(key, n);
    if (!draft.add(recipe.output, recipe.count)) return false;
    this.slots = draft.slots;
    return true;
  }
}
export function miningInfo(block, tool) {
  const suitable = tool?.tool === block.tool;
  const harvestable = block.tier === 0 || (suitable && tool.tier >= block.tier);
  return {
    harvestable,
    duration: block.hardness * (suitable ? 1 / (tool.speed ?? 1) : 2),
    drop: harvestable ? block.drop : null,
  };
}

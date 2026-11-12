// This is the target catalog, not a list of promises exposed in the game UI.
// Missing entries never appear as usable items. Partial entries explain their limits.
export const STATUS = Object.freeze({
  DONE: "implemented",
  PARTIAL: "partially implemented",
  MISSING: "missing",
});
export const WOODS = [
  "oak",
  "spruce",
  "birch",
  "jungle",
  "acacia",
  "dark_oak",
  "mangrove",
  "cherry",
  "bamboo",
  "pale_oak",
  "crimson",
  "warped",
];
export const COLORS = [
  "white",
  "orange",
  "magenta",
  "light_blue",
  "yellow",
  "lime",
  "pink",
  "gray",
  "light_gray",
  "cyan",
  "purple",
  "blue",
  "brown",
  "green",
  "red",
  "black",
];
const dyeColors = [
  "#e6e4dc",
  "#de802c",
  "#b552b9",
  "#66a9d0",
  "#e6c747",
  "#83b83e",
  "#da8faa",
  "#51565a",
  "#a4a7a0",
  "#338f9b",
  "#8053a9",
  "#3f58a1",
  "#805b40",
  "#577e36",
  "#ad4037",
  "#292d31",
];
export const blocks = [];
export const items = [];
let nextId = 1;
function block(key, name, color, options = {}) {
  const entry = {
    id: nextId++,
    key,
    name,
    color,
    family: "terrain",
    texture: "noise",
    hardness: 0.6,
    tool: "shovel",
    tier: 0,
    drop: key,
    solid: true,
    status: STATUS.DONE,
    ...options,
  };
  blocks.push(entry);
  return entry.id;
}
const rock = { hardness: 1.5, tool: "pickaxe", tier: 1 };
block("grass", "Grass", "#769c47", { drop: "dirt", texture: "grass" });
block("dirt", "Dirt", "#86623e");
block("stone", "Stone", "#8c8d87", { ...rock, drop: "cobblestone" });
block("sand", "Sand", "#d9c78a");
block("oak_log", "Oak log", "#86603b", {
  tool: "axe",
  hardness: 1.1,
  texture: "bark",
  family: "wood",
});
block("oak_planks", "Oak planks", "#b78d54", {
  tool: "axe",
  hardness: 0.8,
  texture: "planks",
  family: "wood",
});
block("bricks", "Bricks", "#ad6450", {
  ...rock,
  texture: "bricks",
  family: "masonry",
});
block("oak_leaves", "Oak leaves", "#467943", {
  tool: "shears",
  hardness: 0.2,
  family: "plants",
});
block("diamond_ore", "Diamond ore", "#898d90", {
  ...rock,
  tier: 3,
  hardness: 3,
  texture: "ore",
  accent: "#62eee8",
  drop: "diamond",
  family: "ores",
});
block("crafting_table", "Crafting table", "#a87443", {
  tool: "axe",
  hardness: 1.1,
  texture: "table",
  family: "functional",
});
for (const [key, name, color, options] of [
  ["cobblestone", "Cobblestone", "#777b76", { ...rock, texture: "cobble" }],
  ["sandstone", "Sandstone", "#d1bd83", { ...rock, texture: "bricks" }],
  ["gravel", "Gravel", "#99938d", {}],
  ["clay", "Clay", "#9daab2", {}],
  ["mud", "Mud", "#58534a", {}],
  ["snow", "Snow", "#e9eff2", {}],
  ["ice", "Ice", "#9bcbd8", { tool: "pickaxe", hardness: 0.4 }],
  ["terracotta", "Terracotta", "#b77b5f", { ...rock, family: "masonry" }],
  [
    "glass",
    "Glass",
    "#a9d4da",
    {
      tool: "hand",
      hardness: 0.3,
      texture: "glass",
      status: STATUS.PARTIAL,
      notes: "Solid patterned glass; transparent rendering is pending.",
    },
  ],
  [
    "coal_ore",
    "Coal ore",
    "#878a84",
    {
      ...rock,
      texture: "ore",
      accent: "#303131",
      drop: "coal",
      family: "ores",
    },
  ],
  [
    "iron_ore",
    "Iron ore",
    "#8d8b84",
    {
      ...rock,
      tier: 2,
      texture: "ore",
      accent: "#d7b49a",
      drop: "raw_iron",
      family: "ores",
    },
  ],
  [
    "copper_ore",
    "Copper ore",
    "#8d8b84",
    {
      ...rock,
      tier: 2,
      texture: "ore",
      accent: "#c5875b",
      drop: "raw_copper",
      family: "ores",
    },
  ],
  [
    "gold_ore",
    "Gold ore",
    "#8d8b84",
    {
      ...rock,
      tier: 3,
      texture: "ore",
      accent: "#efd15b",
      drop: "raw_gold",
      family: "ores",
    },
  ],
  [
    "redstone_ore",
    "Redstone ore",
    "#8d8b84",
    {
      ...rock,
      tier: 3,
      texture: "ore",
      accent: "#d84035",
      drop: "redstone",
      family: "ores",
    },
  ],
  [
    "lapis_ore",
    "Lapis ore",
    "#8d8b84",
    {
      ...rock,
      tier: 2,
      texture: "ore",
      accent: "#3865bc",
      drop: "lapis",
      family: "ores",
    },
  ],
  [
    "emerald_ore",
    "Emerald ore",
    "#8d8b84",
    {
      ...rock,
      tier: 3,
      texture: "ore",
      accent: "#50d996",
      drop: "emerald",
      family: "ores",
    },
  ],
  ["obsidian", "Obsidian", "#332d48", { ...rock, tier: 4, hardness: 8 }],
  ["moss", "Moss", "#638845", {}],
  ["mycelium", "Mycelium", "#927a86", { drop: "dirt" }],
  ["deepslate", "Deepslate", "#4f5658", { ...rock }],
  ["granite", "Granite", "#ab8173", { ...rock }],
  ["diorite", "Diorite", "#bdc0b7", { ...rock }],
  ["andesite", "Andesite", "#91988c", { ...rock }],
  ["calcite", "Calcite", "#dfddd1", { ...rock }],
  ["tuff", "Tuff", "#72766a", { ...rock }],
  ["basalt", "Basalt", "#555963", { ...rock }],
  ["blackstone", "Blackstone", "#39383c", { ...rock }],
  ["netherrack", "Netherrack", "#85443f", { ...rock }],
  ["end_stone", "End stone", "#d5d5a6", { ...rock }],
])
  block(key, name, color, options);
const woodColors = [
  "#86603b",
  "#665039",
  "#d6c7a0",
  "#a57c50",
  "#b76d44",
  "#493528",
  "#79463b",
  "#d59ca0",
  "#b4b450",
  "#d7d5bc",
  "#823c52",
  "#398a85",
];
WOODS.forEach((wood, i) => {
  if (wood !== "oak") {
    block(`${wood}_log`, `${title(wood)} log`, woodColors[i], {
      tool: "axe",
      hardness: 1.1,
      texture: "bark",
      family: "wood",
    });
    block(`${wood}_planks`, `${title(wood)} planks`, woodColors[i], {
      tool: "axe",
      hardness: 0.8,
      texture: "planks",
      family: "wood",
    });
    block(
      `${wood}_leaves`,
      `${title(wood)} leaves`,
      wood === "cherry" ? "#d7a0b4" : "#4d8248",
      { tool: "shears", hardness: 0.2, family: "plants" },
    );
  }
});
COLORS.forEach((color, i) => {
  for (const family of ["wool", "concrete", "terracotta"]) {
    block(`${color}_${family}`, `${title(color)} ${family}`, dyeColors[i], {
      family,
      hardness: family === "wool" ? 0.4 : 1.2,
      tool: family === "wool" ? "shears" : "pickaxe",
      tier: family === "wool" ? 0 : 1,
    });
  }
});
for (const [metal, color] of [
  ["iron", "#c3c8c4"],
  ["copper", "#bc805c"],
  ["gold", "#e6c44e"],
  ["diamond", "#63dbda"],
  ["emerald", "#4bb785"],
  ["coal", "#343737"],
  ["redstone", "#b83930"],
  ["lapis", "#3c5ea8"],
]) {
  block(`${metal}_block`, `${title(metal)} block`, color, {
    ...rock,
    family: "storage",
    texture: "metal",
  });
}
block("bedrock", "Bedrock", "#343a3d", {
  hardness: Infinity,
  tool: "pickaxe",
  family: "terrain",
  drop: null,
});
block("water", "Water", "#5dabc7", {
  solid: false,
  hardness: Infinity,
  tool: "none",
  drop: null,
  status: STATUS.PARTIAL,
  notes:
    "Static oceans, rivers, and cave pools; swimming works, fluid flow is pending.",
});

const keyed = (entries) =>
  Object.assign(Object.create(null), Object.fromEntries(entries));
export const byKey = keyed(blocks.map((b) => [b.key, b]));
export const byId = keyed(blocks.map((b) => [b.id, b]));
export const BLOCK = Object.freeze({
  AIR: 0,
  ...Object.fromEntries(blocks.map((b) => [b.key.toUpperCase(), b.id])),
});

function item(key, name, options = {}) {
  items.push({ key, name, status: STATUS.DONE, color: "#c5b28a", ...options });
}
for (const key of [
  "stick",
  "coal",
  "raw_iron",
  "raw_copper",
  "raw_gold",
  "iron_ingot",
  "copper_ingot",
  "gold_ingot",
  "diamond",
  "emerald",
  "redstone",
  "lapis",
])
  item(key, title(key));
for (const [material, tier, speed, durability] of [
  ["wooden", 1, 2, 60],
  ["stone", 2, 4, 132],
  ["iron", 3, 6, 251],
  ["diamond", 4, 8, 1562],
]) {
  for (const tool of ["pickaxe", "axe", "shovel"])
    item(`${material}_${tool}`, `${title(material)} ${tool}`, {
      tool,
      tier,
      speed,
      durability,
      color: material === "diamond" ? "#63dbda" : "#b9ada0",
    });
}
export const itemByKey = keyed(
  [...blocks, ...items].map((entry) => [entry.key, entry]),
);
export const recipes = [];
function recipe(key, output, count, ingredients, station = "hand") {
  recipes.push({
    key,
    output,
    count,
    ingredients,
    station,
    status: STATUS.DONE,
  });
}
WOODS.forEach((wood) => {
  recipe(`${wood}_planks`, `${wood}_planks`, 4, { [`${wood}_log`]: 1 });
  recipe(`${wood}_sticks`, "stick", 4, { [`${wood}_planks`]: 2 });
  recipe(`${wood}_table`, "crafting_table", 1, { [`${wood}_planks`]: 4 });
  if (wood !== "oak")
    for (const [tool, amount] of [
      ["pickaxe", 3],
      ["axe", 3],
      ["shovel", 1],
    ]) {
      recipe(
        `${wood}_wooden_${tool}`,
        `wooden_${tool}`,
        1,
        { [`${wood}_planks`]: amount, stick: 2 },
        "table",
      );
    }
});
for (const [material, ingredient] of [
  ["wooden", "oak_planks"],
  ["stone", "cobblestone"],
  ["iron", "iron_ingot"],
  ["diamond", "diamond"],
]) {
  for (const [tool, amount] of [
    ["pickaxe", 3],
    ["axe", 3],
    ["shovel", 1],
  ])
    recipe(
      `${material}_${tool}`,
      `${material}_${tool}`,
      1,
      { [ingredient]: amount, stick: 2 },
      "table",
    );
}
recipe("sandstone", "sandstone", 1, { sand: 4 });
for (const key of [
  "iron",
  "copper",
  "gold",
  "diamond",
  "emerald",
  "coal",
  "redstone",
  "lapis",
]) {
  const ingredient = ["iron", "copper", "gold"].includes(key)
    ? `${key}_ingot`
    : key;
  recipe(`${key}_block`, `${key}_block`, 1, { [ingredient]: 9 }, "table");
  recipe(`${key}_unpack`, ingredient, 9, { [`${key}_block`]: 1 });
}

export const biomes = [
  ["plains", "grass", "oak"],
  ["forest", "grass", "oak"],
  ["birch_forest", "grass", "birch"],
  ["dark_forest", "grass", "dark_oak"],
  ["taiga", "grass", "spruce"],
  ["snowy_forest", "snow", "spruce"],
  ["jungle", "grass", "jungle"],
  ["bamboo_jungle", "grass", "bamboo"],
  ["desert", "sand", null],
  ["savanna", "grass", "acacia"],
  ["badlands", "terracotta", null],
  ["swamp", "mud", "oak"],
  ["mangrove_swamp", "mud", "mangrove"],
  ["cherry_grove", "grass", "cherry"],
  ["meadow", "grass", null],
  ["mountains", "stone", null],
  ["snowy_peaks", "snow", null],
  ["beach", "sand", null],
  ["river", "gravel", null],
  ["ocean", "sand", null],
  ["coral_reef", "sand", null],
  ["mushroom_island", "mycelium", null],
  ["lush_caves", "moss", null],
  ["dripstone_caves", "stone", null],
  ["deep_dark", "deepslate", null],
].map(([key, surface, tree]) => ({
  key,
  name: title(key),
  surface,
  tree,
  status: STATUS.PARTIAL,
  notes:
    "Terrain and surface palette implemented; dedicated ecology, weather, creatures, and structures are pending.",
}));
for (const biome of biomes) {
  if (biome.key.endsWith("caves") || biome.key === "deep_dark")
    biome.notes =
      "Cave region classification implemented; distinct formations, flora, sculk, and fauna are pending.";
  if (biome.key === "coral_reef")
    biome.notes =
      "Warm ocean terrain implemented; coral and reef ecology are pending.";
  if (biome.key === "mushroom_island")
    biome.notes =
      "Mycelium land regions implemented; dedicated islands, mushroom flora, and mooshrooms are pending.";
}

// Enumerate the remaining target families instead of silently dropping their variants.
export const plannedBlocks = [];
function planned(key, family) {
  if (!byKey[key])
    plannedBlocks.push({
      key,
      name: title(key),
      family,
      status: STATUS.MISSING,
    });
}
WOODS.forEach((wood) =>
  [
    "stripped_log",
    "wood",
    "stripped_wood",
    "stairs",
    "slab",
    "fence",
    "fence_gate",
    "door",
    "trapdoor",
    "button",
    "pressure_plate",
    "sign",
    "hanging_sign",
    "sapling",
  ].forEach((form) => planned(`${wood}_${form}`, "wood variants")),
);
[
  "stone",
  "cobblestone",
  "mossy_cobblestone",
  "stone_bricks",
  "mossy_stone_bricks",
  "sandstone",
  "red_sandstone",
  "bricks",
  "mud_bricks",
  "granite",
  "diorite",
  "andesite",
  "deepslate",
  "cobbled_deepslate",
  "deepslate_bricks",
  "deepslate_tiles",
  "tuff",
  "tuff_bricks",
  "quartz",
  "prismarine",
  "dark_prismarine",
  "nether_bricks",
  "red_nether_bricks",
  "blackstone",
  "polished_blackstone",
  "end_stone_bricks",
  "purpur",
].forEach((material) => {
  planned(material, "masonry");
  ["stairs", "slab", "wall"].forEach((shape) =>
    planned(`${material}_${shape}`, "shaped masonry"),
  );
});
COLORS.forEach((color) =>
  [
    "glass",
    "glass_pane",
    "carpet",
    "concrete_powder",
    "glazed_terracotta",
    "bed",
    "candle",
    "banner",
  ].forEach((form) => planned(`${color}_${form}`, "colored variants")),
);
[
  "poppy",
  "dandelion",
  "blue_orchid",
  "allium",
  "azure_bluet",
  "red_tulip",
  "orange_tulip",
  "white_tulip",
  "pink_tulip",
  "oxeye_daisy",
  "cornflower",
  "lily_of_the_valley",
  "wither_rose",
  "sunflower",
  "lilac",
  "rose_bush",
  "peony",
  "pink_petals",
  "wildflowers",
  "torchflower",
  "pitcher_plant",
  "brown_mushroom",
  "red_mushroom",
  "mushroom_stem",
  "brown_mushroom_block",
  "red_mushroom_block",
  "wheat",
  "carrots",
  "potatoes",
  "beetroots",
  "melon",
  "pumpkin",
  "sugar_cane",
  "cactus",
  "bamboo",
  "cocoa",
  "sweet_berries",
  "glow_berries",
  "kelp",
  "seagrass",
  "lily_pad",
  "vines",
  "hanging_roots",
  "azalea",
  "moss_carpet",
  "spore_blossom",
  "small_dripleaf",
  "big_dripleaf",
  "chorus_plant",
  "nether_wart",
  "crimson_fungus",
  "warped_fungus",
].forEach((key) => planned(key, "plants and crops"));
[
  "coal",
  "iron",
  "copper",
  "gold",
  "redstone",
  "lapis",
  "diamond",
  "emerald",
].forEach((ore) => planned(`deepslate_${ore}_ore`, "ores"));
[
  "ancient_debris",
  "nether_gold_ore",
  "nether_quartz_ore",
  "amethyst_block",
  "budding_amethyst",
  "amethyst_cluster",
  "red_sand",
  "packed_mud",
  "mud_bricks",
  "packed_ice",
  "blue_ice",
  "powder_snow",
  "soul_sand",
  "soul_soil",
  "magma",
  "crying_obsidian",
  "sponge",
  "wet_sponge",
  "suspicious_sand",
  "suspicious_gravel",
  "sculk",
  "sculk_sensor",
  "sculk_shrieker",
].forEach((key) => planned(key, "terrain and resources"));
[
  "torch",
  "lantern",
  "soul_torch",
  "soul_lantern",
  "glowstone",
  "sea_lantern",
  "shroomlight",
  "end_rod",
  "redstone_lamp",
  "campfire",
  "soul_campfire",
  "jack_o_lantern",
  "beacon",
  "furnace",
  "blast_furnace",
  "smoker",
  "chest",
  "trapped_chest",
  "barrel",
  "hopper",
  "dispenser",
  "dropper",
  "anvil",
  "grindstone",
  "stonecutter",
  "smithing_table",
  "enchanting_table",
  "brewing_stand",
  "cauldron",
  "composter",
  "loom",
  "cartography_table",
  "fletching_table",
  "bookshelf",
  "chiseled_bookshelf",
  "lectern",
  "jukebox",
  "note_block",
  "flower_pot",
  "painting",
  "item_frame",
  "armor_stand",
  "ladder",
  "scaffolding",
  "rail",
  "powered_rail",
  "minecart",
  "piston",
  "sticky_piston",
  "lever",
  "redstone_wire",
  "repeater",
  "comparator",
  "observer",
  "target",
  "tnt",
  "iron_door",
  "iron_trapdoor",
  "chain",
  "iron_bars",
  "bell",
  "respawn_anchor",
  "nether_portal",
  "end_portal",
].forEach((key) => planned(key, "functional and decorative"));
for (const coral of ["tube", "brain", "bubble", "fire", "horn"])
  for (const form of [
    "coral",
    "coral_block",
    "coral_fan",
    "dead_coral",
    "dead_coral_block",
    "dead_coral_fan",
  ])
    planned(`${coral}_${form}`, "coral");
for (const state of [
  "copper",
  "exposed_copper",
  "weathered_copper",
  "oxidized_copper",
  "waxed_copper",
  "waxed_exposed_copper",
  "waxed_weathered_copper",
  "waxed_oxidized_copper",
])
  for (const form of [
    "block",
    "cut",
    "stairs",
    "slab",
    "grate",
    "bulb",
    "door",
    "trapdoor",
  ])
    planned(`${state}_${form}`, "copper variants");
export const creatures = [
  "cow",
  "pig",
  "sheep",
  "chicken",
  "horse",
  "donkey",
  "mule",
  "rabbit",
  "fox",
  "wolf",
  "cat",
  "ocelot",
  "panda",
  "polar_bear",
  "goat",
  "llama",
  "camel",
  "armadillo",
  "bee",
  "frog",
  "turtle",
  "axolotl",
  "squid",
  "glow_squid",
  "dolphin",
  "cod",
  "salmon",
  "pufferfish",
  "tropical_fish",
  "bat",
  "parrot",
  "mooshroom",
  "sniffer",
  "allay",
  "villager",
  "wandering_trader",
  "iron_golem",
  "snow_golem",
  "zombie",
  "husk",
  "drowned",
  "skeleton",
  "stray",
  "bogged",
  "spider",
  "cave_spider",
  "creeper",
  "enderman",
  "witch",
  "slime",
  "magma_cube",
  "phantom",
  "silverfish",
  "endermite",
  "pillager",
  "vindicator",
  "evoker",
  "ravager",
  "vex",
  "warden",
  "breeze",
  "blaze",
  "ghast",
  "piglin",
  "piglin_brute",
  "zombified_piglin",
  "hoglin",
  "zoglin",
  "strider",
  "wither_skeleton",
  "shulker",
  "wither",
  "ender_dragon",
].map((key) => ({ key, name: title(key), status: STATUS.MISSING }));
export const plannedItems = [];
for (const material of [
  "wooden",
  "stone",
  "iron",
  "golden",
  "diamond",
  "netherite",
])
  for (const tool of ["pickaxe", "axe", "shovel", "hoe", "sword"]) {
    const key = `${material}_${tool}`;
    if (!itemByKey[key])
      plannedItems.push({ key, name: title(key), status: STATUS.MISSING });
  }
for (const material of [
  "leather",
  "chainmail",
  "iron",
  "golden",
  "diamond",
  "netherite",
])
  for (const piece of ["helmet", "chestplate", "leggings", "boots"])
    plannedItems.push({
      key: `${material}_${piece}`,
      name: title(`${material}_${piece}`),
      status: STATUS.MISSING,
    });
[
  "bow",
  "crossbow",
  "arrow",
  "shield",
  "trident",
  "mace",
  "elytra",
  "fishing_rod",
  "shears",
  "flint_and_steel",
  "bucket",
  "water_bucket",
  "lava_bucket",
  "boat",
  "raft",
  "saddle",
  "lead",
  "compass",
  "map",
  "clock",
  "spyglass",
  "brush",
  "bundle",
  "bread",
  "apple",
  "carrot",
  "potato",
  "baked_potato",
  "beetroot",
  "melon_slice",
  "berries",
  "raw_beef",
  "steak",
  "raw_pork",
  "cooked_pork",
  "raw_chicken",
  "cooked_chicken",
  "raw_fish",
  "cooked_fish",
  "mushroom_stew",
  "rabbit_stew",
  "cake",
  "cookie",
  "golden_apple",
  "seeds",
  "bone_meal",
  "dyes",
  "leather",
  "feather",
  "string",
  "gunpowder",
  "bone",
  "ender_pearl",
  "blaze_rod",
  "netherite_ingot",
  "quartz",
  "amethyst",
  "potions",
  "enchanted_books",
  "music_discs",
].forEach((key) =>
  plannedItems.push({ key, name: title(key), status: STATUS.MISSING }),
);
COLORS.forEach((color) =>
  plannedItems.push({
    key: `${color}_dye`,
    name: title(`${color}_dye`),
    status: STATUS.MISSING,
  }),
);
const craftedOutputs = new Set(recipes.map((recipe) => recipe.output));
export const plannedRecipes = [
  ...plannedBlocks.filter(
    (entry) =>
      !["plants and crops", "terrain and resources", "ores", "coral"].includes(
        entry.family,
      ),
  ),
  ...plannedItems.filter((entry) =>
    /pickaxe|axe|shovel|hoe|sword|helmet|chestplate|leggings|boots|dye/.test(
      entry.key,
    ),
  ),
  ...blocks.filter(
    (entry) =>
      !craftedOutputs.has(entry.key) &&
      ["wool", "concrete", "terracotta", "masonry"].includes(entry.family),
  ),
].map((entry) => ({
  key: `craft_${entry.key}`,
  name: `Craft ${entry.name}`,
  output: entry.key,
  status: STATUS.MISSING,
  notes: "Recipe, ingredients, and acquisition path pending.",
}));
for (const [key, output] of [
  ["smelt_iron", "iron_ingot"],
  ["smelt_copper", "copper_ingot"],
  ["smelt_gold", "gold_ingot"],
  ["smelt_glass", "glass"],
  ["cook_food", "cooked_food"],
]) {
  plannedRecipes.push({
    key,
    name: title(key),
    output,
    status: STATUS.MISSING,
    notes: "Requires the planned furnace/cooking system.",
  });
}
export const systems = [
  [
    "seeded_chunks",
    STATUS.DONE,
    "16 × 16 chunks, deterministic generation, nearby loading and unloading.",
  ],
  [
    "terrain",
    STATUS.PARTIAL,
    "Mountains, valleys, oceans, rivers, caves, cave pools, trees, and ore; ravines and dedicated islands pending.",
  ],
  ["movement", STATUS.DONE, "Mouse look, collision, jump, sprint, swimming."],
  [
    "block_interaction",
    STATUS.DONE,
    "Reach limit, outline, hardness, tool tiers, drops, placement and player overlap checks.",
  ],
  [
    "inventory",
    STATUS.DONE,
    "36 stacks, hotbar assignment, finite survival resources and creative catalog.",
  ],
  [
    "crafting",
    STATUS.PARTIAL,
    "Ingredient consumption, hand and nearby workbench recipes; wider recipe catalog pending.",
  ],
  [
    "tools",
    STATUS.PARTIAL,
    "Wood, stone, iron and diamond pickaxes, axes and shovels with durability; other equipment pending.",
  ],
  [
    "survival",
    STATUS.PARTIAL,
    "Health, hunger, fall damage, drowning, death and mode switching; food and combat pending.",
  ],
  [
    "saving",
    STATUS.DONE,
    "Versioned local autosave, manual save, JSON export/import; seed, edits, inventory, pose, settings and time.",
  ],
  [
    "day_night",
    STATUS.DONE,
    "Animated sun and ambient light over a twenty-minute cycle.",
  ],
  [
    "settings",
    STATUS.DONE,
    "Render distance, mouse sensitivity, volume and field of view.",
  ],
  [
    "effects",
    STATUS.DONE,
    "Procedural pixel textures, block particles and synthesized interaction sounds.",
  ],
  ...[
    "weather",
    "creature_ai",
    "biome_spawning",
    "villagers_and_trading",
    "farming",
    "fishing",
    "food",
    "weapons",
    "armor",
    "villages",
    "abandoned_mines",
    "dungeons",
    "temples",
    "ruins",
    "treasure",
    "nether_dimension",
    "end_dimension",
    "furnaces_and_smelting",
    "chests_and_storage",
    "circuits",
    "switches",
    "pistons",
    "automation",
    "shaped_block_collision",
    "doors_and_trapdoors",
  ].map((key) => [
    key,
    STATUS.MISSING,
    "Scheduled in later stages; no inactive game controls.",
  ]),
].map(([key, status, notes]) => ({ key, name: title(key), status, notes }));
export const catalog = {
  blocks: [...blocks, ...plannedBlocks],
  biomes,
  items: [...items, ...plannedItems],
  creatures,
  recipes: [...recipes, ...plannedRecipes],
  systems,
};
export function title(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

# Target catalog and delivery checklist

The authoritative, enumerated target catalog is `src/registry.js`. Every block, biome, item, creature, recipe and system entry has one of three states: **implemented**, **partially implemented**, or **missing**. Partial entries include limitations. `npm run catalog` regenerates `CONTENT_STATUS.md` with every entry and status. This is a Minecraft-inspired target, not a claim of parity with a particular Minecraft release.

## Stage 1 — playable world foundation

- [x] Data-driven block/item/biome/recipe registry and complete target checklist
- [x] Reproducible text seeds and streamed chunks around the player
- [x] First-person movement, gravity, collision, jumping, sprinting, swimming
- [x] Breaking, placing, reach and selection outlines
- [x] Hotbar and finite inventory; creative block catalog
- [x] Versioned saving/loading, autosave, portable export/import

## Stage 2 — terrain, materials and basic survival

- [x] Broad biome terrain palettes, water, mountains, caves and underground ore
- [x] Wood species, colored building families, basic masonry and metal blocks
- [x] Hand recipes and real workbench recipes with ingredient consumption
- [x] Tool tiers, mining hardness, drops and durability
- [x] Basic health, hunger, falling, drowning, death and creative/survival switching
- [x] Day/night lighting, pixel textures, particles, sounds and settings
- [ ] Biome-specific flora, weather, fauna and complete ecology
- [ ] Food production and combat equipment

## Stage 3 — functional building and living world

- [ ] Stairs/slabs/fences with appropriate geometry and collision
- [ ] Doors, trapdoors, switches and orientation/state persistence
- [ ] Chests, furnaces, smelting and storage transactions
- [ ] Crops, farming, food and fishing
- [ ] Passive and hostile creatures, AI, biome spawning and combat
- [ ] Armor and weapons

## Stage 4 — exploration and automation

- [ ] Villages, villagers, mines, dungeons, temples, ruins and loot
- [ ] Nether and End-like dimensions, resources, portals and travel
- [ ] Circuits, switches, pistons and automation
- [ ] Full plant, decorative, colored, copper and masonry variant catalog
- [ ] Weather, dedicated cave ecology, coral reefs and mushroom flora
- [ ] Complete recipes and resource acquisition paths for all catalog entries

Only available content appears in the creative inventory. Missing entries are visible in the **development catalog** with explicit status, never as nonfunctional gameplay buttons. Basic biome terrain is deliberately partial: a named biome does not imply completed flora, creatures or structures. Ingot recipes are tracked but ingots require creative access until smelting is implemented.

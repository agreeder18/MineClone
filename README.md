# Fieldwork

A playable, staged Minecraft-inspired voxel sandbox built with Three.js, Vite, and simplex-noise. This build completes the world/inventory/save foundation and implements basic terrain, crafting and survival. The full requested catalog is tracked, not claimed as finished.

## Run

Use Node.js 20.19+ or 22.12+:

```sh
npm install
npm run dev
```

Open Vite's local URL and click **Enter world**. Use a desktop browser with WebGL and pointer lock. No remote assets, accounts, or server are required.

```sh
npm test          # Registry, terrain/chunks, physics, crafting, inventory, save validation
npm run build     # Production files in dist/
npm run preview   # Serve the production build
npm run catalog   # Regenerate the full CONTENT_STATUS.md checklist
```

## Play

| Input | Action |
| --- | --- |
| W / A / S / D | Move |
| Mouse | Look |
| Space | Jump / swim upward |
| Shift | Sprint |
| Hold left mouse | Mine; survival mining uses hardness and tool tier |
| Right mouse | Place selected block |
| 1–9 / 0, mouse wheel | Select hotbar slot |
| E | Open inventory and crafting |
| Esc | Pause and release mouse |

In **creative**, open inventory with E, search the creative catalog, and click an item to equip it in the selected hotbar slot and take a stack. Building is unlimited. In **survival**, gather wood, craft planks, sticks and a crafting table, place the table, then open the Crafting tab while within three blocks of it. Crafting consumes ingredients. Tools have tiers and durability; ore without a suitable tool produces no drop. Grass drops dirt, stone drops cobblestone, and diamond ore drops diamonds.

World & saves switches modes, creates seeded worlds, saves locally, and exports/imports JSON backups. Settings controls render distance, sensitivity, sound and field of view. A twenty-minute day/night cycle advances while playing. Hunger and drowning are basic; food, armor, combat, smelting and creature systems are pending. Raw iron can be gathered, but iron/diamond tool progression currently requires creative-supplied ingots until furnaces are implemented. Death restores health and returns to spawn while keeping inventory.

## Scope and catalog

- [CONTENT_CHECKLIST.md](CONTENT_CHECKLIST.md) lists delivery stages and outstanding systems.
- [CONTENT_STATUS.md](CONTENT_STATUS.md) enumerates every target block, biome, item, creature, recipe and system with its state.
- `src/registry.js` is the authoritative data source. Only available entries are exposed as usable content. The in-game **Development catalog** shows implemented, partially implemented and missing entries explicitly.

This build includes more than 100 cube block types, twelve wood palettes, sixteen colors of wool/concrete/terracotta, ores, metal blocks, basic masonry, and a functional crafting table. Named biomes currently supply terrain/surface/wood palettes or cave classifications; biome ecology is incomplete. Water is static, and glass currently uses a solid patterned texture. Stairs, slabs, doors, fences, functional storage, automation, mobs, structures, weather, food and other dimensions are tracked for later stages.

## Implementation

- `src/world.js`: seeded height and climate noise, caves, ore veins, trees, water, 16 × 16 × 96 chunks, exposed-face geometry, shared pixel texture atlas, budgeted streaming, and edit persistence.
- `src/player.js`: pointer lock, 120 Hz physics, player/block collision, sprinting, swimming, health, hunger and damage.
- `src/main.js`: renderer, lighting/day cycle, interaction, UI panels, sounds, particles, autosave and export/import.
- `src/inventory.js`: 36 bounded stacks, atomic crafting, tool durability, and mining rules.
- `src/save.js`: versioned snapshots and strict imported-save validation. Edits serialize stable registry keys rather than numeric IDs.

The world generates on demand without a fixed horizontal map edge, using deterministic seeded noise, with a fixed 96-block vertical height (JavaScript and graphics precision still apply at extreme distances). Nearby chunks load nearest-first, one per frame, within a configurable radius of up to six chunks (six by default). Loaded chunks are retained until they are more than six chunks away on either horizontal axis; their geometry is disposed when unloaded. Block placements and removals save immediately to localStorage, including air edits, independently of chunk residency. The current world also autosaves every 15 seconds while dirty, on pause, when hiding the page and on unload. Browser storage has finite capacity, so export portable backups for large worlds. Starting a new world replaces the browser's single current save. Malformed imports are rejected before the active world is changed. The prior fixed-world prototype did not persist worlds and cannot be migrated from a saved file.

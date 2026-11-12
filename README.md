# Fieldwork

A browser voxel sandbox built with Three.js, Vite, and simplex-noise.

## Run

Install Node.js 20.19+ or 22.12+, then:

```sh
npm install
npm run dev
```

Open the local URL Vite prints, then click **Enter world**. A desktop browser with WebGL and pointer lock support is required.

```sh
npm test         # Terrain, geometry, and player collision checks
npm run build   # Production output in dist/
npm run preview # Serve the production build
```

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Move |
| Mouse | Look |
| Space | Jump |
| Left mouse | Break block |
| Right mouse | Place block |
| 1–9 | Select grass, dirt, stone, sand, wood, planks, bricks, leaves, or diamond ore |
| 0 | Select crafting table |
| Esc | Pause and release mouse |

## Modules

- `src/world.js`: deterministic 64 × 64 terrain, grass over three dirt layers and stone, underground diamond veins, ten block types, procedural pixel textures, and exposed-face geometry.
- `src/player.js`: pointer lock, normalized movement, jumping, gravity, and axis-separated player/block collision at a fixed 120 Hz physics rate.
- `src/main.js`: renderer, lighting, game loop, block raycasting, placement, selection, and HUD.

Diamond ore appears in small veins inside stone at Y 1–8, at least five blocks below the surface. Dig through dirt and stone to uncover the cyan crystals. All ten block types are available for unlimited placement in this creative sandbox.

Press **0** and right-click a block face to place a crafting table. It has a 3 × 3 grid on top, wooden sides with tools, and a plank underside. The table is a building block; recipe crafting and inventory are not implemented.

The world is 40 blocks tall. Horizontal edges are solid boundaries; the bottom layer cannot be removed. Placement cannot intersect the player. Edits stay in memory and reset on reload. Terrain meshes rebuild after edits; hidden faces are omitted and faces are grouped by material.

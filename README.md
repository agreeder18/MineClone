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
| 1 / 2 / 3 | Select grass / dirt / stone |
| Esc | Pause and release mouse |

## Modules

- `src/world.js`: deterministic 64 × 64 terrain, grass over three dirt layers and stone, block storage, procedural pixel textures, and exposed-face geometry.
- `src/player.js`: pointer lock, normalized movement, jumping, gravity, and axis-separated player/block collision at a fixed 120 Hz physics rate.
- `src/main.js`: renderer, lighting, game loop, block raycasting, placement, selection, and HUD.

The world is 40 blocks tall. Horizontal edges are solid boundaries; the bottom layer cannot be removed. Placement cannot intersect the player. Edits stay in memory and reset on reload. Terrain meshes rebuild after edits; hidden faces are omitted and all faces are grouped into four material draws.

import { updateWater } from "./water.js";
import { Sky } from "./sky.js";
import * as THREE from "three";
import { World, HEIGHT, UNLOAD_DISTANCE } from "./world.js";
import { Player } from "./player.js";
import {
  blocks,
  byKey,
  byId,
  itemByKey,
  items,
  recipes,
  catalog,
  title,
} from "./registry.js";
import { Inventory, DEFAULT_HOTBAR, miningInfo } from "./inventory.js";
import { DEFAULT_SETTINGS, validateSave, snapshot, writeSave, readSave } from "./save.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const menu = $("#menu"),
  panel = $("#panel"),
  body = $("#panel-body"),
  status = $("#status"),
  fps = $("#fps");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#b9d5dd");
scene.fog = new THREE.Fog("#b9d5dd", 35, 80);
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.05,
  180,
);
camera.rotation.order = "YXZ";
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  status.textContent =
    "WebGL is unavailable. Enable hardware acceleration and reload.";
  $("#play").disabled = true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("#game").appendChild(renderer.domElement);
const ambient = new THREE.HemisphereLight(0xe8f5ff, 0x655b40, 2.2);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight(0xfff1d5, 2.5);
scene.add(sunlight);
const sky = new Sky(scene);
const game = {
  world: null,
  player: null,
  camera,
  inventory: new Inventory(),
  hotbar: [...DEFAULT_HOTBAR],
  selected: 0,
  time: 240,
  settings: { ...DEFAULT_SETTINGS },
};
let activeTab = "inventory",
  target = null,
  holding = false,
  placing = false,
  minedKey = "",
  mineTime = 0,
  placeCooldown = 0,
  toastTime = 0,
  dirty = false;
let audio = null;
let autosaveAllowed = true;
const raycaster = new THREE.Raycaster();
raycaster.far = 6;
const center = new THREE.Vector2();
const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
  new THREE.LineBasicMaterial({ color: 0x181818 }),
);
outline.visible = false;
scene.add(outline);
const particles = [];
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTime = 4;
}
function sound(pitch = 240) {
  if (!audio || !game.settings.volume) return;
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(pitch, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    pitch * 0.45,
    audio.currentTime + 0.09,
  );
  gain.gain.setValueAtTime(game.settings.volume * 0.12, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.1);
}
function burst(x, y, z, color) {
  const positions = new Float32Array(36),
    velocity = new Float32Array(36);
  for (let i = 0; i < 36; i += 3) {
    positions[i] = x + 0.5;
    positions[i + 1] = y + 0.5;
    positions[i + 2] = z + 0.5;
    velocity[i] = (Math.random() - 0.5) * 3;
    velocity[i + 1] = Math.random() * 3;
    velocity[i + 2] = (Math.random() - 0.5) * 3;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mesh = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size: 0.11 }),
  );
  mesh.frustumCulled = false;
  scene.add(mesh);
  particles.push({ mesh, velocity, life: 0.7 });
}
function icon(item) {
  return `<span class="block-icon${item.durability ? " tool" : ""}" style="--block-color:${item.color}"></span>`;
}
function currentItem() {
  return itemByKey[game.hotbar[game.selected]];
}
function equippedTool() {
  const item = currentItem();
  return item?.durability &&
    (game.player.mode === "creative" || game.inventory.count(item.key))
    ? item
    : null;
}
function renderHotbar() {
  $(".hotbar").innerHTML = game.hotbar
    .map((key, index) => {
      const item = itemByKey[key],
        count = game.inventory.count(key),
        creative = game.player.mode === "creative";
      return `<button class="slot${index === game.selected ? " active" : ""}${!creative && !count ? " empty" : ""}" data-slot="${index}" aria-label="Slot ${(index + 1) % 10}: ${item.name}" aria-pressed="${index === game.selected}" title="${item.name}"><span class="key">${(index + 1) % 10}</span><span class="count">${creative ? "∞" : count}</span>${icon(item)}<span class="label">${item.name}</span></button>`;
    })
    .join("");
}
function markDirty() {
  dirty = true;
  renderHotbar();
}
function save(manual = false) {
  if (!autosaveAllowed && !manual) return false;
  if (manual) autosaveAllowed = true;
  try {
    writeSave(game);
    dirty = false;
    if (manual) notify("World saved on this browser.");
    return true;
  } catch (error) {
    notify(
      `Could not save: ${error.message}. Export a backup from World & saves.`,
    );
    return false;
  }
}
function applySettings() {
  const { settings, world, player } = game;
  world.renderDistance = settings.renderDistance;
  player.controls.pointerSpeed = settings.sensitivity;
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  scene.fog.near = settings.renderDistance * 16 * 0.65;
  scene.fog.far = settings.renderDistance * 16 + 12;
  camera.far = settings.renderDistance * 16 + 60;
  camera.updateProjectionMatrix();
}
function startWorld(seed, saved = null) {
  holding = false;
  placing = false;
  target = null;
  outline.visible = false;
  if (game.player) {
    game.player.controls.dispose();
    game.player.dispose();
  }
  game.world?.dispose();
  game.world = new World(seed, saved?.edits ?? []);
  game.world.attach(scene);
  game.inventory = new Inventory(saved?.inventory ?? []);
  game.hotbar = saved?.hotbar ?? [...DEFAULT_HOTBAR];
  game.selected = saved?.selected ?? 0;
  game.settings = { ...DEFAULT_SETTINGS, ...saved?.settings };
  game.time = saved?.time ?? 240;
  game.player = new Player(camera, renderer.domElement, game.world);
  game.player.mode = saved?.mode ?? "creative";
  camera.rotation.set(-0.15, -Math.PI * 0.7, 0, "YXZ");
  if (saved) {
    game.player.position.set(saved.player.x, saved.player.y, saved.player.z);
    game.player.health = saved.player.health;
    game.player.hunger = saved.player.hunger;
    camera.rotation.set(saved.player.pitch, saved.player.yaw, 0, "YXZ");
    if (game.player.collides())
      game.player.position.y =
        game.world.surfaceHeight(saved.player.x, saved.player.z) + 0.01;
    camera.position.copy(game.player.position).y += 1.62;
  }
  const controls = game.player.controls;
  controls.addEventListener("lock", () => {
    menu.classList.add("hidden");
    document.body.classList.add("playing");
    if (panel.open) panel.close();
  });
  controls.addEventListener("unlock", () => {
    holding = false;
    placing = false;
    mineTime = 0;
    outline.visible = false;
    menu.classList.remove("hidden");
    document.body.classList.remove("playing");
    $("#play").innerHTML = "Back to exploring <span>↗</span>";
    $("#target-name").textContent = "";
    $("#mining").hidden = true;
    save();
  });
  game.player.onDeath = () => {
    holding = false;
    controls.unlock();
    notify("You returned to spawn. Your inventory has been kept.");
    markDirty();
  };
  applySettings();
  game.world.stream(game.player.position, 1);
  renderHotbar();
  dirty = true;
}
function enterWorld() {
  autosaveAllowed = true;
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      /* Sound is optional. */
    }
  }
  audio?.resume().catch(() => {});
  status.textContent = "Click to capture your mouse · Esc to pause";
  try {
    game.player.controls.lock();
  } catch {
    status.textContent = "Mouse capture was declined. Try Enter world again.";
  }
}
$("#play").addEventListener("click", enterWorld);
$("#panel-back").addEventListener("click", () => {
  panel.close();
  enterWorld();
});
document.addEventListener("pointerlockerror", () => {
  status.textContent = "Mouse capture was declined. Try Enter world again.";
});
panel.addEventListener("cancel", () => {
  holding = false;
});
function openPanel(tab) {
  holding = false;
  game.player.controls.unlock();
  activeTab = tab;
  if (!panel.open) panel.showModal();
  renderPanel();
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open]");
  if (button) openPanel(button.dataset.open);
});
$("#open-world").addEventListener("click", () => openPanel("world"));
$(".hotbar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-slot]");
  if (button) {
    game.selected = Number(button.dataset.slot);
    markDirty();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.target.matches("input,select,textarea") || event.repeat) return;
  if (event.code === "KeyE") {
    event.preventDefault();
    if (panel.open) {
      panel.close();
      enterWorld();
    } else openPanel("inventory");
  }
  const match = /^Digit([0-9])$/.exec(event.code);
  if (match) {
    game.selected = (Number(match[1]) + 9) % 10;
    markDirty();
    if (panel.open && activeTab === "inventory") renderPanel();
  }
});
renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    if (!game.player.controls.isLocked) return;
    event.preventDefault();
    game.selected = (game.selected + (event.deltaY > 0 ? 1 : 9)) % 10;
    markDirty();
  },
  { passive: false },
);
renderer.domElement.addEventListener("contextmenu", (event) =>
  event.preventDefault(),
);
renderer.domElement.addEventListener("mousedown", (event) => {
  if (!game.player.controls.isLocked) return;
  if (event.button === 0) {
    holding = true;
    minedKey = "";
    mineTime = 0;
  }
  if (event.button === 2) {
    placing = true;
    updateTarget();
    placeBlock();
  }
});
document.addEventListener("mouseup", (event) => {
  if (event.button === 2) placing = false;
  if (event.button === 0) {
    holding = false;
    mineTime = 0;
    $("#mining").hidden = true;
  }
});
window.addEventListener("blur", () => {
  holding = false;
  placing = false;
});
function updateTarget() {
  outline.visible = false;
  target = null;
  if (!game.player.controls.isLocked) {
    $("#target-name").textContent = "";
    return;
  }
  raycaster.setFromCamera(center, camera);
  const hit = raycaster.intersectObjects(game.world.meshes, false)
    .find((hit) => hit.face.materialIndex === 0);
  if (!hit) {
    $("#target-name").textContent = "";
    return;
  }
  const point = hit.point
    .clone()
    .addScaledVector(hit.face.normal, -0.001)
    .floor();
  const block = byId[game.world.getBlock(point.x, point.y, point.z)];
  if (!block) return;
  target = {
    x: point.x,
    y: point.y,
    z: point.z,
    normal: hit.face.normal.clone(),
    block,
  };
  outline.position.copy(point).addScalar(0.5);
  outline.visible = true;
  const mining = miningInfo(block, equippedTool());
  $("#target-name").textContent =
    block.name +
    (game.player.mode === "survival" && !mining.harvestable
      ? ` · needs tier ${block.tier} ${block.tool}`
      : "");
}
function breakBlock() {
  if (!target || target.y === 0) return false;
  const { x, y, z, block } = target,
    creative = game.player.mode === "creative",
    info = miningInfo(block, equippedTool());
  if (!creative && info.drop && !game.inventory.add(info.drop)) {
    notify("Inventory full. Make space before mining.");
    return false;
  }
  game.world.setBlock(x, y, z, 0);
  if (!creative && equippedTool()) {
    if (game.inventory.wear(currentItem().key)) notify("Your tool broke.");
  }
  if (!creative && !info.harvestable)
    notify(`${block.name} broke without a drop. Use the right tool tier.`);
  burst(x, y, z, block.color);
  sound(180);
  markDirty();
  save();
  return true;
}
function placeBlock() {
  if (!target || placeCooldown > 0) return;
  const item = currentItem();
  if (!item.id) {
    notify("Select a building block to place.");
    return;
  }
  if (game.player.mode === "survival" && !game.inventory.count(item.key)) {
    notify(`You have no ${item.name.toLowerCase()}.`);
    return;
  }
  const { x: tx, y: ty, z: tz, normal } = target,
    x = tx + normal.x,
    y = ty + normal.y,
    z = tz + normal.z;
  if (
    !game.world.inBounds(x, y, z) ||
    y === 0 ||
    game.world.isSolid(x, y, z) ||
    (item.solid && game.player.overlapsBlock(x, y, z))
  )
    return;
  if (game.world.setBlock(x, y, z, item.id)) {
    if (game.player.mode === "survival") game.inventory.remove(item.key);
    placeCooldown = 0.15;
    sound(340);
    markDirty();
    save();
    updateTarget();
  }
}
function miningTick(dt) {
  $("#mining").hidden = true;
  outline.material.color.setHex(0x181818);
  if (!holding || !target || !game.player.controls.isLocked) {
    mineTime = 0;
    minedKey = "";
    return;
  }
  if (target.y === 0) {
    $("#target-name").textContent = "Bedrock · unbreakable";
    return;
  }
  const key = `${target.x},${target.y},${target.z}:${currentItem().key}`;
  if (key !== minedKey) {
    minedKey = key;
    mineTime = 0;
  }
  const duration =
    game.player.mode === "creative"
      ? 0.14
      : Math.max(0.1, miningInfo(target.block, equippedTool()).duration);
  mineTime += dt;
  outline.material.color.setRGB(0.1 + Math.min(1, mineTime / duration) * 0.7, 0.1, 0.1);
  if (game.player.mode === "survival") {
    $("#mining").hidden = false;
    $("#mining").value = mineTime / duration;
  }
  if (mineTime >= duration) {
    breakBlock();
    mineTime = 0;
    updateTarget();
  }
}

function renderPanel() {
  $("#panel-title").textContent = {
    inventory: "Your inventory",
    crafting: "Make something",
    world: "Your world",
    settings: "Make yourself at home",
    catalog: "Development catalog",
  }[activeTab];
  document
    .querySelectorAll(".tabs [data-open]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.open === activeTab),
    );
  if (activeTab === "inventory") renderInventory();
  if (activeTab === "crafting") renderCrafting();
  if (activeTab === "world") renderWorldPanel();
  if (activeTab === "settings") renderSettings();
  if (activeTab === "catalog") renderCatalog();
}
function assign(key) {
  game.hotbar[game.selected] = key;
  markDirty();
  renderInventory();
  notify(
    `${itemByKey[key].name} assigned to slot ${(game.selected + 1) % 10}.`,
  );
}
function renderInventory() {
  body.innerHTML = `<p class="note">${game.player.mode === "creative" ? "Creative · choose a catalog item to equip it and take a stack." : "Survival · gather blocks and craft tools. Each stack holds 64 blocks or one tool."} Click an item to assign hotbar slot <strong>${(game.selected + 1) % 10}</strong>. Number keys change the destination slot.</p><div class="inventory-grid">${game.inventory.slots.map((slot, index) => (slot ? `<button class="inventory-cell" data-inventory="${index}" title="${itemByKey[slot.key].name}"><span class="amount">${slot.count}</span>${icon(itemByKey[slot.key])}<span>${itemByKey[slot.key].name}</span>${slot.durability ? `<small>${slot.durability} uses</small>` : ""}</button>` : '<div class="inventory-cell" style="border:1px solid #ffffff12;border-radius:5px"></div>')).join("")}</div><div class="controls-row"><button id="discard">Discard one selected item</button><button data-open="crafting">Open recipes →</button></div>${game.player.mode === "creative" ? '<h3 class="section-title">Creative catalog</h3><div class="controls-row"><input id="item-search" type="search" placeholder="Find a block, tool or material…" aria-label="Search creative inventory" /></div><div id="creative-list" class="creative-grid"></div>' : ""}`;
  body
    .querySelectorAll("[data-inventory]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          assign(game.inventory.slots[button.dataset.inventory].key)),
    );
  $("#discard").onclick = () => {
    if (game.inventory.remove(currentItem().key)) {
      markDirty();
      renderInventory();
    } else notify("No selected item to discard.");
  };
  if (game.player.mode === "creative") {
    const list = $("#creative-list");
    function filter() {
      const search = $("#item-search").value.toLowerCase();
      list.innerHTML = [
        ...blocks.filter((b) => b.key !== "bedrock" && b.key !== "water"),
        ...items,
      ]
        .filter((item) => item.name.toLowerCase().includes(search))
        .map(
          (item) =>
            `<button class="inventory-cell" data-creative="${item.key}" title="${item.name}">${icon(item)}<span>${item.name}</span></button>`,
        )
        .join("");
    }
    $("#item-search").oninput = filter;
    filter();
    list.onclick = (event) => {
      const button = event.target.closest("[data-creative]");
      if (!button) return;
      const key = button.dataset.creative;
      const added = game.inventory.add(key, itemByKey[key].durability ? 1 : 64);
      assign(key);
      if (!added) notify("Equipped for creative building; inventory is full.");
    };
  }
}
function renderCrafting() {
  const table = game.world.hasWorkbench(game.player.position);
  body.innerHTML = `<p class="note">${table ? "Workbench nearby · all workbench recipes unlocked." : "Hand crafting · place a crafting table within three blocks to unlock tool recipes."} Crafting consumes ingredients from your inventory.</p><div class="controls-row"><input id="recipe-search" type="search" placeholder="Search recipes…" aria-label="Search recipes" /><label><input id="craftable" type="checkbox" /> Only recipes I can craft</label></div><div id="recipe-list"></div>`;
  function filter() {
    const search = $("#recipe-search").value.toLowerCase();
    const matches = recipes.filter(
      (recipe) =>
        itemByKey[recipe.output].name.toLowerCase().includes(search) &&
        (!$("#craftable").checked || game.inventory.canCraft(recipe, table)),
    );
    $("#recipe-list").innerHTML =
      matches
        .map(
          (recipe) =>
            `<div class="recipe">${icon(itemByKey[recipe.output])}<div><strong>${recipe.count} × ${itemByKey[recipe.output].name}</strong><small>${Object.entries(
              recipe.ingredients,
            )
              .map(
                ([key, n]) =>
                  `${game.inventory.count(key)}/${n} ${itemByKey[key].name}`,
              )
              .join(
                " · ",
              )}${recipe.station === "table" ? " · Workbench" : ""}</small></div><button data-recipe="${recipe.key}" ${game.inventory.canCraft(recipe, table) ? "" : "disabled"}>Craft</button></div>`,
        )
        .join("") ||
      '<p class="note">No matching recipes. Gather more materials.</p>';
  }
  $("#recipe-search").oninput = filter;
  $("#craftable").onchange = filter;
  filter();
  $("#recipe-list").onclick = (event) => {
    const button = event.target.closest("[data-recipe]");
    if (!button) return;
    const recipe = recipes.find((r) => r.key === button.dataset.recipe);
    if (
      game.inventory.craft(
        recipe.key,
        game.world.hasWorkbench(game.player.position),
      )
    ) {
      game.hotbar[game.selected] = recipe.output;
      markDirty();
      sound(500);
      filter();
      notify(`Crafted ${recipe.count} ${itemByKey[recipe.output].name}.`);
    } else
      notify(
        "Crafting failed: check ingredients, space, and workbench distance.",
      );
  };
}
function renderWorldPanel() {
  body.innerHTML = `<p class="note">Seed: <strong id="seed-label"></strong> · ${game.world.edits.size} edited blocks · ${game.world.chunks.size} loaded chunks<br />Seeded terrain streams endlessly as you explore. Block edits save immediately in this browser. Export a backup before starting a new world.</p><div class="controls-row"><button id="save-now">Save now</button><button id="export-save">Export world</button><button id="import-save">Import world</button></div><h3 class="section-title">Game mode</h3><p class="note">Creative has unlimited building materials. Survival uses your inventory, tool durability, health, hunger and fall damage. Mode switching keeps your inventory. Food and combat are planned for a later stage.</p><div class="controls-row"><button id="mode-creative" ${game.player.mode === "creative" ? "disabled" : ""}>Creative</button><button id="mode-survival" ${game.player.mode === "survival" ? "disabled" : ""}>Survival</button></div><h3 class="section-title">Start another world</h3><form id="new-world" class="controls-row"><label>Seed <input type="text" id="new-seed" maxlength="80" value="Fieldwork" required /></label><button type="submit">Create new world</button></form><p class="note danger">Creating a world replaces this browser’s current save. Export first to keep it.</p>`;
  $("#seed-label").textContent = game.world.seed;
  $("#save-now").onclick = () => save(true);
  $("#export-save").onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(game), null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "fieldwork-world.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("World exported. Keep the JSON file as a backup.");
  };
  $("#import-save").onclick = () => $("#import-file").click();
  for (const mode of ["creative", "survival"])
    $(`#mode-${mode}`).onclick = () => {
      game.player.mode = mode;
      if (mode === "creative") game.player.breath = 10;
      markDirty();
      save();
      renderWorldPanel();
    };
  $("#new-world").onsubmit = (event) => {
    event.preventDefault();
    const seed = $("#new-seed").value.trim();
    if (!seed) {
      notify("Enter a seed first.");
      return;
    }
    startWorld(seed);
    save(true);
    renderWorldPanel();
    notify("New world ready.");
  };
}
$("#import-file").onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 25 * 1024 * 1024)
      throw new Error("Save file exceeds 25 MB.");
    const saved = validateSave(JSON.parse(await file.text()));
    startWorld(saved.seed, saved);
    save(true);
    activeTab = "world";
    renderPanel();
    notify("World restored from backup.");
  } catch (error) {
    notify(`Import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
};
function renderSettings() {
  const labels = [
    ["renderDistance", "Render distance · chunks", 2, UNLOAD_DISTANCE, 1],
    ["sensitivity", "Mouse sensitivity", 0.2, 2, 0.1],
    ["volume", "Sound volume", 0, 1, 0.05],
    ["fov", "Field of view", 55, 100, 1],
  ];
  body.innerHTML =
    '<p class="note">Lower render distance improves performance. Changes apply immediately and are saved with your world.</p>' +
    labels
      .map(
        ([key, name, min, max, step]) =>
          `<label class="settings-row">${name} <output id="value-${key}">${game.settings[key]}</output><input data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${game.settings[key]}" /></label>`,
      )
      .join("");
  body.querySelectorAll("[data-setting]").forEach(
    (input) =>
      (input.oninput = () => {
        game.settings[input.dataset.setting] = Number(input.value);
        $(`#value-${input.dataset.setting}`).value = input.value;
        applySettings();
        dirty = true;
      }),
  );
}
function renderCatalog() {
  body.innerHTML =
    '<p class="note">This is the development checklist, not an inventory. “Partial” entries list their limits. Missing entries are planned and have no gameplay controls.</p><div class="controls-row"><select id="catalog-section" aria-label="Catalog category">' +
    Object.keys(catalog)
      .map((key) => `<option>${key}</option>`)
      .join("") +
    '</select><select id="catalog-status" aria-label="Implementation status"><option value="">All states</option><option>implemented</option><option>partially implemented</option><option>missing</option></select><input id="catalog-search" type="search" placeholder="Search target catalog…" aria-label="Search target catalog" /></div><div id="catalog-results"></div>';
  function filter() {
    const all = catalog[$("#catalog-section").value],
      search = $("#catalog-search").value.toLowerCase(),
      state = $("#catalog-status").value;
    const entries = all.filter(
      (entry) =>
        (entry.name ?? title(entry.key)).toLowerCase().includes(search) &&
        (!state || entry.status === state),
    );
    $("#catalog-results").innerHTML =
      `<div class="summary-counts">${["implemented", "partially implemented", "missing"].map((status) => `<span>${all.filter((entry) => entry.status === status).length} ${status}</span>`).join("")}</div><table class="catalog-table"><thead><tr><th>Entry</th><th>Status</th><th>Current scope</th></tr></thead><tbody>${entries.map((entry) => `<tr><td>${entry.name ?? title(entry.key)}</td><td><span class="badge ${entry.status === "implemented" ? "implemented" : entry.status === "missing" ? "missing" : ""}">${entry.status}</span></td><td>${entry.notes ?? (entry.station ? `${entry.station} recipe` : "")}</td></tr>`).join("")}</tbody></table>`;
  }
  $("#catalog-section").onchange = filter;
  $("#catalog-status").onchange = filter;
  $("#catalog-search").oninput = filter;
  filter();
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
window.addEventListener("beforeunload", () => save());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) save();
});
let initial = null;
try {
  initial = readSave();
} catch (error) {
  autosaveAllowed = false;
  status.textContent = `Could not load the saved world: ${error.message} Your existing save will not be overwritten until you play or save.`;
}
startWorld(initial?.seed ?? "Fieldwork", initial);
let previous = performance.now(),
  hudTime = 0,
  saveTime = 0,
  fpsTime = 0,
  fpsFrames = 0;
document.addEventListener("visibilitychange", () => {
  previous = performance.now();
  fpsTime = 0;
  fpsFrames = 0;
});
renderer.setAnimationLoop((now) => {
  const elapsed = (now - previous) / 1000;
  const dt = Math.min(elapsed, 0.1);
  fpsTime += elapsed;
  fpsFrames++;
  if (fpsTime >= 0.5) {
    fps.textContent = `${Math.round(fpsFrames / fpsTime)} FPS`;
    fpsTime = 0;
    fpsFrames = 0;
  }
  previous = now;
  game.world.stream(game.player.position, 1);
  game.player.update(dt);
  updateTarget();
  miningTick(dt);
  placeCooldown = Math.max(0, placeCooldown - dt);
  if (placing && game.player.controls.isLocked) placeBlock();
  if (game.player.controls.isLocked) {
    game.time += dt;
    dirty = true;
  }
  sky.update(camera, game.time, ambient, sunlight, scene.fog);
  updateWater(game.world.waterMaterial, game.time, sky, sunlight);
  for (let i = particles.length - 1; i >= 0; i--) {
    const effect = particles[i];
    effect.life -= dt;
    const attribute = effect.mesh.geometry.attributes.position;
    for (let j = 0; j < attribute.array.length; j += 3) {
      effect.velocity[j + 1] -= 8 * dt;
      attribute.array[j] += effect.velocity[j] * dt;
      attribute.array[j + 1] += effect.velocity[j + 1] * dt;
      attribute.array[j + 2] += effect.velocity[j + 2] * dt;
    }
    attribute.needsUpdate = true;
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
  if (toastTime > 0) {
    toastTime -= dt;
    if (toastTime <= 0) $("#toast").classList.remove("visible");
  }
  hudTime += dt;
  saveTime += dt;
  if (hudTime > 0.2) {
    const p = game.player.position;
    $("#coordinates").textContent =
      `X ${p.x.toFixed(1)} / Y ${p.y.toFixed(1)} / Z ${p.z.toFixed(1)} · ${game.world.chunks.size} chunks${game.world.queue.length ? " · loading" : ""}`;
    $("#biome").textContent = title(
      game.world.biomeAt(p.x, p.y, p.z),
    ).toUpperCase();
    $("#vitals").textContent =
      game.player.mode === "creative"
        ? "CREATIVE · E inventory & crafting"
        : `♥ ${Math.ceil(game.player.health)}/20  ·  Hunger ${Math.ceil(game.player.hunger)}/20${game.player.breath < 10 ? `  ·  Air ${Math.ceil(game.player.breath)}` : ""}`;
    hudTime = 0;
  }
  if (saveTime > 15) {
    if (dirty) save();
    saveTime = 0;
  }
  renderer.render(scene, camera);
});

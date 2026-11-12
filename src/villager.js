import * as THREE from 'three';

export class Villager {
  constructor(scene, world) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    const spawn = world.findSpawn();
    const x = Math.floor(spawn.x) + 3, z = Math.floor(spawn.z);
    this.mesh.position.set(x + 0.5, world.surfaceHeight(x, z), z + 0.5);
    for (const [size, position, color] of [
      [[0.65, 1.1, 0.45], [0, 0.75, 0], '#72513c'],
      [[0.55, 0.6, 0.55], [0, 1.6, 0], '#c29a75'],
      [[0.16, 0.25, 0.22], [0, 1.5, 0.36], '#ad805d'],
      [[0.1, 0.08, 0.04], [-0.15, 1.7, 0.29], '#243b24'],
      [[0.1, 0.08, 0.04], [0.15, 1.7, 0.29], '#243b24'],
    ]) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color }));
      part.position.set(...position);
      this.mesh.add(part);
    }
    scene.add(this.mesh);
    this.bubble = document.createElement('div');
    this.bubble.className = 'villager-bubble';
    this.bubble.textContent = 'Milo · E to talk';
    document.body.append(this.bubble);
    this.dialog = document.createElement('dialog');
    this.dialog.innerHTML = '<h2>Talk to Milo</h2><p>A curious gardener who loves terrible vegetable jokes.</p><div class="villager-history" role="log"></div><form><label>Your message <input required maxlength="1000" autocomplete="off" /></label><button>Send</button></form><p class="villager-status" role="status"></p><button type="button" class="villager-close">Back to world</button>';
    document.body.append(this.dialog);
    this.history = [];
    this.dialog.querySelector('.villager-close').onclick = () => this.dialog.close();
    this.dialog.querySelector('form').onsubmit = (event) => { event.preventDefault(); this.send(); };
  }
  near(position) { return this.mesh.position.distanceTo(position) < 4; }
  open() { if (!this.dialog.open) this.dialog.showModal(); this.dialog.querySelector('input').focus(); }
  async send() {
    if (this.pending) return;
    const input = this.dialog.querySelector('input'), content = input.value.trim();
    if (!content) return;
    const status = this.dialog.querySelector('.villager-status');
    const button = this.dialog.querySelector('form button');
    this.pending = true; button.disabled = true; status.textContent = 'Milo is thinking…';
    this.abort = new AbortController();
    const timeout = setTimeout(() => this.abort.abort(), 120000);
    try {
      const messages = [...this.history.slice(-12), { role: 'user', content }];
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: this.abort.signal,
        body: JSON.stringify({ model: 'llama3.2', stream: false, messages: [
          { role: 'system', content: 'You are Milo, a friendly, curious villager and gardener in Fieldwork, a voxel world. You love growing carrots, exploring hills, and gentle vegetable puns. Stay in character. Reply in one to three short sentences. You cannot change the game world or perform actions.' }, ...messages,
        ] }),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = await response.json();
      if (typeof data.message?.content !== 'string' || !data.message.content.trim()) throw new Error('Ollama returned an empty reply');
      if (this.disposed) return;
      this.history = [...messages, { role: 'assistant', content: data.message.content }];
      this.bubble.textContent = `Milo: ${data.message.content}`;
      const log = this.dialog.querySelector('.villager-history');
      log.textContent = this.history.map(m => `${m.role === 'user' ? 'You' : 'Milo'}: ${m.content}`).join('\n\n');
      log.scrollTop = log.scrollHeight;
      input.value = ''; status.textContent = '';
    } catch (error) {
      if (!this.disposed) status.textContent = `${error.message}. Start Ollama, pull llama3.2, and allow this site's origin in OLLAMA_ORIGINS. Your message is ready to retry.`;
    } finally { clearTimeout(timeout); this.pending = false; button.disabled = false; }
  }
  update(camera, player) {
    const point = this.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    const distance = point.distanceTo(camera.position);
    point.project(camera);
    this.bubble.hidden = distance > 24 || point.z > 1 || point.z < -1;
    this.bubble.style.left = `${(point.x + 1) * innerWidth / 2}px`;
    this.bubble.style.top = `${(1 - point.y) * innerHeight / 2}px`;
    this.mesh.visible = distance < 100;
    if (this.dialog.open && !this.near(player)) this.dialog.close();
  }
  dispose() {
    this.disposed = true; this.abort?.abort();
    this.scene.remove(this.mesh);
    this.mesh.traverse(part => { part.geometry?.dispose(); part.material?.dispose(); });
    this.dialog.remove(); this.bubble.remove();
  }
}

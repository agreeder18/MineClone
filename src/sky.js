import * as THREE from "three";

// Original geometric sky: no downloaded textures and no shadow-map passes.
export class Sky {
  constructor(scene) {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: {
        zenith: { value: new THREE.Color() },
        horizon: { value: new THREE.Color() },
      },
      vertexShader: `varying vec3 direction;
        void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; varying vec3 direction;
        void main() { float h = smoothstep(0.0, 0.85, normalize(direction).y);
          gl_FragColor = vec4(mix(horizon, zenith, h), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), this.material);
    this.dome.renderOrder = -3;
    scene.add(this.dome);
    this.sun = this.body(scene, 5, "#fff1b0");
    this.moon = this.body(scene, 3.5, "#d5e5f5");
    this.cloudMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true });
    this.clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 1.5, 7), this.cloudMaterial, 32);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 32; i++) {
      matrix.makeTranslation((i % 8) * 24 - 84, (i % 3) * 0.5, Math.floor(i / 8) * 42 - 63);
      this.clouds.setMatrixAt(i, matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    scene.add(this.clouds);
  }
  body(scene, size, color) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color, fog: false, depthTest: false, depthWrite: false }));
    mesh.renderOrder = -2;
    scene.add(mesh);
    return mesh;
  }
  update(camera, time, ambient, sunlight, fog) {
    const angle = (time % 1200) / 1200 * Math.PI * 2;
    const elevation = Math.sin(angle);
    const day = THREE.MathUtils.smoothstep(elevation, -0.2, 0.35);
    const dusk = (1 - Math.abs(elevation)) ** 12;
    const horizon = this.material.uniforms.horizon.value;
    horizon.set("#10172e").lerp(new THREE.Color("#bedbfa"), day)
      .lerp(new THREE.Color("#db9872"), dusk * 0.55);
    this.material.uniforms.zenith.value.set("#070d24").lerp(new THREE.Color("#68a5f0"), day);
    fog.color.copy(horizon);
    ambient.intensity = 0.35 + day * 1.15;
    sunlight.intensity = Math.max(0, elevation) * 1.7;
    sunlight.color.set("#fff4d9").lerp(new THREE.Color("#ffc18a"), dusk * 0.5);
    sunlight.position.set(Math.cos(angle) * 80, elevation * 80, 20);
    this.dome.position.copy(camera.position);
    for (const [body, sign] of [[this.sun, 1], [this.moon, -1]]) {
      body.position.copy(camera.position).add(new THREE.Vector3(Math.cos(angle) * 45 * sign, elevation * 45 * sign, -8));
      body.quaternion.copy(camera.quaternion);
      body.visible = body.position.y > camera.position.y - 2;
    }
    this.clouds.position.set(camera.position.x + Math.sin(time / 180) * 12, 106, camera.position.z);
  }
}

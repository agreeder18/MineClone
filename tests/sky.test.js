import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Sky } from "../src/sky.js";

test("sky follows the camera, cycles day/night, and reuses its geometry", () => {
  const scene = new THREE.Scene();
  const sky = new Sky(scene);
  const camera = new THREE.PerspectiveCamera();
  const ambient = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  const fog = new THREE.Fog("white", 30, 100);
  camera.position.set(2000, 42, -3000);
  const geometry = sky.clouds.geometry;
  sky.update(camera, 300, ambient, sun, fog);
  const daylight = ambient.intensity;
  assert.ok(sky.sun.visible);
  assert.ok(!sky.moon.visible);
  assert.deepEqual(sky.dome.position, camera.position);
  sky.update(camera, 900, ambient, sun, fog);
  assert.ok(ambient.intensity < daylight);
  assert.equal(sun.intensity, 0);
  assert.ok(sky.moon.visible);
  assert.ok(!sky.sun.visible);
  assert.equal(scene.children.length, 4);
  assert.equal(sky.clouds.geometry, geometry);
  assert.equal(sky.clouds.count, 32);
  assert.deepEqual(fog.color, sky.material.uniforms.horizon.value);
});

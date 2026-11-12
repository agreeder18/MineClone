import * as THREE from "three";

// Analytic sky reflections avoid rendering the world a second time per frame.
// Shared by every chunk: animation changes uniforms, never chunk geometry.
export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        waterTime: { value: 0 },
        sunDirection: { value: new THREE.Vector3(0.4, 0.8, 0.2).normalize() },
        sunColor: { value: new THREE.Color("#fff4d9") },
        skyColor: { value: new THREE.Color("#68a5f0") },
        horizonColor: { value: new THREE.Color("#bedbfa") },
        daylight: { value: 1 },
      },
    ]),
    vertexShader: `
      varying vec3 waterPosition;
      varying vec3 waterNormal;
      #include <fog_pars_vertex>
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        waterPosition = worldPosition.xyz;
        waterNormal = mat3(modelMatrix) * normal;
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float waterTime;
      uniform float daylight;
      uniform vec3 sunDirection;
      uniform vec3 sunColor;
      uniform vec3 skyColor;
      uniform vec3 horizonColor;
      varying vec3 waterPosition;
      varying vec3 waterNormal;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = waterPosition.xz;
        float t = waterTime;
        vec2 ripple = vec2(
          cos(p.x * 2.2 + p.y * 1.3 + t * 1.1) * 0.055 + cos(p.x * 4.1 - t * 1.4) * 0.025,
          cos(p.y * 2.7 - p.x * 0.8 + t * 0.8) * 0.055 + sin(p.y * 3.8 + t) * 0.025);
        vec3 n = normalize(waterNormal + vec3(ripple.x, 0.0, ripple.y));
        vec3 viewDirection = normalize(cameraPosition - waterPosition);
        float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(n, viewDirection), 0.0), 5.0);
        vec3 reflected = reflect(-viewDirection, n);
        vec3 sky = mix(horizonColor, skyColor, smoothstep(0.0, 0.85, reflected.y));
        float highlight = pow(max(dot(reflect(-sunDirection, n), viewDirection), 0.0), 160.0);
        float light = 0.3 + daylight * 0.7;
        vec3 deepWater = vec3(0.025, 0.19, 0.28) * light;
        vec3 color = mix(deepWater, sky, 0.25 + fresnel * 0.65);
        color += sunColor * highlight * daylight * 1.1;
        gl_FragColor = vec4(color, 0.72 + fresnel * 0.24);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

export function updateWater(material, time, sky, sunlight) {
  const u = material.uniforms;
  u.waterTime.value = time;
  u.sunDirection.value.copy(sunlight.position).normalize();
  u.sunColor.value.copy(sunlight.color);
  u.skyColor.value.copy(sky.material.uniforms.zenith.value);
  u.horizonColor.value.copy(sky.material.uniforms.horizon.value);
  u.daylight.value = Math.min(1, sunlight.intensity / 1.7);
}

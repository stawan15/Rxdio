export const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDirW;

  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/** The flat political map on a sphere: the night half is dimmed, and a thin crisp ring marks the edge (no glow). */
export const mapFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  uniform sampler2D uMap;
  uniform vec3 uRim;
  uniform vec3 uSun;
  uniform float uNight; // brightness of the night half, 0..1

  void main() {
    vec3 n = normalize(vNormalW);
    float day = smoothstep(-0.15, 0.25, dot(n, normalize(uSun)));
    vec3 col = texture2D(uMap, vUv).rgb * (uNight + (1.0 - uNight) * day);
    float edge = smoothstep(0.9, 1.0, 1.0 - max(dot(n, normalize(vViewDirW)), 0.0));
    col = mix(col, uRim, edge * 0.7);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

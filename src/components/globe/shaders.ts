const common = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
`

export const vertex = /* glsl */ `
  ${common}
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/** The sphere body: flat ocean colour, a darker night half, and a thin crisp edge so it reads on any background. */
export const oceanFragment = /* glsl */ `
  ${common}
  uniform vec3 uOcean;
  uniform vec3 uLand;
  uniform vec3 uSun;
  uniform float uNight; // brightness of the night half, 0..1

  void main() {
    vec3 n = normalize(vNormalW);
    float day = smoothstep(-0.15, 0.25, dot(n, normalize(uSun)));
    vec3 col = uOcean * (uNight + (1.0 - uNight) * day);
    // a crisp few-pixel outline at the silhouette, not a glow
    float edge = smoothstep(0.9, 1.0, 1.0 - max(dot(n, normalize(vViewDirW)), 0.0));
    col = mix(col, uLand, edge * 0.5);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/** Land as a dot matrix. The selected country's dots turn accent and grow; the night half dims. */
export const dotsVertex = /* glsl */ `
  attribute float aId;
  uniform float uSelected;
  uniform float uHover;
  uniform float uSize;
  uniform float uScale;
  uniform vec3 uSun;
  varying float vState;
  varying float vDay;
  varying float vFacing;

  void main() {
    vDay = smoothstep(-0.15, 0.25, dot(normalize(position), normalize(uSun)));
    vFacing = dot(normalize(position), normalize(cameraPosition - position));
    vState = aId == uSelected ? 2.0 : (aId == uHover ? 1.0 : 0.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float grow = vState > 1.5 ? 1.5 : (vState > 0.5 ? 1.25 : 1.0);
    gl_PointSize = clamp(uSize * uScale * grow / -mv.z, 1.0, 40.0);
  }
`

export const dotsFragment = /* glsl */ `
  uniform vec3 uLand;
  uniform vec3 uAccent;
  varying float vState;
  varying float vDay;
  varying float vFacing;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // dots fade out toward the edge so the rim doesn't pile up into a dark crescent
    float alpha = smoothstep(0.5, 0.38, d) * smoothstep(0.0, 0.32, vFacing);
    if (alpha < 0.01) discard;
    vec3 col = vState > 1.5 ? uAccent : (vState > 0.5 ? mix(uLand, uAccent, 0.6) : uLand);
    float dim = vState > 1.5 ? 1.0 : mix(0.28, 1.0, vDay);
    gl_FragColor = vec4(col, alpha * dim);
    #include <colorspace_fragment>
  }
`

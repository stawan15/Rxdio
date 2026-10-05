const common = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vNormalV;
  varying vec3 vViewDirW;
`

export const vertex = /* glsl */ `
  ${common}
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vNormalV = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/** Day/night Earth: city lights on the dark side, soft terminator, rim glow toward the sun. */
export const earthFragment = /* glsl */ `
  ${common}
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSun;
  uniform vec3 uTint;
  uniform vec3 uLights;
  uniform vec3 uAtmosphere;
  uniform float uAmbient;

  void main() {
    vec3 n = normalize(vNormalW);
    float d = dot(n, normalize(uSun));
    float dayMix = smoothstep(-0.14, 0.22, d);

    vec3 day = texture2D(uDay, vUv).rgb * uTint;
    vec3 night = texture2D(uNight, vUv).rgb;

    vec3 nightSide = day * uAmbient + night * uLights * 1.8;
    vec3 daySide = day * clamp(0.38 + 0.95 * d, 0.0, 1.15);
    vec3 col = mix(nightSide, daySide, dayMix);

    float twilight = smoothstep(0.22, 0.0, abs(d));
    col += uAtmosphere * 0.1 * twilight;

    float rim = pow(1.0 - max(dot(n, normalize(vViewDirW)), 0.0), 3.0);
    col += uAtmosphere * rim * (0.25 + 0.75 * dayMix);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/** Glow shell drawn on back faces: brightest at the limb, fading outward. */
export const atmosphereFragment = /* glsl */ `
  ${common}
  uniform vec3 uColor;
  uniform vec3 uSun;

  void main() {
    float intensity = pow(max(0.0, 0.72 - dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0))), 4.0);
    float lit = 0.3 + 0.7 * smoothstep(-0.3, 0.6, dot(normalize(vNormalW), normalize(uSun)));
    gl_FragColor = vec4(uColor, 1.0) * intensity * lit * 0.55;
    #include <colorspace_fragment>
  }
`

export const gridFloorVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const gridFloorFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float gridLine(float coord, float lineWidth) {
    float grid = abs(fract(coord - 0.5) - 0.5);
    return smoothstep(lineWidth, lineWidth + 0.02, grid);
  }

  void main() {
    // Grid coordinates
    float gridX = gridLine(vWorldPos.x, 0.02);
    float gridZ = gridLine(vWorldPos.z, 0.02);
    float grid = 1.0 - min(gridX, gridZ);

    // Sub-grid (finer lines)
    float subX = gridLine(vWorldPos.x * 4.0, 0.03);
    float subZ = gridLine(vWorldPos.z * 4.0, 0.03);
    float subGrid = 1.0 - min(subX, subZ);

    // Distance fade from center
    float dist = length(vWorldPos.xz) / 10.0;
    float fade = 1.0 - smoothstep(0.3, 1.0, dist);

    // Pulse animation
    float pulse = 0.85 + 0.15 * sin(uTime * 0.8);

    // Combine
    float mainAlpha = grid * 0.7 * pulse * fade;
    float subAlpha = subGrid * 0.15 * fade;
    float totalAlpha = mainAlpha + subAlpha;

    // Base dark floor with very subtle fill
    vec3 baseColor = vec3(0.02, 0.02, 0.04);
    vec3 finalColor = mix(baseColor, uColor, totalAlpha);
    float finalAlpha = max(totalAlpha, 0.3 * fade);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

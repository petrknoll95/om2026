"use client";

import { useEffect, useRef } from "react";

interface ASCIIBackgroundProps {
  className?: string;
  cellSize?: number;
  overlayText?: string;
  showOverlay?: boolean;
  asciiEnabled?: boolean;
}

// Logo SVG path data
const logoPathData = [
  "M101.58 20.5804L107.606 1.03205H124V46.9675H113.567V33.4837C113.567 24.9245 113.697 17.5267 113.956 11.2901C113.136 14.4299 112.099 17.9138 110.846 21.7417L102.876 46.9675H93.9337L85.9635 21.7417C85.0131 18.688 83.998 15.2256 82.918 11.3546C83.134 18.5804 83.242 25.9568 83.242 33.4837V46.9675H72.8095V1.03205H89.2034L95.2945 20.774C96.1152 23.5697 97.1736 27.3761 98.4695 32.1933C99.5063 28.1073 100.543 24.2363 101.58 20.5804Z",
  "M54.8291 46.9675H45.0835L61.5413 1.03205H71.2869L54.8291 46.9675Z",
  "M40.758 41.4194C36.3949 45.8065 30.6927 48 23.6513 48C16.6099 48 10.9077 45.8065 6.54461 41.4194C2.18154 36.9892 0 31.1828 0 24C0 16.8172 2.18154 11.0108 6.54461 6.58064C10.9077 2.19355 16.6099 0 23.6513 0C30.6927 0 36.3949 2.19355 40.758 6.58064C42.7928 8.64675 44.3532 11.0122 45.439 13.6771C46.3518 15.9171 46.9292 18.3688 47.1714 21.0319C47.2589 21.9937 47.3026 22.983 47.3026 24C47.3026 31.1828 45.1211 36.9892 40.758 41.4194ZM23.6513 38.5161C19.9362 38.5161 16.9771 37.2258 14.774 34.6452C12.5276 32.1075 11.4045 28.5591 11.4045 24C11.4045 19.4409 12.5276 15.8925 14.774 13.3548C16.9771 10.7742 19.9362 9.48387 23.6513 9.48387C27.3232 9.48387 30.3039 10.7742 32.5934 13.3548C34.8398 15.8925 35.9629 19.4409 35.9629 24C35.9629 28.5591 34.8398 32.1075 32.5934 34.6452C30.3039 37.2258 27.3232 38.5161 23.6513 38.5161Z",
];

function createOverlayCanvas(
  width: number,
  height: number,
  text: string,
  dpr: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Clear with transparent background
  ctx.clearRect(0, 0, width, height);

  // Calculate sizes - base on screen size for responsiveness
  const baseFontSize = Math.min(width, height) * 0.012 * 0.8;
  const fontSize = Math.max(10 * dpr, baseFontSize);
  const logoHeight = fontSize * 1.5 * 0.9;
  const logoWidth = (124 / 48) * logoHeight; // Maintain aspect ratio
  const gap = fontSize * 1.5;

  // Set up text rendering
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Measure text
  const textContent = text.toUpperCase();
  const textMetrics = ctx.measureText(textContent);
  const textWidth = textMetrics.width;

  // Total width of logo + gap + text
  const totalWidth = logoWidth + gap + textWidth;

  // Center position
  const centerX = width / 2;
  const centerY = height / 2;
  const startX = centerX - totalWidth / 2;

  // Draw logo paths (left side)
  ctx.save();
  ctx.translate(startX, centerY - logoHeight / 2);
  ctx.scale(logoHeight / 48, logoHeight / 48);
  ctx.fillStyle = "rgba(0, 0, 0, 1)"; // foreground color

  for (const pathData of logoPathData) {
    const path = new Path2D(pathData);
    // Use evenodd for the O to create the hole
    ctx.fill(path, "evenodd");
  }
  ctx.restore();

  // Draw text (right of logo, shifted down 2.5%)
  ctx.fillStyle = "rgba(0, 0, 0, 1)"; // foreground color
  const textYOffset = logoHeight * 0.025;
  ctx.fillText(textContent, startX + logoWidth + gap, centerY + textYOffset);

  return canvas;
}

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform sampler2D u_overlayTexture;
  uniform vec2 u_cellSize;
  uniform float u_hasOverlay;
  uniform float u_overlayOpacity;
  uniform vec2 u_maxVideoSize;
  uniform float u_time;
  uniform float u_asciiEnabled;

  varying vec2 v_texCoord;

  // Sphere SDF
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  // Rotation matrix around X axis
  mat3 rotateX(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(1.0, 0.0, 0.0,
                0.0, c, -s,
                0.0, s, c);
  }

  // Rotation matrix around Y axis
  mat3 rotateY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c, 0.0, s,
                0.0, 1.0, 0.0,
                -s, 0.0, c);
  }

  // Rotation matrix around Z axis
  mat3 rotateZ(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c, -s, 0.0,
                s, c, 0.0,
                0.0, 0.0, 1.0);
  }

  // HSL to RGB conversion
  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  // Get base color for sphere index
  vec3 getBaseColor(float index) {
    float hue = index / 16.0;  // Spread hues across the spectrum
    return hsl2rgb(hue, 0.8, 0.5);
  }

  // Metallic shading for spheres
  vec3 getMetallicColor(float index, vec3 normal, vec3 viewDir) {
    vec3 baseColor = getBaseColor(index);

    // Light direction
    vec3 lightDir = normalize(vec3(-0.5, 0.5, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);

    // Diffuse (metallic materials have subtle diffuse)
    float diff = max(dot(normal, lightDir), 0.0);

    // Specular (sharp, metallic highlight)
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);

    // Fresnel rim effect (metallic edges catch light)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Ambient (tinted by base color for metals)
    vec3 ambient = baseColor * 0.15;

    // Diffuse is tinted by base color
    vec3 diffuseColor = baseColor * diff * 0.5;

    // Specular is white-ish but slightly tinted (metallic reflection)
    vec3 specColor = mix(vec3(1.0), baseColor, 0.3) * spec * 1.2;

    // Fresnel rim adds bright edge
    vec3 rimColor = mix(vec3(1.0), baseColor, 0.5) * fresnel * 0.6;

    // Combine
    vec3 finalColor = ambient + diffuseColor + specColor + rimColor;

    return clamp(finalColor, 0.0, 1.0);
  }

  // Scene SDF - 16 balls in a circle, tilted and rotated
  float scene(vec3 p) {
    // Tilt by 45 degrees on Y, then rotate 45 degrees around X
    p = rotateX(0.7854) * rotateY(0.7854) * p;

    float d = 1e10;
    // Animate radius: start large, converge, hold, then expand near end
    float convergeDuration = 1.5;
    float expandStart = 3.5;
    float expandDuration = 1.0;

    float radiusScale;
    if (u_time < convergeDuration) {
      // Converge phase
      float t = u_time / convergeDuration;
      float eased = 1.0 - pow(1.0 - t, 3.0);
      radiusScale = mix(3.0, 1.0, eased);
    } else if (u_time < expandStart) {
      // Hold at minimum
      radiusScale = 1.0;
    } else {
      // Expand phase - quick acceleration out
      float t = clamp((u_time - expandStart) / expandDuration, 0.0, 1.0);
      float eased = t * t * t;  // Cubic ease-in for quick acceleration
      radiusScale = mix(1.0, 4.0, eased);
    }
    float circleRadius = 1.5 * radiusScale;

    // Ball size: normal during hold, increases during fade out
    float ballRadius = 0.12;
    if (u_time >= expandStart) {
      float t = clamp((u_time - expandStart) / expandDuration, 0.0, 1.0);
      float eased = t * t * t;
      ballRadius = mix(0.12, 0.24, eased);  // Double size on exit
    }

    // Rotation: base speed with multiplier
    // Fade in: 4x -> 1x (quintic ease-out), Fade out: 1x -> 4x (cubic ease-in)
    float baseSpeed = 0.8;
    float fadeInDuration = 2.5;
    float fadeOutStart = 3.5;
    float fadeOutDuration = 1.0;

    // Analytical integration of rotation angle
    // Fade in: multiplier = 1 + 3*(1-t)^5 where t = time/fadeInDuration
    // Integral: baseSpeed * fadeInDuration * [t + 3*(-1/6)*(1-t)^6] = baseSpeed * fadeInDuration * [t + 0.5 - 0.5*(1-t)^6]
    float rotAngle;

    if (u_time < fadeInDuration) {
      float t = u_time / fadeInDuration;
      // Integral of (1 + 3*(1-t)^5) from 0 to t, scaled by duration and speed
      float integral = t + 0.5 - 0.5 * pow(1.0 - t, 6.0);
      rotAngle = baseSpeed * fadeInDuration * integral;
    } else if (u_time < fadeOutStart) {
      // Fade in complete: integral at t=1 is 1 + 0.5 - 0 = 1.5
      float fadeInAngle = baseSpeed * fadeInDuration * 1.5;
      // Hold at multiplier = 1
      rotAngle = fadeInAngle + baseSpeed * (u_time - fadeInDuration);
    } else {
      // Fade in + hold complete
      float fadeInAngle = baseSpeed * fadeInDuration * 1.5;
      float holdAngle = baseSpeed * (fadeOutStart - fadeInDuration);

      // Fade out: multiplier = 1 + 3*t^3 where t = (time-fadeOutStart)/fadeOutDuration
      // Integral: baseSpeed * fadeOutDuration * [t + 3*(t^4/4)] = baseSpeed * fadeOutDuration * [t + 0.75*t^4]
      float t = clamp((u_time - fadeOutStart) / fadeOutDuration, 0.0, 1.0);
      float integral = t + 0.75 * pow(t, 4.0);
      rotAngle = fadeInAngle + holdAngle + baseSpeed * fadeOutDuration * integral;
    }

    for (int i = 0; i < 16; i++) {
      float angle = float(i) * 3.14159265 * 2.0 / 16.0 - rotAngle;
      vec3 ballPos = vec3(
        cos(angle) * circleRadius,
        sin(angle) * circleRadius,
        0.0
      );
      // Apply tilt to get actual z position for size scaling
      vec3 tiltedPos = rotateX(0.7854) * rotateY(0.7854) * ballPos;
      // Scale ball size based on depth (closer = larger, further = smaller)
      float depthScale = 1.0 + tiltedPos.z * 0.4;
      d = min(d, sdSphere(p - ballPos, ballRadius * depthScale));
    }

    return d;
  }

  // Scene SDF with sphere index tracking - returns vec2(distance, sphereIndex)
  vec2 sceneWithIndex(vec3 p) {
    // Tilt by 45 degrees on Y, then rotate 45 degrees around X
    p = rotateX(0.7854) * rotateY(0.7854) * p;

    float d = 1e10;
    float closestIndex = -1.0;

    // Animate radius: start large, converge, hold, then expand near end
    float convergeDuration = 1.5;
    float expandStart = 3.5;
    float expandDuration = 1.0;

    float radiusScale;
    if (u_time < convergeDuration) {
      float t = u_time / convergeDuration;
      float eased = 1.0 - pow(1.0 - t, 3.0);
      radiusScale = mix(3.0, 1.0, eased);
    } else if (u_time < expandStart) {
      radiusScale = 1.0;
    } else {
      float t = clamp((u_time - expandStart) / expandDuration, 0.0, 1.0);
      float eased = t * t * t;
      radiusScale = mix(1.0, 4.0, eased);
    }
    float circleRadius = 1.5 * radiusScale;

    // Ball size
    float ballRadius = 0.12;
    if (u_time >= expandStart) {
      float t = clamp((u_time - expandStart) / expandDuration, 0.0, 1.0);
      float eased = t * t * t;
      ballRadius = mix(0.12, 0.24, eased);
    }

    // Rotation angle calculation
    float baseSpeed = 0.8;
    float fadeInDuration = 2.5;
    float fadeOutStart = 3.5;
    float fadeOutDuration = 1.0;

    float rotAngle;
    if (u_time < fadeInDuration) {
      float t = u_time / fadeInDuration;
      float integral = t + 0.5 - 0.5 * pow(1.0 - t, 6.0);
      rotAngle = baseSpeed * fadeInDuration * integral;
    } else if (u_time < fadeOutStart) {
      float fadeInAngle = baseSpeed * fadeInDuration * 1.5;
      rotAngle = fadeInAngle + baseSpeed * (u_time - fadeInDuration);
    } else {
      float fadeInAngle = baseSpeed * fadeInDuration * 1.5;
      float holdAngle = baseSpeed * (fadeOutStart - fadeInDuration);
      float t = clamp((u_time - fadeOutStart) / fadeOutDuration, 0.0, 1.0);
      float integral = t + 0.75 * pow(t, 4.0);
      rotAngle = fadeInAngle + holdAngle + baseSpeed * fadeOutDuration * integral;
    }

    for (int i = 0; i < 16; i++) {
      float angle = float(i) * 3.14159265 * 2.0 / 16.0 - rotAngle;
      vec3 ballPos = vec3(
        cos(angle) * circleRadius,
        sin(angle) * circleRadius,
        0.0
      );
      vec3 tiltedPos = rotateX(0.7854) * rotateY(0.7854) * ballPos;
      float depthScale = 1.0 + tiltedPos.z * 0.4;
      float sphereDist = sdSphere(p - ballPos, ballRadius * depthScale);

      if (sphereDist < d) {
        d = sphereDist;
        closestIndex = float(i);
      }
    }

    return vec2(d, closestIndex);
  }

  // Simple raymarching - returns vec2(distance, sphereIndex)
  vec2 raymarchWithIndex(vec3 ro, vec3 rd) {
    float t = 0.0;
    float sphereIndex = -1.0;
    for (int i = 0; i < 64; i++) {
      vec3 p = ro + rd * t;
      vec2 result = sceneWithIndex(p);
      float d = result.x;
      if (d < 0.001) {
        sphereIndex = result.y;
        return vec2(t, sphereIndex);
      }
      if (t > 20.0) break;
      t += d;
    }
    return vec2(-1.0, -1.0);
  }

  // Calculate normal
  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
      scene(p + e.xyy) - scene(p - e.xyy),
      scene(p + e.yxy) - scene(p - e.yxy),
      scene(p + e.yyx) - scene(p - e.yyx)
    ));
  }

  void main() {
    vec2 pix = gl_FragCoord.xy;
    vec2 cellSize = u_cellSize;

    // Calculate render area (clamped to max size, centered)
    vec2 renderAreaSize = min(u_resolution.xy, u_maxVideoSize);
    vec2 renderAreaOffset = (u_resolution.xy - renderAreaSize) * 0.5;

    // Check if pixel is inside render area
    vec2 localPix = pix - renderAreaOffset;
    bool insideRenderArea = localPix.x >= 0.0 && localPix.x < renderAreaSize.x &&
                            localPix.y >= 0.0 && localPix.y < renderAreaSize.y;

    // Per-pixel UV for smooth raw render
    vec2 pixelUV = (localPix / renderAreaSize) * 2.0 - 1.0;
    pixelUV.x *= renderAreaSize.x / renderAreaSize.y;

    // Cell-center UV for ASCII sampling
    vec2 cellCenter = floor(localPix / cellSize) * cellSize + cellSize * 0.5;
    vec2 cellUV = (cellCenter / renderAreaSize) * 2.0 - 1.0;
    cellUV.x *= renderAreaSize.x / renderAreaSize.y;

    // Raymarching setup - orthographic camera
    vec3 rd = vec3(0.0, 0.0, -1.0);  // Parallel rays

    float gray = 1.0;       // Cell-sampled gray for ASCII dots
    float rawGray = 1.0;    // Per-pixel gray for smooth raw render
    float sphereIndex = -1.0;  // Track which sphere was hit
    vec3 hitNormal = vec3(0.0, 0.0, 1.0);  // Store normal for metallic shading
    vec3 hitViewDir = vec3(0.0, 0.0, 1.0); // Store view direction

    if (insideRenderArea) {
      // Raymarch at per-pixel resolution for smooth raw render and sphere index
      vec3 roPixel = vec3(pixelUV * 3.0, 5.0);
      vec2 marchResult = raymarchWithIndex(roPixel, rd);
      float t = marchResult.x;
      sphereIndex = marchResult.y;

      if (t > 0.0) {
        vec3 p = roPixel + rd * t;
        vec3 n = calcNormal(p);
        hitNormal = n;
        hitViewDir = normalize(roPixel - p);

        // Soft hemisphere lighting (sky/ground)
        float hemi = 0.5 + 0.5 * n.y;

        // Softer front-side light
        vec3 lightDir = normalize(vec3(-0.5, 0.5, 1.0));
        float diff = max(dot(n, lightDir), 0.0);

        // Softer contrast, slightly darker
        float ambient = 0.3;
        float baseGray = ambient + hemi * 0.25 + diff * 0.35;
        baseGray = clamp(baseGray, 0.0, 1.0);

        // Depth fade - objects further from camera are lighter
        float nearPlane = 3.0;
        float farPlane = 8.0;
        float depthFade = smoothstep(nearPlane, farPlane, t);
        rawGray = mix(baseGray, 1.0, depthFade * 0.5);
      }

      // Raymarch at cell center for ASCII dot sizing (only if ASCII enabled)
      if (u_asciiEnabled > 0.5) {
        vec3 roCell = vec3(cellUV * 3.0, 5.0);
        vec2 cellMarchResult = raymarchWithIndex(roCell, rd);
        float tCell = cellMarchResult.x;

        if (tCell > 0.0) {
          vec3 pCell = roCell + rd * tCell;
          vec3 nCell = calcNormal(pCell);

          float hemiCell = 0.5 + 0.5 * nCell.y;
          vec3 lightDir = normalize(vec3(-0.5, 0.5, 1.0));
          float diffCell = max(dot(nCell, lightDir), 0.0);

          float ambient = 0.3;
          float baseGrayCell = ambient + hemiCell * 0.25 + diffCell * 0.35;
          baseGrayCell = clamp(baseGrayCell, 0.0, 1.0);

          float nearPlane = 3.0;
          float farPlane = 8.0;
          float depthFadeCell = smoothstep(nearPlane, farPlane, tCell);
          gray = mix(baseGrayCell, 1.0, depthFadeCell * 0.5);
        }
      } else {
        gray = rawGray;
      }
    }

    // Flicker timing calculation
    float flickerStart = 1.1;
    float flickerDuration = 2.8;  // Total duration for the wave to travel
    float flickerWidth = 2.5;  // How many spheres wide the flicker wave is

    float flickerTime = u_time - flickerStart;
    float flickerMask = 0.0;

    if (flickerTime > 0.0 && flickerTime < flickerDuration && sphereIndex >= 0.0) {
      // Normalized progress (0 to 1)
      float progress = flickerTime / flickerDuration;

      // Ease-in-out (smootherstep for extra smoothness)
      float easedProgress = progress * progress * progress * (progress * (6.0 * progress - 15.0) + 10.0);

      // Flicker position based on eased progress (reversed: 15 down to -flickerWidth)
      float flickerPosition = 15.0 + flickerWidth - easedProgress * (16.0 + flickerWidth * 2.0);

      // Distance from this sphere to the flicker wave center
      float dist = abs(sphereIndex - flickerPosition);

      // Smooth falloff based on distance from wave center
      float intensity = 1.0 - smoothstep(0.0, flickerWidth, dist);

      // Square for smoother edges
      flickerMask = intensity * intensity;
    }

    // Shape calculations (use local pixel position for render area)
    vec2 cellPos = mod(localPix, cellSize);
    vec2 center = cellSize * 0.5;
    vec2 fromCenter = cellPos - center;
    float dist = length(fromCenter);
    float baseRadius = min(cellSize.x, cellSize.y) * 0.45;
    float sizeVariance = (1.0 - gray) * 0.75;  // darker = larger
    float radius = baseRadius * (0.25 + sizeVariance);
    float strokeWidth = 1.5;
    float edgeSoftness = 1.0;  // anti-aliasing

    // Circle outline
    float outerEdge = 1.0 - smoothstep(radius - edgeSoftness, radius + edgeSoftness, dist);
    float innerEdge = 1.0 - smoothstep(radius - strokeWidth - edgeSoftness, radius - strokeWidth + edgeSoftness, dist);
    float inCircle = outerEdge - innerEdge;

    // X shape for light areas
    float xSize = baseRadius * 0.35;
    float diag1 = abs(fromCenter.x - fromCenter.y);
    float diag2 = abs(fromCenter.x + fromCenter.y);
    float inX = (smoothstep(strokeWidth, strokeWidth - edgeSoftness, diag1) +
                 smoothstep(strokeWidth, strokeWidth - edgeSoftness, diag2)) *
                (1.0 - smoothstep(xSize - edgeSoftness, xSize + edgeSoftness, dist));

    // Use X for light areas (gray > 0.6), circle for darker
    float useX = smoothstep(0.55, 0.65, gray);
    float inDot = mix(inCircle, inX, useX);

    // Only show dots for non-white areas (threshold at 0.80)
    float showDot = inDot * step(gray, 0.80);

    // Colors
    vec3 bgColor = vec3(0.992, 0.992, 0.988);  // #fdfdfc
    vec3 fgColor = vec3(0.0, 0.0, 0.0);  // black

    vec3 color;
    if (u_asciiEnabled > 0.5) {
      // ASCII mode - dots/circles
      float opacity = (1.0 - gray) * showDot;
      vec3 asciiColor = mix(bgColor, fgColor, opacity);

      // Metallic colored version for flicker effect
      vec3 rawColor = getMetallicColor(sphereIndex, hitNormal, hitViewDir);

      // Blend between ASCII and raw based on flicker mask
      color = mix(asciiColor, rawColor, flickerMask);
    } else {
      // Raw render mode - direct grayscale
      color = vec3(gray);
    }

    // Overlay text/logo if present
    if (u_hasOverlay > 0.5) {
      vec2 overlayUV = gl_FragCoord.xy / u_resolution.xy;
      overlayUV.y = 1.0 - overlayUV.y;  // Flip Y for canvas coordinates
      vec4 overlayColor = texture2D(u_overlayTexture, overlayUV);
      color = mix(color, overlayColor.rgb, overlayColor.a * u_overlayOpacity);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default function ASCIIBackground({
  className = "",
  cellSize = 8,
  overlayText,
  showOverlay = true,
  asciiEnabled = true,
}: ASCIIBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    gl.useProgram(program);

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const overlayTextureLocation = gl.getUniformLocation(program, "u_overlayTexture");
    const cellSizeLocation = gl.getUniformLocation(program, "u_cellSize");
    const hasOverlayLocation = gl.getUniformLocation(program, "u_hasOverlay");
    const overlayOpacityLocation = gl.getUniformLocation(program, "u_overlayOpacity");
    const maxVideoSizeLocation = gl.getUniformLocation(program, "u_maxVideoSize");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const asciiEnabledLocation = gl.getUniformLocation(program, "u_asciiEnabled");

    // Create position buffer (fullscreen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // Create texcoord buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      gl.STATIC_DRAW
    );

    // Create overlay texture
    const overlayTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Overlay canvas reference (will be created on resize)
    let overlayCanvas: HTMLCanvasElement | null = null;

    // Animation timing - startTime will be set after preload
    let startTime = 0;
    let isPreloading = true;
    let preloadFrames = 0;
    const PRELOAD_FRAME_COUNT = 3; // Render a few frames to warm up GPU
    const overlayFadeDelay = 1500; // 1.5 seconds
    const overlayFadeDuration = 500; // 0.5 second fade

    // Track responsive cell size
    let responsiveCellSize = cellSize;

    // Resize handler
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Calculate responsive cell size based on screen dimensions
      const minDimension = Math.min(width, height);
      // Scale from 4px at 320px screens to cellSize at 1200px+ screens
      const minSize = 4;
      const maxSize = cellSize;
      const minScreen = 320;
      const maxScreen = 1200;
      const t = Math.max(0, Math.min(1, (minDimension - minScreen) / (maxScreen - minScreen)));
      responsiveCellSize = minSize + (maxSize - minSize) * t;

      // Recreate overlay canvas at new size
      if (overlayText && showOverlay) {
        overlayCanvas = createOverlayCanvas(
          canvas.width,
          canvas.height,
          overlayText,
          dpr
        );
        // Update overlay texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          overlayCanvas
        );
      }
    }

    window.addEventListener("resize", resize);
    resize();

    // Render loop
    function render() {
      animationRef.current = requestAnimationFrame(render);

      // Preloading phase: render frames at t=0 to warm up GPU/shaders
      if (isPreloading) {
        preloadFrames++;
        if (preloadFrames >= PRELOAD_FRAME_COUNT) {
          isPreloading = false;
          startTime = performance.now();
        }
      }

      // Calculate elapsed time (0 during preload)
      const elapsed = isPreloading ? 0 : performance.now() - startTime;

      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, elapsed / 1000.0);
      gl.uniform1i(overlayTextureLocation, 0);
      gl.uniform1f(hasOverlayLocation, overlayText && showOverlay ? 1.0 : 0.0);
      gl.uniform1f(asciiEnabledLocation, asciiEnabled ? 1.0 : 0.0);

      // Calculate overlay opacity with fade-in after delay
      const fadeProgress = Math.max(0, Math.min(1, (elapsed - overlayFadeDelay) / overlayFadeDuration));
      gl.uniform1f(overlayOpacityLocation, fadeProgress);
      const dpr = Math.min(window.devicePixelRatio, 2);
      gl.uniform2f(cellSizeLocation, responsiveCellSize * dpr, responsiveCellSize * dpr);
      gl.uniform2f(maxVideoSizeLocation, canvas.width, canvas.height);

      // Bind overlay texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, overlayTexture);

      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Bind texcoord buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Start render loop
    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(texCoordBuffer);
      gl.deleteTexture(overlayTexture);
    };
  }, [cellSize, overlayText, showOverlay, asciiEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-screen h-screen ${className}`}
    />
  );
}

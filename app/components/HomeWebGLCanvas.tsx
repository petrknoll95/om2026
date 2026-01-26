"use client";

import { useEffect, useRef, useState } from "react";
import { MotionValue, motion, useSpring } from "motion/react";
import { Pane } from "tweakpane";

interface HomeWebGLCanvasProps {
  className?: string;
  rotation?: MotionValue<number>;
  tiltY?: MotionValue<number>;
  tiltX?: MotionValue<number>;
  zoom?: MotionValue<number>;
  isZoomedIn?: boolean;
  scrollProgress?: MotionValue<number>;
  sphereCount?: number;
  onSphereCountChange?: (count: number) => void;
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

const labelVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const labelFragmentShaderSource = `
  precision highp float;

  uniform sampler2D u_labelTexture;
  varying vec2 v_texCoord;

  void main() {
    vec4 texColor = texture2D(u_labelTexture, v_texCoord);
    gl_FragColor = texColor;
  }
`;

const solidVertexShaderSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const solidFragmentShaderSource = `
  precision highp float;
  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_maxVideoSize;
  uniform float u_rotation;
  uniform float u_time;
  uniform float u_entranceRotation;
  uniform float u_tiltY;
  uniform float u_tiltX;
  uniform float u_zoom;
  uniform float u_focusedSphere;
  uniform float u_sphereCount;

  varying vec2 v_texCoord;

  // Sphere SDF
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  // Rotation matrix around Y axis
  mat3 rotateY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c, 0.0, s,
                0.0, 1.0, 0.0,
                -s, 0.0, c);
  }

  // Rotation matrix around X axis
  mat3 rotateX(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(1.0, 0.0, 0.0,
                0.0, c, -s,
                0.0, s, c);
  }

  // Simple diffuse shading for spheres
  vec3 getDiffuseColor(vec3 normal) {
    // Softer light direction (more frontal)
    vec3 lightDir = normalize(vec3(0.3, 0.3, 1.0));

    // Diffuse lighting with softer falloff
    float diff = max(dot(normal, lightDir), 0.0);

    // White diffuse material
    vec3 baseColor = vec3(1.0);

    // Higher ambient for mellower look
    vec3 ambient = baseColor * 0.6;

    // Reduced diffuse contrast
    vec3 diffuseColor = baseColor * diff * 0.3;

    // Combine
    vec3 finalColor = ambient + diffuseColor;

    return clamp(finalColor, 0.0, 1.0);
  }

  // Smooth interpolation function
  float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  // Scene SDF - dynamic number of balls in a circle, rotating based on scroll
  float scene(vec3 p) {
    float d = 1e10;
    float circleRadius = 2.43;
    float ballRadius = 0.18;
    int numSpheres = int(u_sphereCount);

    for (int i = 0; i < 20; i++) { // Max loop size
      if (i >= numSpheres) break;

      float angle = float(i) * 3.14159265 * 2.0 / u_sphereCount + u_rotation + u_entranceRotation;

      // Position sphere in circle (XY plane)
      vec3 ballPos = vec3(
        cos(angle) * circleRadius,
        sin(angle) * circleRadius,
        0.0
      );

      // Apply Y-axis rotation to create left/right tilt (dynamic from scroll)
      ballPos = rotateY(u_tiltY) * ballPos;

      // Apply X-axis rotation to create up/down tilt (dynamic from scroll)
      ballPos = rotateX(u_tiltX) * ballPos;

      // Scale focused sphere
      float sphereRadius = ballRadius;
      float focusDiff = abs(float(i) - u_focusedSphere);
      // Handle wrap-around (sphere 0 and last are neighbors)
      float halfCount = u_sphereCount * 0.5;
      if (focusDiff > halfCount) {
        focusDiff = u_sphereCount - focusDiff;
      }
      // Smoothly scale: 1.5x for focused sphere, 1.0x for others
      float scaleFactor = mix(1.5, 1.0, smoothstep(0.0, 1.0, focusDiff));
      sphereRadius *= scaleFactor;

      d = min(d, sdSphere(p - ballPos, sphereRadius));
    }

    return d;
  }

  // Simple raymarching
  float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
      vec3 p = ro + rd * t;
      float d = scene(p);
      if (d < 0.001) {
        return t;
      }
      if (t > 20.0) break;
      t += d;
    }
    return -1.0;
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

    // Calculate render area (clamped to max size, centered)
    vec2 renderAreaSize = min(u_resolution.xy, u_maxVideoSize);
    vec2 renderAreaOffset = (u_resolution.xy - renderAreaSize) * 0.5;

    // Check if pixel is inside render area
    vec2 localPix = pix - renderAreaOffset;
    bool insideRenderArea = localPix.x >= 0.0 && localPix.x < renderAreaSize.x &&
                            localPix.y >= 0.0 && localPix.y < renderAreaSize.y;

    // Per-pixel UV for rendering
    vec2 pixelUV = (localPix / renderAreaSize) * 2.0 - 1.0;
    pixelUV.x *= renderAreaSize.x / renderAreaSize.y;

    // Start with transparent background
    vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);

    if (insideRenderArea) {
      // Zoom effect: narrow field of view and move camera closer, offset to left edge
      float zoomScale = mix(3.0, 1.0, u_zoom);  // Narrow the view from 3.0 to 1.0
      float zoomDepth = mix(5.0, 3.0, u_zoom);  // Move camera closer (from 5.0 to 3.0)

      // Offset camera to the left during zoom (negative X = left)
      // At full zoom, camera is at x = -2.43 (array radius) to center on left edge
      float xOffset = mix(0.0, -2.43, u_zoom);

      vec3 ro = vec3(pixelUV.x * zoomScale + xOffset, pixelUV.y * zoomScale, zoomDepth);

      vec3 rd = vec3(0.0, 0.0, -1.0);  // Parallel rays

      float t = raymarch(ro, rd);

      if (t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);

        // White diffuse shading
        vec3 color = getDiffuseColor(n);

        // Apply fog based on Z-depth (farther = dimmer)
        // Fog starts at z=-2.5 and fully dims by z=2.5 (wider range for smoother fade)
        float fogStart = -2.5;
        float fogEnd = 2.5;
        float fogProgress = clamp((p.z - fogStart) / (fogEnd - fogStart), 0.0, 1.0);

        // Use smootherstep for even smoother fade
        float fogAmount = smootherstep(0.0, 1.0, fogProgress);

        // Less pronounced fog - only reduce to 50% at maximum instead of 0%
        float fogFactor = mix(1.0, 0.5, fogAmount);

        // Mix color towards darker (fog effect)
        color = color * fogFactor;

        // Also reduce opacity for farther spheres, but less aggressively
        float alpha = mix(1.0, 0.7, fogAmount);

        finalColor = vec4(color, alpha);
      }
    }

    gl_FragColor = finalColor;
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

export default function HomeWebGLCanvas({
  className = "",
  rotation,
  tiltY,
  tiltX,
  zoom,
  isZoomedIn = false,
  scrollProgress,
  sphereCount = 16,
  onSphereCountChange,
}: HomeWebGLCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const rotationValueRef = useRef<number>(0);
  const tiltYValueRef = useRef<number>(-0.6); // Default tilt Y
  const tiltXValueRef = useRef<number>(0.5236); // Default tilt X
  const zoomValueRef = useRef<number>(0); // Default zoom
  const entranceRotationRef = useRef<number>(Math.PI * 0.5); // Start with quarter rotation (90 degrees)
  const [isVisible, setIsVisible] = useState(false);
  const showHelpersRef = useRef<boolean>(true);
  const showFocusAreaRef = useRef<boolean>(true);
  const focusedSphereIndexRef = useRef<number>(0);
  const scrollProgressRef = useRef<number>(0);
  const animatedFocusedSphereRef = useRef<number>(0);
  const targetFocusedSphereRef = useRef<number>(0);
  const sphereCountRef = useRef<number>(sphereCount);

  // Subscribe to rotation changes and initialize
  useEffect(() => {
    if (!rotation) return;

    // Initialize with current value
    rotationValueRef.current = rotation.get();

    const unsubscribe = rotation.on("change", (latest) => {
      rotationValueRef.current = latest;
    });

    return unsubscribe;
  }, [rotation]);

  // Subscribe to tiltY changes and initialize
  useEffect(() => {
    if (!tiltY) return;

    // Initialize with current value
    tiltYValueRef.current = tiltY.get();

    const unsubscribe = tiltY.on("change", (latest) => {
      tiltYValueRef.current = latest;
    });

    return unsubscribe;
  }, [tiltY]);

  // Subscribe to tiltX changes and initialize
  useEffect(() => {
    if (!tiltX) return;

    // Initialize with current value
    tiltXValueRef.current = tiltX.get();

    const unsubscribe = tiltX.on("change", (latest) => {
      tiltXValueRef.current = latest;
    });

    return unsubscribe;
  }, [tiltX]);

  // Subscribe to zoom changes and initialize
  useEffect(() => {
    if (!zoom) return;

    // Initialize with current value
    zoomValueRef.current = zoom.get();

    const unsubscribe = zoom.on("change", (latest) => {
      zoomValueRef.current = latest;
    });

    return unsubscribe;
  }, [zoom]);

  // Subscribe to scroll progress changes and initialize
  useEffect(() => {
    if (!scrollProgress) return;

    // Initialize with current value
    scrollProgressRef.current = scrollProgress.get();

    const unsubscribe = scrollProgress.on("change", (latest) => {
      scrollProgressRef.current = latest;
    });

    return unsubscribe;
  }, [scrollProgress]);

  // Update sphere count ref when prop changes
  useEffect(() => {
    sphereCountRef.current = sphereCount;
  }, [sphereCount]);

  // Tweakpane setup
  useEffect(() => {
    // Create a fixed container for Tweakpane
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.right = '0';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    const pane = new Pane({ title: 'WebGL Controls', container });

    const params = {
      sphereCount: sphereCount,
      showHelpers: true,
      showFocusArea: true,
      mode: 'Intro',
      scrollPercent: '0%',
      focusedSphere: 0,
      sphereProgress: `0 / ${sphereCount}`,
    };

    pane.addBinding(params, 'sphereCount', {
      label: 'Sphere Count',
      min: 8,
      max: 20,
      step: 1,
    }).on('change', (ev) => {
      if (onSphereCountChange) {
        onSphereCountChange(ev.value);
      }
    });

    pane.addBinding(params, 'showHelpers', { label: 'Show Sphere Indices' }).on('change', (ev) => {
      showHelpersRef.current = ev.value;
    });

    pane.addBinding(params, 'showFocusArea', { label: 'Show Focus Area' }).on('change', (ev) => {
      showFocusAreaRef.current = ev.value;
    });

    pane.addBinding(params, 'mode', {
      label: 'Mode',
      readonly: true,
    });

    pane.addBinding(params, 'scrollPercent', {
      label: 'Scroll Progress',
      readonly: true,
    });

    pane.addBinding(params, 'focusedSphere', {
      label: 'Focused Sphere',
      readonly: true,
    });

    pane.addBinding(params, 'sphereProgress', {
      label: 'Sphere Progress',
      readonly: true,
    });

    // Update display values in render loop
    const updateInterval = setInterval(() => {
      const scrollProgress = scrollProgressRef.current;
      params.mode = scrollProgress < 0.2 ? 'Intro' : 'Carousel';
      params.scrollPercent = `${(scrollProgress * 100).toFixed(1)}%`;
      params.focusedSphere = focusedSphereIndexRef.current;
      params.sphereProgress = `${focusedSphereIndexRef.current} / ${sphereCountRef.current}`;
      pane.refresh();
    }, 16); // ~60fps

    return () => {
      clearInterval(updateInterval);
      pane.dispose();
      container.remove();
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    setIsVisible(true);

    const startTime = performance.now();
    const duration = 3000; // 3 seconds

    const animateEntrance = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quartic - starts fast, decelerates smoothly
      const eased = 1 - Math.pow(1 - progress, 4);

      // Animate from π/2 (90 degrees) to 0
      entranceRotationRef.current = Math.PI * 0.5 * (1 - eased);

      if (progress < 1) {
        requestAnimationFrame(animateEntrance);
      }
    };

    animateEntrance();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
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

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const maxVideoSizeLocation = gl.getUniformLocation(program, "u_maxVideoSize");
    const rotationLocation = gl.getUniformLocation(program, "u_rotation");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const entranceRotationLocation = gl.getUniformLocation(program, "u_entranceRotation");
    const tiltYLocation = gl.getUniformLocation(program, "u_tiltY");
    const tiltXLocation = gl.getUniformLocation(program, "u_tiltX");
    const zoomLocation = gl.getUniformLocation(program, "u_zoom");
    const focusedSphereLocation = gl.getUniformLocation(program, "u_focusedSphere");
    const sphereCountLocation = gl.getUniformLocation(program, "u_sphereCount");

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

    // Create label shader program
    const labelVertexShader = createShader(gl, gl.VERTEX_SHADER, labelVertexShaderSource);
    const labelFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, labelFragmentShaderSource);
    if (!labelVertexShader || !labelFragmentShader) return;

    const labelProgram = createProgram(gl, labelVertexShader, labelFragmentShader);
    if (!labelProgram) return;

    const labelPositionLocation = gl.getAttribLocation(labelProgram, "a_position");
    const labelTexCoordLocation = gl.getAttribLocation(labelProgram, "a_texCoord");
    const labelTextureLocation = gl.getUniformLocation(labelProgram, "u_labelTexture");

    // Create solid color shader program for drawing outlines
    const solidVertexShader = createShader(gl, gl.VERTEX_SHADER, solidVertexShaderSource);
    const solidFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, solidFragmentShaderSource);
    if (!solidVertexShader || !solidFragmentShader) return;

    const solidProgram = createProgram(gl, solidVertexShader, solidFragmentShader);
    if (!solidProgram) return;

    const solidPositionLocation = gl.getAttribLocation(solidProgram, "a_position");
    const solidColorLocation = gl.getUniformLocation(solidProgram, "u_color");

    const solidPosBuffer = gl.createBuffer();

    // Create label texture atlas (5x4 grid with numbers 0-19)
    function createLabelTexture() {
      const labelCanvas = document.createElement("canvas");
      const size = 256;
      labelCanvas.width = size;
      labelCanvas.height = size;
      const ctx = labelCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, size, size);

      const cols = 5;
      const rows = 4;
      const cellWidth = size / cols;
      const cellHeight = size / rows;
      ctx.font = `${cellWidth * 0.35}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < 20; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;

        // Text
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillText(i.toString(), x, y);
      }

      return labelCanvas;
    }

    const labelCanvas = createLabelTexture();
    const labelTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, labelTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (labelCanvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labelCanvas);
    }

    // Label position and texcoord buffers (will be updated per sphere)
    const labelPosBuffer = gl.createBuffer();
    const labelTexBuffer = gl.createBuffer();

    // Resize handler
    function resize() {
      const dpr = window.devicePixelRatio;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener("resize", resize);
    resize();

    // Render function (continuous loop for rotation updates)
    let startTime = performance.now();
    function render() {
      animationRef.current = requestAnimationFrame(render);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Get current sphere count from ref (used throughout render function)
      const currentSphereCount = sphereCountRef.current;

      // Smoothly animate focused sphere value
      const target = targetFocusedSphereRef.current;
      const current = animatedFocusedSphereRef.current;
      const halfCount = currentSphereCount / 2;

      // Handle wrap-around: if target and current are far apart, take shortest path
      let diff = target - current;
      if (Math.abs(diff) > halfCount) {
        // Wrap around the circle
        if (diff > 0) {
          diff = diff - currentSphereCount;
        } else {
          diff = diff + currentSphereCount;
        }
      }

      // Smooth interpolation with ease-out cubic easing
      const lerpFactor = 0.08; // Lower = smoother, slower animation
      const easedDiff = diff * lerpFactor;

      // Apply ease-out cubic: 1 - (1-t)^3
      const easeOutCubic = (t: number) => {
        const invT = 1 - t;
        return 1 - invT * invT * invT;
      };

      const normalizedDiff = Math.abs(diff) / currentSphereCount; // Normalize to 0-1
      const easeFactor = easeOutCubic(1 - normalizedDiff);

      animatedFocusedSphereRef.current = current + easedDiff * (1 + easeFactor);

      // Normalize to [0, sphereCount) range
      if (animatedFocusedSphereRef.current < 0) {
        animatedFocusedSphereRef.current += currentSphereCount;
      } else if (animatedFocusedSphereRef.current >= currentSphereCount) {
        animatedFocusedSphereRef.current -= currentSphereCount;
      }

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(maxVideoSizeLocation, canvas.width, canvas.height);
      gl.uniform1f(rotationLocation, rotationValueRef.current);
      gl.uniform1f(timeLocation, (performance.now() - startTime) / 1000.0);
      gl.uniform1f(entranceRotationLocation, entranceRotationRef.current);
      gl.uniform1f(tiltYLocation, tiltYValueRef.current);
      gl.uniform1f(tiltXLocation, tiltXValueRef.current);
      gl.uniform1f(zoomLocation, zoomValueRef.current);
      gl.uniform1f(focusedSphereLocation, animatedFocusedSphereRef.current);
      gl.uniform1f(sphereCountLocation, currentSphereCount);

      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Bind texcoord buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw spheres
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Calculate sphere positions (shared by labels and focus area)
      const circleRadius = 2.43;
      const zoomScale = 3.0 + (1.0 - 3.0) * zoomValueRef.current;
      const xOffset = -2.43 * zoomValueRef.current;
      const aspect = canvas.width / canvas.height;

      // Calculate which sphere is currently aligned with the focus area (left edge, angle = π)
      // Sphere i is at angle: i * (2π / sphereCount) + rotation + entranceRotation
      // For focus area at left (angle = π), solve for i:
      const totalRotation = rotationValueRef.current + entranceRotationRef.current;
      const targetAngle = Math.PI; // Left edge of circle
      let focusedIndex = (targetAngle - totalRotation) / (Math.PI * 2 / currentSphereCount);

      // Normalize to [0, sphereCount) range
      focusedIndex = ((focusedIndex % currentSphereCount) + currentSphereCount) % currentSphereCount;

      // Round to nearest integer
      focusedIndex = Math.round(focusedIndex) % currentSphereCount;

      // Update refs
      focusedSphereIndexRef.current = focusedIndex;
      targetFocusedSphereRef.current = focusedIndex;

      // Render labels on top (conditionally)
      if (showHelpersRef.current) {
        gl.useProgram(labelProgram);

      // Bind label texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, labelTexture);
      gl.uniform1i(labelTextureLocation, 0);

      for (let i = 0; i < currentSphereCount; i++) {
        const angle = (i * Math.PI * 2) / currentSphereCount + rotationValueRef.current + entranceRotationRef.current;

        // Calculate sphere position in circle (XY plane)
        let pos = {
          x: Math.cos(angle) * circleRadius,
          y: Math.sin(angle) * circleRadius,
          z: 0
        };

        // Apply Y-axis rotation (matching shader's rotateY matrix exactly)
        // Shader: mat3(c,0,s, 0,1,0, -s,0,c) gives x'=c*x-s*z, y'=y, z'=s*x+c*z
        const cosY = Math.cos(tiltYValueRef.current);
        const sinY = Math.sin(tiltYValueRef.current);
        const rotatedY = {
          x: cosY * pos.x - sinY * pos.z,
          y: pos.y,
          z: sinY * pos.x + cosY * pos.z
        };

        // Apply X-axis rotation (matching shader's rotateX matrix exactly)
        // Shader: mat3(1,0,0, 0,c,-s, 0,s,c) gives x'=x, y'=c*y+s*z, z'=-s*y+c*z
        const cosX = Math.cos(tiltXValueRef.current);
        const sinX = Math.sin(tiltXValueRef.current);
        const rotatedX = {
          x: rotatedY.x,
          y: cosX * rotatedY.y + sinX * rotatedY.z,
          z: -sinX * rotatedY.y + cosX * rotatedY.z
        };

        // Calculate pixelUV (matching shader's camera setup)
        // In shader: vec3 ro = vec3(pixelUV.x * zoomScale + xOffset, pixelUV.y * zoomScale, zoomDepth);
        // We need to reverse this: given sphere position, what pixelUV would see it?
        const pixelUVX = (rotatedX.x - xOffset) / zoomScale;
        const pixelUVY = rotatedX.y / zoomScale;

        // Convert pixelUV to NDC
        // In shader: pixelUV.x is multiplied by aspect, ranges from -aspect to +aspect
        // pixelUV.y ranges from -1 to +1
        // To get NDC (which gl_Position expects), we need to normalize:
        const ndcX = pixelUVX / aspect; // Normalize X back to [-1, 1]
        const ndcY = pixelUVY; // Y is already in [-1, 1], keep as is (positive Y = up)

        // Label size in NDC
        const labelSize = 0.025; // Size of label quad

        // Create quad around sphere position (CCW winding)
        const quadPositions = new Float32Array([
          ndcX - labelSize, ndcY - labelSize,
          ndcX + labelSize, ndcY - labelSize,
          ndcX - labelSize, ndcY + labelSize,
          ndcX - labelSize, ndcY + labelSize,
          ndcX + labelSize, ndcY - labelSize,
          ndcX + labelSize, ndcY + labelSize,
        ]);

        // Texture coordinates for this number in the 5x4 atlas (5 cols, 4 rows)
        // Without UNPACK_FLIP_Y_WEBGL, canvas uploads as-is (origin top-left, V=0 at top)
        const cols = 5;
        const rows = 4;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const uSize = 1.0 / cols;
        const vSize = 1.0 / rows;
        const u0 = col * uSize;
        const v0 = row * vSize; // V=0 at top (canvas row 0)
        const u1 = u0 + uSize;
        const v1 = (row + 1) * vSize;

        const quadTexCoords = new Float32Array([
          u0, v1,
          u1, v1,
          u0, v0,
          u0, v0,
          u1, v1,
          u1, v0,
        ]);

        // Update buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, labelPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(labelPositionLocation);
        gl.vertexAttribPointer(labelPositionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, labelTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadTexCoords, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(labelTexCoordLocation);
        gl.vertexAttribPointer(labelTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Draw this label
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      }

      // Render focus area rectangle
      if (showFocusAreaRef.current) {
        gl.useProgram(solidProgram);

        // Focus area center is at the left edge of the circle (negative X = left)
        let focusPos = {
          x: -circleRadius, // Left edge of circle
          y: 0,
          z: 0
        };

        // Apply Y-axis rotation
        const cosY = Math.cos(tiltYValueRef.current);
        const sinY = Math.sin(tiltYValueRef.current);
        const rotatedY = {
          x: cosY * focusPos.x - sinY * focusPos.z,
          y: focusPos.y,
          z: sinY * focusPos.x + cosY * focusPos.z
        };

        // Apply X-axis rotation
        const cosX = Math.cos(tiltXValueRef.current);
        const sinX = Math.sin(tiltXValueRef.current);
        const rotatedX = {
          x: rotatedY.x,
          y: cosX * rotatedY.y + sinX * rotatedY.z,
          z: -sinX * rotatedY.y + cosX * rotatedY.z
        };

        // Convert to NDC (same as sphere labels)
        const pixelUVX = (rotatedX.x - xOffset) / zoomScale;
        const pixelUVY = rotatedX.y / zoomScale;
        const ndcX = pixelUVX / aspect;
        const ndcY = pixelUVY;

        // Rectangle dimensions in NDC
        const rectWidth = 0.15; // Width
        const rectHeight = 0.2; // Height
        const lineThickness = 0.003; // Outline thickness

        // Draw 4 rectangles forming the outline
        // Top edge
        const topEdge = new Float32Array([
          ndcX - rectWidth/2, ndcY + rectHeight/2,
          ndcX + rectWidth/2, ndcY + rectHeight/2,
          ndcX - rectWidth/2, ndcY + rectHeight/2 - lineThickness,
          ndcX - rectWidth/2, ndcY + rectHeight/2 - lineThickness,
          ndcX + rectWidth/2, ndcY + rectHeight/2,
          ndcX + rectWidth/2, ndcY + rectHeight/2 - lineThickness,
        ]);

        // Bottom edge
        const bottomEdge = new Float32Array([
          ndcX - rectWidth/2, ndcY - rectHeight/2 + lineThickness,
          ndcX + rectWidth/2, ndcY - rectHeight/2 + lineThickness,
          ndcX - rectWidth/2, ndcY - rectHeight/2,
          ndcX - rectWidth/2, ndcY - rectHeight/2,
          ndcX + rectWidth/2, ndcY - rectHeight/2 + lineThickness,
          ndcX + rectWidth/2, ndcY - rectHeight/2,
        ]);

        // Left edge
        const leftEdge = new Float32Array([
          ndcX - rectWidth/2, ndcY - rectHeight/2,
          ndcX - rectWidth/2 + lineThickness, ndcY - rectHeight/2,
          ndcX - rectWidth/2, ndcY + rectHeight/2,
          ndcX - rectWidth/2, ndcY + rectHeight/2,
          ndcX - rectWidth/2 + lineThickness, ndcY - rectHeight/2,
          ndcX - rectWidth/2 + lineThickness, ndcY + rectHeight/2,
        ]);

        // Right edge
        const rightEdge = new Float32Array([
          ndcX + rectWidth/2 - lineThickness, ndcY - rectHeight/2,
          ndcX + rectWidth/2, ndcY - rectHeight/2,
          ndcX + rectWidth/2 - lineThickness, ndcY + rectHeight/2,
          ndcX + rectWidth/2 - lineThickness, ndcY + rectHeight/2,
          ndcX + rectWidth/2, ndcY - rectHeight/2,
          ndcX + rectWidth/2, ndcY + rectHeight/2,
        ]);

        // Set color (white with some transparency)
        gl.uniform4f(solidColorLocation, 1.0, 1.0, 1.0, 0.6);

        // Draw each edge
        for (const edge of [topEdge, bottomEdge, leftEdge, rightEdge]) {
          gl.bindBuffer(gl.ARRAY_BUFFER, solidPosBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, edge, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(solidPositionLocation);
          gl.vertexAttribPointer(solidPositionLocation, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
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
      gl.deleteProgram(labelProgram);
      gl.deleteShader(labelVertexShader);
      gl.deleteShader(labelFragmentShader);
      gl.deleteBuffer(labelPosBuffer);
      gl.deleteBuffer(labelTexBuffer);
      gl.deleteTexture(labelTexture);
      gl.deleteProgram(solidProgram);
      gl.deleteShader(solidVertexShader);
      gl.deleteShader(solidFragmentShader);
      gl.deleteBuffer(solidPosBuffer);
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      className={`bg-transparent ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    />
  );
}

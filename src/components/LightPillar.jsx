import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { pillarColor } from '../pillarColor';
import './LightPillar.css';
import { isPlayerOpen } from '../media';

const LightPillar = ({
  topColor = '#5227FF',
  bottomColor = '#FF9FFC',
  intensity = 1.0,
  rotationSpeed = 0.3,
  interactive = false,
  className = '',
  glowAmount = 0.005,
  pillarWidth = 3.0,
  pillarHeight = 0.4,
  noiseIntensity = 0.5,
  mixBlendMode = 'screen',
  pillarRotation = 0,
  quality = 'high',
  lightMode = false,
  onReady,
  onUnavailable
}) => {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const sceneRef = useRef(null);
  const geometryRef = useRef(null);
  const mouseRef = useRef([0, 0]);
  const timeRef = useRef(0);
  const rotationSpeedRef = useRef(rotationSpeed);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !webGLSupported) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;


    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    let effectiveQuality = quality;
    if (isLowEndDevice && quality === 'high') effectiveQuality = 'medium';
    if (isMobile && quality !== 'low') effectiveQuality = 'low';

    const qualitySettings = {
      low: { iterations: 24, waveIterations: 1, pixelRatio: 0.5, precision: 'mediump', stepMultiplier: 1.5 },
      medium: { iterations: 40, waveIterations: 2, pixelRatio: 0.65, precision: 'mediump', stepMultiplier: 1.2 },
      high: {
        iterations: 80,
        waveIterations: 4,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        precision: 'highp',
        stepMultiplier: 1.0
      }
    };

    const settings = qualitySettings[effectiveQuality] || qualitySettings.medium;

    let renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        dpr: settings.pixelRatio,
        premultipliedAlpha: true,
        antialias: false,
        alpha: true,
        powerPreference: effectiveQuality === 'high' ? 'high-performance' : 'low-power',
        precision: settings.precision,
        stencil: false,
        depth: false
      });
    } catch (error) {
      setWebGLSupported(false);
      return;
    }

    renderer.setSize(width, height);
    container.appendChild(renderer.gl.canvas);
    rendererRef.current = renderer;

    const parseColor = pillarColor;

    const vertexShader = `#version 300 es
      precision highp float;
      in vec2 position;
      in vec2 uv;
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `#version 300 es
      precision ${settings.precision} float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uLightMode;
      uniform float uRotCos;
      uniform float uRotSin;
      uniform float uPillarRotCos;
      uniform float uPillarRotSin;
      uniform float uWaveSin;
      uniform float uWaveCos;
      in vec2 vUv;
      out vec4 fragColor;

      const float STEP_MULT = ${settings.stepMultiplier.toFixed(1)};
      const int MAX_ITER = ${settings.iterations};
      const int WAVE_ITER = ${settings.waveIterations};

      void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
        uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);

        vec3 ro = vec3(0.0, 0.0, -10.0);
        vec3 rd = normalize(vec3(uv, 1.0));

        float rotC = uRotCos;
        float rotS = uRotSin;
        if(uInteractive && (uMouse.x != 0.0 || uMouse.y != 0.0)) {
          float a = uMouse.x * 6.283185;
          rotC = cos(a);
          rotS = sin(a);
        }

        vec3 col = vec3(0.0);
        float t = 0.1;

        for(int i = 0; i < MAX_ITER; i++) {
          vec3 p = ro + rd * t;
          p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);

          vec3 q = p;
          q.y = p.y * uPillarHeight + uTime;

          float freq = 1.0;
          float amp = 1.0;
          for(int j = 0; j < WAVE_ITER; j++) {
            q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
            q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
            freq *= 2.0;
            amp *= 0.5;
          }

          float d = length(cos(q.xz)) - 0.2;
          float bound = length(p.xz) - uPillarWidth;
          float k = 4.0;
          float h = max(k - abs(d - bound), 0.0);
          d = max(d, bound) + h * h * 0.0625 / k;
          d = abs(d) * 0.15 + 0.01;

          float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
          col += mix(uBottomColor, uTopColor, grad) / d;

          t += d * STEP_MULT;
          if(t > 50.0) break;
        }

        float widthNorm = uPillarWidth / 3.0;
        col = tanh(col * uGlowAmount / widthNorm);

        col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;

        vec3 result = clamp(col * uIntensity, 0.0, 1.0);
        if (uLightMode > 0.5) {
          float energy = max(result.r, max(result.g, result.b));
          vec3 hue = result / max(energy, 0.001);
          float coverage = smoothstep(0.025, 0.95, energy);
          hue = pow(clamp(hue, 0.0, 1.0), vec3(1.25));
          result = mix(vec3(1.0), hue, coverage * 0.94);
        }
        fragColor = vec4(result, 1.0);
      }
    `;

    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    const waveSin = Math.sin(0.4);
    const waveCos = Math.cos(0.4);

    const material = new Program(renderer.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [width, height] },
        uMouse: { value: mouseRef.current },
        uTopColor: { value: parseColor(topColor) },
        uBottomColor: { value: parseColor(bottomColor) },
        uIntensity: { value: intensity },
        uInteractive: { value: interactive },
        uGlowAmount: { value: glowAmount },
        uPillarWidth: { value: pillarWidth },
        uPillarHeight: { value: pillarHeight },
        uNoiseIntensity: { value: noiseIntensity },
        uLightMode: { value: lightMode ? 1 : 0 },
        uRotCos: { value: 1.0 },
        uRotSin: { value: 0.0 },
        uPillarRotCos: { value: Math.cos(pillarRotRad) },
        uPillarRotSin: { value: Math.sin(pillarRotRad) },
        uWaveSin: { value: waveSin },
        uWaveCos: { value: waveCos }
      },
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    materialRef.current = material;

    const geometry = new Triangle(renderer.gl);
    geometryRef.current = geometry;
    const mesh = new Mesh(renderer.gl, { geometry, program: material });
    sceneRef.current = mesh;
    const release = () => {
      material.remove();
      geometry.remove();
      if (container.contains(renderer.gl.canvas)) container.removeChild(renderer.gl.canvas);
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Prime the real shader once while the opening screen is still present,
    // even when this section is below the viewport.
    try {
      renderer.render({ scene: mesh });
      const context = renderer.gl;
      if (!context.getProgramParameter(material.program, context.LINK_STATUS) || context.isContextLost() || context.getError() !== context.NO_ERROR) throw new Error('Background shader could not render');
      renderer.gl.canvas.dataset.backgroundFrame = 'ready';
      onReady?.();
    } catch { release(); setWebGLSupported(false); return; }

    let mouseMoveTimeout = null;
    const handleMouseMove = event => {
      if (!interactive) return;
      if (mouseMoveTimeout) return;
      mouseMoveTimeout = window.setTimeout(() => {
        mouseMoveTimeout = null;
      }, 16);
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current[0] = x;
      mouseRef.current[1] = y;
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    let lastTime = performance.now();
    const targetFPS = 30;
    const frameTime = 1000 / targetFPS;
    let isInView = typeof IntersectionObserver !== 'function';
    let isPageVisible = !document.hidden && !isPlayerOpen() && !document.documentElement.classList.contains('portfolio-loading');
    let disposed = false;

    const animate = currentTime => {
      if (disposed || !isInView || !isPageVisible || !materialRef.current || !rendererRef.current || !sceneRef.current) {
        rafRef.current = null;
        return;
      }
      const deltaTime = currentTime - lastTime;
      if (deltaTime >= frameTime) {
        timeRef.current += Math.min(deltaTime, 100) * 0.001 * rotationSpeedRef.current;
        const t = timeRef.current;
        materialRef.current.uniforms.uTime.value = t;
        materialRef.current.uniforms.uRotCos.value = Math.cos(t * 0.3);
        materialRef.current.uniforms.uRotSin.value = Math.sin(t * 0.3);
        try {
          if (rendererRef.current.gl.isContextLost()) { setWebGLSupported(false); return; }
          rendererRef.current.render({ scene: sceneRef.current });
        } catch { setWebGLSupported(false); return; }
        lastTime = currentTime - (deltaTime % frameTime);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    const startAnimation = () => {
      if (isInView && isPageVisible && !disposed && !rafRef.current) rafRef.current = requestAnimationFrame(animate);
    };
    const stopAnimation = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    const onContextLost = event => { event.preventDefault(); stopAnimation(); setWebGLSupported(false); };
    renderer.gl.canvas.addEventListener('webglcontextlost', onContextLost);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      isInView ? startAnimation() : stopAnimation();
    }, { threshold: .05 });
    visibilityObserver.observe(container);
    const handlePageVisibility = () => {
      isPageVisible = !document.hidden && !isPlayerOpen() && !document.documentElement.classList.contains('portfolio-loading');
      isPageVisible ? startAnimation() : stopAnimation();
    };
    document.addEventListener('visibilitychange', handlePageVisibility);
    document.addEventListener('portfolio-player-change', handlePageVisibility);
    document.addEventListener('portfolio-opening-finished', handlePageVisibility);

    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        if (!rendererRef.current || !materialRef.current || !containerRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        materialRef.current.uniforms.uResolution.value[0] = newWidth;
        materialRef.current.uniforms.uResolution.value[1] = newHeight;
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      disposed = true;
      clearTimeout(mouseMoveTimeout);
      clearTimeout(resizeTimeout);
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', handlePageVisibility);
      document.removeEventListener('portfolio-player-change', handlePageVisibility);
      document.removeEventListener('portfolio-opening-finished', handlePageVisibility);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.gl.canvas.removeEventListener('webglcontextlost', onContextLost);
        release();
      }

      rendererRef.current = null;
      materialRef.current = null;
      sceneRef.current = null;
      geometryRef.current = null;
      rafRef.current = null;
    };
  }, [webGLSupported, quality]);

  useEffect(() => { if (!webGLSupported) onUnavailable?.() }, [webGLSupported]);

  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  useEffect(() => {
    if (!materialRef.current) return;
    const parseColor = pillarColor;
    materialRef.current.uniforms.uTopColor.value = parseColor(topColor);
  }, [topColor]);

  useEffect(() => {
    if (!materialRef.current) return;
    const parseColor = pillarColor;
    materialRef.current.uniforms.uBottomColor.value = parseColor(bottomColor);
  }, [bottomColor]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uIntensity.value = intensity;
  }, [intensity]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uInteractive.value = interactive;
  }, [interactive]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uGlowAmount.value = glowAmount;
  }, [glowAmount]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uPillarWidth.value = pillarWidth;
  }, [pillarWidth]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uPillarHeight.value = pillarHeight;
  }, [pillarHeight]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uNoiseIntensity.value = noiseIntensity;
  }, [noiseIntensity]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uLightMode.value = lightMode ? 1 : 0;
  }, [lightMode]);

  useEffect(() => {
    if (!materialRef.current) return;
    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    materialRef.current.uniforms.uPillarRotCos.value = Math.cos(pillarRotRad);
    materialRef.current.uniforms.uPillarRotSin.value = Math.sin(pillarRotRad);
  }, [pillarRotation]);

  if (!webGLSupported) {
    return (
      <div className={`light-pillar-fallback ${className}`} style={{ mixBlendMode }} aria-hidden="true" />
    );
  }

  return <div ref={containerRef} className={`light-pillar-container ${className}`} style={{ mixBlendMode }} />;
};

export default LightPillar;

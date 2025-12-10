"use client";

import { Camera, Mesh, Plane, Program, Renderer, Transform } from "ogl";
import * as React from "react";
import { cn } from "@/lib/utils";

interface NeuralProps extends React.HTMLAttributes<HTMLCanvasElement> {
	hue?: number;
	saturation?: number;
	chroma?: number;
}

const vertexShader = `
  precision mediump float;

  attribute vec2 position;
  attribute vec2 uv;

  varying vec2 vUv;

  void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;

  varying vec2 vUv;
  uniform float u_time;
  uniform float u_ratio;
  uniform vec2 u_pointer_position;
  uniform float u_scroll_progress;
  uniform float u_hue;
  uniform float u_saturation;
  uniform float u_chroma;

  vec2 rotate(vec2 uv, float th) {
      return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float neuro_shape(vec2 uv, float t, float p) {
      vec2 sine_acc = vec2(0.);
      vec2 res = vec2(0.);
      float scale = 8.;

      for (int j = 0; j < 15; j++) {
          uv = rotate(uv, 1.);
          sine_acc = rotate(sine_acc, 1.);
          vec2 layer = uv * scale + float(j) + sine_acc - t;
          sine_acc += sin(layer) + 2.4 * p;
          res += (.5 + .5 * cos(layer)) / scale;
          scale *= (1.2);
      }
      return res.x + res.y;
  }

  // HSL to RGB conversion
  vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
      vec2 uv = .5 * vUv;
      uv.x *= u_ratio;

      vec2 pointer = vUv - u_pointer_position;
      pointer.x *= u_ratio;
      float p = clamp(length(pointer), 0., 1.);
      p = .5 * pow(1. - p, 2.);

      float t = .001 * u_time;
      vec3 color = vec3(0.);

      float noise = neuro_shape(uv, t, p);

      noise = 1.2 * pow(noise, 3.);
      noise += pow(noise, 10.);
      noise = max(.0, noise - .5);
      noise *= (1. - length(vUv - .5));

      // Convert hue from degrees to 0-1 range
      float normalizedHue = u_hue / 360.0;
      
      // Create HSL color with animation
      vec3 hsl = vec3(
          normalizedHue + 0.1 * sin(3.0 * u_scroll_progress + 1.5),
          u_saturation,
          u_chroma * 0.5 + 0.2 * sin(2.0 * u_scroll_progress)
      );

      // Convert to RGB
      color = hsl2rgb(hsl);
      color = color * noise;

      // More transparent output
      float alpha = noise * 0.5;
      gl_FragColor = vec4(color, alpha);
  }
`;

function Neural({ hue, saturation, chroma, className, ...props }: NeuralProps) {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const animationRef = React.useRef<number | null>(null);
	const rendererRef = React.useRef<Renderer | null>(null);
	const sceneRef = React.useRef<Transform | null>(null);
	const meshRef = React.useRef<Mesh | null>(null);
	const cameraRef = React.useRef<Camera | null>(null);
	const pointerRef = React.useRef({ x: 0, y: 0, tX: 0, tY: 0 });

	// Read CSS variables for colors
	const getCSSVariable = (name: string, fallback: number): number => {
		if (typeof window === "undefined") return fallback;
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(name)
			.trim();
		return value ? parseFloat(value) : fallback;
	};

	const resolvedHue = hue ?? getCSSVariable("--neural-hue", 220);
	const resolvedSaturation =
		saturation ?? getCSSVariable("--neural-saturation", 0.8);
	const resolvedChroma = chroma ?? getCSSVariable("--neural-chroma", 0.6);

	const initOGL = React.useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return false;

		try {
			const renderer = new Renderer({
				canvas,
				width: canvas.clientWidth,
				height: canvas.clientHeight,
				dpr: Math.min(window.devicePixelRatio, 2),
				alpha: true,
				premultipliedAlpha: false,
			});

			const camera = new Camera(renderer.gl);
			const scene = new Transform();

			const geometry = new Plane(renderer.gl, {
				width: 2,
				height: 2,
			});

			const program = new Program(renderer.gl, {
				vertex: vertexShader,
				fragment: fragmentShader,
				uniforms: {
					u_time: { value: 0 },
					u_ratio: { value: window.innerWidth / window.innerHeight },
					u_pointer_position: { value: [0, 0] },
					u_scroll_progress: { value: 0 },
					u_hue: { value: resolvedHue },
					u_saturation: { value: resolvedSaturation },
					u_chroma: { value: resolvedChroma },
				},
			});

			const mesh = new Mesh(renderer.gl, {
				geometry,
				program,
			});

			mesh.setParent(scene);

			rendererRef.current = renderer;
			cameraRef.current = camera;
			sceneRef.current = scene;
			meshRef.current = mesh;

			return true;
		} catch (error) {
			console.error("Error initializing OGL:", error);
			return false;
		}
	}, [resolvedHue, resolvedSaturation, resolvedChroma]);

	const resizeCanvas = React.useCallback(() => {
		const renderer = rendererRef.current;
		const mesh = meshRef.current;
		const canvas = canvasRef.current;

		if (!canvas || !renderer || !mesh) return;

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		renderer.setSize(width, height);

		// Update ratio uniform
		if (mesh.program?.uniforms.u_ratio) {
			mesh.program.uniforms.u_ratio.value = width / height;
		}
	}, []);

	const updateMousePosition = React.useCallback((x: number, y: number) => {
		pointerRef.current.tX = x;
		pointerRef.current.tY = y;
	}, []);

	const render = React.useCallback(() => {
		const renderer = rendererRef.current;
		const scene = sceneRef.current;
		const camera = cameraRef.current;
		const mesh = meshRef.current;
		const pointer = pointerRef.current;

		if (!renderer || !scene || !camera || !mesh) return;

		const currentTime = performance.now();

		// Smooth pointer interpolation
		pointer.x += (pointer.tX - pointer.x) * 0.2;
		pointer.y += (pointer.tY - pointer.y) * 0.2;

		// Update uniforms
		if (mesh.program?.uniforms) {
			const uniforms = mesh.program.uniforms;

			if (uniforms.u_time) uniforms.u_time.value = currentTime;
			if (uniforms.u_pointer_position) {
				uniforms.u_pointer_position.value = [
					pointer.x / window.innerWidth,
					1 - pointer.y / window.innerHeight,
				];
			}
			if (uniforms.u_scroll_progress) {
				uniforms.u_scroll_progress.value =
					window.pageYOffset / (2 * window.innerHeight);
			}
		}

		renderer.render({ scene, camera });
		animationRef.current = requestAnimationFrame(render);
	}, []);

	// Update uniforms when props change
	React.useEffect(() => {
		const mesh = meshRef.current;
		if (mesh?.program?.uniforms.u_hue) {
			mesh.program.uniforms.u_hue.value = resolvedHue;
		}
	}, [resolvedHue]);

	React.useEffect(() => {
		const mesh = meshRef.current;
		if (mesh?.program?.uniforms.u_saturation) {
			mesh.program.uniforms.u_saturation.value = resolvedSaturation;
		}
	}, [resolvedSaturation]);

	React.useEffect(() => {
		const mesh = meshRef.current;
		if (mesh?.program?.uniforms.u_chroma) {
			mesh.program.uniforms.u_chroma.value = resolvedChroma;
		}
	}, [resolvedChroma]);

	React.useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			updateMousePosition(e.clientX, e.clientY);
		};

		const handleTouchMove = (e: TouchEvent) => {
			updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
		};

		const handleClick = (e: MouseEvent) => {
			updateMousePosition(e.clientX, e.clientY);
		};

		if (initOGL()) {
			resizeCanvas();
			render();

			window.addEventListener("resize", resizeCanvas);
			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("touchmove", handleTouchMove);
			window.addEventListener("click", handleClick);
		}

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}

			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("touchmove", handleTouchMove);
			window.removeEventListener("click", handleClick);

			// Clean up OGL resources
			rendererRef.current = null;
		};
	}, [initOGL, resizeCanvas, render, updateMousePosition]);

	return (
		<canvas
			ref={canvasRef}
			className={cn(
				"absolute inset-0 size-full pointer-events-none opacity-95",
				className,
			)}
			{...props}
		/>
	);
}

export { Neural };

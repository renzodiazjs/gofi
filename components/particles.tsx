"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  driftX: number;
  driftY: number;
  pulse: number;
};

/**
 * Ambient particle field.
 *
 * Canvas rather than DOM nodes: a few hundred absolutely-positioned divs would
 * force layout on every frame. Nothing here touches React state, so the field
 * animates without ever re-rendering the tree above it.
 */
export function Particles({
  quantity = 90,
  color = "#7dd3fc",
}: {
  quantity?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let particles: Particle[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const seed = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      particles = Array.from({ length: quantity }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.1 + 0.4,
        alpha: Math.random() * 0.4 + 0.1,
        driftX: (Math.random() - 0.5) * 0.12,
        driftY: -(Math.random() * 0.18 + 0.04),
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reduceMotion) {
          particle.x += particle.driftX;
          particle.y += particle.driftY;
          particle.pulse += 0.012;

          // Wrap instead of respawn: the field stays evenly distributed.
          if (particle.y < -10) particle.y = height + 10;
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
        }

        const twinkle = reduceMotion
          ? particle.alpha
          : particle.alpha * (0.65 + 0.35 * Math.sin(particle.pulse));

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.globalAlpha = twinkle;
        context.fill();
      }

      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    seed();
    draw();

    const observer = new ResizeObserver(seed);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [quantity, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}

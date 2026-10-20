import React, { useEffect, useRef, useState } from 'react';

export interface ConfettiExplosionProps {
  /**
   * Boolean flag or counter value to trigger the confetti explosion.
   * Animation runs whenever this becomes truthy or changes to a new truthy value.
   */
  trigger: boolean | number;
  /**
   * Number of particles to render. Defaults to 120 as specified.
   */
  particleCount?: number;
  /**
   * Total duration of the explosion in milliseconds. Defaults to 2500.
   */
  durationMs?: number;
  /**
   * Explicit override for reduced motion accessibility.
   * If omitted, checks window.matchMedia('(prefers-reduced-motion: reduce)').
   */
  forceReducedMotion?: boolean;
  /**
   * Optional callback invoked when the particle explosion finishes.
   */
  onComplete?: () => void;
  /**
   * Optional className for styling the canvas element.
   */
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  aspectRatio: number;
  angle: number;
  angularVelocity: number;
  alpha: number;
}

const CONFETTI_COLORS = [
  '#6558D3', // Ledgerly Violet
  '#F5B83D', // Warm Gold
  '#4ADE80', // Emerald Green
  '#F472B6', // Rosy Pink
  '#38BDF8', // Sky Blue
  '#A78BFA', // Soft Lavender
  '#FB923C', // Warm Orange
];

export const ConfettiExplosion: React.FC<ConfettiExplosionProps> = ({
  trigger,
  particleCount = 120, // default 120 particles
  durationMs = 2500,
  forceReducedMotion,
  onComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastTriggerRef = useRef<boolean | number | null>(null);

  // Check user preference for reduced motion
  const checkReducedMotion = (): boolean => {
    if (typeof forceReducedMotion === 'boolean') {
      return forceReducedMotion;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  };

  useEffect(() => {
    // Only trigger if trigger is truthy and either changed or was false before
    const isTriggered = Boolean(trigger);
    const triggerChanged = lastTriggerRef.current !== trigger;
    lastTriggerRef.current = trigger;

    if (!isTriggered || !triggerChanged) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const isReducedMotion = checkReducedMotion();

    setIsActive(true);

    // If user prefers reduced motion, satisfy constraint by rendering static particles with fade or omitting animation
    if (isReducedMotion) {
      ctx.clearRect(0, 0, width, height);

      // Render static celebratory confetti dots without rapid movement/spins
      const staticParticles: Array<{ x: number; y: number; size: number; color: string }> = [];
      for (let i = 0; i < Math.min(particleCount, 60); i++) {
        staticParticles.push({
          x: width * 0.2 + Math.random() * (width * 0.6),
          y: height * 0.2 + Math.random() * (height * 0.4),
          size: Math.random() * 6 + 4,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        });
      }

      // Draw static particles with soft opacity
      for (const p of staticParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Automatically clean up static display after 1.2s without motion
      const staticTimer = setTimeout(() => {
        ctx.clearRect(0, 0, width, height);
        setIsActive(false);
        if (onComplete) onComplete();
      }, 1200);

      return () => {
        clearTimeout(staticTimer);
        ctx.clearRect(0, 0, width, height);
      };
    }

    // Standard Full Motion: Initialize 120 particles bursting outward from upper center
    const particles: Particle[] = [];
    const originX = width / 2;
    const originY = height * 0.38;

    for (let i = 0; i < particleCount; i++) {
      // Angle spread: spread outwards and upwards with variation
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 1.6;
      const speed = Math.random() * 14 + 6;

      particles.push({
        x: originX + (Math.random() - 0.5) * 60,
        y: originY + (Math.random() - 0.5) * 40,
        vx: Math.sin(spreadAngle) * speed,
        vy: -Math.cos(spreadAngle) * speed - Math.random() * 4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 9 + 6,
        aspectRatio: Math.random() > 0.4 ? 0.6 : 1, // mix of ribbon rectangles and squares
        angle: Math.random() * 360,
        angularVelocity: (Math.random() - 0.5) * 16,
        alpha: 1,
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      if (progress >= 1) {
        ctx.clearRect(0, 0, width, height);
        setIsActive(false);
        if (onComplete) onComplete();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Remaining alpha fades smoothly near end of animation
      const globalFade = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.985; // air drag
        p.angle += p.angularVelocity;

        ctx.save();
        ctx.globalAlpha = Math.max(0, globalFade);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;

        const w = p.size;
        const h = p.size * p.aspectRatio;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (ctx) ctx.clearRect(0, 0, width, height);
      setIsActive(false);
    };
  }, [trigger, particleCount, durationMs, forceReducedMotion, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-50 w-full h-full ${
        isActive ? 'block' : 'hidden'
      } ${className}`}
    />
  );
};

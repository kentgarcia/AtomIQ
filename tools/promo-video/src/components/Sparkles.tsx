import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, mix, prog } from '../motion';

export interface SparkleSpec {
  x: number;
  y: number;
  size: number;
  delay?: number;
  color?: string;
}

/** Crisp 4-point Duolingo celebration sparkles that pop in and gently pulse. */
export const Sparkles: React.FC<{ startFrame: number; items: readonly SparkleSpec[] }> = ({
  startFrame,
  items,
}) => {
  const frame = useCurrentFrame();

  return (
    <>
      {items.map((sp, i) => {
        const s = startFrame + (sp.delay ?? i * 4);
        if (frame < s) return null;
        const pop = prog(frame, s, s + 16, E.popOut);
        const dt = frame - s;
        const twinkle = 1 + 0.08 * Math.sin(dt * 0.22 + i * 1.4);
        const rot = mix(-22, 0, prog(frame, s, s + 18, E.snapOut));
        const sc = Math.max(0, pop * twinkle);

        return (
          <svg
            key={i}
            width={sp.size}
            height={sp.size}
            viewBox="-60 -60 120 120"
            style={{
              position: 'absolute',
              left: sp.x - sp.size / 2,
              top: sp.y - sp.size / 2,
              transform: `rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`,
              pointerEvents: 'none',
            }}
          >
            <path d="M0-54Q8-8 54 0Q8 8 0 54Q-8 8-54 0Q-8-8 0-54Z" fill={sp.color ?? '#FFF8C4'} />
          </svg>
        );
      })}
    </>
  );
};

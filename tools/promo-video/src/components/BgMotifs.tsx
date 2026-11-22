import React from 'react';
import { useCurrentFrame } from 'remotion';
import { WIDTH, HEIGHT } from '../timeline';

export type MotifKind = 'atom' | 'flask' | 'sparkle' | 'bolt' | 'gem' | 'shield' | 'star' | 'phone';

export interface MotifItem {
  kind: MotifKind;
  x: number;
  y: number;
  rot?: number;
  scale?: number;
  opacity?: number;
  driftX?: number;
  driftY?: number;
  spin?: number;
}

const renderMotifShape = (kind: MotifKind): React.ReactNode => {
  switch (kind) {
    case 'atom':
      return (
        <>
          <ellipse rx="82" ry="30" fill="none" stroke="currentColor" strokeWidth="14" />
          <ellipse rx="82" ry="30" transform="rotate(60)" fill="none" stroke="currentColor" strokeWidth="14" />
          <ellipse rx="82" ry="30" transform="rotate(120)" fill="none" stroke="currentColor" strokeWidth="14" />
          <circle r="19" fill="currentColor" />
        </>
      );
    case 'flask':
      return (
        <>
          <path d="M-20 -72H20V-24L58 44Q70 70 44 70H-44Q-70 70 -58 44L-20 -24Z" fill="currentColor" />
          <rect x="-30" y="-86" width="60" height="16" rx="8" fill="currentColor" />
        </>
      );
    case 'sparkle':
      return <path d="M0-54Q7-7 54 0Q7 7 0 54Q-7 7-54 0Q-7-7 0-54Z" fill="currentColor" />;
    case 'bolt':
      return (
        <path
          d="M12 -74L-46 8H-4L-18 74L48 -14H4Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinejoin="round"
        />
      );
    case 'gem':
      return <path d="M-54-14L-28-54H28L54-14L0 60Z" fill="currentColor" />;
    case 'shield':
      return <path d="M0-72L58-48V6C58 46 28 66 0 78C-28 66 -58 46 -58 6V-48Z" fill="currentColor" />;
    case 'star':
      return (
        <path
          d="M0-62L18-20L64-15L29 15L39 60L0 36L-39 60L-29 15L-64-15L-18-20Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinejoin="round"
        />
      );
    case 'phone':
      return (
        <>
          <rect x="-38" y="-66" width="76" height="132" rx="18" fill="none" stroke="currentColor" strokeWidth="14" />
          <circle cx="0" cy="44" r="7" fill="currentColor" />
        </>
      );
  }
};

export const BgMotifs: React.FC<{ items: readonly MotifItem[]; color?: string }> = ({
  items,
  color = '#FFFFFF',
}) => {
  const frame = useCurrentFrame();
  const sec = frame / 60;

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', color }}
    >
      {items.map((item, i) => {
        const dx = (item.driftX ?? (i % 2 === 0 ? 8 : -7)) * sec;
        const dy = (item.driftY ?? (i % 3 === 0 ? -6 : 5)) * sec;
        const rot = (item.rot ?? 0) + (item.spin ?? (item.kind === 'atom' ? 6 : 2)) * sec;
        return (
          <g
            key={i}
            transform={`translate(${item.x + dx} ${item.y + dy}) rotate(${rot}) scale(${item.scale ?? 1})`}
            opacity={item.opacity ?? 0.14}
          >
            {renderMotifShape(item.kind)}
          </g>
        );
      })}
    </svg>
  );
};

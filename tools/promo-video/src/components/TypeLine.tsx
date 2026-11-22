import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, mix, prog } from '../motion';
import { FONT_FAMILY } from '../palette';

interface TypeLineProps {
  text: string;
  startFrame: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textShadow?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wordStagger?: number;
  maxWidth?: number;
  align?: 'left' | 'center';
}

/**
 * Bold Duolingo kinetic typography — snaps in word-by-word with solid lip shadow.
 * Never wraps subtitles in pill or badge boxes.
 */
export const TypeLine: React.FC<TypeLineProps> = ({
  text,
  startFrame,
  fontSize = 84,
  fontWeight = 900,
  color = '#FFFFFF',
  textShadow = '0 7px 0 rgba(0, 0, 0, 0.22)',
  lineHeight = 1.04,
  letterSpacing = -2.2,
  wordStagger = 4,
  maxWidth,
  align = 'left',
}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: Math.round(fontSize * 0.24),
        rowGap: Math.round(fontSize * 0.08),
        maxWidth,
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
        color,
        textShadow,
      }}
    >
      {words.map((word, idx) => {
        const wStart = startFrame + idx * wordStagger;
        const p = prog(frame, wStart, wStart + 16, E.snapOut);
        const op = prog(frame, wStart, wStart + 6, E.snapOut);
        const y = mix(34, 0, p);
        const scale = mix(1.08, 1.0, p);
        return (
          <span
            key={`${word}-${idx}`}
            style={{
              display: 'inline-block',
              opacity: op,
              transform: `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
              transformOrigin: '50% 80%',
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

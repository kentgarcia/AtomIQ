import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, clamp, mix, prog } from '../motion';

interface TapCursorProps {
  /** Destination X/Y inside the parent positioned container */
  x: number;
  y: number;
  /** Exact local frame of tap contact */
  tapFrame: number;
  /** Optional starting X/Y for the approach glide */
  fromX?: number;
  fromY?: number;
}

/**
 * Crisp tactile Duolingo tap indicator: glides in smoothly, presses down on the exact
 * contact frame with a bright ripple ring, and glides away cleanly.
 */
export const TapCursor: React.FC<TapCursorProps> = ({
  x,
  y,
  tapFrame,
  fromX,
  fromY,
}) => {
  const frame = useCurrentFrame();
  const enterStart = tapFrame - 20;
  const exitEnd = tapFrame + 22;

  if (frame < enterStart || frame > exitEnd) return null;

  const arrive = prog(frame, enterStart, tapFrame - 2, E.glideOut);
  const depart = prog(frame, tapFrame + 10, exitEnd, E.buildIn);

  const sx = fromX ?? x + 76;
  const sy = fromY ?? y + 64;
  const curX = mix(sx, x, arrive) + mix(0, 32, depart);
  const curY = mix(sy, y, arrive) + mix(0, 40, depart);

  const opacity = clamp(
    prog(frame, enterStart, enterStart + 8, E.snapOut) * (1 - prog(frame, tapFrame + 12, exitEnd, E.buildIn)),
    0,
    1,
  );

  // Press scale dip right on contact
  const pressDown = prog(frame, tapFrame - 3, tapFrame, E.launchIn);
  const pressUp = prog(frame, tapFrame + 3, tapFrame + 10, E.snapOut);
  const pressAmt = clamp(pressDown - pressUp, 0, 1);
  const dotScale = 1 - 0.24 * pressAmt;

  // Expanding ripple ring from tapFrame
  const ripP = prog(frame, tapFrame, tapFrame + 18, E.snapOut);
  const ripOpacity = frame >= tapFrame ? (1 - ripP) * 0.85 : 0;
  const ripScale = mix(0.45, 2.35, ripP);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`,
        pointerEvents: 'none',
        zIndex: 50,
        opacity,
      }}
    >
      {/* Ripple ring */}
      {ripOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: -26,
            top: -26,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '5px solid #FABF24',
            opacity: ripOpacity,
            transform: `scale(${ripScale.toFixed(3)})`,
          }}
        />
      )}
      {/* Clean circular touch pointer */}
      <div
        style={{
          position: 'absolute',
          left: -22,
          top: -22,
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          border: '4px solid #2B2B2B',
          boxShadow: '0 6px 0 rgba(0, 0, 0, 0.22)',
          transform: `scale(${dotScale.toFixed(3)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#FABF24',
          }}
        />
      </div>
    </div>
  );
};

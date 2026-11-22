import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, mix, prog } from '../motion';
import { FONT_FAMILY } from '../palette';

interface DeviceStageProps {
  children: React.ReactNode;
  enterFrame?: number;
  width?: number;
  height?: number;
  background?: string;
  borderColor?: string;
  lipColor?: string;
  style?: React.CSSProperties;
}

/**
 * Wide, crisp, frameless rounded white UI card for 16:9 landscape scenes —
 * echoes AtomIQ's Play Store screenshot aesthetic with chunky face-and-lip depth.
 */
export const DeviceStage: React.FC<DeviceStageProps> = ({
  children,
  enterFrame = 0,
  width = 940,
  height = 860,
  background = '#FFFFFF',
  borderColor = 'rgba(255,255,255,0.92)',
  lipColor = 'rgba(0,0,0,0.18)',
  style,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, enterFrame, enterFrame + 22, E.snapOut);
  const y = mix(64, 0, p);
  const scale = mix(0.95, 1.0, p);
  const opacity = prog(frame, enterFrame, enterFrame + 9, E.snapOut);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 44,
        background,
        border: `8px solid ${borderColor}`,
        boxShadow: `0 18px 0 ${lipColor}, 0 34px 70px rgba(0, 0, 0, 0.22)`,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: FONT_FAMILY,
        opacity,
        transform: `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
        transformOrigin: '50% 60%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

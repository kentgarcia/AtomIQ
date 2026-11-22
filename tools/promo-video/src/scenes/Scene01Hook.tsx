import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { Sparkles } from '../components/Sparkles';
import { TypeLine } from '../components/TypeLine';
import { E, contactSquash, mix, prog, spr, SPR } from '../motion';
import { FONT_FAMILY, THEMES } from '../palette';
import { CUES, SAFE } from '../timeline';

const HOOK_MOTIFS: readonly MotifItem[] = [
  { kind: 'atom', x: 1680, y: 160, rot: 18, scale: 1.2, opacity: 0.16 },
  { kind: 'atom', x: 180, y: 920, rot: -20, scale: 1.1, opacity: 0.15 },
  { kind: 'flask', x: 980, y: 140, rot: 14, scale: 0.9, opacity: 0.14 },
  { kind: 'bolt', x: 1060, y: 930, rot: -16, scale: 0.85, opacity: 0.14 },
  { kind: 'sparkle', x: 840, y: 240, rot: 0, scale: 0.65, opacity: 0.22 },
  { kind: 'gem', x: 1790, y: 890, rot: 16, scale: 0.8, opacity: 0.15 },
];

export const Scene01Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = THEMES.gold;

  // AtomIQ icon stamp drop at frame 6
  const iconDrop = prog(frame, 0, CUES.hookIconLand + 10, E.snapOut);
  const iconScaleOversize = mix(1.38, 1.0, prog(frame, 0, CUES.hookIconLand + 12, E.snapOut));
  const iconSq = contactSquash(frame - CUES.hookIconLand, 0.14, 5);
  const iconOp = prog(frame, 0, 5, E.snapOut);

  // Wordmark slides out cleanly beside icon
  const brandP = prog(frame, 10, 26, E.snapOut);

  // Shrodi pops up on beat 2 (frame 72)
  const shrodiStart = CUES.hookLine2;
  const shrodiSpring = spr(frame, shrodiStart, SPR.landing);
  const shrodiY = mix(240, 0, shrodiSpring);
  const shrodiOp = prog(frame, shrodiStart, shrodiStart + 8, E.snapOut);
  const shrodiSq = contactSquash(frame - (shrodiStart + 8), 0.1, 6);
  const shrodiBob = frame > shrodiStart + 18 ? Math.sin((frame - shrodiStart) * 0.08) * 6 : 0;

  // Exit push into Scene 2 (frames 198..210)
  const exitP = prog(frame, 198, 210, E.launchIn);
  const exitX = mix(0, -120, exitP);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      {/* Warm golden halo behind Shrodi */}
      <div
        style={{
          position: 'absolute',
          right: -60,
          top: 90,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 245, 194, 0.44) 0%, rgba(255, 245, 194, 0) 68%)',
          transform: `scale(${mix(0.85, 1.05, prog(frame, shrodiStart, shrodiStart + 40, E.settleOut)).toFixed(3)})`,
        }}
      />

      <BgMotifs items={HOOK_MOTIFS} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${exitX.toFixed(1)}px, 0, 0)`,
        }}
      >
        {/* Top-left brand lockup */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x + 16,
            top: SAFE.y + 38,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              width: 124,
              height: 124,
              borderRadius: 30,
              overflow: 'hidden',
              border: '6px solid #FFFFFF',
              boxShadow: '0 10px 0 rgba(168, 106, 0, 0.36)',
              opacity: iconOp,
              transform: `translate3d(0, ${mix(-42, 0, iconDrop).toFixed(1)}px, 0) scale(${(
                iconScaleOversize * iconSq.sx
              ).toFixed(4)}, ${(iconScaleOversize * iconSq.sy).toFixed(4)})`,
              transformOrigin: '50% 80%',
            }}
          >
            <Img
              src={staticFile('images/icon-layered.svg')}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: -2,
              color: '#FFFFFF',
              textShadow: theme.textShadow,
              opacity: brandP,
              transform: `translate3d(${mix(-24, 0, brandP).toFixed(1)}px, 0, 0)`,
            }}
          >
            AtomIQ
          </div>
        </div>

        {/* Hero Hook Headlines */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x + 16,
            top: 318,
            width: 1020,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <TypeLine
            text="Nuclear science"
            startFrame={4}
            fontSize={114}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={6}
            letterSpacing={-3}
          />
          <TypeLine
            text="that actually makes sense."
            startFrame={CUES.hookLine2}
            fontSize={114}
            fontWeight={900}
            color="#FFFDF5"
            textShadow={theme.textShadow}
            wordStagger={5}
            letterSpacing={-3}
            maxWidth={960}
          />
        </div>

        {/* Right Hero: Shrodi cheering */}
        <div
          style={{
            position: 'absolute',
            right: 84,
            bottom: 42,
            width: 670,
            height: 670,
            opacity: shrodiOp,
            transform: `translate3d(0, ${(shrodiY + shrodiBob).toFixed(1)}px, 0) scale(${shrodiSq.sx.toFixed(
              4,
            )}, ${shrodiSq.sy.toFixed(4)})`,
            transformOrigin: '50% 85%',
          }}
        >
          <Img
            src={staticFile('images/mascot/happy_2.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 0 rgba(168, 106, 0, 0.24))',
            }}
          />
        </div>

        {/* Celebration sparkles around Shrodi */}
        <Sparkles
          startFrame={CUES.hookSparkle}
          items={[
            { x: 1185, y: 310, size: 76, delay: 0, color: '#FFFFFF' },
            { x: 1760, y: 270, size: 62, delay: 5, color: '#FFF7B8' },
            { x: 1210, y: 690, size: 52, delay: 10, color: '#FFF7B8' },
            { x: 1790, y: 650, size: 68, delay: 7, color: '#FFFFFF' },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};

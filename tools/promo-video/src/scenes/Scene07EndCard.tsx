import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { Sparkles } from '../components/Sparkles';
import { E, contactSquash, mix, prog, spr, SPR } from '../motion';
import { FONT_FAMILY, THEMES } from '../palette';
import { CUES, SAFE, SCENES } from '../timeline';

const MOTIFS: readonly MotifItem[] = [
  { kind: 'atom', x: 170, y: 165, rot: -18, scale: 1.15, opacity: 0.16 },
  { kind: 'atom', x: 1740, y: 885, rot: 22, scale: 1.25, opacity: 0.16 },
  { kind: 'flask', x: 1750, y: 175, rot: 16, scale: 0.9, opacity: 0.15 },
  { kind: 'sparkle', x: 960, y: 145, rot: 0, scale: 0.72, opacity: 0.24 },
  { kind: 'gem', x: 160, y: 900, rot: -14, scale: 0.85, opacity: 0.15 },
  { kind: 'bolt', x: 1020, y: 940, rot: -14, scale: 0.8, opacity: 0.14 },
];

export const Scene07EndCard: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..270
  const base = SCENES.endcard.from;
  const s1 = CUES.stamp1 - base; // 0
  const s2 = CUES.stamp2 - base; // 33
  const s3 = CUES.stamp3 - base; // 66
  const heroAt = CUES.endHeroIn - base; // 108
  const sparkleAt = CUES.endSparkle - base; // 138

  const theme = THEMES.gold;
  const inHero = frame >= heroAt;

  // Determine active rapid stamp (0..108)
  const activeStamp =
    frame < s2
      ? { text: 'No account.', start: s1 }
      : frame < s3
        ? { text: 'No ads.', start: s2 }
        : { text: '100% offline.', start: s3 };

  const stampDt = frame - activeStamp.start;
  const stampOversize = mix(1.36, 1.0, prog(stampDt, 0, 12, E.snapOut));
  const stampSq = contactSquash(stampDt - 3, 0.14, 4.5);

  // Hero lockup animation (108..270)
  const heroDt = frame - heroAt;
  const iconSpr = spr(frame, heroAt, SPR.landing);
  const iconSq = contactSquash(heroDt - 6, 0.12, 5);
  const titleP = prog(frame, heroAt + 6, heroAt + 22, E.snapOut);
  const tagP = prog(frame, heroAt + 14, heroAt + 30, E.snapOut);
  const badgeP = prog(frame, heroAt + 22, heroAt + 38, E.snapOut);

  const shrodiSpr = spr(frame, heroAt + 4, SPR.landing);
  const shrodiY = mix(220, 0, shrodiSpr);
  const shrodiBob = frame > heroAt + 24 ? Math.sin((frame - heroAt) * 0.08) * 5 : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      {/* Warm center-right radial halo */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 120,
          width: 880,
          height: 880,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 248, 206, 0.44) 0%, rgba(255, 248, 206, 0) 68%)',
        }}
      />

      <BgMotifs items={MOTIFS} />

      {/* PHASE A: 3 Rhythmic Full-Frame Stamps (No account. / No ads. / 100% offline.) */}
      {!inHero && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 156,
              fontWeight: 900,
              letterSpacing: -4.5,
              color: '#FFFFFF',
              textShadow: '0 12px 0 rgba(160, 102, 0, 0.42)',
              transform: `scale(${(stampOversize * stampSq.sx).toFixed(4)}, ${(
                stampOversize * stampSq.sy
              ).toFixed(4)})`,
              textAlign: 'center',
            }}
          >
            {activeStamp.text}
          </div>

          {frame >= s3 && (
            <Sparkles
              startFrame={s3}
              items={[
                { x: 470, y: 370, size: 74, delay: 0, color: '#FFFFFF' },
                { x: 1450, y: 390, size: 66, delay: 3, color: '#FFF7B8' },
                { x: 1390, y: 690, size: 54, delay: 6, color: '#FFFFFF' },
              ]}
            />
          )}
        </AbsoluteFill>
      )}

      {/* PHASE B: Final Brand Hero Lockup (holds cleanly 2.7s) */}
      {inHero && (
        <AbsoluteFill>
          {/* Left hero lockup */}
          <div
            style={{
              position: 'absolute',
              left: SAFE.x + 28,
              top: 204,
              width: 1020,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {/* Layered Vector Icon + AtomIQ Wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
              <div
                style={{
                  width: 184,
                  height: 184,
                  borderRadius: 44,
                  overflow: 'hidden',
                  border: '8px solid #FFFFFF',
                  boxShadow: '0 14px 0 rgba(168, 106, 0, 0.36)',
                  transform: `scale(${(mix(1.25, 1, iconSpr) * iconSq.sx).toFixed(4)}, ${(
                    mix(1.25, 1, iconSpr) * iconSq.sy
                  ).toFixed(4)})`,
                  opacity: prog(frame, heroAt, heroAt + 6, E.snapOut),
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
                  fontSize: 132,
                  fontWeight: 900,
                  letterSpacing: -4,
                  color: '#FFFFFF',
                  textShadow: '0 10px 0 rgba(160, 102, 0, 0.42)',
                  opacity: titleP,
                  transform: `translate3d(${mix(-32, 0, titleP).toFixed(1)}px, 0, 0)`,
                }}
              >
                AtomIQ
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                marginTop: 44,
                fontFamily: FONT_FAMILY,
                fontSize: 66,
                fontWeight: 900,
                letterSpacing: -1.6,
                color: '#FFFFFF',
                textShadow: '0 7px 0 rgba(160, 102, 0, 0.35)',
                opacity: tagP,
                transform: `translate3d(0, ${mix(28, 0, tagP).toFixed(1)}px, 0)`,
              }}
            >
              Make the atom make sense.
            </div>

            {/* Sub-features plain text (no pills) */}
            <div
              style={{
                marginTop: 16,
                fontFamily: FONT_FAMILY,
                fontSize: 36,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.94)',
                textShadow: '0 3px 0 rgba(160, 102, 0, 0.25)',
                opacity: tagP,
                transform: `translate3d(0, ${mix(22, 0, tagP).toFixed(1)}px, 0)`,
              }}
            >
              No account · No ads · 100% offline
            </div>

            {/* Official-style Available on Google Play CTA badge */}
            <div
              style={{
                marginTop: 52,
                background: '#14171F',
                border: '4px solid rgba(255,255,255,0.94)',
                borderRadius: 26,
                padding: '24px 44px',
                boxShadow: '0 11px 0 rgba(120, 74, 0, 0.36)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 24,
                opacity: badgeP,
                transform: `translate3d(0, ${mix(28, 0, badgeP).toFixed(1)}px, 0) scale(${mix(
                  0.92,
                  1,
                  badgeP,
                ).toFixed(3)})`,
              }}
            >
              {/* Google Play 4-color triangle */}
              <svg width="52" height="56" viewBox="0 0 46 50">
                <path d="M2 4.5C1.3 5.2 1 6.3 1 7.7v34.6c0 1.4.3 2.5 1 3.2l.2.2L22 25.9v-.5L2.2 4.3z" fill="#00D2FF" />
                <path d="M28.6 32.5L22 25.9v-.5l6.6-6.6.2.1 7.8 4.4c2.2 1.3 2.2 3.3 0 4.6l-7.8 4.5z" fill="#FFCE00" />
                <path d="M28.8 32.4L22 25.6 2 45.6c.7.8 2 .9 3.4.1l23.4-13.3z" fill="#FF3A44" />
                <path d="M28.8 18.8L5.4 5.5C4 4.7 2.7 4.8 2 5.6l20 20 6.8-6.8z" fill="#00F076" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 1.3,
                    color: 'rgba(255,255,255,0.84)',
                    textTransform: 'uppercase',
                  }}
                >
                  Available on
                </span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 44,
                    fontWeight: 900,
                    letterSpacing: -1,
                    color: '#FFFFFF',
                  }}
                >
                  Google Play
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero: Shrodi cheering */}
          <div
            style={{
              position: 'absolute',
              right: 88,
              bottom: 62,
              width: 640,
              height: 640,
              opacity: prog(frame, heroAt + 4, heroAt + 12, E.snapOut),
              transform: `translate3d(0, ${(shrodiY + shrodiBob).toFixed(1)}px, 0)`,
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

          <Sparkles
            startFrame={sparkleAt}
            items={[
              { x: 1210, y: 250, size: 78, delay: 0, color: '#FFFFFF' },
              { x: 1780, y: 290, size: 62, delay: 4, color: '#FFF7B8' },
              { x: 1180, y: 740, size: 52, delay: 8, color: '#FFF7B8' },
              { x: 1790, y: 690, size: 64, delay: 6, color: '#FFFFFF' },
            ]}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

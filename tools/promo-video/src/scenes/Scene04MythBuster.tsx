import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { DeviceStage } from '../components/DeviceStage';
import { Sparkles } from '../components/Sparkles';
import { TapCursor } from '../components/TapCursor';
import { TypeLine } from '../components/TypeLine';
import { E, contactSquash, mix, pressSink, prog } from '../motion';
import { THEMES, UI } from '../palette';
import { CUES, SAFE, SCENES } from '../timeline';

const MOTIFS: readonly MotifItem[] = [
  { kind: 'shield', x: 160, y: 170, rot: -14, scale: 0.9, opacity: 0.15 },
  { kind: 'sparkle', x: 680, y: 195, rot: 0, scale: 0.68, opacity: 0.22 },
  { kind: 'bolt', x: 660, y: 880, rot: 16, scale: 0.8, opacity: 0.14 },
  { kind: 'atom', x: 170, y: 870, rot: 14, scale: 0.95, opacity: 0.14 },
];

const MODES = [
  { title: 'Quick Play', desc: '10 statements per unit', bg: '#FF9500', lip: '#CC7800' },
  { title: 'Challenge', desc: '3 lives, no timer', bg: '#FF3B5C', lip: '#CC2F4A' },
  { title: 'Endless', desc: 'Beat the clock', bg: '#8B5CF6', lip: '#6F4AC4' },
] as const;

export const Scene04MythBuster: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..240
  const base = SCENES.myth.from;
  const tapAt = CUES.mythTapMyth - base; // 102
  const correctAt = CUES.mythCorrect - base; // 105

  const theme = THEMES.coral;
  const mythPress = pressSink(frame, tapAt);
  const isBusted = frame >= correctAt;

  const cardIn = prog(frame, 8, 26, E.snapOut);
  const footP = prog(frame, correctAt, correctAt + 16, E.snapOut);
  const bustSq = contactSquash(frame - correctAt, 0.1, 5);
  const barPct = mix(60, 76, prog(frame, correctAt, correctAt + 20, E.snapOut));
  const exitX = mix(0, -100, prog(frame, 228, 240, E.launchIn));

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      <BgMotifs items={MOTIFS} />

      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${exitX.toFixed(1)}px, 0, 0)` }}>
        {/* Left copy */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x,
            top: 325,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <TypeLine
            text="Bust nuclear myths."
            startFrame={4}
            fontSize={94}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
          />
          <TypeLine
            text="Calm, sourced facts."
            startFrame={18}
            fontSize={44}
            fontWeight={800}
            color={theme.subColor}
            textShadow="0 4px 0 rgba(154, 46, 0, 0.28)"
            letterSpacing={-0.8}
            wordStagger={3}
          />
        </div>

        {/* Right MythBuster UI Stage */}
        <div style={{ position: 'absolute', right: SAFE.x, top: 102 }}>
          <DeviceStage enterFrame={2} width={990} height={876} lipColor="rgba(154, 46, 0, 0.34)">
            <div style={{ padding: '30px 44px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Top progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <svg width="30" height="30" viewBox="0 0 24 24">
                  <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="#AFAFAF" strokeWidth="3.2" strokeLinecap="round" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: UI.coral, letterSpacing: 1.2, marginBottom: 6 }}>
                    MYTH BUSTER
                  </div>
                  <div style={{ height: 18, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barPct.toFixed(1)}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: UI.coral,
                        boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.28)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, fontWeight: 900, color: UI.red }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={UI.red}>
                    <path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z" />
                  </svg>
                  <span>3</span>
                </div>
              </div>

              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 26,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: UI.coralLip,
                    background: UI.coralBg,
                    padding: '8px 16px',
                    borderRadius: 14,
                  }}
                >
                  MYTH OR FACT?
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, color: UI.inkMuted }}>4 of 10</span>
              </div>

              {/* Ada statement card */}
              <div
                style={{
                  background: '#FFF9F5',
                  border: '3.5px solid #FFD4BC',
                  borderRadius: 30,
                  padding: '28px 34px',
                  boxShadow: '0 8px 0 #F5C3A6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                  transform: `translate3d(0, ${mix(28, 0, cardIn).toFixed(1)}px, 0) scale(${bustSq.sx.toFixed(
                    4,
                  )}, ${bustSq.sy.toFixed(4)})`,
                }}
              >
                <Img
                  src={staticFile('art/npc-ada-bust.svg')}
                  style={{ width: 156, height: 156, objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ fontSize: 36, fontWeight: 900, color: UI.ink, lineHeight: 1.2, letterSpacing: -0.8 }}>
                  “You become radioactive after getting an X-ray.”
                </div>
              </div>

              {/* MYTH / FACT chunky buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 28 }}>
                <div
                  style={{
                    background: isBusted ? UI.green : '#FFFFFF',
                    border: `4px solid ${isBusted ? UI.greenLip : UI.border}`,
                    borderRadius: 24,
                    padding: '26px 28px',
                    boxShadow: `0 ${(9 * (1 - mythPress)).toFixed(1)}px 0 ${isBusted ? UI.greenLip : UI.borderLip}`,
                    transform: `translateY(${(9 * mythPress).toFixed(1)}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: isBusted ? '#FFFFFF' : UI.ink,
                  }}
                >
                  <span>MYTH</span>
                  {isBusted && <span>✓</span>}
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: `4px solid ${UI.border}`,
                    borderRadius: 24,
                    padding: '26px 28px',
                    boxShadow: `0 9px 0 ${UI.borderLip}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: UI.ink,
                  }}
                >
                  FACT
                </div>
              </div>

              {/* 3 Play Modes strip (fills card space gracefully before footer) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 34 }}>
                {MODES.map((m) => (
                  <div
                    key={m.title}
                    style={{
                      background: '#F7F8FA',
                      border: `2.5px solid ${UI.border}`,
                      borderRadius: 20,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: m.bg,
                          boxShadow: `0 3px 0 ${m.lip}`,
                        }}
                      />
                      <span style={{ fontSize: 21, fontWeight: 900, color: UI.ink }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: UI.inkSoft }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Myth busted! footer */}
            {isBusted && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: UI.greenBg,
                  borderTop: `4px solid ${UI.green}`,
                  boxShadow: '0 -10px 26px rgba(0, 0, 0, 0.10)',
                  padding: '24px 44px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transform: `translate3d(0, ${mix(150, 0, footP).toFixed(1)}px, 0)`,
                }}
              >
                <div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#398A00' }}>Myth busted!</div>
                  <div style={{ fontSize: 21, fontWeight: 700, color: '#4B8B1B', marginTop: 3 }}>
                    X-rays pass through without leaving radioactivity behind.
                  </div>
                </div>
                <div
                  style={{
                    background: UI.green,
                    color: '#FFFFFF',
                    borderRadius: 18,
                    padding: '16px 32px',
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: 1,
                    boxShadow: `0 6px 0 ${UI.greenLip}`,
                    flexShrink: 0,
                  }}
                >
                  NEXT
                </div>
              </div>
            )}

            <TapCursor x={265} y={488} tapFrame={tapAt} fromX={440} fromY={620} />
            <Sparkles
              startFrame={correctAt}
              items={[
                { x: 430, y: 420, size: 54, delay: 0, color: '#58CC02' },
                { x: 110, y: 455, size: 42, delay: 4, color: '#FABF24' },
              ]}
            />
          </DeviceStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};

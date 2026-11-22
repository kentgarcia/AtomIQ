import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { DeviceStage } from '../components/DeviceStage';
import { Sparkles } from '../components/Sparkles';
import { TapCursor } from '../components/TapCursor';
import { TypeLine } from '../components/TypeLine';
import { E, clamp, mix, pressSink, prog } from '../motion';
import { THEMES, UI } from '../palette';
import { CUES, SAFE, SCENES } from '../timeline';

const MOTIFS: readonly MotifItem[] = [
  { kind: 'flask', x: 160, y: 170, rot: -14, scale: 0.95, opacity: 0.15 },
  { kind: 'atom', x: 660, y: 880, rot: 20, scale: 1.05, opacity: 0.14 },
  { kind: 'sparkle', x: 700, y: 200, rot: 0, scale: 0.65, opacity: 0.22 },
  { kind: 'star', x: 170, y: 890, rot: 12, scale: 0.72, opacity: 0.14 },
  { kind: 'atom', x: 1840, y: 150, rot: -18, scale: 0.95, opacity: 0.14 },
];

const Puck: React.FC<{
  face: string;
  lip: string;
  glyph: 'check' | 'atom' | 'star' | 'lock';
  ring?: number;
  size?: number;
}> = ({ face, lip, glyph, ring = 0, size = 112 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
    {ring > 0 && (
      <>
        <circle cx="40" cy="36" r="46" fill="none" stroke="#F0E2B8" strokeWidth="7" />
        <circle
          cx="40"
          cy="36"
          r="46"
          fill="none"
          stroke="#FABF24"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${Math.round(289 * ring)} 289`}
          transform="rotate(-90 40 36)"
        />
      </>
    )}
    <ellipse cx="40" cy="43" rx="35" ry="30" fill={lip} />
    <ellipse cx="40" cy="32" rx="35" ry="30" fill={face} />
    <path
      d="M15 36A26 22 0 0 1 25 15"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.34"
      strokeWidth="3.6"
      strokeLinecap="round"
    />
    {glyph === 'check' && (
      <path
        d="M25 32l10 10 20-21"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 -2)"
      />
    )}
    {glyph === 'atom' && (
      <g transform="translate(40 32) scale(0.2 0.17)" color="#FFFFFF">
        <ellipse rx="82" ry="30" fill="none" stroke="currentColor" strokeWidth="16" />
        <ellipse rx="82" ry="30" transform="rotate(60)" fill="none" stroke="currentColor" strokeWidth="16" />
        <ellipse rx="82" ry="30" transform="rotate(120)" fill="none" stroke="currentColor" strokeWidth="16" />
        <circle r="20" fill="currentColor" />
      </g>
    )}
    {glyph === 'star' && (
      <path
        d="M40 16l6 12 13 2-9.5 9 2.2 13L40 46l-11.7 6 2.2-13L21 30l13-2z"
        fill="#FFFFFF"
      />
    )}
    {glyph === 'lock' && (
      <g transform="translate(40 33)">
        <rect x="-11" y="-3" width="22" height="17" rx="4" fill="#FFFFFF" />
        <path d="M-6 -3v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#FFFFFF" strokeWidth="4" />
      </g>
    )}
  </svg>
);

export const Scene02Lessons: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..300
  const base = SCENES.lessons.from;
  const tapStart = CUES.lessonsTapStart - base; // 66
  const cutHal = CUES.lessonsCutToHal - base; // 78
  const tapWater = CUES.lessonsTapWater - base; // 180
  const correctAt = CUES.lessonsCorrect - base; // 183

  const theme = THEMES.blue;

  // Color handoff from Gold -> Blue on the opening 14 frames
  const bgBlueOp = prog(frame, 0, 14, E.snapOut);

  // Start button press sink on Lesson Map
  const startPress = pressSink(frame, tapStart);

  // Zoom transition from Lesson Map into Hal's Visual Lesson
  const mapZoom = prog(frame, cutHal - 10, cutHal, E.launchIn);
  const inLesson = frame >= cutHal;
  const lessonIn = prog(frame, cutHal, cutHal + 16, E.snapOut);

  // Water answer tap & instant green flip
  const waterPress = pressSink(frame, tapWater);
  const isCorrect = frame >= correctAt;
  const footP = prog(frame, correctAt, correctAt + 16, E.snapOut);
  const progressPct = mix(64, 86, prog(frame, correctAt, correctAt + 20, E.snapOut));

  // Exit push
  const exitX = mix(0, -100, prog(frame, 288, 300, E.launchIn));

  return (
    <AbsoluteFill style={{ background: `linear-gradient(155deg, ${THEMES.gold.bgTop}, ${THEMES.gold.bgBottom})`, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(155deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
          opacity: bgBlueOp,
        }}
      />
      <BgMotifs items={MOTIFS} />

      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${exitX.toFixed(1)}px, 0, 0)` }}>
        {/* Left column copy */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x,
            top: 315,
            width: 670,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <TypeLine
            text="5-minute visual lessons."
            startFrame={4}
            fontSize={92}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
            maxWidth={650}
          />
          <TypeLine
            text="Guided by your teachers."
            startFrame={18}
            fontSize={42}
            fontWeight={800}
            color={theme.subColor}
            textShadow="0 4px 0 rgba(9, 89, 140, 0.28)"
            letterSpacing={-0.8}
            wordStagger={3}
          />
        </div>

        {/* Right column UI stage */}
        <div style={{ position: 'absolute', right: SAFE.x, top: 102 }}>
          <DeviceStage enterFrame={2} width={990} height={876} lipColor="rgba(9, 89, 140, 0.34)">
            {/* PHASE A: Authentic Lesson Map (NO top stats, tall yellow unit card) */}
            {!inLesson && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '34px 44px',
                  background: '#FFFFFF',
                  transform: `scale(${mix(1, 1.16, mapZoom).toFixed(4)})`,
                  opacity: clamp(1 - mapZoom * 0.9, 0, 1),
                  transformOrigin: '55% 42%',
                }}
              >
                {/* Tall Yellow Unit Card (matches Play Store Lesson Map) */}
                <div
                  style={{
                    background: UI.gold,
                    borderRadius: 28,
                    padding: '32px 36px',
                    boxShadow: `0 10px 0 ${UI.goldLip}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 156,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing: 1.4,
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: 8,
                      }}
                    >
                      UNIT 1 · INSIDE THE ATOM
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#FFFFFF', letterSpacing: -1 }}>
                      What everything is made of
                    </div>
                  </div>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.24)',
                      border: '3px solid rgba(255,255,255,0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="#FFFFFF">
                      <path d="M3 5.5C6 4.5 9 4.8 12 6.8c3-2 6-2.3 9-1.3v13c-3-1-6-.7-9 1.3-3-2-6-2.3-9-1.3z" />
                    </svg>
                  </div>
                </div>

                {/* Stepping-stone path */}
                <div style={{ position: 'relative', height: 640, marginTop: 22 }}>
                  <div style={{ position: 'absolute', left: 260, top: 20 }}>
                    <Puck face={UI.gold} lip={UI.goldLip} glyph="check" size={108} />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 440,
                      top: 132,
                      transform: `scale(${(1 + 0.03 * Math.sin(frame * 0.16)).toFixed(4)})`,
                    }}
                  >
                    <Puck face={UI.gold} lip={UI.goldLip} glyph="atom" ring={0.48} size={120} />
                  </div>

                  {/* START floating callout bubble */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 256,
                      top: 282,
                      width: 470,
                      background: UI.gold,
                      borderRadius: 28,
                      padding: '24px 28px',
                      boxShadow: `0 10px 0 ${UI.goldLip}, 0 18px 34px rgba(0,0,0,0.12)`,
                      color: '#FFFFFF',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: 226,
                        width: 24,
                        height: 24,
                        background: UI.gold,
                        transform: 'rotate(45deg)',
                      }}
                    />
                    <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.6 }}>Meet the atom</div>
                    <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.92, marginTop: 4 }}>
                      Lesson 2 of 5 · 3 min
                    </div>
                    <div
                      style={{
                        marginTop: 18,
                        background: '#FFFFFF',
                        color: '#C88908',
                        borderRadius: 18,
                        padding: '15px 0',
                        textAlign: 'center',
                        fontSize: 26,
                        fontWeight: 900,
                        letterSpacing: 1.2,
                        boxShadow: `0 ${(7 * (1 - startPress)).toFixed(1)}px 0 #E5C169`,
                        transform: `translateY(${(7 * startPress).toFixed(1)}px)`,
                      }}
                    >
                      START
                    </div>
                  </div>

                  <div style={{ position: 'absolute', left: 210, top: 516 }}>
                    <Puck face={UI.gold} lip={UI.goldLip} glyph="star" size={102} />
                  </div>
                  <div style={{ position: 'absolute', left: 615, top: 530 }}>
                    <Puck face="#E2E2E2" lip="#C0C0C0" glyph="lock" size={102} />
                  </div>
                </div>

                <TapCursor x={490} y={626} tapFrame={tapStart} fromX={620} fromY={720} />
              </div>
            )}

            {/* PHASE B: Hal's Visual Lesson */}
            {inLesson && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '28px 42px 0',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  transform: `scale(${mix(0.94, 1, lessonIn).toFixed(4)})`,
                  opacity: prog(frame, cutHal, cutHal + 8, E.snapOut),
                }}
              >
                {/* Top progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24">
                    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="#AFAFAF" strokeWidth="3.2" strokeLinecap="round" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#D9981A', letterSpacing: 1, marginBottom: 6 }}>
                      5 IN A ROW
                    </div>
                    <div style={{ height: 18, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressPct.toFixed(1)}%`,
                          height: '100%',
                          borderRadius: 99,
                          background: UI.green,
                          boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.28)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, fontWeight: 900, color: UI.red }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={UI.red}>
                      <path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z" />
                    </svg>
                    <span>5</span>
                  </div>
                </div>

                {/* Hal + speech bubble */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 18 }}>
                  <Img
                    src={staticFile('art/npc-hal-bust.svg')}
                    style={{ width: 118, height: 118, objectFit: 'contain', flexShrink: 0 }}
                  />
                  <div
                    style={{
                      flex: 1,
                      background: '#F7F8FA',
                      border: `3px solid ${UI.border}`,
                      borderRadius: 24,
                      padding: '18px 24px',
                      fontSize: 25,
                      fontWeight: 800,
                      color: UI.ink,
                      lineHeight: 1.3,
                    }}
                  >
                    Your hand, your phone, and an apple are all{' '}
                    <span style={{ color: '#0F8AD8', textDecoration: 'underline', textUnderlineOffset: 4 }}>matter</span>{' '}
                    — made of{' '}
                    <span style={{ color: '#0F8AD8', textDecoration: 'underline', textUnderlineOffset: 4 }}>atoms</span>!
                  </div>
                </div>

                {/* Visual comparison diagram */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
                  <div
                    style={{
                      background: UI.blueBg,
                      border: '3px solid #BDE8FF',
                      borderRadius: 24,
                      padding: '16px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1.2, color: '#0F8AD8' }}>
                      MADE OF ATOMS
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, margin: '10px 0 6px' }}>
                      <Img src={staticFile('art/obj-air.svg')} style={{ width: 70, height: 70 }} />
                      <Img src={staticFile('art/obj-water.svg')} style={{ width: 70, height: 70 }} />
                      <Img src={staticFile('art/obj-hand.svg')} style={{ width: 70, height: 70 }} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: UI.inkSoft }}>air, water, you</div>
                  </div>
                  <div
                    style={{
                      background: '#FFF4E6',
                      border: '3px solid #FFD8A8',
                      borderRadius: 24,
                      padding: '16px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1.2, color: '#D96B00' }}>
                      NOT MATTER
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '10px 0 6px' }}>
                      <Img src={staticFile('art/obj-sun.svg')} style={{ width: 70, height: 70 }} />
                      <Img src={staticFile('art/obj-flame.svg')} style={{ width: 70, height: 70 }} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: UI.inkSoft }}>light, heat</div>
                  </div>
                </div>

                {/* Question & Options */}
                <div style={{ fontSize: 28, fontWeight: 900, color: UI.ink, marginTop: 22, marginBottom: 14 }}>
                  Which of these is made of atoms?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Option 1: Correct answer */}
                  <div
                    style={{
                      background: isCorrect ? UI.greenBg : '#FFFFFF',
                      border: `3.5px solid ${isCorrect ? UI.green : UI.border}`,
                      borderRadius: 20,
                      padding: '18px 26px',
                      boxShadow: `0 ${(6 * (1 - waterPress)).toFixed(1)}px 0 ${isCorrect ? UI.green : UI.borderLip}`,
                      transform: `translateY(${(6 * waterPress).toFixed(1)}px)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 25,
                      fontWeight: 800,
                      color: isCorrect ? '#2F7D00' : UI.ink,
                    }}
                  >
                    <span>A glass of water</span>
                    {isCorrect && (
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: UI.green,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: `3px solid ${UI.border}`,
                      borderRadius: 20,
                      padding: '18px 26px',
                      boxShadow: `0 6px 0 ${UI.borderLip}`,
                      fontSize: 25,
                      fontWeight: 800,
                      color: UI.ink,
                    }}
                  >
                    A beam of sunlight
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: `3px solid ${UI.border}`,
                      borderRadius: 20,
                      padding: '18px 26px',
                      boxShadow: `0 6px 0 ${UI.borderLip}`,
                      fontSize: 25,
                      fontWeight: 800,
                      color: UI.ink,
                    }}
                  >
                    The warmth of a fire
                  </div>
                </div>

                {/* Excellent! green footer slides up */}
                {isCorrect && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: UI.greenBg,
                      borderTop: `4px solid ${UI.green}`,
                      padding: '22px 42px 26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transform: `translate3d(0, ${mix(140, 0, footP).toFixed(1)}px, 0)`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: '#398A00' }}>Excellent!</div>
                      <div style={{ fontSize: 21, fontWeight: 700, color: '#4B8B1B', marginTop: 2 }}>
                        Water is matter, so it is built from atoms.
                      </div>
                    </div>
                    <div
                      style={{
                        background: UI.green,
                        color: '#FFFFFF',
                        borderRadius: 18,
                        padding: '16px 38px',
                        fontSize: 23,
                        fontWeight: 900,
                        letterSpacing: 1,
                        boxShadow: `0 6px 0 ${UI.greenLip}`,
                      }}
                    >
                      CONTINUE
                    </div>
                  </div>
                )}

                <TapCursor x={390} y={534} tapFrame={tapWater} fromX={560} fromY={650} />
                <Sparkles
                  startFrame={correctAt}
                  items={[
                    { x: 870, y: 515, size: 46, delay: 0, color: '#58CC02' },
                    { x: 920, y: 558, size: 34, delay: 3, color: '#FABF24' },
                  ]}
                />
              </div>
            )}
          </DeviceStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};

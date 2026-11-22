import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { DeviceStage } from '../components/DeviceStage';
import { Sparkles } from '../components/Sparkles';
import { TapCursor } from '../components/TapCursor';
import { TypeLine } from '../components/TypeLine';
import { E, clamp, contactSquash, mix, pressSink, prog } from '../motion';
import { THEMES, UI } from '../palette';
import { CUES, SAFE, SCENES } from '../timeline';

const MOTIFS: readonly MotifItem[] = [
  { kind: 'bolt', x: 150, y: 165, rot: -16, scale: 0.9, opacity: 0.16 },
  { kind: 'star', x: 670, y: 210, rot: 16, scale: 0.78, opacity: 0.16 },
  { kind: 'sparkle', x: 165, y: 880, rot: 0, scale: 0.65, opacity: 0.22 },
  { kind: 'atom', x: 660, y: 870, rot: -12, scale: 0.95, opacity: 0.14 },
  { kind: 'bolt', x: 1850, y: 170, rot: 14, scale: 0.85, opacity: 0.14 },
];

const STARBURST_POINTS = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const r = i % 2 ? 26 : 56;
    pts.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
})();

export const Scene03AtomMaze: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..300
  const base = SCENES.maze.from;
  const jumpAt = CUES.mazeJump - base; // 36
  const battleAt = CUES.mazeBattleStart - base; // 72
  const tapAt = CUES.mazeTapAnswer - base; // 150
  const coinsAt = CUES.mazeCoins - base; // 174

  const theme = THEMES.green;

  // Shrodi runs right, jumps at frame 36..68, lands into battle stance at frame 72
  const runP = prog(frame, 4, battleAt, E.settleOut);
  const shrodiX = mix(72, 276, runP);
  const jumpRaw = clamp((frame - jumpAt) / 30, 0, 1);
  const shrodiJumpY = frame >= jumpAt && frame <= jumpAt + 30 ? -Math.sin(jumpRaw * Math.PI) * 118 : 0;
  const shrodiLandSq = contactSquash(frame - (jumpAt + 30), 0.14, 4);
  const shrodiHitLunge =
    frame >= tapAt ? Math.sin(clamp((frame - tapAt) / 14, 0, 1) * Math.PI) * 32 : 0;

  // Slime patrols slightly, then recoils right on Direct Hit!
  const slimeWalk = Math.floor(frame / 14) % 2 === 0;
  const hitP = prog(frame, tapAt, tapAt + 20, E.snapOut);
  const slimeX = mix(650, 745, hitP) + (frame < battleAt ? Math.sin(frame * 0.1) * 12 : 0);
  const slimeRot = mix(0, 18, hitP);
  const slimeSq = contactSquash(frame - tapAt, 0.2, 5);

  // Starburst between Shrodi and Slime on answer hit
  const burstPop = prog(frame, tapAt, tapAt + 14, E.popOut);
  const burstFade = 1 - prog(frame, tapAt + 55, tapAt + 95, E.buildIn);

  // Battle panel slides up at battleAt
  const panelP = prog(frame, battleAt, battleAt + 18, E.snapOut);
  const answerPress = pressSink(frame, tapAt);
  const isHit = frame >= tapAt;
  const footP = prog(frame, tapAt + 4, tapAt + 20, E.snapOut);

  // Coins fly from starburst (530, 220) to coin HUD (830, 74)
  const coinsLanded = frame >= coinsAt + 22;
  const hudPulse = contactSquash(frame - (coinsAt + 22), 0.16, 4);

  const exitX = mix(0, -100, prog(frame, 288, 300, E.launchIn));

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      <BgMotifs items={MOTIFS} />

      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${exitX.toFixed(1)}px, 0, 0)` }}>
        {/* Left column copy */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x,
            top: 310,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <TypeLine
            text="Play between questions."
            startFrame={4}
            fontSize={92}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
          />
          <TypeLine
            text="Run, jump & battle in Atom Maze."
            startFrame={18}
            fontSize={42}
            fontWeight={800}
            color={theme.subColor}
            textShadow="0 4px 0 rgba(36, 104, 0, 0.28)"
            letterSpacing={-0.8}
            wordStagger={3}
          />
        </div>

        {/* Right column Atom Maze Stage */}
        <div style={{ position: 'absolute', right: SAFE.x, top: 102 }}>
          <DeviceStage enterFrame={2} width={990} height={876} lipColor="rgba(36, 104, 0, 0.34)">
            {/* Top Platformer World */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 400,
                background: 'linear-gradient(180deg, #98E2FF 0%, #D9F5FF 100%)',
                overflow: 'hidden',
              }}
            >
              {/* Clouds & Hills parallax */}
              <Img
                src={staticFile('platformer/backgrounds/background_clouds.png')}
                style={{ position: 'absolute', left: -frame * 0.4, top: -30, width: 520, height: 420 }}
              />
              <Img
                src={staticFile('platformer/backgrounds/background_clouds.png')}
                style={{ position: 'absolute', left: 500 - frame * 0.4, top: -30, width: 520, height: 420 }}
              />
              <Img
                src={staticFile('platformer/backgrounds/background_color_hills.png')}
                style={{ position: 'absolute', left: 0, top: 10, width: 520, height: 390 }}
              />
              <Img
                src={staticFile('platformer/backgrounds/background_color_hills.png')}
                style={{ position: 'absolute', left: 480, top: 10, width: 520, height: 390 }}
              />

              {/* Grass ground tiles */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <React.Fragment key={i}>
                  <Img
                    src={staticFile('platformer/tiles/terrain_grass_block_top.png')}
                    style={{ position: 'absolute', left: i * 128, top: 300, width: 128, height: 128 }}
                  />
                </React.Fragment>
              ))}

              {/* Top HUD */}
              <div
                style={{
                  position: 'absolute',
                  left: 28,
                  right: 28,
                  top: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* Hearts */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 1, 2].map((h) => (
                    <Img
                      key={h}
                      src={staticFile('platformer/hud/hud_heart.png')}
                      style={{ width: 42, height: 42 }}
                    />
                  ))}
                </div>

                {/* Progress bar + flag */}
                <div
                  style={{
                    width: 340,
                    height: 22,
                    borderRadius: 99,
                    background: 'rgba(255,255,255,0.88)',
                    border: '3px solid #FFFFFF',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <div
                    style={{
                      width: `${mix(48, 66, prog(frame, tapAt, tapAt + 24, E.snapOut)).toFixed(1)}%`,
                      height: '100%',
                      borderRadius: 99,
                      background: UI.gold,
                    }}
                  />
                  <Img
                    src={staticFile('platformer/props/flag_yellow_a.png')}
                    style={{ position: 'absolute', right: -10, top: -18, width: 42, height: 42 }}
                  />
                </div>

                {/* Coin counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255,255,255,0.86)',
                    borderRadius: 99,
                    padding: '6px 16px',
                    boxShadow: '0 4px 0 rgba(0,0,0,0.12)',
                    transform: `scale(${hudPulse.sx.toFixed(3)}, ${hudPulse.sy.toFixed(3)})`,
                  }}
                >
                  <Img src={staticFile('platformer/hud/hud_coin.png')} style={{ width: 34, height: 34 }} />
                  <Img src={staticFile('platformer/hud/hud_character_multiply.png')} style={{ width: 20, height: 20 }} />
                  <Img src={staticFile('platformer/hud/hud_character_1.png')} style={{ width: 24, height: 24 }} />
                  <Img
                    src={staticFile(
                      coinsLanded
                        ? 'platformer/hud/hud_character_5.png'
                        : 'platformer/hud/hud_character_2.png',
                    )}
                    style={{ width: 24, height: 24 }}
                  />
                </div>
              </div>

              {/* Shrodi hero sprite */}
              <Img
                src={staticFile('art/shrodi-cheer.png')}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 146,
                  width: 174,
                  height: 174,
                  objectFit: 'contain',
                  transform: `translate3d(${(shrodiX + shrodiHitLunge).toFixed(1)}px, ${shrodiJumpY.toFixed(
                    1,
                  )}px, 0) scale(${shrodiLandSq.sx.toFixed(3)}, ${shrodiLandSq.sy.toFixed(3)})`,
                  transformOrigin: '50% 90%',
                }}
              />

              {/* Slime enemy */}
              <Img
                src={staticFile(
                  slimeWalk
                    ? 'platformer/enemies/slime_normal_walk_a.png'
                    : 'platformer/enemies/slime_normal_walk_b.png',
                )}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 202,
                  width: 122,
                  height: 122,
                  objectFit: 'contain',
                  transform: `translate3d(${slimeX.toFixed(1)}px, 0, 0) rotate(${slimeRot.toFixed(
                    1,
                  )}deg) scale(${slimeSq.sx.toFixed(3)}, ${slimeSq.sy.toFixed(3)})`,
                  transformOrigin: '50% 90%',
                }}
              />

              {/* Direct-hit golden starburst */}
              {isHit && burstFade > 0.01 && (
                <svg
                  width="156"
                  height="156"
                  viewBox="0 0 120 120"
                  style={{
                    position: 'absolute',
                    left: 486,
                    top: 158,
                    opacity: burstFade,
                    transform: `scale(${Math.max(0, burstPop).toFixed(3)}) rotate(${(frame - tapAt) * 1.4}deg)`,
                  }}
                >
                  <polygon
                    points={STARBURST_POINTS}
                    fill="#FFF3A0"
                    stroke="#FFFFFF"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* 3 Coins arcing into HUD */}
              {[0, 1, 2].map((c) => {
                const cs = coinsAt + c * 4;
                if (frame < cs || frame > cs + 22) return null;
                const cp = prog(frame, cs, cs + 22, E.stdInOut);
                const cx = mix(545 + c * 18, 860, cp);
                const cy = mix(220, 44, cp) - Math.sin(cp * Math.PI) * 95;
                return (
                  <Img
                    key={c}
                    src={staticFile('platformer/hud/hud_coin.png')}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 44,
                      height: 44,
                      transform: `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`,
                    }}
                  />
                );
              })}
            </div>

            {/* Bottom Area: Platformer Controls before battle, then Slime Battle Panel snaps up! */}
            <div
              style={{
                position: 'relative',
                height: 476,
                background: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {/* Pre-battle playful Atom Maze exploration bar */}
              {frame < battleAt + 6 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    padding: '44px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: 1 - prog(frame, battleAt, battleAt + 6, E.snapOut),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1.4, color: '#398A00' }}>
                        LEVEL 1 · ATOM MAZE
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: UI.ink, marginTop: 6 }}>
                        Explore the trail &amp; dodge slimes!
                      </div>
                    </div>
                    <div
                      style={{
                        background: UI.greenBg,
                        border: `3px solid ${UI.green}`,
                        borderRadius: 20,
                        padding: '12px 22px',
                        fontSize: 22,
                        fontWeight: 900,
                        color: '#2F7D00',
                      }}
                    >
                      3 Hearts · 12 Coins
                    </div>
                  </div>

                  {/* Tactile on-screen controls preview */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 18 }}>
                      <div
                        style={{
                          width: 104,
                          height: 104,
                          borderRadius: 28,
                          background: '#F3F4F6',
                          border: `3.5px solid ${UI.border}`,
                          boxShadow: `0 8px 0 ${UI.borderLip}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 40,
                          fontWeight: 900,
                          color: UI.inkSoft,
                        }}
                      >
                        ◀
                      </div>
                      <div
                        style={{
                          width: 104,
                          height: 104,
                          borderRadius: 28,
                          background: UI.blueBg,
                          border: `3.5px solid ${UI.blue}`,
                          boxShadow: `0 4px 0 ${UI.blueLip}`,
                          transform: 'translateY(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 40,
                          fontWeight: 900,
                          color: UI.blueLip,
                        }}
                      >
                        ▶
                      </div>
                    </div>

                    <div
                      style={{
                        width: 170,
                        height: 104,
                        borderRadius: 28,
                        background: frame >= jumpAt && frame <= jumpAt + 14 ? UI.green : UI.gold,
                        boxShadow: `0 ${frame >= jumpAt && frame <= jumpAt + 14 ? 3 : 8}px 0 ${
                          frame >= jumpAt && frame <= jumpAt + 14 ? UI.greenLip : UI.goldLip
                        }`,
                        transform: `translateY(${frame >= jumpAt && frame <= jumpAt + 14 ? 5 : 0}px)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 30,
                        fontWeight: 900,
                        letterSpacing: 1.5,
                        color: '#FFFFFF',
                      }}
                    >
                      JUMP
                    </div>
                  </div>
                </div>
              )}

              {/* Slime Battle Panel snaps up cleanly at battleAt */}
              {frame >= battleAt && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#FFFFFF',
                    padding: '18px 42px 0',
                    transform: `translate3d(0, ${mix(140, 0, panelP).toFixed(1)}px, 0)`,
                    opacity: prog(frame, battleAt, battleAt + 6, E.snapOut),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                        letterSpacing: 1.4,
                        color: '#398A00',
                        background: UI.greenBg,
                        padding: '5px 14px',
                        borderRadius: 12,
                      }}
                    >
                      SLIME BATTLE
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[0, 1, 2].map((pip) => {
                        const active = pip === 0 || (pip === 1 && !isHit);
                        return (
                          <span
                            key={pip}
                            style={{
                              width: 24,
                              height: 12,
                              borderRadius: 99,
                              background: active ? UI.red : '#E5E7EB',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 900, color: UI.ink, marginBottom: 12 }}>
                    What happens when an atom loses an electron?
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: `3px solid ${UI.border}`,
                        borderRadius: 18,
                        padding: '13px 22px',
                        boxShadow: `0 5px 0 ${UI.borderLip}`,
                        fontSize: 23,
                        fontWeight: 800,
                        color: UI.ink,
                      }}
                    >
                      It becomes neutral
                    </div>

                    <div
                      style={{
                        background: isHit ? UI.greenBg : '#FFFFFF',
                        border: `3.5px solid ${isHit ? UI.green : UI.border}`,
                        borderRadius: 18,
                        padding: '13px 22px',
                        boxShadow: `0 ${(5 * (1 - answerPress)).toFixed(1)}px 0 ${isHit ? UI.green : UI.borderLip}`,
                        transform: `translateY(${(5 * answerPress).toFixed(1)}px)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 23,
                        fontWeight: 800,
                        color: isHit ? '#2F7D00' : UI.ink,
                      }}
                    >
                      <span>It becomes positively charged</span>
                      {isHit && (
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: UI.green,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 19,
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
                        borderRadius: 18,
                        padding: '13px 22px',
                        boxShadow: `0 5px 0 ${UI.borderLip}`,
                        fontSize: 23,
                        fontWeight: 800,
                        color: UI.ink,
                      }}
                    >
                      It turns into light
                    </div>
                  </div>

                  {/* Direct hit! footer */}
                  {isHit && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: UI.greenBg,
                        borderTop: `4px solid ${UI.green}`,
                        boxShadow: '0 -8px 22px rgba(0,0,0,0.08)',
                        padding: '16px 42px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transform: `translate3d(0, ${mix(130, 0, footP).toFixed(1)}px, 0)`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 30, fontWeight: 900, color: '#398A00' }}>Direct hit!</div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: '#4B8B1B', marginTop: 2 }}>
                          Fewer electrons leaves more positive protons.
                        </div>
                      </div>
                      <div
                        style={{
                          background: UI.green,
                          color: '#FFFFFF',
                          borderRadius: 18,
                          padding: '14px 34px',
                          fontSize: 21,
                          fontWeight: 900,
                          letterSpacing: 1,
                          boxShadow: `0 6px 0 ${UI.greenLip}`,
                        }}
                      >
                        CONTINUE
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <TapCursor x={420} y={596} tapFrame={tapAt} fromX={620} fromY={720} />
            <Sparkles
              startFrame={tapAt}
              items={[
                { x: 540, y: 150, size: 50, delay: 0, color: '#FFFFFF' },
                { x: 640, y: 180, size: 40, delay: 4, color: '#FABF24' },
              ]}
            />
          </DeviceStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};

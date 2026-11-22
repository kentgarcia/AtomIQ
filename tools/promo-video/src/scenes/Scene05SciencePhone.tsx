import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { BgMotifs, type MotifItem } from '../components/BgMotifs';
import { DeviceStage } from '../components/DeviceStage';
import { TypeLine } from '../components/TypeLine';
import { E, mix, prog, spr, SPR } from '../motion';
import { THEMES } from '../palette';
import { CUES, SAFE, SCENES } from '../timeline';

const MOTIFS: readonly MotifItem[] = [
  { kind: 'phone', x: 155, y: 170, rot: -14, scale: 0.9, opacity: 0.15 },
  { kind: 'sparkle', x: 680, y: 205, rot: 0, scale: 0.7, opacity: 0.22 },
  { kind: 'atom', x: 650, y: 880, rot: 18, scale: 1.0, opacity: 0.14 },
  { kind: 'gem', x: 165, y: 885, rot: -14, scale: 0.78, opacity: 0.14 },
];

const PHONE_APPS = [
  ['chats', 'Chats'],
  ['atomdex', 'AtomDex'],
  ['scanner', 'Scanner'],
  ['field-notes', 'Field Notes'],
  ['library', 'Library'],
  ['camera', 'Camera'],
  ['safety', 'Safety'],
  ['map', 'Map'],
  ['shop', 'Shop'],
  ['daily-fact', 'Daily Fact'],
  ['contacts', 'Contacts'],
  ['settings', 'Settings'],
] as const;

export const Scene05SciencePhone: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..240
  const base = SCENES.phone.from;
  const notifAt = CUES.phoneNotif - base; // 102
  const geigerAt = CUES.phoneGeiger - base; // 138

  const theme = THEMES.purple;

  // Ada notification drops from top
  const notifSpr = spr(frame, notifAt, SPR.landing);
  const notifY = mix(-180, 0, notifSpr);
  const notifOp = prog(frame, notifAt, notifAt + 8, E.snapOut);

  // Shrodi Geiger peek bottom-right
  const geigerSpr = spr(frame, geigerAt, SPR.landing);
  const geigerY = mix(280, 0, geigerSpr);
  const geigerOp = prog(frame, geigerAt, geigerAt + 8, E.snapOut);
  const geigerPulse = frame >= geigerAt + 6 ? ((frame - geigerAt) % 24) / 24 : 0;

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
            top: 315,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <TypeLine
            text="Your own science phone."
            startFrame={4}
            fontSize={92}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
          />
          <TypeLine
            text="Chat, scan & explore."
            startFrame={18}
            fontSize={44}
            fontWeight={800}
            color={theme.subColor}
            textShadow="0 4px 0 rgba(67, 36, 122, 0.30)"
            letterSpacing={-0.8}
            wordStagger={3}
          />
        </div>

        {/* Right Science Phone Stage */}
        <div style={{ position: 'absolute', right: SAFE.x + 20, top: 102 }}>
          <DeviceStage
            enterFrame={2}
            width={960}
            height={876}
            background="linear-gradient(180deg, #4B2E83 0%, #2C1B54 100%)"
            borderColor="#231642"
            lipColor="rgba(35, 22, 66, 0.55)"
          >
            {/* Soft phone wallpaper shapes */}
            <div
              style={{
                position: 'absolute',
                left: -90,
                top: 120,
                width: 380,
                height: 380,
                borderRadius: '50%',
                background: 'rgba(182, 149, 248, 0.14)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: -80,
                bottom: 90,
                width: 420,
                height: 420,
                borderRadius: '50%',
                background: 'rgba(28, 176, 246, 0.14)',
              }}
            />

            {/* Status bar */}
            <div
              style={{
                padding: '22px 44px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'rgba(255,255,255,0.88)',
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              <span>9:41</span>
              <span style={{ letterSpacing: 1.5, fontSize: 16, opacity: 0.78 }}>ATOMIQ OS · OFFLINE</span>
              <span>100%</span>
            </div>

            {/* 12 chunky 3D-lipped apps (4x3 grid with diagonal pop-in) */}
            <div
              style={{
                padding: '38px 66px 24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                rowGap: 34,
                columnGap: 36,
              }}
            >
              {PHONE_APPS.map(([id, name], idx) => {
                const col = idx % 4;
                const row = Math.floor(idx / 4);
                const delay = 10 + (col + row) * 3;
                const p = prog(frame, delay, delay + 16, E.popOut);
                const op = prog(frame, delay, delay + 6, E.snapOut);
                const sc = Math.max(0.01, mix(0.65, 1.0, p));

                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      opacity: op,
                      transform: `translate3d(0, ${mix(24, 0, p).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`,
                    }}
                  >
                    <Img
                      src={staticFile(`art/app-${id}.svg`)}
                      style={{
                        width: 118,
                        height: 124,
                        filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.28))',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: '#FFFFFF',
                        textShadow: '0 2px 4px rgba(0,0,0,0.35)',
                      }}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom glass dock */}
            <div
              style={{
                position: 'absolute',
                left: 110,
                right: 110,
                bottom: 28,
                background: 'rgba(255,255,255,0.16)',
                border: '2px solid rgba(255,255,255,0.22)',
                borderRadius: 34,
                padding: '14px 38px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {['chats', 'scanner', 'map', 'safety'].map((id) => (
                <Img
                  key={id}
                  src={staticFile(`art/app-${id}.svg`)}
                  style={{ width: 82, height: 86 }}
                />
              ))}
            </div>

            {/* Ada's Atom Scanner notification drops down */}
            {frame >= notifAt && (
              <div
                style={{
                  position: 'absolute',
                  left: 36,
                  right: 36,
                  top: 32,
                  background: '#FFFFFF',
                  borderRadius: 28,
                  padding: '20px 26px',
                  boxShadow: '0 10px 0 rgba(35, 22, 66, 0.34), 0 24px 48px rgba(0,0,0,0.34)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  opacity: notifOp,
                  transform: `translate3d(0, ${notifY.toFixed(1)}px, 0)`,
                }}
              >
                <div
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: '50%',
                    background: '#EDE4FF',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '3px solid #9069CD',
                  }}
                >
                  <Img
                    src={staticFile('art/npc-ada-head.svg')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#2B2B2B' }}>Ada · Atom Scanner</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#8A8A8A' }}>just now</span>
                  </div>
                  <div style={{ fontSize: 23, fontWeight: 700, color: '#4B4B4B', lineHeight: 1.25 }}>
                    Scan a banana — it has a tiny trace of Potassium-40!
                  </div>
                </div>
                <Img
                  src={staticFile('art/obj-banana.svg')}
                  style={{ width: 78, height: 78, flexShrink: 0 }}
                />
              </div>
            )}
          </DeviceStage>
        </div>

        {/* Shrodi Geiger peek at bottom-right */}
        {frame >= geigerAt && (
          <div
            style={{
              position: 'absolute',
              right: 22,
              bottom: 18,
              width: 310,
              height: 310,
              opacity: geigerOp,
              transform: `translate3d(0, ${geigerY.toFixed(1)}px, 0) rotate(-6deg)`,
              zIndex: 20,
            }}
          >
            {/* Geiger click pulse ring */}
            <div
              style={{
                position: 'absolute',
                left: 36,
                top: 72,
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: '6px solid #FABF24',
                opacity: (1 - geigerPulse) * 0.85,
                transform: `scale(${mix(0.4, 1.9, geigerPulse).toFixed(3)})`,
              }}
            />
            <Img
              src={staticFile('images/mascot/radiation.png')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 14px 20px rgba(35, 22, 66, 0.42))',
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

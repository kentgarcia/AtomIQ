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
  { kind: 'gem', x: 160, y: 170, rot: -16, scale: 0.9, opacity: 0.16 },
  { kind: 'star', x: 670, y: 200, rot: 16, scale: 0.8, opacity: 0.16 },
  { kind: 'sparkle', x: 165, y: 880, rot: 0, scale: 0.65, opacity: 0.22 },
  { kind: 'flask', x: 660, y: 880, rot: -14, scale: 0.82, opacity: 0.14 },
];

const SWATCHES = [
  { color: '#FF5252' },
  { color: '#FF9600' },
  { color: '#FFD000', active: true },
  { color: '#89E219' },
  { color: '#58CC02' },
  { color: '#1CB0F6' },
] as const;

const EYE_TILES = ['none', 'round', 'square', 'sunglasses', 'heart', 'star'] as const;

export const Scene06QuestsShop: React.FC = () => {
  const frame = useCurrentFrame(); // local 0..240
  const base = SCENES.shop.from;
  const chestAt = CUES.shopChestOpen - base; // 18
  const shopAt = CUES.shopRise - base; // 54
  const swapAt = CUES.shopSwapGlasses - base; // 114
  const coinAt = CUES.shopCoinLand - base; // 156

  const theme = THEMES.teal;

  // Daily chest pops open at frame 18
  const chestOpen = frame >= chestAt;
  const chestSq = contactSquash(frame - chestAt, 0.18, 5);
  const plus5P = prog(frame, chestAt, chestAt + 22, E.snapOut);

  // Shop rises into focus at frame 54
  const shopIn = prog(frame, shopAt - 12, shopAt + 14, E.snapOut);

  // Eyewear swap: round -> star on frame 114!
  const isStar = frame >= swapAt;
  const starPress = pressSink(frame, swapAt);
  const heroSq = contactSquash(frame - swapAt, 0.14, 5);

  // Diamond counter bumps when coins land
  const bal = frame >= coinAt ? 125 : 120;
  const balSq = contactSquash(frame - coinAt, 0.14, 5);

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
        {/* Left column copy */}
        <div
          style={{
            position: 'absolute',
            left: SAFE.x,
            top: 270,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <TypeLine
            text="Earn diamonds."
            startFrame={4}
            fontSize={88}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
          />
          <TypeLine
            text="Style your look."
            startFrame={18}
            fontSize={88}
            fontWeight={900}
            textShadow={theme.textShadow}
            wordStagger={4}
          />
          <div style={{ marginTop: 10 }}>
            <TypeLine
              text="Daily quests & avatar shop."
              startFrame={32}
              fontSize={42}
              fontWeight={800}
              color={theme.subColor}
              textShadow="0 4px 0 rgba(6, 92, 83, 0.30)"
              letterSpacing={-0.8}
              wordStagger={3}
            />
          </div>
        </div>

        {/* Right column Quests + Authentic Avatar Shop */}
        <div style={{ position: 'absolute', right: SAFE.x, top: 102 }}>
          <DeviceStage enterFrame={2} width={990} height={876} lipColor="rgba(6, 92, 83, 0.36)">
            {/* TOP STRIP: Daily Chest + Quest Row */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '18px 34px 16px',
                borderBottom: `3px solid ${UI.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div
                  style={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${chestSq.sx.toFixed(3)}, ${chestSq.sy.toFixed(3)})`,
                  }}
                >
                  <Img
                    src={staticFile(chestOpen ? 'art/chest-open.png' : 'art/chest-closed.png')}
                    style={{ width: 82, height: 82, objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 27, fontWeight: 900, color: UI.ink }}>Daily Chest</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: UI.inkSoft }}>
                    Finish 1 lesson · 1 / 1 complete
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    background: '#E6F7FF',
                    border: '3px solid #96DCFF',
                    borderRadius: 18,
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 26,
                    fontWeight: 900,
                    color: '#0F8AD8',
                    transform: `translate3d(0, ${mix(14, 0, plus5P).toFixed(1)}px, 0) scale(${mix(
                      0.85,
                      1,
                      plus5P,
                    ).toFixed(3)})`,
                  }}
                >
                  <span>+5</span>
                  <Img src={staticFile('images/diamond.png')} style={{ width: 28, height: 28 }} />
                </div>
                <div
                  style={{
                    background: UI.green,
                    color: '#FFFFFF',
                    borderRadius: 16,
                    padding: '12px 24px',
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: 1,
                    boxShadow: `0 5px 0 ${UI.greenLip}`,
                  }}
                >
                  CLAIMED
                </div>
              </div>
            </div>

            {/* MAIN: Authentic Avatar Shop (Scalloped Red/White Awning + Sky Stage + Eyewear Shelf) */}
            <div
              style={{
                position: 'relative',
                height: 756,
                display: 'flex',
                flexDirection: 'column',
                transform: `translate3d(0, ${mix(32, 0, shopIn).toFixed(1)}px, 0)`,
              }}
            >
              {/* Sky-blue shop stage */}
              <div
                style={{
                  position: 'relative',
                  height: 392,
                  background: UI.skyShop,
                  overflow: 'hidden',
                }}
              >
                {/* Red & White Scalloped Awning */}
                <div style={{ display: 'flex', width: '100%', height: 50, position: 'relative', zIndex: 4 }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 50,
                        background: i % 2 === 0 ? '#FF4B4B' : '#FFFFFF',
                        borderBottomLeftRadius: 28,
                        borderBottomRightRadius: 28,
                        boxShadow: i % 2 === 0 ? '0 7px 0 #D93B3B' : '0 7px 0 #E5E7EB',
                      }}
                    />
                  ))}
                </div>

                {/* Top bar inside shop: back button + diamond balance */}
                <div
                  style={{
                    position: 'absolute',
                    left: 28,
                    right: 28,
                    top: 66,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path d="M15 6l-7 6 7 6z" fill="#3C3C3C" />
                    </svg>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 99,
                      padding: '8px 20px',
                      boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 26,
                      fontWeight: 900,
                      color: '#0F8AD8',
                      transform: `scale(${balSq.sx.toFixed(3)}, ${balSq.sy.toFixed(3)})`,
                    }}
                  >
                    <Img src={staticFile('images/diamond.png')} style={{ width: 28, height: 28 }} />
                    <span>{bal}</span>
                  </div>
                </div>

                {/* Left color swatch column */}
                <div
                  style={{
                    position: 'absolute',
                    left: 34,
                    top: 134,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    zIndex: 5,
                  }}
                >
                  {SWATCHES.map((sw, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 42, height: 34 }}>
                      <svg width="42" height="34" viewBox="0 0 44 38">
                        <path
                          d="M9 17c-2-8 3-14 13-14s15 6 13 14c4 4 4 12-1 16-4 3-20 3-24 0-5-4-5-12-1-16z"
                          fill={sw.color}
                          stroke={'active' in sw && sw.active ? '#E8741E' : 'none'}
                          strokeWidth="3"
                        />
                      </svg>
                      {'active' in sw && sw.active && (
                        <span
                          style={{
                            position: 'absolute',
                            right: -4,
                            top: -2,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#E8741E',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Center Hero Avatar (swaps live from yellow round -> star glasses!) */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: -14,
                    width: 310,
                    height: 310,
                    transform: `translateX(-50%) scale(${heroSq.sx.toFixed(4)}, ${heroSq.sy.toFixed(4)})`,
                    transformOrigin: '50% 85%',
                  }}
                >
                  <Img
                    src={staticFile(isStar ? 'art/shop-hero-star.svg' : 'art/shop-hero-round.svg')}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                {/* Buy 40 button */}
                <div
                  style={{
                    position: 'absolute',
                    right: 34,
                    bottom: 24,
                    background: isStar ? UI.green : '#FFFFFF',
                    border: `3px solid ${isStar ? UI.greenLip : UI.border}`,
                    borderRadius: 20,
                    padding: '12px 24px',
                    boxShadow: `0 6px 0 ${isStar ? UI.greenLip : UI.borderLip}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 24,
                    fontWeight: 900,
                    color: isStar ? '#FFFFFF' : UI.ink,
                  }}
                >
                  <Img src={staticFile('images/diamond.png')} style={{ width: 26, height: 26 }} />
                  <span>{isStar ? 'Equipped!' : 'Buy 40'}</span>
                </div>
              </div>

              {/* White bottom shelf with authentic category bar + 6 eyewear tiles (NO Badges row) */}
              <div
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  marginTop: -18,
                  padding: '18px 32px 20px',
                  position: 'relative',
                  zIndex: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Authentic top category bar (matches in-app Avatar Shop) */}
                <div
                  style={{
                    background: '#F4F6F9',
                    borderRadius: 20,
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {[
                    { id: 'hair', path: 'M6 19v-7a6 6 0 0 1 12 0v7h-3v-6a3 3 0 0 0-6 0v6z' },
                    { id: 'face', path: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z' },
                    { id: 'crown', active: true, path: 'M3.5 17.5L5 8l4.5 3.5L12 6.5l2.5 5L19 8l1.5 9.5z' },
                    { id: 'skin', path: 'M12 4.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
                    { id: 'paint', path: 'M18.5 3.5l2 2-9.5 9.5-2.5.5.5-2.5z' },
                    { id: 'pattern', path: 'M10.5 5.5L16.5 16H4.5z' },
                  ].map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        width: 68,
                        height: 46,
                        borderRadius: 14,
                        background: cat.active ? '#FFF4EC' : 'transparent',
                        border: cat.active ? '3px solid #E8741E' : '3px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24">
                        <path d={cat.path} fill={cat.active ? '#E8741E' : '#707784'} />
                      </svg>
                    </div>
                  ))}
                </div>

                {/* Eyewear 6-tile shelf */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, flex: 1 }}>
                  {EYE_TILES.map((id) => {
                    const isEquipped = id === 'none' && !isStar;
                    const isPicked = (id === 'round' && !isStar) || (id === 'star' && isStar);
                    const isStarTile = id === 'star';
                    const sink = isStarTile ? starPress * 5 : 0;

                    return (
                      <div
                        key={id}
                        style={{
                          position: 'relative',
                          background: isPicked ? '#FFF6EE' : '#F8FAFC',
                          border: `3.5px solid ${
                            isEquipped ? UI.green : isPicked ? '#E8741E' : '#E5E7EB'
                          }`,
                          borderRadius: 22,
                          padding: '14px 8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          boxShadow: `0 ${(5 - sink).toFixed(1)}px 0 ${
                            isEquipped ? UI.greenLip : isPicked ? '#C75E10' : '#D5DAE0'
                          }`,
                          transform: `translateY(${sink.toFixed(1)}px)`,
                        }}
                      >
                        {(isEquipped || (isStarTile && isStar)) && (
                          <span
                            style={{
                              position: 'absolute',
                              right: 8,
                              top: 8,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: UI.green,
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ✓
                          </span>
                        )}
                        <Img
                          src={staticFile(`art/eye-${id}.svg`)}
                          style={{ width: 122, height: 122, objectFit: 'contain' }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 19,
                            fontWeight: 900,
                            color: isEquipped || (isStarTile && isStar) ? '#398A00' : '#3C3C3C',
                          }}
                        >
                          {isEquipped || (isStarTile && isStar) ? (
                            <span>Equipped</span>
                          ) : (
                            <>
                              <Img src={staticFile('images/diamond.png')} style={{ width: 20, height: 20 }} />
                              <span>40</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tap cursor hits the Star Glasses tile (6th tile on the right) */}
            <TapCursor x={875} y={715} tapFrame={swapAt} fromX={620} fromY={780} />
            <Sparkles
              startFrame={chestAt}
              items={[
                { x: 118, y: 42, size: 42, delay: 0, color: '#FABF24' },
                { x: 745, y: 52, size: 36, delay: 4, color: '#1CB0F6' },
              ]}
            />
            <Sparkles
              startFrame={swapAt}
              items={[
                { x: 375, y: 270, size: 54, delay: 0, color: '#FABF24' },
                { x: 615, y: 240, size: 48, delay: 3, color: '#FFFFFF' },
                { x: 590, y: 365, size: 38, delay: 6, color: '#FABF24' },
              ]}
            />
          </DeviceStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};

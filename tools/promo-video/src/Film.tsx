import React, { useEffect } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, getStaticFiles, staticFile } from 'remotion';
import { FONT_CSS, FONT_FAMILY } from './palette';
import { Scene01Hook } from './scenes/Scene01Hook';
import { Scene02Lessons } from './scenes/Scene02Lessons';
import { Scene03AtomMaze } from './scenes/Scene03AtomMaze';
import { Scene04MythBuster } from './scenes/Scene04MythBuster';
import { Scene05SciencePhone } from './scenes/Scene05SciencePhone';
import { Scene06QuestsShop } from './scenes/Scene06QuestsShop';
import { Scene07EndCard } from './scenes/Scene07EndCard';
import { SCENES } from './timeline';

const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const handle = delayRender('Load AtomIQIntern font');
    const url = staticFile('fonts/Intern-Variable.ttf');
    const face = new FontFace('AtomIQIntern', `url(${url}) format('truetype')`, {
      weight: '100 900',
      style: 'normal',
    });
    face
      .load()
      .then((loaded) => {
        (document.fonts as unknown as Set<FontFace>).add(loaded);
        return document.fonts.ready;
      })
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, []);

  return (
    <>
      <style>{FONT_CSS}</style>
      {children}
    </>
  );
};

export const Film: React.FC = () => {
  const hasSoundtrack = getStaticFiles().some((f) => f.name === 'audio/soundtrack.wav');

  return (
    <FontLoader>
      <AbsoluteFill style={{ fontFamily: FONT_FAMILY, backgroundColor: '#FABF24' }}>
        {hasSoundtrack && <Audio src={staticFile('audio/soundtrack.wav')} />}

        <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.to - SCENES.hook.from} name="01 Hook">
          <Scene01Hook />
        </Sequence>

        <Sequence from={SCENES.lessons.from} durationInFrames={SCENES.lessons.to - SCENES.lessons.from} name="02 Visual Lessons">
          <Scene02Lessons />
        </Sequence>

        <Sequence from={SCENES.maze.from} durationInFrames={SCENES.maze.to - SCENES.maze.from} name="03 Atom Maze">
          <Scene03AtomMaze />
        </Sequence>

        <Sequence from={SCENES.myth.from} durationInFrames={SCENES.myth.to - SCENES.myth.from} name="04 MythBuster">
          <Scene04MythBuster />
        </Sequence>

        <Sequence from={SCENES.phone.from} durationInFrames={SCENES.phone.to - SCENES.phone.from} name="05 Science Phone">
          <Scene05SciencePhone />
        </Sequence>

        <Sequence from={SCENES.shop.from} durationInFrames={SCENES.shop.to - SCENES.shop.from} name="06 Quests & Shop">
          <Scene06QuestsShop />
        </Sequence>

        <Sequence from={SCENES.endcard.from} durationInFrames={SCENES.endcard.to - SCENES.endcard.from} name="07 End Card">
          <Scene07EndCard />
        </Sequence>
      </AbsoluteFill>
    </FontLoader>
  );
};

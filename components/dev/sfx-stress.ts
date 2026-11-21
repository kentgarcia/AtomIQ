/**
 * Sound scripts for the performance probe (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4 and §4.2): fire known cues through
 * the real `playSfx` (gates, scheduler and engine included), so a run can be compared on two engines and two phones. The
 * result is read from `sfxDiag`, not from here.
 */
import { playSfx, type SfxCue } from "@/services/sfx";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Ten taps in 600 ms (a child mashing a button), then twenty mixed cues in two seconds (a busy lesson finish). About 3 s. */
export async function runSoundStress(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    void playSfx("ui.press");
    await wait(60);
  }
  await wait(300);
  const mixed: SfxCue[] = [
    "reward.pop", "reward.coin", "lesson.star", "lesson.answer-correct", "ui.tick", "reward.coin", "lesson.bubble", "reward.pop",
    "lesson.stamp", "reward.coin", "ui.tick", "lesson.star", "reward.pop", "reward.coin", "lesson.whoosh", "lesson.star", "ui.tick",
    "reward.coin", "reward.pop", "lesson.complete",
  ];
  for (const cue of mixed) {
    void playSfx(cue);
    await wait(100);
  }
}

/** One representative cue of each set, 350 ms apart, so a person can listen to a whole pass and the log shows each outcome. About 9 s. */
export async function runSoundSelfTest(): Promise<void> {
  const cues: SfxCue[] = [
    "ui.press", "ui.tab", "ui.select", "lesson.answer-correct", "lesson.answer-wrong", "lesson.bubble", "reward.coin", "lesson.node-zoom",
    "lesson.pick", "lesson.pair-ok", "reward.chest-open", "shop.swatch", "reward.purchase", "phone.app-open", "chat.send", "camera.shutter",
    "map.pin", "game.count-one", "game.platformer-jump", "game.step-grass-left", "game.land-grass", "game.checkpoint", "social.notification",
    "rank.podium", "ui.shop-open", "reward.level-up",
  ];
  for (const cue of cues) {
    void playSfx(cue);
    await wait(350);
  }
}

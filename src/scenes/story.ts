/**
 * 剧情演出：在章节地图（3D 舞台）、黑幕或羊皮纸上播放剧情
 */
import { audio } from '@/audio';
import { chapterById } from '@/data/chapters';
import type { ChapterDef, StoryScene } from '@/data/types';
import { BattleWorld } from '@/render/world';
import { h, sleep } from '@/ui/dom';
import type { App } from './app';
import { WorldStage } from './stage';

function sceneEnabled(app: App, s: StoryScene): boolean {
  if (!s.if) return true;
  if (s.if.startsWith('!')) return !app.state.flags[s.if.slice(1)];
  return !!app.state.flags[s.if];
}

/** 依次播放若干剧情场景 */
export async function playScenes(app: App, scenes: StoryScene[], chapter: ChapterDef): Promise<void> {
  for (const scene of scenes) {
    if (!sceneEnabled(app, scene)) continue;
    await playScene(app, scene, chapter);
  }
}

export async function playScene(app: App, scene: StoryScene, chapter: ChapterDef): Promise<void> {
  const { engine } = app;
  if (scene.music) audio.playMusic(scene.music);
  const bd = scene.backdrop;
  if (bd.type === 'map') {
    const ch = (bd.chapter && chapterById(bd.chapter)) || chapter;
    const map = BattleWorld.mapFromRows(ch.map.rows, ch.map.theme, ch.map.seed ?? ch.index + 1);
    engine.setFade(1);
    const world = new BattleWorld(engine, app.ui, { map, quality: app.settings.quality, hpBars: false });
    world.overlay.setGrid(0);
    const stage = new WorldStage(world, engine);
    for (const a of scene.actors ?? []) stage.spawnActor(a);
    const focus = bd.focus ?? [Math.floor(map.width / 2), Math.floor(map.height / 2)];
    world.focusTile(focus[0], focus[1], true);
    if (bd.zoom) world.rig.goal.distance = 17 / bd.zoom;
    world.rig.snap?.();
    await engine.letterbox(0.085, 10);
    await engine.fadeTo(0, 700);
    try {
      await app.dialogue.play(scene.lines, stage);
    } finally {
      await engine.fadeTo(1, 600);
      await engine.letterbox(0, 10);
      world.dispose();
    }
    return;
  }
  // 黑幕 / 羊皮纸
  const back = h(`div.backdrop.${bd.type}`);
  app.ui.appendChild(back);
  engine.setFade(1);
  back.classList.add('enter');
  await sleep(30);
  back.classList.remove('enter');
  try {
    await app.dialogue.play(scene.lines);
  } finally {
    back.classList.add('leave');
    await sleep(500);
    back.remove();
  }
}

/** 章节标题卡 */
export async function chapterCard(app: App, ch: ChapterDef): Promise<void> {
  app.engine.setFade(1);
  const el = h(
    'div.chapter-card.big',
    null,
    h('div.label', null, ch.label),
    h('div.ttl', null, ch.title),
    h('div.rule'),
    h('div.quote', null, ch.quote),
  );
  app.ui.appendChild(el);
  audio.sfx('phase');
  await sleep(3400);
  el.classList.add('leave');
  await sleep(600);
  el.remove();
}

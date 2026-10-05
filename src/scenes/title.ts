/**
 * 标题画面：日蚀下的黑龙与持剑的少年（实时 3D 场景）+ 标志与菜单
 */
import { audio } from '@/audio';
import { CHAPTERS } from '@/data/chapters';
import { clearSuspend, listSaves, loadGame, loadSuspend, newGame, type Difficulty, type GameState } from '@/game/state';
import type { BattleSnapshot } from '@/game/battle/battle';
import { BattleWorld } from '@/render/world';
import { h, sleep } from '@/ui/dom';
import { menuList, modal } from '@/ui/widgets';
import type { App } from './app';
import { lookSpec } from './stage';
import { keyArt } from '@/art/assets';

const TITLE_MAP = [
  'aaaaMMMaaaaaaaa',
  'aaaa......aaMMa',
  'aaa..r......aaa',
  'aa....aaa.....a',
  'a...a.r.r.a...a',
  '....aa...aa....',
  '...aa.....aa...',
  '..r..........r.',
  '...............',
  '.....a....a....',
  '...............',
  '..a.........r..',
  '...............',
  '......a........',
  '...............',
  '..r.......a....',
  '...............',
  '...............',
];

export type TitleChoice = { kind: 'new'; state: GameState } | { kind: 'load'; state: GameState; resume?: BattleSnapshot };

export async function runTitle(app: App): Promise<TitleChoice> {
  const { engine } = app;
  engine.setFade(1);
  const map = BattleWorld.mapFromRows(TITLE_MAP, 'eclipse', 5);
  const world = new BattleWorld(engine, app.ui, { map, quality: app.settings.quality, hpBars: false });
  world.overlay.setGrid(0);
  world.addUnit('dragon', lookSpec('ash_dragon', 'enemy'), 7, 3, 's', { hp: 1, maxHp: 1, team: 'enemy' });
  world.addUnit('rein', lookSpec('rein', 'player'), 7, 9, 'n', { hp: 1, maxHp: 1, team: 'player' });
  for (const id of ['dragon', 'rein']) {
    const v = world.view(id);
    if (v) {
      v.visible = false;
      v.model.setRing?.(false);
    }
  }
  world.focusTile(7, 6, true);
  world.rig.goal.pitch = 0.34;
  world.rig.goal.distance = 10;
  world.rig.goal.yaw = -0.25;
  world.rig.snap();
  let t = 0;
  const off = engine.onUpdate((dt) => {
    t += dt;
    world.rig.goal.yaw = -0.25 + Math.sin(t * 0.08) * 0.32;
  });
  audio.playMusic('title');

  const root = h('div.title-screen');
  const art = keyArt();
  if (art) root.appendChild(h('div.title-keyart', { style: `background-image:url(${art})` }));
  const logo = h(
    'div.title-logo',
    null,
    h('div.logo-cn', null, '烬龙誓约'),
    h('div.logo-en', null, 'EMBEROATH'),
    h('div.logo-sub', null, '赤 鳞 骑 士 与 三 百 年 的 誓 约'),
  );
  const menuHolder = h('div.title-menu');
  const foot = h('div.title-foot', null, '原创战棋 · 全部角色、美术与音乐由程序实时生成');
  root.append(logo, menuHolder, foot);
  app.ui.appendChild(root);
  await engine.fadeTo(0, 1600);
  root.classList.add('show');

  try {
    for (;;) {
      const saves = listSaves();
      const suspend = loadSuspend();
      const any = saves.some(Boolean) || !!suspend;
      const m = menuList(
        menuHolder,
        [
          { id: 'new', label: '新的旅程' },
          { id: 'continue', label: suspend ? '继续中断的战斗' : '继续旅程', disabled: !any },
          { id: 'load', label: '读取进度', disabled: !saves.some(Boolean) },
          { id: 'settings', label: '设置' },
        ],
        { className: 'title' },
      );
      const pick = await m.result;
      m.el.remove();
      audio.unlock();
      if (pick === 'new') {
        const d = await modal(app.ui, '选择难度', '难度会影响敌人的能力与成长。之后无法更改。', [
          { id: 'easy', label: '简单' },
          { id: 'normal', label: '普通' },
          { id: 'hard', label: '困难' },
          { id: 'back', label: '返回' },
        ]);
        if (d === 'back') continue;
        return { kind: 'new', state: newGame(d as Difficulty) };
      }
      if (pick === 'continue' && suspend) {
        clearSuspend();
        return { kind: 'load', state: suspend.state, resume: suspend.battle };
      }
      if (pick === 'continue') {
        // 最近的存档
        const latest = saves.filter(Boolean).sort((a, b) => b!.savedAt - a!.savedAt)[0];
        const st = latest ? loadGame(latest.slot) : null;
        if (st) return { kind: 'load', state: st };
      }
      if (pick === 'load') {
        const st = await pickSave(app);
        if (st) return { kind: 'load', state: st };
      }
      if (pick === 'settings') await app.openSettings();
    }
  } finally {
    off();
    root.classList.remove('show');
    await engine.fadeTo(1, 700);
    root.remove();
    world.dispose();
  }
}

function fmtTime(sec: number): string {
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

export function saveLabel(slot: number): string {
  return slot === 0 ? '自动存档' : `存档 ${slot}`;
}

/** 选择一个存档读取 */
export async function pickSave(app: App): Promise<GameState | null> {
  const saves = listSaves();
  const back = h('div.modal-backdrop.interactive');
  const box = h('div.panel.modal.wide', null, h('h2.title-serif', null, '读取进度'));
  back.appendChild(box);
  app.ui.appendChild(back);
  const m = menuList(
    box,
    [
      ...saves.map((s, i) => ({
        id: String(i),
        label: saveLabel(i),
        sub: s ? `${CHAPTERS[s.chapterIndex]?.label ?? ''} ${s.chapterTitle}` : '— 空 —',
        right: s ? `Lv${s.leaderLevel} · ${s.partySize}人 · ${fmtTime(s.playtime)}` : '',
        disabled: !s,
      })),
      { id: 'back', label: '返回' },
    ],
    { cancellable: true, className: 'slots' },
  );
  const r = await m.result;
  back.remove();
  if (r === null || r === 'back') return null;
  return loadGame(Number(r));
}

export { fmtTime, sleep };

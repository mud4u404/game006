/**
 * 游戏主流程：营地 → 章节卡 → 战前剧情 → 出击 → 战斗 → 战后剧情 → 结算 → 下一章
 */
import { audio } from '@/audio';
import { CHAPTERS } from '@/data/chapters';
import { CHARACTERS } from '@/data/characters';
import { ITEMS } from '@/data/items';
import type { ChapterDef } from '@/data/types';
import { Battle } from '@/game/battle/battle';
import { promoteSave } from '@/game/progression';
import { applyBattleResult, dragonScales, fixEquipment, joinParty, leaveParty, member, saveGame, saveSuspend, type BattleReport } from '@/game/state';
import { h, sleep, waitForConfirm } from '@/ui/dom';
import { modal, toast } from '@/ui/widgets';
import type { App } from './app';
import { BattleScene } from './battleScene';
import { runCamp } from './camp';
import { runDeploy } from './deploy';
import { runEnding } from './ending';
import { chapterCard, playScenes } from './story';

/** 自动存档（槽 0） */
export function autosave(app: App) {
  const ch = CHAPTERS[Math.min(app.state.chapterIndex, CHAPTERS.length - 1)];
  saveGame(0, app.state, `${ch.label} ${ch.title}`);
}

export async function runGame(app: App): Promise<void> {
  const s = app.state;
  const t0 = performance.now();
  let last = t0;
  const tick = window.setInterval(() => {
    const now = performance.now();
    s.playtime += (now - last) / 1000;
    last = now;
  }, 1000);
  try {
    while (s.chapterIndex < CHAPTERS.length) {
      const ch = CHAPTERS[s.chapterIndex];
      if (s.stage === 'camp') {
        if ((ch.camp ?? 'full') === 'none') s.stage = 'intro';
        else {
          const r = await runCamp(app, ch);
          if (r === 'title') return;
          s.stage = 'intro';
        }
      }
      if (s.stage === 'intro') {
        await chapterCard(app, ch);
        await playScenes(app, ch.intro, ch);
        for (const j of ch.joins ?? []) joinParty(s, j);
        for (const [id, to] of Object.entries(ch.storyPromotions ?? {})) {
          const m = member(s, id);
          if (m && m.classId !== to) {
            promoteSave(m, to);
            fixEquipment(s, id);
          }
        }
        for (const [id, item] of Object.entries(ch.storyEquip ?? {})) {
          const m = member(s, id);
          if (!m) continue;
          if (m.equipment.weapon && m.equipment.weapon !== item) {
            const old = m.equipment.weapon;
            // 被重铸的专属武器不再保留
            if (!(old === 'crimson_blade' && item === 'oath_sword')) s.convoy.push(old);
          }
          m.equipment.weapon = item;
        }
        s.stage = 'battle';
        autosave(app);
      }
      if (s.stage === 'battle') {
        const r = await runBattle(app, ch);
        if (r === 'title') return;
        s.stage = 'outro';
      }
      if (s.stage === 'outro') {
        if (ch.index === CHAPTERS.length - 1 && dragonScales(s) >= 6) s.flags.true_ending = true;
        await playScenes(app, ch.outro, ch);
        for (const l of ch.leaves ?? []) leaveParty(s, l);
        s.chapterIndex += 1;
        const next = CHAPTERS[s.chapterIndex];
        s.stage = next && (next.camp ?? 'full') !== 'none' ? 'camp' : 'intro';
        if (next) autosave(app);
      }
    }
    s.stage = 'ending';
    await runEnding(app);
  } finally {
    clearInterval(tick);
  }
}

async function runBattle(app: App, ch: ChapterDef): Promise<'ok' | 'title'> {
  const s = app.state;
  for (;;) {
    // 恢复中断的战斗
    const snap = app.resumeBattle && app.resumeBattle.chapterId === ch.id ? app.resumeBattle : null;
    app.resumeBattle = null;
    if (snap) {
      const battle = Battle.restore(ch, snap);
      const r = await fight(app, ch, battle, true);
      if (r === 'retry') continue;
      return r;
    }
    const deployed = await runDeploy(app, ch);
    if (deployed === null) {
      // 返回营地
      const r = await runCamp(app, ch);
      if (r === 'title') return 'title';
      continue;
    }
    const seed = (Date.now() & 0xffffff) ^ (ch.index * 7919);
    const battle = new Battle(ch, deployed, s.party, s.flags, seed);
    // 难度：敌人能力修正
    if (s.difficulty !== 'normal') {
      const k = s.difficulty === 'hard' ? 1 : -1;
      for (const u of battle.units) {
        if (u.team !== 'enemy') continue;
        u.base.atk = Math.max(0, u.base.atk + k * 2);
        u.base.def = Math.max(0, u.base.def + k);
        u.base.hp = Math.max(1, u.base.hp + k * 3);
        u.hp = u.base.hp;
      }
    }
    const r = await fight(app, ch, battle, false);
    if (r === 'retry') continue;
    return r;
  }
}

async function fight(app: App, ch: ChapterDef, battle: Battle, resumed: boolean): Promise<'ok' | 'title' | 'retry'> {
  const s = app.state;
  {
    const scene = new BattleScene(app, ch, battle, resumed);
    let res;
    try {
      res = await scene.run();
    } finally {
      scene.dispose();
    }
    if (res.outcome === 'suspend') {
      saveSuspend(s, res.battle.snapshot());
      toast(app.ui, '已中断。可以从「继续旅程」接着进行。');
      return 'title';
    }
    if (res.outcome === 'win') {
      const report = applyBattleResult(s, res.battle, res.bonds);
      s.gold += ch.reward.gold;
      s.convoy.push(...(ch.reward.items ?? []));
      // 本章开场就在我方的角色不算「新的伙伴」（序章的初始队伍）
      const preset = new Set(ch.units.filter((u) => u.team === 'player' && u.character).map((u) => u.character));
      report.joined = report.joined.filter((id) => !preset.has(id));
      for (const id of ch.recruitAfter ?? []) {
        if (!member(s, id)) {
          joinParty(s, id);
          report.joined.push(id);
        }
      }
      await showResults(app, ch, report);
      return 'ok';
    }
    const pick = await modal(app.ui, '败北', '要重新挑战这场战斗吗？', [
      { id: 'retry', label: '重新挑战' },
      { id: 'title', label: '返回标题' },
    ]);
    return pick === 'title' ? 'title' : 'retry';
  }
}

async function showResults(app: App, ch: ChapterDef, r: BattleReport) {
  audio.playMusic('camp');
  const row = (k: string, v: string | HTMLElement) => h('div.res-row', null, h('span.muted', null, k), typeof v === 'string' ? h('b', null, v) : v);
  const items = [...r.items, ...(ch.reward.items ?? [])];
  const el = h(
    'div.screen.results.interactive',
    null,
    h('div.res-card.panel', null,
      h('div.res-label', null, `${ch.label} 完成`),
      h('div.res-title.title-serif', null, ch.title),
      h('div.res-rule'),
      row('回合数', `${r.turns}`),
      row('击破数', `${r.kills}`),
      row('获得金币', `${r.gold + ch.reward.gold} G`),
      items.length ? row('获得道具', items.map((i) => ITEMS[i]?.name ?? i).join('、')) : null,
      r.joined.length ? row('新的伙伴', r.joined.map((i) => CHARACTERS[i]?.name ?? i).join('、')) : null,
      r.fallen.length ? row('阵亡', h('b.neg', null, r.fallen.map((i) => CHARACTERS[i]?.name ?? i).join('、') + '（可在教会复活）')) : null,
      h('div.res-next.muted', null, '点击继续'),
    ),
  );
  app.ui.appendChild(el);
  app.engine.setFade(1);
  audio.sfx('gold');
  await sleep(400);
  await waitForConfirm(el);
  el.remove();
}

/**
 * 全章节自动对战模拟：双方都由 AI 操作，检查不会崩溃、不会卡死
 * （我方 AI 只会无脑冲锋，胜负仅作参考）
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/data/chapters';
import { Battle, type DeployEntry } from '@/game/battle/battle';
import { decide } from '@/game/battle/ai';
import { powerLevel } from '@/game/unit';
import { buildDevState } from '@/scenes/dev';

function simulate(chIndex: number, seed: number) {
  const ch = CHAPTERS[chIndex];
  const s = buildDevState(chIndex);
  const fixed = new Set(ch.units.filter((u) => u.team === 'player' && u.character).map((u) => u.character));
  const pool = s.party.filter((p) => !fixed.has(p.id)).sort((a, b) => powerLevel(b) - powerLevel(a));
  const forced = (ch.deploy.forced ?? []).filter((id) => pool.some((p) => p.id === id));
  const chosen = [...forced, ...pool.map((p) => p.id).filter((id) => !forced.includes(id))].slice(0, Math.min(ch.deploy.max, ch.deploy.slots.length));
  const deployed: DeployEntry[] = chosen.map((id, i) => ({ save: pool.find((p) => p.id === id)!, x: ch.deploy.slots[i][0], y: ch.deploy.slots[i][1] }));
  const b = new Battle(ch, deployed, s.party, {}, seed);
  // 占领 / 脱出：主角直奔目标
  const lord = b.lord();
  if (lord) {
    const v = ch.victory;
    if (v.type === 'seize') lord.ai = { type: 'target', tile: [v.x, v.y] };
    if (v.type === 'escape') lord.ai = { type: 'target', tile: [v.area[0], v.area[1]] };
  }
  const drain = () => {
    let guard = 0;
    while (b.eventQueue.length && guard++ < 500) {
      const a = b.eventQueue.shift()!;
      if (a.do !== 'say' && a.do !== 'camera') b.applyAction(a);
    }
  };
  b.fire({ on: 'start' });
  drain();
  let actions = 0;
  while (!b.outcome && b.turn <= 40) {
    const phase = b.phase;
    b.startPhase(phase);
    drain();
    for (const u of [...b.active(phase)]) {
      if (b.outcome) break;
      if (!u.alive || u.done || u.gone) continue;
      const d = decide(b, u);
      if (d.moveTo[0] !== u.x || d.moveTo[1] !== u.y) {
        b.move(u, d.moveTo[0], d.moveTo[1]);
        drain();
        if (b.outcome || !u.alive) continue;
      }
      const a = d.action;
      if (a.type === 'attack') b.attack(u, a.target, a.skill);
      else if (a.type === 'cast') b.cast(u, a.skill, a.tx, a.ty);
      else if (a.type === 'loot') b.lootChest(u);
      else if (a.type === 'destroy') b.destroyVillage(u);
      else if (a.type === 'escape') b.escape(u);
      else b.wait(u);
      drain();
      actions++;
      expect(actions).toBeLessThan(5000);
    }
    if (b.outcome) break;
    b.phase = b.nextPhase();
  }
  return { outcome: b.outcome ?? 'timeout', turn: b.turn, reason: b.loseReason };
}

describe('自动对战模拟', () => {
  for (let i = 0; i < CHAPTERS.length; i++) {
    it(`${CHAPTERS[i].id} ${CHAPTERS[i].title}`, () => {
      const results = [1, 2, 3].map((seed) => simulate(i, seed * 7919 + i));
      // 打印结果供参考
      console.log(CHAPTERS[i].id, results.map((r) => `${r.outcome}@${r.turn}${r.reason ? `(${r.reason})` : ''}`).join(' '));
      for (const r of results) expect(['win', 'lose', 'timeout']).toContain(r.outcome);
    });
  }
});

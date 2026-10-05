/**
 * 出击准备：选择出击成员（必须出击的角色自动入选），按顺序分配出击格
 */
import { audio } from '@/audio';
import { CHARACTERS } from '@/data/characters';
import { getClass } from '@/data/classes';
import type { ChapterDef } from '@/data/types';
import type { DeployEntry } from '@/game/battle/battle';
import { powerLevel, type UnitSave } from '@/game/unit';
import { h } from '@/ui/dom';
import { portraitHtml } from '@/ui/portraits';
import type { App } from './app';

export async function runDeploy(app: App, ch: ChapterDef): Promise<DeployEntry[] | null> {
  const fixed = new Set(ch.units.filter((u) => u.team === 'player' && u.character).map((u) => u.character!));
  const pool = app.state.party.filter((p) => !p.fallen && !fixed.has(p.id));
  const forced = new Set((ch.deploy.forced ?? []).filter((id) => pool.some((p) => p.id === id)));
  const max = Math.min(ch.deploy.max, ch.deploy.slots.length);
  if (max <= 0 || pool.length === 0) return [];

  // 默认：必须出击 + 实力最高的成员
  const chosen: string[] = [...forced];
  for (const p of [...pool].sort((a, b) => powerLevel(b) - powerLevel(a))) {
    if (chosen.length >= max) break;
    if (!chosen.includes(p.id)) chosen.push(p.id);
  }

  return new Promise((resolve) => {
    const root = h('div.screen.deploy.interactive');
    const head = h('div.screen-head', null, h('div.title-serif.big', null, '出击准备'), h('div.muted', null, `${ch.label} ${ch.title} · 胜利条件：${ch.objectiveText}`));
    const count = h('div.deploy-count');
    const grid = h('div.deploy-grid');
    const foot = h('div.screen-foot');
    root.append(head, count, grid, foot);

    const refresh = () => {
      count.innerHTML = `出击人数 <b>${chosen.length}</b> / ${max}`;
      for (const card of grid.children) {
        const id = (card as HTMLElement).dataset.id!;
        card.classList.toggle('on', chosen.includes(id));
      }
    };
    for (const p of pool) {
      const card = unitCard(p);
      card.dataset.id = p.id;
      if (forced.has(p.id)) card.classList.add('forced');
      card.addEventListener('click', () => {
        if (forced.has(p.id)) {
          audio.sfx('error');
          return;
        }
        const i = chosen.indexOf(p.id);
        if (i >= 0) chosen.splice(i, 1);
        else if (chosen.length < max) chosen.push(p.id);
        else {
          audio.sfx('error');
          return;
        }
        audio.sfx('select');
        refresh();
      });
      grid.appendChild(card);
    }
    const go = () => {
      if (chosen.length === 0) {
        audio.sfx('error');
        return;
      }
      cleanup();
      const out: DeployEntry[] = chosen.map((id, i) => ({ save: pool.find((p) => p.id === id)!, x: ch.deploy.slots[i][0], y: ch.deploy.slots[i][1] }));
      resolve(out);
    };
    const back = () => {
      cleanup();
      resolve(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') go();
      if (e.key === 'Escape') back();
    };
    const cleanup = () => {
      window.removeEventListener('keydown', onKey);
      root.remove();
    };
    foot.append(h('button.btn', { on: { click: back } }, '返回营地'), h('button.btn.primary', { on: { click: go } }, '出 击'));
    window.addEventListener('keydown', onKey);
    app.ui.appendChild(root);
    refresh();
  });
}

export function unitCard(p: UnitSave): HTMLElement {
  const c = CHARACTERS[p.id];
  const cls = getClass(p.classId);
  return h(
    'div.unit-card',
    null,
    h('div.uc-portrait', { html: portraitHtml(p.id, c?.name ?? p.id) }),
    h('div.uc-info', null, h('div.uc-name', null, c?.name ?? p.id), h('div.uc-class', null, cls.name), h('div.uc-lv', null, `Lv ${p.level}`)),
  );
}

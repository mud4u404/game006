/**
 * 战斗界面（HUD）
 */
import { getClass } from '@/data/classes';
import { ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import { TERRAIN } from '@/data/terrain';
import { STAT_NAMES, type GrowthKey, type StatKey } from '@/data/types';
import type { TerrainId } from '@/render/contracts';
import type { Forecast } from '@/game/battle/combat';
import type { LevelUpResult } from '@/game/progression';
import { derived, maxHp, maxMp, stats, type Unit } from '@/game/unit';
import { bar, clear, h, setBar, sleep } from './dom';
import { portraitHtml } from './portraits';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  sub?: string;
  key?: string;
  disabled?: boolean;
}

const STATUS_NAMES: Record<string, string> = {
  poison: '中毒',
  sleep: '沉睡',
  silence: '沉默',
  slow: '迟缓',
  atk_up: '力量↑',
  def_up: '防御↑',
  agi_up: '敏捷↑',
  regen: '再生',
};

export class BattleHud {
  readonly root: HTMLElement;
  private objective: HTMLElement;
  private terrain: HTMLElement;
  private unitPanel: HTMLElement;
  private forecastEl: HTMLElement;
  private toasts: HTMLElement;
  private hints: HTMLElement;
  readonly buttons: HTMLElement;
  private menuEl: HTMLElement | null = null;
  private menuResolve: ((v: string | null) => void) | null = null;
  private menuIndex = 0;
  private menuItems: MenuItem[] = [];

  constructor(parent: HTMLElement) {
    this.root = h('div.battle-hud');
    this.objective = h('div.panel.hud-objective');
    this.terrain = h('div.panel.hud-terrain');
    this.unitPanel = h('div.panel.hud-unit.hidden');
    this.forecastEl = h('div.panel.forecast.hidden');
    this.toasts = h('div.toast-stack');
    this.hints = h('div.hud-hints');
    this.buttons = h('div.hud-buttons');
    this.root.append(this.objective, this.terrain, this.unitPanel, this.forecastEl, this.toasts, this.hints, this.buttons);
    parent.appendChild(this.root);
    this.setHints('idle');
  }

  dispose() {
    this.root.remove();
  }

  /* -------------------- 目标与回合 -------------------- */

  setObjective(label: string, title: string, goal: string, turn: number, limit?: number) {
    clear(this.objective);
    this.objective.append(
      h('div.chapter', null, `${label} · ${title}`),
      h('div.goal', null, h('span.gold', null, '胜利条件　'), goal),
      h('div.turn', null, h('span', null, `第 ${turn} 回合`), limit && limit < 255 ? h('span', null, `限 ${limit} 回合`) : null),
    );
  }

  /* -------------------- 地形 -------------------- */

  showTerrain(t: TerrainId | null) {
    clear(this.terrain);
    if (!t) {
      this.terrain.classList.add('hidden');
      return;
    }
    this.terrain.classList.remove('hidden');
    const d = TERRAIN[t];
    const fmt = (v: number) => h(`b.${v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'}`, null, `${v > 0 ? '+' : ''}${v}%`);
    this.terrain.append(h('div.name', null, d.name), h('div.mods', null, h('span', null, '攻 ', fmt(d.atk)), h('span', null, '防 ', fmt(d.def))));
    if (d.heal) this.terrain.append(h('div.muted', { style: 'font-size:1.3rem;margin-top:0.3rem' }, `每回合回复 ${d.heal}%`));
  }

  /* -------------------- 单位 -------------------- */

  showUnit(u: Unit | null) {
    clear(this.unitPanel);
    if (!u) {
      this.unitPanel.classList.add('hidden');
      return;
    }
    this.unitPanel.classList.remove('hidden');
    const s = stats(u);
    const d = derived(u);
    const cls = getClass(u.classId);
    const frame = h(`div.portrait-frame${u.team === 'enemy' ? '.enemy' : ''}`, { html: portraitHtml(u.portrait ?? u.charId ?? '', u.name, 'normal') });
    const hpBar = bar(u.hp / maxHp(u), u.team === 'player' ? 'player' : '');
    const mpBar = bar(maxMp(u) ? u.mp / maxMp(u) : 0, 'mp');
    const w = u.equipment.weapon ? ITEMS[u.equipment.weapon] : undefined;
    const info = h(
      'div.info',
      null,
      h('div.nameline', null, h('span.uname', null, u.name), h('span.uclass', null, cls.name), h('span.lv', null, `Lv ${u.level}`)),
      h('div.statrow', null, h('span.muted', null, '生命'), hpBar, h('span.num', null, `${u.hp} / ${maxHp(u)}`)),
      maxMp(u) > 0 ? h('div.statrow', null, h('span.muted', null, '魔力'), mpBar, h('span.num', null, `${u.mp} / ${maxMp(u)}`)) : null,
      h(
        'div.statgrid',
        null,
        h('div', null, h('span', null, '攻击力'), h('b.num', null, String(d.ap))),
        h('div', null, h('span', null, '防御力'), h('b.num', null, String(d.dp))),
        h('div', null, h('span', null, '命中'), h('b.num', null, String(d.hit))),
        h('div', null, h('span', null, '回避'), h('b.num', null, String(d.ev))),
        h('div', null, h('span', null, '移动'), h('b.num', null, String(s.mov))),
      ),
      h(
        'div.status-icons',
        null,
        w ? h('span', null, `⚔ ${w.name}`) : null,
        ...u.status.map((st) => h('span', null, `${STATUS_NAMES[st.id] ?? st.id} ${st.turns}`)),
        u.boss ? h('span.gold', null, '首领') : null,
      ),
    );
    this.unitPanel.append(frame, info);
  }

  /* -------------------- 战斗预测 -------------------- */

  showForecast(f: Forecast | null) {
    clear(this.forecastEl);
    if (!f) {
      this.forecastEl.classList.add('hidden');
      return;
    }
    this.forecastEl.classList.remove('hidden');
    const side = (u: Unit, c: Forecast['atk'] | null, right: boolean, isCounter: boolean) => {
      const dmgTxt = c ? (c.dmg <= 0 ? '无效' : c.dmgMin === c.dmgMax ? `${c.dmg}` : `${c.dmgMin}~${c.dmgMax}`) : '—';
      const tags: HTMLElement[] = [];
      if (c?.effective) tags.push(h('span.tag', null, '特效'));
      if (c?.bond) tags.push(h('span.tag', null, '羁绊'));
      if (c && c.hits > 1) tags.push(h('span.tag', null, `×${c.hits}`));
      if (!c && isCounter) tags.push(h('span.tag.warn', null, '无法反击'));
      if (c && c.dmg <= 0) tags.push(h('span.tag.warn', null, '打不动'));
      const hb = bar(u.hp / maxHp(u), u.team === 'player' ? 'player' : '');
      return h(
        `div.side${right ? '.right' : ''}`,
        null,
        h('div.fname', null, u.name),
        h('div', { style: 'display:flex;gap:0.8rem;align-items:center' + (right ? ';flex-direction:row-reverse' : '') }, h('span.num', { style: 'min-width:6rem' }, `${u.hp}/${maxHp(u)}`), h('div', { style: 'flex:1' }, hb)),
        h('div.figs', null, h('span', null, '伤害'), h('b', null, dmgTxt), h('span', null, '命中'), h('b', null, c ? `${c.hit}%` : '—'), h('span', null, '会心'), h('b', null, c ? `${c.crit}%` : '—')),
        h('div', null, ...tags),
      );
    };
    const mid = h('div.mid', null, h('div.vs', null, '⚔'), f.skill ? h('div.gold', null, f.skill.name) : null);
    this.forecastEl.append(side(f.attacker, f.atk, false, false), mid, side(f.defender, f.counter, true, true));
  }

  /* -------------------- 菜单 -------------------- */

  /** 弹出指令菜单（键盘 ↑↓/Enter/Esc，或鼠标），返回选中的 id，取消返回 null */
  menu(items: MenuItem[], at: { x: number; y: number }, title?: string): Promise<string | null> {
    this.closeMenu(null);
    const el = h('div.panel.menu.interactive');
    if (title) el.append(h('div.title-serif.gold', { style: 'padding:0.4rem 1.2rem;font-size:1.5rem' }, title));
    this.menuItems = items;
    this.menuIndex = items.findIndex((i) => !i.disabled);
    items.forEach((it, i) => {
      const row = h(
        `div.item${it.disabled ? '.disabled' : ''}`,
        {
          on: {
            click: (e) => {
              e.stopPropagation();
              this.closeMenu(it.id);
            },
            mouseenter: () => this.focusMenu(i),
          },
        },
        h('span.icon', null, it.icon ?? '◆'),
        h('span', null, it.label, it.sub ? h('div.sub', null, it.sub) : null),
        it.key ? h('span.key', null, it.key) : null,
      );
      el.appendChild(row);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.closeMenu(null);
    });
    this.root.appendChild(el);
    // 放在点击处旁边，避免超出屏幕
    const rect = el.getBoundingClientRect();
    const W = window.innerWidth;
    const H = window.innerHeight;
    let x = at.x + 40;
    let y = at.y - rect.height / 2;
    if (x + rect.width > W - 20) x = at.x - rect.width - 40;
    y = Math.max(20, Math.min(H - rect.height - 20, y));
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.menuEl = el;
    this.focusMenu(this.menuIndex);
    return new Promise((res) => (this.menuResolve = res));
  }

  private focusMenu(i: number) {
    if (!this.menuEl) return;
    this.menuIndex = i;
    this.menuEl.querySelectorAll('.item').forEach((n, k) => n.classList.toggle('focus', k === i));
  }

  /** 键盘控制菜单；返回 true 表示已处理 */
  menuKey(key: string): boolean {
    if (!this.menuEl) return false;
    const n = this.menuItems.length;
    if (key === 'ArrowDown' || key === 's') {
      let i = this.menuIndex;
      for (let k = 0; k < n; k++) {
        i = (i + 1) % n;
        if (!this.menuItems[i].disabled) break;
      }
      this.focusMenu(i);
      return true;
    }
    if (key === 'ArrowUp' || key === 'w') {
      let i = this.menuIndex;
      for (let k = 0; k < n; k++) {
        i = (i - 1 + n) % n;
        if (!this.menuItems[i].disabled) break;
      }
      this.focusMenu(i);
      return true;
    }
    if (key === 'Enter' || key === ' ' || key === 'z') {
      const it = this.menuItems[this.menuIndex];
      if (it && !it.disabled) this.closeMenu(it.id);
      return true;
    }
    if (key === 'Escape' || key === 'x') {
      this.closeMenu(null);
      return true;
    }
    return false;
  }

  get menuOpen() {
    return !!this.menuEl;
  }

  closeMenu(v: string | null) {
    this.menuEl?.remove();
    this.menuEl = null;
    const r = this.menuResolve;
    this.menuResolve = null;
    r?.(v);
  }

  /* -------------------- 提示与横幅 -------------------- */

  setHints(mode: 'idle' | 'selected' | 'target' | 'enemy' | 'none') {
    const k = (s: string) => h('kbd', null, s);
    clear(this.hints);
    const lines: (string | HTMLElement)[][] = {
      idle: [[k('左键'), ' 选择单位'], [k('右键'), ' 查看敌方范围'], [k('Q'), k('E'), ' 旋转镜头　', k('滚轮'), ' 缩放'], [k('R'), ' 全体危险范围　', k('Tab'), ' 下一个单位']],
      selected: [[k('左键'), ' 选择移动位置'], [k('右键'), ' / ', k('Esc'), ' 取消']],
      target: [[k('左键'), ' 确认目标'], [k('右键'), ' / ', k('Esc'), ' 返回']],
      enemy: [['敌方行动中……　', k('空格'), ' 加速']],
      none: [],
    }[mode];
    for (const l of lines) this.hints.append(h('div', null, ...l));
  }

  async banner(kind: 'player' | 'enemy' | 'ally', turn: number) {
    const text = { player: '我方回合', enemy: '敌方回合', ally: '友军回合' }[kind];
    const el = h(`div.phase-banner.${kind}`, null, h('span.t', null, text), h('span.s', null, `TURN ${turn}`));
    this.root.appendChild(el);
    await sleep(1300);
    el.remove();
  }

  toast(text: string | HTMLElement) {
    const el = h('div.panel.plain.toast', null, text);
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2900);
  }

  /** 经验条动画 */
  async expGain(u: Unit, before: number, gain: number, leveled: boolean) {
    const el = h('div.panel.exp-gain');
    const b = bar(before / 100, 'exp');
    el.append(h('div.lbl', null, h('span', null, `${u.name}　EXP`), h('span.gold.num', null, `+${gain}`)), b);
    this.root.appendChild(el);
    await sleep(120);
    setBar(b, leveled ? 1 : Math.min(1, (before + gain) / 100));
    await sleep(leveled ? 700 : 900);
    el.remove();
  }

  /** 升级面板，点击或按键关闭 */
  async levelUp(u: Unit, r: LevelUpResult, prevStats: Record<StatKey, number>) {
    const el = h('div.panel.levelup');
    if (u.charId || u.portrait) el.appendChild(h('div.lv-portrait', { html: portraitHtml(u.portrait ?? u.charId ?? '', u.name, 'smile') }));
    el.append(h('h3', null, `LEVEL UP!　Lv ${r.level}`), h('div.muted', { style: 'margin-bottom:0.8rem' }, `${u.name} · ${getClass(u.classId).name}`));
    const keys: GrowthKey[] = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'agi'];
    this.root.appendChild(el);
    for (const k of keys) {
      const g = r.gains[k] ?? 0;
      const row = h('div.row', null, h('span.muted', null, STAT_NAMES[k]), h('span.num', null, String(prevStats[k] + g), g ? h('span.up', null, `　+${g}`) : null));
      el.appendChild(row);
      if (g) await sleep(110);
    }
    for (const s of r.learned) el.appendChild(h('div.row', null, h('span.gold', null, '习得'), h('span', null, SKILLS[s]?.name ?? s)));
    el.appendChild(h('div.muted', { style: 'margin-top:1rem;font-size:1.3rem;text-align:right' }, '点击继续'));
    await new Promise<void>((res) => {
      const done = () => {
        window.removeEventListener('keydown', onKey);
        el.removeEventListener('click', done);
        res();
      };
      const onKey = (e: KeyboardEvent) => {
        if (['Enter', ' ', 'z', 'Escape'].includes(e.key)) done();
      };
      el.addEventListener('click', done);
      window.addEventListener('keydown', onKey);
      setTimeout(done, 6000);
    });
    el.remove();
  }

  /** 确认框 */
  confirm(text: string): Promise<boolean> {
    return new Promise((res) => {
      const back = h('div.modal-backdrop');
      const box = h('div.panel.modal', { style: 'min-width:40rem;text-align:center' }, h('div', { style: 'font-size:2rem;margin:1rem 0 2rem' }, text));
      const yes = h('button.btn', { on: { click: () => done(true) } }, '确定');
      const no = h('button.btn', { on: { click: () => done(false) } }, '取消');
      box.append(h('div', { style: 'display:flex;gap:2rem;justify-content:center' }, yes, no));
      back.appendChild(box);
      this.root.appendChild(back);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter') done(true);
        if (e.key === 'Escape') done(false);
      };
      window.addEventListener('keydown', onKey);
      function done(v: boolean) {
        window.removeEventListener('keydown', onKey);
        back.remove();
        res(v);
      }
    });
  }
}

export function itemLabel(id: string): string {
  return ITEMS[id]?.name ?? id;
}

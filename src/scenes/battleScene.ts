/**
 * 战斗场景：把战斗逻辑（Battle）与 3D 世界、HUD、输入串起来
 */
import * as THREE from 'three';
import { audio } from '@/audio';
import type { SfxId } from '@/audio/contracts';
import { CHARACTERS } from '@/data/characters';
import { getClass } from '@/data/classes';
import { ITEMS } from '@/data/items';
import type { BattleAction, ChapterDef, SkillDef } from '@/data/types';
import type { UnitAnim, VfxId } from '@/render/contracts';
import { Hl } from '@/render/overlay';
import { BattleWorld } from '@/render/world';
import { Battle, type ActionOutcome } from '@/game/battle/battle';
import { decide } from '@/game/battle/ai';
import { forecast } from '@/game/battle/combat';
import { isFriend, stopTiles, threatTiles, tilesInArea, tilesInRange } from '@/game/battle/grid';
import { bondKey } from '@/game/state';
import { maxHp, stats, weaponOf, type Unit } from '@/game/unit';
import { BattleHud, type MenuItem } from '@/ui/battleHud';
import { h, sleep } from '@/ui/dom';
import type { App } from './app';
import { WorldStage } from './stage';

export interface BattleResult {
  outcome: 'win' | 'lose';
  battle: Battle;
  bonds: Record<string, number>;
}

type Tile = [number, number];

interface Mode {
  hover?(t: Tile | null): void;
  click?(t: Tile | null, button: number): void;
  key?(e: KeyboardEvent): boolean;
}

const WEAPON_VFX: Record<string, VfxId> = {
  sword: 'slash',
  axe: 'heavy_slash',
  lance: 'pierce',
  dagger: 'slash',
  bow: 'arrow',
  staff: 'impact',
  fang: 'claw',
};
const ELEMENT_VFX: Record<string, VfxId> = { fire: 'fire', ice: 'ice', thunder: 'thunder', holy: 'holy', dark: 'dark' };
const WEAPON_SFX: Record<string, SfxId> = { sword: 'slash', axe: 'heavy', lance: 'pierce', dagger: 'slash', bow: 'bow', staff: 'hit', fang: 'hit' };

export class BattleScene {
  private app: App;
  private chapter: ChapterDef;
  battle: Battle;
  private world!: BattleWorld;
  private hud!: BattleHud;
  private stage!: WorldStage;
  private mode: Mode | null = null;
  private cursor: Tile = [0, 0];
  private dangerOn = false;
  private shownRanges = new Set<string>();
  private bonds: Record<string, number> = {};
  private fast = false;
  private listeners: [EventTarget, string, EventListener][] = [];
  private dragging: { x: number; y: number } | null = null;

  constructor(app: App, chapter: ChapterDef, battle: Battle) {
    this.app = app;
    this.chapter = chapter;
    this.battle = battle;
  }

  /* ================================================================ */
  /* 主流程                                                            */
  /* ================================================================ */

  async run(): Promise<BattleResult> {
    const b = this.battle;
    const map = BattleWorld.mapFromRows(
      this.chapter.map.rows,
      this.chapter.map.theme,
      this.chapter.map.seed ?? this.chapter.index + 1,
      b.chests.map((c) => ({ x: c.x, y: c.y, opened: c.opened })),
    );
    this.app.engine.setFade(1);
    this.world = new BattleWorld(this.app.engine, this.app.ui, { map, quality: this.app.settings.quality, hpBars: this.app.settings.hpBars });
    this.world.overlay.setGrid(this.app.settings.grid ? 0.16 : 0);
    this.stage = new WorldStage(this.world, this.app.engine);
    this.hud = new BattleHud(this.app.ui);
    this.buildButtons();
    for (const u of b.active()) this.addView(u);
    const lord = b.lord() ?? b.active('player')[0];
    if (lord) {
      this.cursor = [lord.x, lord.y];
      this.world.focusTile(lord.x, lord.y, true);
    }
    this.bindInput();
    await this.app.engine.fadeTo(0, 700);
    this.updateObjective();

    b.fire({ on: 'start' });
    await this.processEvents();

    try {
      while (!b.outcome) {
        const phase = b.phase;
        await this.phaseStart(phase);
        if (b.outcome) break;
        if (phase === 'player') await this.playerPhase();
        else await this.aiPhase(phase);
        if (b.outcome) break;
        const next = b.nextPhase();
        b.phase = next;
      }
      await this.finish();
    } finally {
      this.unbindInput();
    }
    return { outcome: b.outcome ?? 'lose', battle: b, bonds: this.bonds };
  }

  private async finish() {
    const b = this.battle;
    this.clearOverlay();
    this.hud.setHints('none');
    if (b.outcome === 'win') {
      audio.playMusic('victory', 0.4);
      for (const u of b.active('player')) this.world.play(u.uid, 'victory');
      const el = h('div.chapter-card', { style: 'background:radial-gradient(ellipse at center, rgba(60,30,10,0.35), rgba(0,0,0,0.6))' }, h('div.label', null, 'VICTORY'), h('div.ttl', null, '战斗胜利'));
      this.app.ui.appendChild(el);
      await sleep(2600);
      el.remove();
    } else {
      audio.playMusic('defeat', 0.4);
      await this.app.engine.desaturate(1, 1200);
      const el = h('div.chapter-card', null, h('div.label', null, 'DEFEAT'), h('div.ttl', null, '败北'), h('div.quote', null, b.loseReason));
      this.app.ui.appendChild(el);
      await sleep(3000);
      el.remove();
      this.app.engine.desaturate(0, 10);
    }
    await this.app.engine.fadeTo(1, 600);
  }

  dispose() {
    this.hud?.dispose();
    this.world?.dispose();
  }

  /* ================================================================ */
  /* 视图                                                              */
  /* ================================================================ */

  private addView(u: Unit) {
    const v = this.world.addUnit(u.uid, { ...u.model, team: u.team }, u.x, u.y, u.facing, { hp: u.hp, maxHp: maxHp(u), team: u.team, boss: u.boss });
    v.model.setActed(u.done && u.team === this.battle.phase);
  }

  private refreshView(u: Unit) {
    const v = this.world.view(u.uid);
    if (!v) return;
    v.setHp(u.hp, maxHp(u));
    v.model.setActed(u.alive && u.done && u.team === this.battle.phase);
    if (v.x !== u.x || v.y !== u.y) this.world.place(u.uid, u.x, u.y);
  }

  private refreshAll() {
    for (const u of this.battle.units) if (u.alive && !u.gone) this.refreshView(u);
  }

  private updateObjective() {
    this.hud.setObjective(this.chapter.label, this.chapter.title, this.battle.objectiveText, this.battle.turn, this.chapter.turnLimit);
  }

  /* ================================================================ */
  /* 阶段                                                              */
  /* ================================================================ */

  private async phaseStart(phase: 'player' | 'enemy' | 'ally') {
    const b = this.battle;
    this.updateObjective();
    audio.playMusic(phase === 'player' ? this.chapter.music.player : this.chapter.music.enemy, 1.2);
    audio.sfx('phase');
    this.hud.setHints('none');
    await this.hud.banner(phase, b.turn);
    const fx = b.startPhase(phase);
    for (const u of b.units) this.world.view(u.uid)?.model.setActed(false);
    if (fx.length) {
      for (const f of fx) {
        const at = this.world.anchor(f.uid).add(new THREE.Vector3(0, 0.3, 0));
        if (f.kind === 'poison' || f.kind === 'burn') this.world.popup(at, `-${f.amount}`, '');
        else if (f.kind === 'mp') this.world.popup(at, `MP +${f.amount}`, 'heal');
        else if (f.kind !== 'status_end' && f.kind !== 'wake') this.world.popup(at, `+${f.amount}`, 'heal');
      }
      this.refreshAll();
      await sleep(700);
    }
    await this.processEvents();
    this.updateDanger();
  }

  private async playerPhase() {
    const b = this.battle;
    while (!b.outcome) {
      const ready = b.active('player').filter((u) => !u.done);
      if (!ready.length && this.app.settings.autoEnd) break;
      const pick = await this.idle();
      if (pick === 'end') {
        if (ready.length && !(await this.hud.confirm(`还有 ${ready.length} 名单位未行动，确定结束回合吗？`))) continue;
        break;
      }
      await this.command(pick);
    }
    // 羁绊：回合结束时相邻的同伴
    const ps = b.active('player').filter((u) => u.charId);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (Math.abs(ps[i].x - ps[j].x) + Math.abs(ps[i].y - ps[j].y) === 1) {
          const k = bondKey(ps[i].charId!, ps[j].charId!);
          this.bonds[k] = (this.bonds[k] ?? 0) + 1;
        }
      }
    }
    this.clearOverlay();
  }

  private async aiPhase(phase: 'enemy' | 'ally') {
    const b = this.battle;
    this.hud.setHints('enemy');
    const units = b.active(phase).sort((a, c) => this.distToPlayer(a) - this.distToPlayer(c));
    for (const u of units) {
      if (b.outcome) break;
      if (!u.alive || u.done || u.gone) continue;
      const d = decide(b, u);
      const speed = this.fast ? 3 : this.app.settings.enemySpeed;
      const moved = d.moveTo[0] !== u.x || d.moveTo[1] !== u.y;
      if (moved || d.action.type !== 'wait') {
        this.world.focusTile(u.x, u.y);
        this.hud.showUnit(u);
        await sleep(this.fast ? 60 : 220 / speed);
      }
      if (moved) {
        const path = b.move(u, d.moveTo[0], d.moveTo[1]);
        this.world.follow = u.uid;
        await this.world.moveAlong(u.uid, path, speed);
        this.world.follow = null;
        await this.processEvents();
        if (b.outcome) break;
      }
      const a = d.action;
      switch (a.type) {
        case 'attack': {
          const out = b.attack(u, a.target, a.skill);
          await this.presentOutcome(out);
          break;
        }
        case 'cast': {
          const out = b.cast(u, a.skill, a.tx, a.ty);
          await this.presentOutcome(out);
          break;
        }
        case 'loot': {
          const out = b.lootChest(u);
          this.world.bf.openChest(u.x, u.y);
          await this.world.vfxPlay('chest', this.world.anchor(u.uid), this.world.anchor(u.uid));
          if (out.message) this.hud.toast(out.message);
          break;
        }
        case 'destroy': {
          const out = b.destroyVillage(u);
          for (const c of b.takeTileChanges()) this.world.setTile(c.x, c.y, c.t);
          await this.world.vfxPlay('inferno', this.world.anchor(u.uid), this.world.anchor(u.uid), undefined, 0.6);
          if (out.message) this.hud.toast(out.message);
          break;
        }
        case 'escape': {
          b.escape(u);
          this.hud.toast(`${u.name}逃走了……`);
          await this.world.vfxPlay('warp', this.world.anchor(u.uid), this.world.anchor(u.uid));
          this.world.removeUnit(u.uid);
          break;
        }
        default:
          b.wait(u);
      }
      this.refreshView(u);
      await this.processEvents();
    }
    this.hud.showUnit(null);
    this.fast = false;
  }

  private distToPlayer(u: Unit): number {
    let best = 999;
    for (const p of this.battle.active('player')) best = Math.min(best, Math.abs(p.x - u.x) + Math.abs(p.y - u.y));
    return best;
  }

  /* ================================================================ */
  /* 玩家操作                                                          */
  /* ================================================================ */

  /** 空闲：等待玩家选中一个可行动的单位，或结束回合 */
  private idle(): Promise<Unit | 'end'> {
    this.hud.setHints('idle');
    this.clearOverlay();
    this.world.overlay.moveCursor(...this.cursor);
    this.showHover(this.cursor);
    return new Promise((resolve) => {
      this.endTurnResolver = () => {
        this.mode = null;
        resolve('end');
      };
      this.mode = {
        hover: (t) => this.showHover(t),
        click: (t, button) => {
          if (!t) return;
          const u = this.battle.unitAt(t[0], t[1]);
          if (button === 2) {
            if (u && u.team !== 'player') this.toggleRange(u);
            return;
          }
          if (u && u.team === 'player' && !u.done) {
            audio.sfx('select');
            this.mode = null;
            this.endTurnResolver = null;
            resolve(u);
          } else if (u && u.team !== 'player') {
            this.toggleRange(u);
          }
        },
        key: (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const ready = this.battle.active('player').filter((u) => !u.done);
            if (ready.length) {
              const i = (ready.findIndex((u) => u.x === this.cursor[0] && u.y === this.cursor[1]) + 1) % ready.length;
              this.setCursor([ready[i].x, ready[i].y], true);
            }
            return true;
          }
          return false;
        },
      };
    });
  }

  private endTurnResolver: (() => void) | null = null;

  /** 指挥一个单位：选择移动位置 → 指令菜单 → 执行 */
  private async command(u: Unit): Promise<void> {
    const b = this.battle;
    for (;;) {
      this.hud.showUnit(u);
      const reach = b.reach(u);
      const stops = stopTiles(reach).map((n) => [n.x, n.y] as Tile);
      // 攻击范围：可停留格的武器射程覆盖（排除可移动格）
      const w = weaponOf(u);
      const atk = new Set<string>();
      if (w) for (const [x, y] of stops) for (const [ax, ay] of tilesInRange(b.map, x, y, w.range[0], w.range[1])) atk.add(`${ax},${ay}`);
      for (const [x, y] of stops) atk.delete(`${x},${y}`);
      this.clearOverlay();
      this.world.overlay.set(
        [...atk].map((s) => s.split(',').map(Number) as Tile),
        Hl.Attack,
      );
      this.world.overlay.set(stops, Hl.Move);
      this.world.view(u.uid)?.model.setHighlighted(true);
      this.hud.setHints('selected');
      const dest = await this.pickTile(stops, (t) => {
        if (t && reach.has(b.map.key(t[0], t[1]))) this.world.overlay.setPath(b.path(u, t[0], t[1]));
        else this.world.overlay.setPath([]);
      });
      this.world.view(u.uid)?.model.setHighlighted(false);
      this.world.overlay.setPath([]);
      if (!dest) {
        audio.sfx('cancel');
        this.clearOverlay();
        this.hud.showUnit(null);
        return;
      }
      const path = b.move(u, dest[0], dest[1]);
      this.clearOverlay();
      if (path.length > 1) {
        audio.sfx(getClass(u.classId).moveType === 'horse' ? 'gallop' : getClass(u.classId).moveType === 'fly' ? 'wing' : 'step', { volume: 0.5 });
        await this.world.moveAlong(u.uid, path);
      }
      await this.processEvents();
      if (b.outcome) return;
      const r = await this.actionMenu(u);
      if (r === 'back') {
        b.undoMove(u);
        this.world.place(u.uid, u.x, u.y);
        continue;
      }
      this.refreshView(u);
      return;
    }
  }

  /** 指令菜单。返回 'done'（已行动）或 'back'（取消移动） */
  private async actionMenu(u: Unit): Promise<'done' | 'back'> {
    const b = this.battle;
    for (;;) {
      if (b.outcome) return 'done';
      const targets = b.weaponTargets(u);
      const skills = b.skillsOf(u);
      const usableItems = u.items.filter((i) => ITEMS[i]?.consumable && ITEMS[i]?.consumable?.effect !== 'key');
      const items: MenuItem[] = [];
      if (targets.length) items.push({ id: 'attack', label: '攻击', icon: '⚔', key: 'A' });
      if (skills.length) items.push({ id: 'skill', label: getClass(u.classId).tags.includes('mage') || getClass(u.classId).tags.includes('healer') ? '魔法' : '技能', icon: '✦', key: 'S', disabled: !skills.some((s) => b.canUseSkill(u, s).ok && b.skillTargetTiles(u, s).length) });
      if (usableItems.length) items.push({ id: 'item', label: '道具', icon: '❖', key: 'D' });
      if (b.talkTargets(u).length) items.push({ id: 'talk', label: '交谈', icon: '❝' });
      if (b.villageAt(u.x, u.y)) items.push({ id: 'visit', label: '拜访', icon: '⌂' });
      if (b.canOpenChest(u)) items.push({ id: 'chest', label: '开箱', icon: '▣' });
      if (b.stealTargets(u).length) items.push({ id: 'steal', label: '偷窃', icon: '☍' });
      items.push({ id: 'wait', label: '待机', icon: '■', key: 'W' });
      const scr = this.world.project(this.world.anchor(u.uid));
      this.hud.setHints('none');
      const choice = await this.menuAsync(items, scr);
      if (!choice) return 'back';
      switch (choice) {
        case 'attack': {
          const t = await this.pickUnitTarget(u, targets);
          if (!t) continue;
          const out = b.attack(u, t);
          await this.presentOutcome(out);
          return 'done';
        }
        case 'skill': {
          const done = await this.skillFlow(u);
          if (done) return 'done';
          continue;
        }
        case 'item': {
          const done = await this.itemFlow(u);
          if (done) return 'done';
          continue;
        }
        case 'talk': {
          const ts = b.talkTargets(u);
          const t = ts.length === 1 ? ts[0] : await this.pickUnitTarget(u, ts, true);
          if (!t) continue;
          b.talk(u, t);
          this.world.faceUnit(u.uid, t.uid);
          this.world.faceUnit(t.uid, u.uid);
          await this.processEvents();
          // 加入我方的单位需要更新外观
          continue;
        }
        case 'visit': {
          const out = b.visit(u);
          audio.sfx('door');
          await this.processEvents();
          await this.presentLoot(out);
          return 'done';
        }
        case 'chest': {
          const out = b.openChest(u);
          this.world.bf.openChest(u.x, u.y);
          audio.sfx('chest');
          await this.world.vfxPlay('chest', this.world.anchor(u.uid), this.world.tilePos(u.x, u.y, 0.3));
          await this.presentLoot(out);
          await this.processEvents();
          return 'done';
        }
        case 'steal': {
          const ts = b.stealTargets(u);
          const t = ts.length === 1 ? ts[0] : await this.pickUnitTarget(u, ts, true);
          if (!t) continue;
          const out = b.steal(u, t);
          await this.world.vfxPlay('steal', this.world.anchor(u.uid), this.world.anchor(t.uid));
          await this.presentLoot(out);
          await this.presentExp(out);
          return 'done';
        }
        case 'wait':
        default: {
          b.wait(u);
          const hid = b.lastHidden;
          if (hid) {
            b.lastHidden = null;
            audio.sfx('item');
            await this.world.vfxPlay('chest', this.world.anchor(u.uid), this.world.anchor(u.uid));
            this.hud.toast(h('span', null, '发现了隐藏的宝物！ ', h('span.gold', null, hid.loot.item ? ITEMS[hid.loot.item]?.name ?? '' : `${hid.loot.gold} 金币`)));
          }
          await this.processEvents();
          return 'done';
        }
      }
    }
  }

  private menuAsync(items: MenuItem[], at: { x: number; y: number }, title?: string): Promise<string | null> {
    const saved = this.mode;
    this.mode = { key: (e) => this.hud.menuKey(e.key), click: (_t, button) => button === 2 && this.hud.closeMenu(null) };
    return this.hud.menu(items, at, title).then((r) => {
      this.mode = saved;
      if (r) audio.sfx('select');
      else audio.sfx('cancel');
      return r;
    });
  }

  /** 选择攻击目标（悬停显示战斗预测） */
  private async pickUnitTarget(u: Unit, targets: Unit[], noForecast = false, skill?: SkillDef): Promise<Unit | null> {
    const tiles = targets.map((t) => [t.x, t.y] as Tile);
    this.clearOverlay();
    this.world.overlay.set(tiles, noForecast ? Hl.Talk : Hl.Attack);
    this.hud.setHints('target');
    const first = targets[0];
    if (first) this.setCursor([first.x, first.y]);
    const showFc = (t: Tile | null) => {
      const tu = t ? this.battle.unitAt(t[0], t[1]) : undefined;
      if (tu && targets.includes(tu) && !noForecast) {
        this.hud.showForecast(forecast(this.battle.map, u, tu, skill));
        this.world.faceUnit(u.uid, tu.uid);
      } else this.hud.showForecast(null);
    };
    showFc(first ? [first.x, first.y] : null);
    const t = await this.pickTile(tiles, showFc);
    this.hud.showForecast(null);
    this.clearOverlay();
    if (!t) return null;
    return this.battle.unitAt(t[0], t[1]) ?? null;
  }

  private async skillFlow(u: Unit): Promise<boolean> {
    const b = this.battle;
    const skills = b.skillsOf(u);
    const items: MenuItem[] = skills.map((s) => {
      const ok = b.canUseSkill(u, s);
      const has = ok.ok && b.skillTargetTiles(u, s).length > 0;
      return { id: s.id, label: s.name, icon: s.kind === 'heal' ? '✚' : s.kind === 'tech' ? '⚔' : '✦', sub: `${s.mp ? `MP ${s.mp}　` : ''}${ok.ok ? (has ? s.desc : '范围内没有目标') : ok.reason}`, disabled: !has };
    });
    const scr = this.world.project(this.world.anchor(u.uid));
    const id = await this.menuAsync(items, scr, '选择技能');
    if (!id) return false;
    const s = skills.find((x) => x.id === id)!;
    // 单体武技：走普通攻击流程（有预测、可被反击）
    if (s.kind === 'tech' && s.area === 0) {
      const ts = b.skillTargetTiles(u, s).map(([x, y]) => b.unitAt(x, y)).filter((t): t is Unit => !!t);
      const t = await this.pickUnitTarget(u, ts, false, s);
      if (!t) return false;
      const out = b.attack(u, t, s);
      await this.presentOutcome(out);
      return true;
    }
    // 复苏：先选择同伴
    let reviveUid: string | undefined;
    if (s.revive) {
      const fallen = b.revivable(u);
      const pick = await this.menuAsync(
        fallen.map((f) => ({ id: f.uid, label: f.name, icon: '✚' })),
        scr,
        '复苏谁？',
      );
      if (!pick) return false;
      reviveUid = pick;
    }
    const tiles = b.skillTargetTiles(u, s);
    this.clearOverlay();
    this.world.overlay.set(tiles, s.target === 'enemy' ? Hl.Attack : Hl.Support);
    this.hud.setHints('target');
    if (tiles.length) this.setCursor(tiles[0]);
    const t = await this.pickTile(tiles, (tt) => {
      if (tt && tiles.some(([x, y]) => x === tt[0] && y === tt[1])) {
        this.world.overlay.setArea(tilesInArea(b.map, tt[0], tt[1], s.area));
        const tu = b.unitAt(tt[0], tt[1]);
        if (tu && s.kind === 'magic' && s.area === 0 && !isFriend(tu.team, u.team)) this.hud.showForecast(forecast(b.map, u, tu, s));
        else this.hud.showForecast(null);
      } else {
        this.world.overlay.setArea([]);
        this.hud.showForecast(null);
      }
    });
    this.hud.showForecast(null);
    this.world.overlay.setArea([]);
    this.clearOverlay();
    if (!t) return false;
    const out = b.cast(u, s, t[0], t[1], reviveUid);
    if (out.kind === 'revive') {
      const r = b.unit(out.effects[0]?.uid ?? '');
      if (r) this.addView(r);
    }
    await this.presentOutcome(out);
    return true;
  }

  private async itemFlow(u: Unit): Promise<boolean> {
    const b = this.battle;
    const entries = u.items.map((id, i) => ({ id, i })).filter((e) => ITEMS[e.id]?.consumable && ITEMS[e.id].consumable!.effect !== 'key');
    const scr = this.world.project(this.world.anchor(u.uid));
    const pick = await this.menuAsync(
      entries.map((e) => ({ id: String(e.i), label: ITEMS[e.id].name, icon: '❖', sub: ITEMS[e.id].desc })),
      scr,
      '使用道具',
    );
    if (pick === null) return false;
    const idx = Number(pick);
    const it = ITEMS[u.items[idx]];
    let target: Unit = u;
    if (it.consumable!.range > 0) {
      const cands = [u, ...b.adjacent(u).filter((t) => t.team === u.team)];
      if (cands.length > 1) {
        const t = await this.pickUnitTarget(u, cands, true);
        if (!t) return false;
        target = t;
      }
    }
    const out = b.useItem(u, idx, target);
    await this.presentOutcome(out);
    return true;
  }

  /* ================================================================ */
  /* 演出                                                              */
  /* ================================================================ */

  private async presentOutcome(out: ActionOutcome) {
    const b = this.battle;
    const actor = b.unit(out.actor);
    if (!actor) return;
    const mode = this.app.settings.battleAnim;
    const isSpell = out.kind === 'spell' || out.kind === 'heal' || out.kind === 'buff' || out.kind === 'revive' || out.kind === 'item';
    const firstTarget = out.strikes[0]?.defender ?? out.effects[0]?.uid;
    const cine = mode === 'full' && firstTarget && firstTarget !== actor.uid && out.kind !== 'item';
    if (cine) {
      this.world.rig.cinematic(this.world.anchor(actor.uid), this.world.anchor(firstTarget!));
      this.world.spotlight([actor.uid, ...out.strikes.map((s) => s.defender), ...out.effects.map((e) => e.uid)]);
      void this.app.engine.letterbox(0.085);
      await sleep(380);
    } else if (firstTarget) {
      this.world.focusTile(actor.x, actor.y);
    }
    const speed = mode === 'off' ? 3 : mode === 'short' ? 1.5 : 1;

    if (isSpell) await this.presentSpell(out, actor, speed);
    else {
      for (const s of out.strikes) await this.presentStrike(s, out.skill, speed);
    }
    // 阵亡
    for (const uid of out.deaths) {
      const v = this.world.view(uid);
      if (!v) continue;
      audio.sfx('death');
      void this.world.vfxPlay('death', this.world.anchor(uid), this.world.anchor(uid));
      await this.world.play(uid, 'death');
      this.world.removeUnit(uid);
    }
    if (cine) {
      await sleep(250);
      this.world.rig.restore();
      this.world.spotlight(null);
      void this.app.engine.letterbox(0);
    }
    for (const u of [actor, ...out.strikes.map((s) => b.unit(s.defender)!)]) if (u) this.refreshView(u);
    await this.presentLoot(out);
    await this.presentExp(out);
    // 羁绊：治疗/辅助同伴
    if ((out.kind === 'heal' || out.kind === 'buff') && actor.charId) {
      for (const e of out.effects) {
        const t = b.unit(e.uid);
        if (t?.charId && t !== actor) {
          const k = bondKey(actor.charId, t.charId);
          this.bonds[k] = (this.bonds[k] ?? 0) + 2;
        }
      }
    }
    await this.processEvents();
    this.updateDanger();
  }

  private animFor(u: Unit, skill?: SkillDef): UnitAnim {
    const w = weaponOf(u);
    if (skill && skill.kind !== 'tech') return skill.kind === 'heal' || skill.kind === 'buff' ? 'heal' : 'cast';
    if (w?.type === 'bow') return 'shoot';
    if (w?.magic && w.type !== 'breath') return 'cast';
    return 'attack';
  }

  private vfxFor(u: Unit, skill?: SkillDef): VfxId {
    if (skill?.vfx && skill.kind !== 'tech') return skill.vfx;
    if (skill?.kind === 'tech' && skill.vfx !== 'slash') return skill.vfx;
    const w = weaponOf(u);
    if (!w) return 'impact';
    if (w.type === 'breath') return w.element === 'dark' ? 'ash_breath' : 'fire';
    if (w.magic) return ELEMENT_VFX[w.element ?? 'fire'] ?? 'fire';
    if (w.type === 'axe' || (w.type === 'sword' && u.model.weapon === 'greatsword')) return 'heavy_slash';
    return WEAPON_VFX[w.type] ?? 'slash';
  }

  private async presentStrike(s: ActionOutcome['strikes'][number], skill: SkillDef | undefined, speed: number) {
    const b = this.battle;
    const att = b.unit(s.attacker)!;
    const def = b.unit(s.defender)!;
    this.world.faceUnit(att.uid, def.uid);
    this.world.faceUnit(def.uid, att.uid);
    const anim = this.animFor(att, s.counter ? undefined : skill);
    const vfx = this.vfxFor(att, s.counter ? undefined : skill);
    const w = weaponOf(att);
    let impactResolve!: () => void;
    const impact = new Promise<void>((r) => (impactResolve = r));
    const animDone = this.world.play(att.uid, anim, impactResolve, speed);
    if (anim === 'cast') audio.sfx(skill?.sfx ?? (w?.element === 'thunder' ? 'thunder' : w?.element === 'ice' ? 'ice' : w?.element === 'holy' ? 'holy' : w?.element === 'dark' ? 'dark' : 'fire'));
    await impact;
    if (anim !== 'cast') audio.sfx(skill?.sfx ?? WEAPON_SFX[w?.type ?? 'sword'] ?? 'slash');
    const from = this.world.anchor(att.uid);
    const to = this.world.anchor(def.uid);
    const applyHit = () => {
      const at = to.clone().add(new THREE.Vector3(0, 0.35, 0));
      if (s.hit) {
        if (s.crit) {
          this.app.engine.shake(0.18, 350);
          void this.app.engine.flash('#ffffff', 180, 0.45);
          void this.world.vfxPlay('critical', from, to);
          audio.sfx('crit');
        } else audio.sfx(getClass(def.classId).tags.includes('armored') ? 'armor_hit' : 'hit', { volume: 0.8 });
        this.world.view(def.uid)?.model.flash(s.crit ? '#ffffff' : '#ff6a4a', 0.3);
        void this.world.play(def.uid, 'hit', undefined, speed);
        this.world.popup(at, s.dmg > 0 ? String(s.dmg) : '无效', s.crit ? 'crit' : s.dmg > 0 ? '' : 'zero');
        if (s.drained > 0) this.world.popup(from.clone().add(new THREE.Vector3(0, 0.35, 0)), `+${s.drained}`, 'heal');
        if (s.status) setTimeout(() => this.world.popup(at.clone().add(new THREE.Vector3(0, 0.25, 0)), STATUS_POP[s.status!] ?? s.status!, 'info'), 250);
        this.world.view(def.uid)?.setHp(s.hpAfter, maxHp(def));
        if (s.drained > 0) this.world.view(att.uid)?.setHp(att.hp, maxHp(att));
      } else {
        audio.sfx('miss');
        void this.world.play(def.uid, 'dodge', undefined, speed);
        this.world.popup(at, 'MISS', 'miss');
      }
    };
    await this.world.vfxPlay(vfx, from, to, applyHit);
    await animDone;
    await sleep(120 / speed);
  }

  private async presentSpell(out: ActionOutcome, caster: Unit, speed: number) {
    const b = this.battle;
    const s = out.skill;
    const target = out.target ?? [caster.x, caster.y];
    const to = this.world.tilePos(target[0], target[1], 0.45);
    if (target[0] !== caster.x || target[1] !== caster.y) this.world.face(caster.uid, [target[0] - caster.x, target[1] - caster.y]);
    const anim: UnitAnim = out.kind === 'item' ? 'heal' : s?.kind === 'heal' || s?.kind === 'buff' || out.kind === 'revive' ? 'heal' : 'cast';
    let impactResolve!: () => void;
    const impact = new Promise<void>((r) => (impactResolve = r));
    const animDone = this.world.play(caster.uid, anim, impactResolve, speed);
    if (s) audio.sfx(s.sfx);
    else audio.sfx('heal');
    await impact;
    const vfx: VfxId = out.kind === 'item' ? 'heal' : out.kind === 'revive' ? 'promote' : s?.vfx ?? 'heal';
    const from = this.world.anchor(caster.uid);
    const apply = () => {
      for (const st of out.strikes) {
        const d = b.unit(st.defender);
        if (!d) continue;
        const at = this.world.anchor(d.uid).add(new THREE.Vector3(0, 0.35, 0));
        if (st.hit) {
          this.world.view(d.uid)?.model.flash('#ff6a4a', 0.3);
          void this.world.play(d.uid, 'hit', undefined, speed);
          if (st.dmg > 0 || !st.status) this.world.popup(at, st.dmg > 0 ? String(st.dmg) : '无效', st.dmg > 0 ? '' : 'zero');
          if (st.status) this.world.popup(at.clone().add(new THREE.Vector3(0, 0.25, 0)), STATUS_POP[st.status] ?? st.status, 'info');
          this.world.view(d.uid)?.setHp(st.hpAfter, maxHp(d));
        } else {
          void this.world.play(d.uid, 'dodge', undefined, speed);
          this.world.popup(at, 'MISS', 'miss');
        }
      }
      for (const e of out.effects) {
        const t = b.unit(e.uid);
        if (!t) continue;
        const at = this.world.anchor(t.uid).add(new THREE.Vector3(0, 0.35, 0));
        if (e.heal !== undefined) this.world.popup(at, `+${e.heal}`, 'heal');
        if (e.mp) this.world.popup(at, `MP +${e.mp}`, 'heal');
        if (e.status) this.world.popup(at, STATUS_POP[e.status] ?? e.status, 'info');
        if (e.cured) this.world.popup(at, '净化', 'info');
        if (e.stat) this.world.popup(at, `${e.stat.toUpperCase()} +${e.amount}`, 'info');
        this.world.view(t.uid)?.setHp(t.hp, maxHp(t));
      }
    };
    const areaHit = s && s.area > 0 && s.kind === 'magic';
    const single = out.strikes.length === 1 && !areaHit;
    const dst = single ? this.world.anchor(out.strikes[0].defender) : out.kind === 'item' || out.effects.length === 1 ? this.world.anchor(out.effects[0]?.uid ?? caster.uid) : to;
    await this.world.vfxPlay(vfx, from, dst, apply, areaHit ? 1 + s!.area * 0.4 : 1);
    await animDone;
  }

  private async presentLoot(out: ActionOutcome) {
    for (const l of out.loot) {
      if (l.item) {
        audio.sfx('item');
        this.hud.toast(h('span', null, '获得 ', h('span.gold', null, ITEMS[l.item]?.name ?? l.item), l.to === 'convoy' ? '（送往仓库）' : ''));
      }
      if (l.gold) {
        audio.sfx('gold');
        this.hud.toast(h('span', null, '获得 ', h('span.gold', null, `${l.gold}`), ' 金币'));
      }
      await sleep(250);
    }
    if (out.message && out.kind !== 'destroy') this.hud.toast(out.message);
  }

  private async presentExp(out: ActionOutcome) {
    for (const e of out.exp) {
      const u = this.battle.unit(e.uid);
      if (!u || e.amount <= 0) continue;
      await this.hud.expGain(u, e.before, e.amount, !!e.levelUp);
      if (e.levelUp) {
        audio.sfx('levelup');
        const prev = { ...stats(u) };
        for (const k of Object.keys(e.levelUp.gains) as (keyof typeof prev)[]) prev[k] -= e.levelUp.gains[k] ?? 0;
        void this.world.vfxPlay('levelup', this.world.anchor(u.uid), this.world.anchor(u.uid));
        void this.world.play(u.uid, 'levelup');
        await this.hud.levelUp(u, e.levelUp, prev);
        this.refreshView(u);
      }
    }
  }

  /* ================================================================ */
  /* 剧情事件                                                          */
  /* ================================================================ */

  private async processEvents() {
    const b = this.battle;
    let guard = 0;
    while (b.eventQueue.length && guard++ < 200) {
      const a = b.eventQueue.shift()!;
      await this.applyEvent(a);
    }
    for (const c of b.takeTileChanges()) this.world.setTile(c.x, c.y, c.t);
    this.updateObjective();
  }

  private async applyEvent(a: BattleAction) {
    const b = this.battle;
    if (a.do === 'say') {
      this.hud.setHints('none');
      const prevMode = this.mode;
      this.mode = null;
      await this.app.dialogue.play(a.lines, this.stage);
      this.mode = prevMode;
      // 剧情指令可能移动了单位视图：以逻辑位置为准
      this.refreshAll();
      return;
    }
    if (a.do === 'camera') {
      this.world.focusTile(a.x, a.y);
      await sleep(500);
      return;
    }
    const spawned = b.applyAction(a);
    switch (a.do) {
      case 'spawn':
        for (const u of spawned) {
          this.addView(u);
          void this.world.vfxPlay('spawn', this.world.anchor(u.uid), this.world.anchor(u.uid));
        }
        if (spawned[0]) {
          this.world.focusTile(spawned[0].x, spawned[0].y);
          audio.sfx('door');
          this.hud.toast('敌方援军出现了！');
          await sleep(900);
        }
        break;
      case 'join': {
        const u = b.unit(a.unit);
        if (u) {
          this.world.removeUnit(u.uid);
          this.addView(u);
          audio.sfx('recruit');
          this.hud.toast(h('span', null, h('span.gold', null, u.name), ' 加入了队伍！'));
          void this.world.vfxPlay('buff', this.world.anchor(u.uid), this.world.anchor(u.uid));
          await sleep(800);
        }
        break;
      }
      case 'leave': {
        const v = this.world.view(a.unit);
        if (v) {
          await this.world.vfxPlay('warp', this.world.anchor(a.unit), this.world.anchor(a.unit));
          this.world.removeUnit(a.unit);
        }
        break;
      }
      case 'item':
        this.hud.toast(h('span', null, '获得 ', h('span.gold', null, ITEMS[a.item]?.name ?? a.item)));
        audio.sfx('item');
        break;
      case 'gold':
        this.hud.toast(h('span', null, '获得 ', h('span.gold', null, `${a.amount}`), ' 金币'));
        audio.sfx('gold');
        break;
      case 'objective':
        this.hud.toast(h('span', null, '目标变更：', h('span.gold', null, a.text)));
        break;
      case 'heal': {
        const u = b.unit(a.unit);
        if (u) this.refreshView(u);
        break;
      }
      default:
        break;
    }
  }

  /* ================================================================ */
  /* 覆盖层与悬停                                                      */
  /* ================================================================ */

  private clearOverlay() {
    this.world?.overlay.clear(true);
    this.world?.overlay.setPath([]);
    this.world?.overlay.setArea([]);
    this.applyShownRanges();
  }

  private toggleRange(u: Unit) {
    if (this.shownRanges.has(u.uid)) this.shownRanges.delete(u.uid);
    else this.shownRanges.add(u.uid);
    audio.sfx('cursor');
    this.updateDanger();
  }

  private applyShownRanges() {
    /* 由 updateDanger 统一绘制 */
  }

  /** 敌方危险范围：全体（R 键）或单独查看的敌人 */
  private updateDanger() {
    if (!this.world) return;
    const b = this.battle;
    const occ = b.occ();
    const tiles: Tile[] = [];
    const add = (u: Unit) => {
      if (!u.alive || u.gone) return;
      const w = weaponOf(u);
      let range: [number, number] = w ? [w.range[0], w.range[1]] : [1, 1];
      for (const s of b.skillsOf(u)) if (s.kind === 'magic' && s.target === 'enemy' && u.mp >= s.mp) range = [Math.min(range[0], s.range[0] || 1), Math.max(range[1], s.range[1])];
      const ghost = { ...u, moved: false, done: false } as Unit;
      for (const k of threatTiles(b.map, occ, ghost, range)) tiles.push(b.map.fromKey(k));
    };
    for (const id of [...this.shownRanges]) {
      const u = b.unit(id);
      if (!u || !u.alive) this.shownRanges.delete(id);
      else add(u);
    }
    if (this.dangerOn) for (const u of b.active('enemy')) add(u);
    this.world.overlay.setDanger(tiles);
  }

  private setCursor(t: Tile, focus = false) {
    this.cursor = t;
    this.world.overlay.moveCursor(t[0], t[1]);
    if (focus) this.world.focusTile(t[0], t[1]);
    this.mode?.hover?.(t);
  }

  private showHover(t: Tile | null) {
    if (!t) {
      this.hud.showTerrain(null);
      return;
    }
    this.hud.showTerrain(this.battle.map.at(t[0], t[1]));
    const u = this.battle.unitAt(t[0], t[1]);
    this.hud.showUnit(u ?? null);
  }

  /** 等待玩家在给定格子中点选（右键/Esc 取消） */
  private pickTile(valid: Tile[], onHover?: (t: Tile | null) => void): Promise<Tile | null> {
    const ok = new Set(valid.map(([x, y]) => `${x},${y}`));
    return new Promise((resolve) => {
      const prev = this.mode;
      const done = (v: Tile | null) => {
        this.mode = prev === this.mode ? null : prev;
        this.mode = null;
        resolve(v);
      };
      this.mode = {
        hover: (t) => {
          this.showHover(t);
          onHover?.(t);
        },
        click: (t, button) => {
          if (button === 2) return done(null);
          if (t && ok.has(`${t[0]},${t[1]}`)) {
            audio.sfx('select');
            done(t);
          } else audio.sfx('error');
        },
        key: (e) => {
          if (e.key === 'Escape' || e.key === 'x') {
            done(null);
            return true;
          }
          return false;
        },
      };
      onHover?.(this.cursor);
    });
  }

  /* ================================================================ */
  /* 输入                                                              */
  /* ================================================================ */

  private on(t: EventTarget, ev: string, fn: EventListener, opts?: AddEventListenerOptions) {
    t.addEventListener(ev, fn, opts);
    this.listeners.push([t, ev, fn]);
  }

  private bindInput() {
    const canvas = this.app.engine.canvas;
    let lastTile = '';
    this.on(window, 'mousemove', ((e: MouseEvent) => {
      if (this.dragging) {
        const dx = e.clientX - this.dragging.x;
        const dy = e.clientY - this.dragging.y;
        this.dragging = { x: e.clientX, y: e.clientY };
        this.world.rig.pan(-dx * 0.02, dy * 0.02);
        return;
      }
      if (e.target !== canvas) return;
      const t = this.world.pick(e.clientX, e.clientY);
      const key = t ? t.join(',') : '';
      if (key === lastTile) return;
      lastTile = key;
      if (t) {
        this.cursor = t;
        this.world.overlay.moveCursor(t[0], t[1]);
        audio.sfx('cursor', { volume: 0.25 });
      }
      this.mode?.hover?.(t);
    }) as EventListener);
    this.on(canvas, 'mousedown', ((e: MouseEvent) => {
      if (e.button === 1) {
        this.dragging = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }
      const t = this.world.pick(e.clientX, e.clientY);
      if (this.hud.menuOpen) {
        if (e.button === 2) this.hud.closeMenu(null);
        return;
      }
      this.mode?.click?.(t, e.button);
    }) as EventListener);
    this.on(window, 'mouseup', (() => (this.dragging = null)) as EventListener);
    this.on(canvas, 'contextmenu', ((e: Event) => e.preventDefault()) as EventListener);
    this.on(canvas, 'wheel', ((e: WheelEvent) => {
      e.preventDefault();
      this.world.rig.zoom(Math.sign(e.deltaY) * 0.1);
    }) as EventListener, { passive: false });
    this.on(window, 'keydown', ((e: KeyboardEvent) => {
      if (this.mode?.key?.(e)) return;
      const k = e.key;
      if (k === 'q' || k === 'Q') this.world.rig.rotate(-1);
      else if (k === 'e' || k === 'E') {
        if (this.endTurnResolver && e.shiftKey) this.endTurnResolver();
        else this.world.rig.rotate(1);
      } else if (k === 'r' || k === 'R') {
        this.dangerOn = !this.dangerOn;
        this.updateDanger();
      } else if (k === ' ' && this.battle.phase !== 'player') {
        this.fast = true;
        this.app.engine.timeScale = 2.2;
        setTimeout(() => (this.app.engine.timeScale = 1), 400);
      } else if (k === 'w' || k === 'W') this.world.rig.pan(0, 1);
      else if (k === 's' || k === 'S') this.world.rig.pan(0, -1);
      else if (k === 'a' || k === 'A') this.world.rig.pan(-1, 0);
      else if (k === 'd' || k === 'D') this.world.rig.pan(1, 0);
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        const ax = this.world.rig.screenAxes();
        const [dx, dy] = k === 'ArrowRight' ? ax.right : k === 'ArrowLeft' ? [-ax.right[0], -ax.right[1]] : k === 'ArrowDown' ? ax.down : [-ax.down[0], -ax.down[1]];
        const nx = Math.max(0, Math.min(this.battle.map.width - 1, this.cursor[0] + dx));
        const ny = Math.max(0, Math.min(this.battle.map.height - 1, this.cursor[1] + dy));
        this.setCursor([nx, ny], true);
        audio.sfx('cursor', { volume: 0.25 });
      } else if (k === 'Enter' || k === 'z') this.mode?.click?.(this.cursor, 0);
      else if (k === 'Escape' || k === 'x') this.mode?.click?.(this.cursor, 2);
    }) as EventListener);
  }

  private unbindInput() {
    for (const [t, ev, fn] of this.listeners) t.removeEventListener(ev, fn);
    this.listeners = [];
  }

  private buildButtons() {
    const end = h('button.btn', { on: { click: () => this.endTurnResolver?.() } }, '结束回合');
    const danger = h('button.btn', { on: { click: () => { this.dangerOn = !this.dangerOn; this.updateDanger(); } } }, '危险范围');
    const settings = h('button.btn', { on: { click: () => void this.app.openSettings() } }, '设置');
    this.hud.buttons.append(settings, danger, end);
  }
}

const STATUS_POP: Record<string, string> = {
  poison: '中毒',
  sleep: '沉睡',
  silence: '沉默',
  slow: '迟缓',
  atk_up: '力量提升',
  def_up: '防御提升',
  agi_up: '敏捷提升',
};

void CHARACTERS;

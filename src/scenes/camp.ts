/**
 * 营地：整备、商店、教会（复活/转职）、营地对话、羁绊、存档
 */
import { audio } from '@/audio';
import { CAMP_TALKS } from '@/data/campTalks';
import { CHARACTERS } from '@/data/characters';
import { getClass } from '@/data/classes';
import { ITEMS } from '@/data/items';
import { SKILLS } from '@/data/skills';
import { SUPPORTS } from '@/data/supports';
import { STAT_KEYS, STAT_NAMES, type ChapterDef, type ItemDef, type SupportDef } from '@/data/types';
import { promoteOptions, promoteSave } from '@/game/progression';
import {
  bondKey,
  buy,
  dragonScales,
  equipFromConvoy,
  fixEquipment,
  giveToMember,
  member,
  revive,
  reviveCost,
  saveGame,
  sell,
  sellPrice,
  storeFromMember,
  unequip,
} from '@/game/state';
import { buildModelSpec, createUnitFromSave, derived, maxHp, maxMp, stats, type UnitSave } from '@/game/unit';
import { BattleWorld } from '@/render/world';
import { clear, h } from '@/ui/dom';
import { portraitHtml } from '@/ui/portraits';
import { menuList, modal, toast, type ListItem } from '@/ui/widgets';
import type { App } from './app';
import { fmtTime, saveLabel } from './title';
import { listSaves } from '@/game/state';

const CAMP_MAP = ['TTTTTTTTTTTT', 'TT........TT', 'T..........T', 'T..........T', 'T....==....T', 'T..........T', 'T..........T', 'TT........TT', 'TTTTTTTTTTTT'];

const RARITY_CLASS = ['', 'r1', 'r2', 'r3', 'r4'];

function itemLabel(id: string): string {
  return ITEMS[id]?.name ?? id;
}

function slotOf(it: ItemDef): 'weapon' | 'armor' | 'accessory' | null {
  if (it.weapon) return 'weapon';
  if (it.armor) return 'armor';
  if (it.accessory) return 'accessory';
  return null;
}

/** 仍可观看的营地对话 */
export function availableTalks(app: App, chapterIndex: number) {
  const s = app.state;
  return CAMP_TALKS.filter((t) => t.chapter <= chapterIndex && t.requires.every((id) => member(s, id) && !member(s, id)!.fallen));
}

/** 可以观看的羁绊等级 */
export function availableSupports(app: App): { def: SupportDef; rank: SupportDef['ranks'][number] }[] {
  const s = app.state;
  const out: { def: SupportDef; rank: SupportDef['ranks'][number] }[] = [];
  for (const d of SUPPORTS) {
    if (!member(s, d.a) || !member(s, d.b)) continue;
    const pts = s.bonds[bondKey(d.a, d.b)] ?? 0;
    for (const r of d.ranks) {
      const key = `${bondKey(d.a, d.b)}|${r.rank}`;
      if (s.supportsSeen.includes(key)) continue;
      if (pts >= r.points) out.push({ def: d, rank: r });
      break;
    }
  }
  return out;
}

export async function runCamp(app: App, ch: ChapterDef): Promise<'depart' | 'title'> {
  const { engine, state } = app;
  engine.setFade(1);
  // 3D 背景：黄昏林间空地，队员围成半圆
  const map = BattleWorld.mapFromRows(CAMP_MAP, 'dusk_road', 3);
  const world = new BattleWorld(engine, app.ui, { map, quality: app.settings.quality, hpBars: false });
  world.overlay.setGrid(0);
  const alive = state.party.filter((p) => !p.fallen);
  const spots: [number, number][] = [
    [5, 6],
    [6, 6],
    [4, 5],
    [7, 5],
    [3, 4],
    [8, 4],
    [4, 3],
    [7, 3],
    [5, 2],
    [6, 2],
    [2, 5],
    [9, 5],
    [3, 2],
    [8, 2],
  ];
  alive.slice(0, spots.length).forEach((p, i) => {
    const [x, y] = spots[i];
    world.addUnit(p.id, buildModelSpec(p.classId, 'player', undefined, CHARACTERS[p.id]?.model), x, y, x < 5.5 ? 'e' : 'w', { hp: 1, maxHp: 1, team: 'player' });
    const v = world.view(p.id);
    if (v) {
      v.visible = false;
      v.model.setRing?.(false);
    }
  });
  world.focusTile(5.5, 4.2, true);
  world.rig.goal.pitch = 0.62;
  world.rig.goal.distance = 10.5;
  world.rig.goal.yaw = 0.15;
  world.rig.snap();
  audio.playMusic('camp');

  const root = h('div.camp');
  const top = h('div.camp-top');
  const menuBox = h('div.panel.camp-menu.interactive');
  const content = h('div.camp-content');
  root.append(top, menuBox, content);
  app.ui.appendChild(root);

  const renderTop = () => {
    clear(top);
    top.append(
      h('div.camp-chapter', null, h('span.muted', null, '下一战'), h('b.title-serif', null, ` ${ch.label} ${ch.title}`)),
      h('div.camp-gold', null, h('span.muted', null, '金币'), h('b.num.gold', null, ` ${state.gold}`)),
      h('div.camp-scale', null, h('span.muted', null, '龙鳞残片'), h('b.num', null, ` ${dragonScales(state)} / 6`)),
      h('div.camp-time', null, h('span.muted', null, '游戏时间'), h('b.num', null, ` ${fmtTime(state.playtime)}`)),
    );
  };

  await engine.fadeTo(0, 900);
  try {
    for (;;) {
      renderTop();
      clear(menuBox);
      clear(content);
      const talks = availableTalks(app, ch.index).filter((t) => !state.campTalksSeen.includes(t.id));
      const sups = availableSupports(app);
      const full = ch.camp !== 'march';
      const m = menuList(menuBox, [
        { id: 'depart', label: '出发', sub: '前往战场' },
        { id: 'party', label: '整备', sub: '装备与道具' },
        { id: 'shop', label: '商店', sub: full ? '购买与出售' : '行军中无法使用', disabled: !full || ch.shop.length === 0 },
        { id: 'church', label: '教会', sub: full ? '复活与转职' : '行军中无法使用', disabled: !full },
        { id: 'talk', label: '营地对话', sub: talks.length ? `新对话 ×${talks.length}` : '无新对话', disabled: availableTalks(app, ch.index).length === 0 },
        { id: 'bond', label: '羁绊', sub: sups.length ? `可观看 ×${sups.length}` : '无', disabled: sups.length === 0 },
        { id: 'save', label: '存档' },
        { id: 'settings', label: '设置' },
        { id: 'title', label: '返回标题' },
      ]);
      const pick = await m.result;
      if (pick === 'depart') return 'depart';
      if (pick === 'party') await partyScreen(app, content);
      if (pick === 'shop') await shopScreen(app, ch, content, renderTop);
      if (pick === 'church') await churchScreen(app, content, renderTop);
      if (pick === 'talk') await talkScreen(app, ch, content);
      if (pick === 'bond') await bondScreen(app, content);
      if (pick === 'save') await saveScreen(app, ch, content);
      if (pick === 'settings') await app.openSettings();
      if (pick === 'title') {
        const r = await modal(app.ui, '返回标题', '未保存的进度将会丢失。确定要返回标题画面吗？', [
          { id: 'yes', label: '返回标题' },
          { id: 'no', label: '取消' },
        ]);
        if (r === 'yes') return 'title';
      }
    }
  } finally {
    await engine.fadeTo(1, 600);
    root.remove();
    world.dispose();
  }
}

/* ================================================================== */
/* 整备                                                                */
/* ================================================================== */

function memberDetail(save: UnitSave): HTMLElement {
  const c = CHARACTERS[save.id];
  const u = createUnitFromSave(save);
  const st = stats(u);
  const d = derived(u);
  const cls = getClass(save.classId);
  const statRows = STAT_KEYS.filter((k) => k !== 'hp' && k !== 'mp').map((k) => h('div.srow', null, h('span', null, STAT_NAMES[k]), h('b.num', null, String(st[k]))));
  const eq = (slot: 'weapon' | 'armor' | 'accessory', label: string) => {
    const id = save.equipment[slot];
    return h('div.eqrow', null, h('span.muted', null, label), h(`b.${RARITY_CLASS[ITEMS[id ?? '']?.rarity ?? 1]}`, null, id ? itemLabel(id) : '—'));
  };
  return h(
    'div.panel.member-detail',
    null,
    h(
      'div.md-head',
      null,
      h('div.md-portrait', { html: portraitHtml(save.id, c?.name ?? save.id) }),
      h(
        'div.md-id',
        null,
        h('div.md-name.title-serif', null, c?.name ?? save.id),
        h('div.md-title.muted', null, c?.title ?? ''),
        h('div.md-class', null, `${cls.name}  Lv ${save.level}  `, h('span.muted', null, `EXP ${save.exp}/100`)),
        h('div.md-hp', null, h('span', null, `HP ${maxHp(u)}`), h('span', null, `MP ${maxMp(u)}`)),
        save.fallen ? h('div.md-fallen', null, '阵亡 —— 需要在教会复活') : null,
      ),
    ),
    h('div.md-stats', null, ...statRows),
    h(
      'div.md-derived',
      null,
      h('div.srow', null, h('span', null, '攻击'), h('b.num', null, String(d.ap))),
      h('div.srow', null, h('span', null, '防御'), h('b.num', null, String(d.dp))),
      h('div.srow', null, h('span', null, '命中'), h('b.num', null, String(d.hit))),
      h('div.srow', null, h('span', null, '回避'), h('b.num', null, String(d.ev))),
    ),
    h('div.md-eq', null, eq('weapon', '武器'), eq('armor', '防具'), eq('accessory', '饰品')),
    h('div.md-bag', null, h('div.muted', null, '背包'), ...save.items.map((i) => h('div', null, itemLabel(i))), save.items.length === 0 ? h('div.muted', null, '（空）') : null),
    h('div.md-skills', null, h('div.muted', null, '技能'), h('div', null, save.skills.map((s) => SKILLS[s]?.name ?? s).join('、') || '—')),
    h('div.md-bio.muted', null, c?.bio ?? ''),
  );
}

async function partyScreen(app: App, content: HTMLElement) {
  const s = app.state;
  let start = 0;
  for (;;) {
    clear(content);
    const listBox = h('div.panel.list-box');
    const detailBox = h('div.detail-box');
    content.append(listBox, detailBox);
    const m = menuList(
      listBox,
      s.party.map((p) => ({ id: p.id, label: CHARACTERS[p.id]?.name ?? p.id, sub: `${getClass(p.classId).name} Lv${p.level}`, right: p.fallen ? '阵亡' : '' })),
      {
        cancellable: true,
        start,
        onFocus: (id) => {
          clear(detailBox);
          detailBox.appendChild(memberDetail(member(s, id)!));
        },
      },
    );
    const id = await m.result;
    if (!id) return;
    start = s.party.findIndex((p) => p.id === id);
    await memberActions(app, id, content, detailBox);
  }
}

async function memberActions(app: App, id: string, content: HTMLElement, detailBox: HTMLElement) {
  const s = app.state;
  for (;;) {
    const save = member(s, id)!;
    clear(detailBox);
    detailBox.appendChild(memberDetail(save));
    const box = h('div.panel.list-box.sub');
    content.appendChild(box);
    const m = menuList(
      box,
      [
        { id: 'weapon', label: '更换武器' },
        { id: 'armor', label: '更换防具' },
        { id: 'accessory', label: '更换饰品' },
        { id: 'bag', label: '背包道具', disabled: save.items.length === 0 },
        { id: 'take', label: '从仓库取出', disabled: s.convoy.length === 0 || save.items.length >= 4 },
        { id: 'back', label: '返回' },
      ],
      { cancellable: true },
    );
    const a = await m.result;
    box.remove();
    if (!a || a === 'back') return;
    if (a === 'weapon' || a === 'armor' || a === 'accessory') {
      const cls = getClass(save.classId);
      const options = s.convoy
        .map((it, i) => ({ it, i, def: ITEMS[it] }))
        .filter(({ def }) => def && slotOf(def) === a)
        .filter(({ def }) => (!def.personal || def.personal === id) && (a !== 'weapon' || cls.weapons.includes(def.weapon!.type)) && (a !== 'armor' || cls.armors.includes(def.armor!.type)));
      const sub = h('div.panel.list-box.sub');
      content.appendChild(sub);
      const items: ListItem[] = options.map(({ it, i, def }) => ({ id: String(i), label: def.name, sub: describeItem(def) }));
      if (save.equipment[a]) items.unshift({ id: 'remove', label: '卸下', sub: itemLabel(save.equipment[a]!) });
      items.push({ id: 'back', label: '返回' });
      const mm = menuList(sub, items, { cancellable: true });
      const r = await mm.result;
      sub.remove();
      if (r === 'remove') unequip(s, id, a);
      else if (r && r !== 'back') {
        if (equipFromConvoy(s, Number(r), id)) audio.sfx('item');
      }
    }
    if (a === 'bag') {
      const sub = h('div.panel.list-box.sub');
      content.appendChild(sub);
      const mm = menuList(sub, [...save.items.map((it, i) => ({ id: String(i), label: itemLabel(it), sub: ITEMS[it]?.desc })), { id: 'back', label: '返回' }], { cancellable: true });
      const r = await mm.result;
      sub.remove();
      if (r && r !== 'back') {
        const idx = Number(r);
        const it = ITEMS[save.items[idx]];
        const usable = it?.consumable?.effect === 'stat_up';
        const act = await modal(app.ui, it?.name ?? '', it?.desc ?? '', [...(usable ? [{ id: 'use', label: '使用' }] : []), { id: 'store', label: '存入仓库' }, { id: 'back', label: '取消' }]);
        if (act === 'store') storeFromMember(s, id, idx);
        if (act === 'use' && it?.consumable?.stat) {
          const k = it.consumable.stat;
          const cap = getClass(save.classId).caps[k];
          save.base[k] = Math.min(cap, save.base[k] + (it.consumable.amount ?? 1));
          save.items.splice(idx, 1);
          audio.sfx('buff');
          toast(app.ui, `${CHARACTERS[id]?.name} 的${STAT_NAMES[k]}提升了！`);
        }
      }
    }
    if (a === 'take') {
      const sub = h('div.panel.list-box.sub');
      content.appendChild(sub);
      const mm = menuList(sub, [...s.convoy.map((it, i) => ({ id: String(i), label: itemLabel(it), sub: ITEMS[it]?.desc })), { id: 'back', label: '返回' }], { cancellable: true });
      const r = await mm.result;
      sub.remove();
      if (r && r !== 'back') giveToMember(s, Number(r), id);
    }
  }
}

function describeItem(def: ItemDef): string {
  if (def.weapon) {
    const w = def.weapon;
    return `攻 ${w.atk} 命中 ${w.hit} 必杀 ${w.crit} 射程 ${w.range[0] === w.range[1] ? w.range[0] : `${w.range[0]}~${w.range[1]}`}`;
  }
  if (def.armor) return `防 ${def.armor.def}${def.armor.res ? ` 魔防 ${def.armor.res}` : ''}`;
  return def.desc;
}

/* ================================================================== */
/* 商店                                                                */
/* ================================================================== */

async function shopScreen(app: App, ch: ChapterDef, content: HTMLElement, renderTop: () => void) {
  const s = app.state;
  for (;;) {
    clear(content);
    const box = h('div.panel.list-box');
    content.appendChild(box);
    const tab = await menuList(box, [
      { id: 'buy', label: '购买' },
      { id: 'sell', label: '出售', disabled: s.convoy.every((i) => sellPrice(i) <= 0) },
      { id: 'back', label: '离开' },
    ], { cancellable: true }).result;
    if (!tab || tab === 'back') return;
    for (;;) {
      clear(content);
      const listBox = h('div.panel.list-box.shop');
      const info = h('div.panel.item-info');
      content.append(listBox, info);
      const showInfo = (id: string) => {
        clear(info);
        const def = ITEMS[id];
        if (!def) return;
        const owned = s.convoy.filter((x) => x === id).length + s.party.reduce((n, p) => n + p.items.filter((x) => x === id).length, 0);
        info.append(h('div.title-serif.big', null, def.name), h('div.muted', null, describeItem(def)), h('p', null, def.desc), h('div.muted', null, `持有 ${owned}`));
      };
      let items: ListItem[];
      if (tab === 'buy') items = ch.shop.map((id) => ({ id, label: itemLabel(id), right: `${ITEMS[id].price} G`, disabled: ITEMS[id].price > s.gold }));
      else items = s.convoy.map((id, i) => ({ id: `${i}`, label: itemLabel(id), right: sellPrice(id) > 0 ? `${sellPrice(id)} G` : '不可出售', disabled: sellPrice(id) <= 0 }));
      items.push({ id: 'back', label: '返回' });
      const r = await menuList(listBox, items, { cancellable: true, onFocus: (id) => showInfo(tab === 'buy' ? id : s.convoy[Number(id)] ?? '') }).result;
      if (!r || r === 'back') break;
      if (tab === 'buy') {
        if (buy(s, r)) {
          audio.sfx('buy');
          toast(app.ui, `购买了「${itemLabel(r)}」（已放入仓库）`);
        }
      } else {
        const id = s.convoy[Number(r)];
        if (sell(s, Number(r))) {
          audio.sfx('gold');
          toast(app.ui, `出售了「${itemLabel(id)}」`);
        }
      }
      renderTop();
    }
  }
}

/* ================================================================== */
/* 教会                                                                */
/* ================================================================== */

async function churchScreen(app: App, content: HTMLElement, renderTop: () => void) {
  const s = app.state;
  for (;;) {
    clear(content);
    const box = h('div.panel.list-box');
    content.appendChild(box);
    const fallen = s.party.filter((p) => p.fallen);
    const promotable = s.party.filter((p) => !p.fallen && promoteOptions(p, s.convoy).length > 0);
    const tab = await menuList(box, [
      { id: 'revive', label: '复活', sub: fallen.length ? `阵亡 ${fallen.length} 人` : '无人阵亡', disabled: fallen.length === 0 },
      { id: 'promote', label: '转职', sub: 'Lv10 以上可转职', disabled: promotable.length === 0 },
      { id: 'back', label: '离开' },
    ], { cancellable: true }).result;
    if (!tab || tab === 'back') return;
    if (tab === 'revive') {
      clear(content);
      const lb = h('div.panel.list-box');
      content.appendChild(lb);
      const r = await menuList(lb, [...fallen.map((p) => ({ id: p.id, label: CHARACTERS[p.id]?.name ?? p.id, right: `${reviveCost(p)} G`, disabled: reviveCost(p) > s.gold })), { id: 'back', label: '返回' }], { cancellable: true }).result;
      if (r && r !== 'back' && revive(s, r)) {
        audio.sfx('holy');
        toast(app.ui, `${CHARACTERS[r]?.name} 复活了！`);
        renderTop();
      }
    }
    if (tab === 'promote') {
      clear(content);
      const lb = h('div.panel.list-box');
      const detail = h('div.detail-box');
      content.append(lb, detail);
      const r = await menuList(lb, [...promotable.map((p) => ({ id: p.id, label: CHARACTERS[p.id]?.name ?? p.id, sub: `${getClass(p.classId).name} Lv${p.level}` })), { id: 'back', label: '返回' }], {
        cancellable: true,
        onFocus: (id) => {
          clear(detail);
          const m = member(s, id);
          if (m) detail.appendChild(memberDetail(m));
        },
      }).result;
      if (!r || r === 'back') continue;
      const save = member(s, r)!;
      const opts = promoteOptions(save, s.convoy);
      const ob = h('div.panel.list-box.sub');
      content.appendChild(ob);
      const to = await menuList(ob, [...opts.map((o) => ({ id: o.to, label: getClass(o.to).name, sub: o.available ? getClass(o.to).desc : o.reason, disabled: !o.available })), { id: 'back', label: '返回' }], { cancellable: true }).result;
      if (!to || to === 'back') continue;
      const opt = opts.find((o) => o.to === to)!;
      const ok = await modal(app.ui, '转职', `${CHARACTERS[r]?.name} 将转职为「${getClass(to).name}」。等级将重置为 1，能力获得提升。`, [
        { id: 'yes', label: '转职' },
        { id: 'no', label: '取消' },
      ]);
      if (ok !== 'yes') continue;
      if (opt.item) {
        const bi = save.items.indexOf(opt.item);
        if (bi >= 0) save.items.splice(bi, 1);
        else s.convoy.splice(s.convoy.indexOf(opt.item), 1);
      }
      const bonus = promoteSave(save, to);
      fixEquipment(s, r);
      audio.sfx('promote');
      const txt = Object.entries(bonus)
        .filter(([, v]) => v)
        .map(([k, v]) => `${STAT_NAMES[k as keyof typeof STAT_NAMES]}+${v}`)
        .join('  ');
      toast(app.ui, `${CHARACTERS[r]?.name} 转职为「${getClass(to).name}」！ ${txt}`, 3500);
    }
  }
}

/* ================================================================== */
/* 营地对话 / 羁绊 / 存档                                              */
/* ================================================================== */

async function talkScreen(app: App, ch: ChapterDef, content: HTMLElement) {
  const s = app.state;
  for (;;) {
    clear(content);
    const box = h('div.panel.list-box');
    content.appendChild(box);
    const talks = availableTalks(app, ch.index);
    const r = await menuList(box, [...talks.map((t) => ({ id: t.id, label: t.title, right: s.campTalksSeen.includes(t.id) ? '' : '新' })), { id: 'back', label: '返回' }], { cancellable: true }).result;
    if (!r || r === 'back') return;
    const t = talks.find((x) => x.id === r)!;
    clear(content);
    await app.dialogue.play(t.lines);
    if (!s.campTalksSeen.includes(t.id)) {
      s.campTalksSeen.push(t.id);
      if (t.reward?.item) {
        s.convoy.push(t.reward.item);
        audio.sfx('item');
        toast(app.ui, `获得了「${itemLabel(t.reward.item)}」`);
      }
      if (t.reward?.gold) {
        s.gold += t.reward.gold;
        audio.sfx('gold');
        toast(app.ui, `获得了 ${t.reward.gold} 金币`);
      }
    }
  }
}

async function bondScreen(app: App, content: HTMLElement) {
  const s = app.state;
  for (;;) {
    clear(content);
    const box = h('div.panel.list-box');
    content.appendChild(box);
    const sups = availableSupports(app);
    if (sups.length === 0) return;
    const r = await menuList(
      box,
      [
        ...sups.map((x, i) => ({ id: String(i), label: `${CHARACTERS[x.def.a]?.name} × ${CHARACTERS[x.def.b]?.name}`, sub: x.rank.title, right: `羁绊 ${x.rank.rank}` })),
        { id: 'back', label: '返回' },
      ],
      { cancellable: true },
    ).result;
    if (!r || r === 'back') return;
    const x = sups[Number(r)];
    clear(content);
    await app.dialogue.play(x.rank.lines);
    s.supportsSeen.push(`${bondKey(x.def.a, x.def.b)}|${x.rank.rank}`);
    audio.sfx('recruit');
    toast(app.ui, `${CHARACTERS[x.def.a]?.name} 与 ${CHARACTERS[x.def.b]?.name} 的羁绊达到了 ${x.rank.rank}！`);
  }
}

async function saveScreen(app: App, ch: ChapterDef, content: HTMLElement) {
  clear(content);
  const box = h('div.panel.list-box.wide');
  content.appendChild(box);
  const saves = listSaves();
  const r = await menuList(
    box,
    [
      ...[1, 2, 3].map((i) => ({
        id: String(i),
        label: saveLabel(i),
        sub: saves[i] ? `${saves[i]!.chapterTitle}` : '— 空 —',
        right: saves[i] ? new Date(saves[i]!.savedAt).toLocaleString() : '',
      })),
      { id: 'back', label: '返回' },
    ],
    { cancellable: true },
  ).result;
  if (!r || r === 'back') return;
  if (saves[Number(r)]) {
    const ok = await modal(app.ui, '覆盖存档', `要覆盖${saveLabel(Number(r))}吗？`, [
      { id: 'yes', label: '覆盖' },
      { id: 'no', label: '取消' },
    ]);
    if (ok !== 'yes') return;
  }
  if (saveGame(Number(r), app.state, `${ch.label} ${ch.title}`)) {
    audio.sfx('select');
    toast(app.ui, '已保存。');
  } else toast(app.ui, '保存失败。');
}

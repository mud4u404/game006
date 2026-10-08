/**
 * 即时回合战斗。规则说明见 docs/design.md 第四节。
 * 对手的数值、台词和结算都来自 src/content/packs/ 下各内容包的 foes 字段。
 */
import { S, save } from '../core/state';
import { advanceMin, dateStr, shichen } from '../core/time';
import { $, H, M, MO, buzz, clamp, cn, fmt, liang, pick, reduceMotion, rnd } from '../core/util';
import { REALMS, foeById, itemById, room, skillById } from '../content';
import type { Effect, FightResult, FoeDef, FxKind, PrepDef, TellDef } from '../content/types';
import { run, textVars } from '../engine/dsl';
import { gainProf } from '../engine/growth';
import { attrEffects } from '../engine/gengu';
import { prepFoe } from '../engine/beizhan';
import { fightLilian } from '../engine/lilian';
import { cheng, chengN, judgeText, realmPow, respOptions, tellPw, type RespKey, type RespOption } from '../engine/formulas';
import { npcName } from '../engine/world';
import { FOE_FX_TAG, FX_SAY, fightKit, foeFighter, meFighter, weaponWord, type FightKit } from '../engine/zhaoshi';
import { dealtMul, endOfRound, flatCut, strike, takenMul, type Combat, type Fighter, type Move } from '../engine/combat';
import { IC } from './icons';
import { mb } from './widgets';
import { afterOutcome, closeSheet, hooks, openSheet, registerHandlers, render } from './shell';

const ROUND_MS = 1500;
const PARTS = ['左肩', '右肩', '左臂', '右臂', '胸口', '右肋', '左肋', '小腹', '左腿', '右腿'];
const PART_XY: Record<string, [number, number]> = { 左肩: [28, 19], 右肩: [12, 19], 左臂: [33, 32], 右臂: [7, 32], 胸口: [20, 26], 右肋: [15, 35], 左肋: [25, 35], 小腹: [20, 41], 左腿: [26, 58], 右腿: [14, 58] };
const FOE_HIT = [
  (f: FoeDef, p: string) => `${f.name}闪避不及，${H(p)}结结实实挨了一下。`,
  (f: FoeDef, p: string) => `噗的一声，正中${f.name}${H(p)}。`,
  (f: FoeDef, p: string) => `${f.name}躲闪稍慢，${H(p + '中招')}，闷哼一声。`,
  (f: FoeDef, p: string) => `${f.name}${H(p)}挨了一记，脚下一个踉跄。`
];
const FOE_PARRY = [(f: FoeDef) => `${f.name}横${f.ws}一架，「铛」的一声，火星四溅。`, (f: FoeDef) => `${f.name}${f.weapon}一封，将这一招荡开。`];
const FOE_DODGE = [(f: FoeDef) => `${f.name}侧身急退，堪堪避过。`, (f: FoeDef) => `${f.name}矮身一闪，这一招落了空。`];
const ME_DODGE = ['你足尖一点，身形斜飘，锋刃贴着衣角削过。', '你侧身一让，顺势一引，将来势卸开。'];
const ME_PARRY = [(w: string) => `你${w}势一封，只震得虎口发麻。`, (w: string) => `你${w}上一搭一引，将这一招带偏了半尺。`];
const ME_HIT = [(p: string) => `你闪避不及，${H(p)}已被扫中，鲜血迸流。`, (p: string) => `你急忙后跃，终究慢了半分，${H(p)}一阵剧痛。`, (p: string) => `你${H(p)}中招，踉跄退了两步。`];
const SAY: Record<RespKey, (f: FoeDef, o: RespOption) => string> = {
  block: (_f, o) => `你沉腰坐马，运起${M(o.sname)}，硬接这一招！`,
  dodge: (_f, o) => `你足尖一点，${M(o.sname)}，身形斜飘而起——`,
  parry: (f, o) => `你凝神细看${f.weapon}去势，${M(o.sname)}一引一带——`,
  rush: (f, o) => `你不退反进，${M(o.sname)}抢在${f.name}招式未成之前出手——`
};

interface Prompt { t: TellDef; opts: RespOption[]; dur: number; end: number; rem?: number; untimed?: boolean }
type Res = 'win' | 'lose' | 'flee' | 'yield';
interface Fight {
  f: FoeDef; ehp: number; ehpMax: number; mom: number; round: number;
  wounds: Record<string, number>; recent: string[]; rage: number;
  charge: number; chargeT: number; prompt: Prompt | null; opening: { part: string } | null;
  busy: boolean; paused: boolean; over: boolean; phase: number; nextTell: number; lastTell: number; lock: number;
  st: { parry: number; open: number; ult: number; big: string[] };
  floor: number; T: { tick?: number; prompt?: number; open?: number; cd?: number };
  res?: Res; then?: Effect[]; tellRound?: number; rescued?: boolean;
  /** 生效的备战（engine/beizhan.ts） */
  prep: PrepDef[];
  /** 由搭配算出的招式（engine/zhaoshi.ts）；绝招各自的调息合数 */
  kit: FightKit; pcd: number[];
  /** 交给战斗内核记状态的两个人（点穴、流血、护体……）和内核的局面 */
  me: Fighter; foe: Fighter; k: Combat;
}
let C: Fight | null = null;
export const inFight = (): boolean => !!C;

/* ---------- 开打 ---------- */

export function startFight(fid: string): void {
  const base = foeById(fid);
  if (C || !base) return;
  const { foe: f, active } = prepFoe(base);
  const kit = fightKit(S);
  const me = meFighter(S, kit), foe = foeFighter(f);
  C = {
    f, ehp: f.hp, ehpMax: f.hp, mom: 50, round: 0, wounds: {}, recent: [], rage: Math.max(0, 30 + attrEffects(S).rage), charge: 0, chargeT: 0,
    prompt: null, opening: null, busy: false, paused: false, over: false, phase: 1,
    nextTell: f.firstTell ?? rnd(3, 4), lastTell: -1, lock: 0,
    st: { parry: 0, open: 0, ult: 0, big: [] },
    floor: f.spar ? Math.round(Math.min(S.hpMax * 0.3, S.hp * 0.5)) : f.script ? Math.round(S.hpMax * 0.25) : 0,
    T: {}, prep: active,
    kit, pcd: kit.performs.map(() => 0), me, foe, k: { round: 0, maxRounds: 999, f: [me, foe], rng: Math.random }
  };
  if (f.script && S.hp <= C.floor + 100) S.hp = C.floor + 300;
  const L = $('#fightLayer')!;
  L.innerHTML = fightHTML(C);
  L.hidden = false;
  bindCharge();
  updAll();
  bubble('sys', f.intro);
  active.forEach(p => bubble('aside', p.text));
  (f.tips || []).forEach(t => bubble('sys', t));
  C.T.tick = window.setTimeout(tick, 1400);
}

function fightHTML(c: Fight): string {
  const f = c.f;
  return `<div class="fight" role="dialog" aria-label="战斗">
  <div class="f-top"><div class="f-where"><span class="pl">${room(S.loc).name}</span><span class="tag ${f.spar ? 'accent' : 'danger'}">${f.tag}</span></div>
    <div class="f-r"><span class="pill" id="fRound">第 0 合</span><button class="iconbtn" data-act="fPause" aria-label="暂停">${IC.pause}</button></div></div>
  <section class="card foecard">
    <span class="ava t-${f.tone}">${f.ini}</span>
    <div class="foe-m"><div class="foe-n"><b>${f.name}</b><small>${f.title}</small></div><div class="tags" id="fTags"></div>
      <div class="hpbar" id="fHp"><div class="tr"><i></i></div><span></span></div></div>
    <svg class="body" width="26" height="47" viewBox="0 0 40 72" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="伤势图">
      <circle cx="20" cy="8" r="6"/><path d="M11 19 H29 L27 44 H13 Z"/><path d="M11 19 L5 40"/><path d="M29 19 L35 40"/><path d="M15 44 L13 70"/><path d="M25 44 L27 70"/><g id="wounds"></g></svg>
  </section>
  <section class="mom"><div class="mom-l"><span class="me" id="mMe"></span><span class="st" id="mSt"></span><span class="op" id="mOp"></span></div><div class="mom-b"><i class="m1" id="mA"></i><i class="m2" id="mB"></i></div></section>
  <div class="flog-wrap"><div class="flog" id="flog" aria-live="polite"></div></div>
  <section class="fsheet" id="fsheet">
    <div class="rh" id="rHead"><b>见招拆招</b><span id="rTime">对手出重招时在这里应对</span></div>
    <button class="opstrip" id="opening" data-act="fOpening" hidden><span class="ops-t"><b>趁虚而入</b><small id="opPart"></small></span><span class="ops-k">点此出手</span><i></i></button>
    <div class="rbody" id="rBody" hidden>
      <p class="rtip" id="rTip" hidden>对手要出重招了。下面是你能用的应对，来自你练成的武功；成算越高越稳。这一次不限时，慢慢看。</p>
      <p class="rtell" id="rTell"></p>
      <p class="rjudge" id="rJudge"></p>
      <div class="rbar"><i id="rFill"></i></div>
      <div class="ropts" id="rOpts"></div>
    </div>
    <div class="pb" id="pBars"></div>
    <div class="sk" id="idleBody">
      ${c.kit.performs.map((x, i) => `<button class="skb" id="skP${i}" data-act="fSkill:p${i}"><b>${x.p.name}</b><small></small></button>`).join('')}
      ${c.kit.locked.map(p => `<button class="skb" disabled><b>${p.name}</b><small>${REALMS[p.realm ?? 0]}可用</small></button>`).join('')}
      <button class="skb" id="skCharge"><b>运功</b><small>长按蓄力</small></button>
      <button class="skb ult" id="skUlt" data-act="fSkill:ult"><b>${c.kit.ult ? '杀招·' + c.kit.ult.def.name : '杀招'}</b><small></small></button>
      <button class="skb minor" id="skJcy" data-act="fSkill:jcy"></button>
      <button class="skb minor" id="skDart" data-act="fSkill:dart"></button>
      ${f.spar ? '<button class="skb minor" data-act="fSkill:yield">认输</button>' : '<button class="skb minor" data-act="fSkill:flee">逃跑</button>'}
    </div>
  </section>
  <div class="ult-layer" id="ultL" hidden><small id="ultLabel"></small><div class="ult-w"><div class="ult-word" id="ultWord"></div><span class="ult-seal" id="ultSeal"></span></div><span class="ult-slash"></span></div>
  <div class="pause-layer" id="pauseL" hidden><div class="box"><b>已暂停</b><small>对手也在等你</small><button class="btn" data-act="fResume">继续</button></div></div>
</div>`;
}

/* ---------- 战斗记录 ---------- */

function bubble(type: string, html: string, dmg?: number, kind?: 'out' | 'in' | 'heal'): void {
  const log = $('#flog');
  if (!log) return;
  const d = document.createElement('div');
  d.className = 'b ' + type;
  d.innerHTML = html + (dmg ? `<span class="dmg ${kind || 'out'}">${kind === 'heal' ? '+' : '−'}${Math.round(dmg)}</span>` : '');
  log.appendChild(d);
  const k = log.querySelectorAll('.b.me,.b.foe');
  k.forEach((el, i) => el.classList.toggle('old', i < k.length - 3));
  while (log.children.length > 46) log.removeChild(log.firstElementChild!);
  log.scrollTop = log.scrollHeight;
}

/* ---------- 回合 ---------- */

function next(ms?: number): void {
  if (!C || C.over) return;
  clearTimeout(C.T.tick);
  C.T.tick = window.setTimeout(tick, ms || (C.phase === 2 ? 1300 : ROUND_MS));
}

function tick(): void {
  if (!C || C.over || C.paused || C.prompt || C.busy) return;
  C.round++;
  S.mp = Math.min(S.mpMax, S.mp + 10);
  C.pcd = C.pcd.map(x => Math.max(0, x - 1));
  if (C.f.script === 'rescue' && C.tellRound !== undefined && C.round >= C.tellRound + 2) { rescue(); return; }
  dotTick();
  if (!C || C.over) return;
  // 被点穴、寒气入体，这一合出不了手（每合只判一次）
  const held = foeHeld();
  C.nextTell--;
  if (C.nextTell <= 0 && !held) { startTell(); updAll(); return; }
  if (held || Math.random() < 0.26 + C.mom * 0.0048) playerAuto(); else foeAuto();
  if (C && !C.over && Math.random() < 0.1) bubble('aside', pick(C.f.asides));
  if (!C || C.over) return;
  endOfRound(C.me); endOfRound(C.foe);
  updAll();
  next();
}

function chargeMul(): number { const m = 1 + C!.charge; C!.charge = 0; return m; }
function cancelCharge(): void {
  if (!C) return;
  C.chargeT = 0;
  $('#skCharge')?.classList.remove('charging');
}

/** 出手那门外功练到了的招式里挑一招；空手又没有拳脚功夫时，随手一拳 */
function myMove(part: string): { name: string; text: string } {
  const o = C!.kit.outer;
  const r = o ? S.skills[o.id]?.r ?? 0 : 0;
  const ms = (o?.moves ?? []).filter(m => (m.realm ?? 0) <= r);
  if (!ms.length) return { name: '随手一拳', text: `你挥拳打向${C!.f.name}${part}。` };
  const m = pick(ms);
  return { name: m.name, text: fmt(m.text, { foe: C!.f.name, part }) };
}

function playerAuto(): void {
  const c = C!, f = c.f, p = pick(PARTS);
  const mv = myMove(p);
  const t = `你使一招${M(mv.name)}，${mv.text}`;
  const r = Math.random(), dg = 0.14 - (c.mom - 50) * 0.002, pr = 0.2 - (c.mom - 50) * 0.002;
  if (r < dg) bubble('me', t + pick(FOE_DODGE)(f));
  else if (r < dg + pr) bubble('me', t + pick(FOE_PARRY)(f));
  else {
    let d = rnd(55, 80) * realmPow(S, c.kit.outer?.id) * chargeMul() * takenMul(c.foe);
    const crit = Math.random() < 0.1;
    if (crit) d *= 1.6;
    bubble('me', t + pick(FOE_HIT)(f, p) + (crit ? `<span class="note">${weaponWord(S)}势如虹</span>` : ''), d, 'out');
    hitFoe(d, p, crit ? 8 : 5);
    maybeOpening(0.12);
  }
}

function armMul(): number {
  const n = ['左臂', '右臂', '左肩', '右肩'].reduce((s, k) => s + (C!.wounds[k] || 0), 0);
  return 1 - Math.min(0.25, n * 0.05);
}

/** 对手这一合被制住了吗：点穴（按次数解）、寒气入体（一半时候慢半拍）。制住了就说一句，返回 true */
function foeHeld(): boolean {
  const c = C!, busy = c.foe.st.busy;
  if (busy) {
    bubble('aside', `${c.f.name}穴道受制，空自挣扎。`);
    if (--busy.r <= 0) { delete c.foe.st.busy; c.foe.immune = 2; }
    return true;
  }
  if (c.foe.st.chill && Math.random() < 0.5) { bubble('aside', `${c.f.name}寒气入体，出招慢了半拍。`); return true; }
  return false;
}

/** 合初：对手身上的流血、中毒、灼伤掉血 */
function dotTick(): void {
  const c = C!;
  for (const k of ['bleed', 'poison', 'burn'] as const) {
    const st = c.foe.st[k];
    if (!st || !C || C.over) continue;
    bubble('aside', { bleed: `${c.f.name}伤口血流不止。`, poison: `${c.f.name}毒性发作，脸色发青。`, burn: `${c.f.name}灼伤处火辣辣地疼。` }[k], st.v, 'out');
    hitFoe(st.v, null, 0, true);
  }
}

/** 身法：轻功位的境界 */
const qgRealm = (): number => S.skills[S.loadout.qinggong ?? '']?.r ?? 0;

function foeAuto(): void {
  const c = C!, f = c.f, p = pick(PARTS), charging = !!c.chargeT;
  let t = `${f.name}一招${MO(pick(f.moves))}，${f.weapon}${pick(f.flourish)}，直取你${p}！`;
  const r = Math.random();
  const dg = charging ? 0 : 0.2 + (c.mom - 50) * 0.003 + qgRealm() * 0.02 + (c.me.st.haste?.v ?? 0) / 100;
  const pr = charging ? 0 : 0.15;
  if (r < dg) { bubble('foe', t + pick(ME_DODGE)); c.mom = clamp(c.mom + 2, 5, 95); maybeOpening(0.2); }
  else if (r < dg + pr) { bubble('foe', t + pick(ME_PARRY)(weaponWord(S))); maybeOpening(0.12); }
  else {
    let d = (rnd(f.atk[0], f.atk[1]) * (c.phase === 2 ? 1.2 : 1) * armMul() * dealtMul(c.foe) - flatCut(c.foe)) * takenMul(c.me);
    if (charging) { d *= 1.3; cancelCharge(); t += '你正凝神运功，躲闪不及——'; }
    bubble('foe', t + pick(ME_HIT)(p), d, 'in');
    c.mom = clamp(c.mom - 5, 5, 95);
    hurtMe(d);
  }
}

/** noRage：怒气已经由战斗内核加过了（绝招），或者不该加（流血、中毒） */
function hitFoe(d: number, p: string | null, mg: number, noRage = false): void {
  const c = C;
  if (!c || c.over) return;
  d = Math.max(0, Math.round(d));
  c.ehp = Math.max(c.f.script === 'rescue' ? 1 : 0, c.ehp - d);
  if (p) { c.wounds[p] = (c.wounds[p] || 0) + 1; c.recent = c.recent.filter(x => x !== p); c.recent.push(p); }
  if (!noRage) c.rage = Math.min(100, c.rage + 4);
  c.mom = clamp(c.mom + mg, 5, 95);
  const hb = $('#fHp');
  if (hb) { hb.classList.remove('flash'); void hb.offsetWidth; hb.classList.add('flash'); }
  if (c.f.spar) { if (c.ehp <= c.ehpMax * 0.3) endFight('win'); return; }
  if (c.f.script === 'rescue') { if (c.ehp <= c.ehpMax * 0.6) rescue(); return; }
  if (c.f.phase2 && c.phase === 1 && c.ehp < c.ehpMax * 0.5 && c.ehp > 0) { c.phase = 2; bubble('foe', c.f.phase2); c.nextTell = Math.min(c.nextTell, 2); }
  if (c.ehp <= 0) endFight('win');
}

function hurtMe(d: number): void {
  const c = C;
  if (!c || c.over) return;
  d = Math.round(d);
  S.hp = Math.max(c.floor, S.hp - d);
  c.rage = Math.min(100, c.rage + 8);
  if (d >= 150) shake();
  buzz(d >= 150 ? 60 : 20);
  if (S.hp > c.floor) return;
  if (c.f.script === 'rescue') rescue();
  else if (c.f.script === 'win-at-zero') {
    bubble('foe', '墙角的江伯挣扎着抓起茶碗掷出，正中黑衣人后脑——');
    c.ehp = 0;
    endFight('win');
  } else endFight('lose');
}

function shake(): void {
  if (reduceMotion) return;
  const a = $('#app');
  if (!a) return;
  a.classList.remove('shake');
  void a.offsetWidth;
  a.classList.add('shake');
}

/* ---------- 破绽 ---------- */

function maybeOpening(base: number): void {
  const c = C;
  if (!c || c.over || c.prompt || c.opening || c.paused || c.busy) return;
  if (Math.random() >= base + Math.max(0, c.mom - 50) / 250) return;
  const part = pick(PARTS);
  c.opening = { part };
  window.setTimeout(() => {
    if (!C || !C.opening || C.over || C.prompt || C.paused) { if (C) C.opening = null; return; }
    bubble('foe', `${C.f.name}${pick(C.f.opening)}，${H(part)}空门大开——`);
    const b = $('#opening')!, i = b.querySelector('i')!;
    $('#opPart')!.textContent = part + '空门大开';
    $('#rHead')!.hidden = true;
    b.hidden = false;
    const first = !S.flags.tutOpen;
    S.flags.tutOpen = true;
    const win = first ? 2600 : 1300;
    i.style.animation = 'none';
    void i.offsetWidth;
    i.style.animation = `drain ${win}ms linear forwards`;
    buzz(15);
    C.T.open = window.setTimeout(() => {
      if (!C || !C.opening) return;
      C.opening = null;
      hideOpening();
      bubble('aside', `破绽稍纵即逝，${C.f.name}已回${C.f.ws}护住要害。`);
    }, win);
  }, 350);
}

function hideOpening(): void {
  const b = $('#opening'), h = $('#rHead');
  if (b) b.hidden = true;
  if (h) h.hidden = false;
  if (C) clearTimeout(C.T.open);
}

function takeOpening(): void {
  const c = C;
  if (!c || !c.opening || c.over || c.paused) return;
  const part = c.opening.part;
  c.opening = null;
  hideOpening();
  c.st.open++;
  const d = rnd(200, 240) * realmPow(S, c.kit.outer?.id) * chargeMul() * takenMul(c.foe);
  const mv = myMove(part);
  bubble('me crit', `你看得真切，一招${M(mv.name)}，${mv.text}`);
  bubble('foe', `${c.f.name}${pick(['闷哼一声', '怪叫一声', '脸色大变'])}，${H(part + '鲜血迸流')}。`, d, 'out');
  c.rage = Math.min(100, c.rage + 10);
  hitFoe(d, part, 12);
  updAll();
}

/* ---------- 见招拆招 ---------- */

function startTell(): void {
  const c = C!;
  hideOpening();
  c.opening = null;
  const ts = c.f.tells;
  let i = rnd(0, ts.length - 1);
  if (ts.length > 1) while (i === c.lastTell) i = rnd(0, ts.length - 1);
  c.lastTell = i;
  const t = ts[i];
  if (c.chargeT) cancelCharge();
  bubble('tell', `<span class="tl"><i></i>预兆</span>${t.text}`);
  buzz(30);
  const pw = tellPw(t, c.phase);
  const opts = respOptions(S, pw, c.f);
  $('#rTell')!.textContent = t.text;
  $('#rJudge')!.textContent = judgeText(S, pw, c.f.ws);
  $('#rOpts')!.innerHTML = opts.map(o => {
    const n = chengN(o.p);
    return `<button class="ropt" data-act="fReact:${o.k}"${o.dis ? ' disabled' : ''}><span class="rn"><b>${o.act}</b><span> · ${o.sname}</span></span><span class="ro ${n >= 6 ? 'hi' : n >= 3 ? 'mid' : 'low'}">成算${cheng(o.p)}</span><span class="rx">${o.note}</span></button>`;
  }).join('');
  const dur = Math.round((5000 + qgRealm() * 300) * (c.phase === 2 ? 0.85 : 1));
  if (!S.flags.tutTell) {
    // 第一次遇到重招：不计时，附上说明
    c.prompt = { t, opts, dur, end: 0, untimed: true };
    setPromptUI(true);
    $('#rTip')!.hidden = false;
    $('#rTime')!.textContent = '这一次不限时';
    updSkills();
    return;
  }
  c.prompt = { t, opts, dur, end: 0 };
  armPrompt(dur, 1);
}

function armPrompt(rem: number, frac: number): void {
  const c = C!;
  if (!c.prompt) return;
  setPromptUI(true);
  const fill = $('#rFill')!;
  fill.style.transition = 'none';
  fill.style.width = frac * 100 + '%';
  void fill.offsetWidth;
  fill.style.transition = `width ${rem}ms linear`;
  fill.style.width = '0%';
  c.prompt.end = performance.now() + rem;
  clearTimeout(c.T.prompt);
  c.T.prompt = window.setTimeout(() => resolveTell(null), rem);
  clearInterval(c.T.cd);
  const lab = $('#rTime')!;
  const upd = (): void => { if (C && C.prompt) lab.textContent = Math.max(0, (C.prompt.end - performance.now()) / 1000).toFixed(1) + 's'; };
  upd();
  c.T.cd = window.setInterval(upd, 100);
  updSkills();
}

function setPromptUI(on: boolean): void {
  const sh = $('#fsheet');
  if (!sh) return;
  sh.classList.toggle('alert', on);
  $('#rBody')!.hidden = !on;
  $('#idleBody')!.hidden = on;
  // 矮屏上底部面板放不下时可以滚动；出重招时滚到应对按钮露全，免得按钮在屏幕外、玩家以为卡死
  if (on) requestAnimationFrame(() => {
    const o = $('#rOpts');
    if (!o) return;
    const below = o.getBoundingClientRect().bottom - sh.getBoundingClientRect().bottom;
    if (below > 0) sh.scrollTop += below + 8;
  });
  else sh.scrollTop = 0;
  if (!on) {
    if (C) clearInterval(C.T.cd);
    $('#rTime')!.textContent = '对手出重招时在这里应对';
    $('#rTip')!.hidden = true;
    const fill = $('#rFill')!;
    fill.style.transition = 'none';
    fill.style.width = '0%';
  }
}

function resolveTell(choice: RespKey | null): void {
  const c = C;
  if (!c || !c.prompt || c.over || c.paused) return;
  const { t, opts } = c.prompt;
  c.prompt = null;
  clearTimeout(c.T.prompt);
  setPromptUI(false);
  S.flags.tutTell = true;
  if (!c.st.big.includes(t.name)) c.st.big.push(t.name);
  let o = opts.find(x => x.k === choice && !x.dis);
  let instinct = false;
  if (!o) { o = opts.filter(x => !x.dis).sort((a, b) => b.p - a.p)[0]; instinct = true; }
  const f = c.f, part = pick(PARTS), big = f.big * (c.phase === 2 ? 1.15 : 1);
  if (!o) {
    // 没有一种应对用得上（槽位空着，或内力都不够）：硬吃这一招
    c.mom = clamp(c.mom - 12, 5, 95);
    bubble('foe', `你无从招架，${MO(t.name)}结结实实打在你${H(part)}！${t.after}`, big * 1.2, 'in');
    hurtMe(big * 1.2);
    updAll();
    if (!C || C.over || C.rescued) return;
    C.tellRound = C.round;
    C.nextTell = C.phase === 2 ? rnd(3, 4) : rnd(4, 6);
    next(1000);
    return;
  }
  const p = Math.max(0.05, o.p - (instinct ? 0.15 : 0));
  const ok = Math.random() < p;
  S.mp = Math.max(0, S.mp - o.cost);
  bubble('me', (instinct ? '你来不及细想，凭本能——' : '') + SAY[o.k](f, o) + `<span class="note">成算${cheng(p)}</span>`);
  if (ok) {
    c.st.parry++;
    c.rage = Math.min(100, c.rage + 12);
    const pw = realmPow(S, o.skill);
    if (o.k === 'block') { const d = rnd(80, 110) * pw; bubble('foe', `「当」的一声巨响，${MO(t.name)}被你硬生生接下！${f.name}反被震得连退三步。`, d, 'out'); hitFoe(d, null, 15); }
    else if (o.k === 'dodge') { bubble('foe', `${MO(t.name)}落了空，${t.after}`); c.mom = clamp(c.mom + 8, 5, 95); window.setTimeout(() => { if (C && !C.over && !C.prompt) maybeOpening(1); }, 450); }
    else if (o.k === 'parry') { const d = rnd(60, 90) * pw; bubble('foe', `你以巧破拙，将${MO(t.name)}化于无形，顺势还了一${weaponWord(S)}，正中他${H(part)}！`, d, 'out'); hitFoe(d, part, 20); }
    else { const d = rnd(220, 280) * pw; bubble('foe', `${f.name}招式未成，${H(part + '先中一' + weaponWord(S))}，${MO(t.name)}硬生生憋了回去！`, d, 'out'); hitFoe(d, part, 15); }
    gainProf(o.skill, 15);
    bubble('aside', `实战有得：「${o.sname}」熟练 +15`);
  } else {
    const mul = { block: 0.8, dodge: 1, parry: 1.1, rush: 1.3 }[o.k];
    const dm = { block: 10, dodge: 8, parry: 12, rush: 15 }[o.k];
    const txt = {
      block: `你内力不及，${MO(t.name)}破开护体真气，余劲震得你${H(part)}一阵剧痛！`,
      dodge: `你身法慢了半拍，${MO(t.name)}正中你${H(part)}！${t.after}`,
      parry: `你${weaponWord(S)}势一乱，非但没拆开${MO(t.name)}，反被${f.ws}锋带过${H(part)}！`,
      rush: `你抢攻慢了一步，正撞上${MO(t.name)}！${t.after}`
    }[o.k];
    c.mom = clamp(c.mom - dm, 5, 95);
    const hurt = (big * mul * dealtMul(c.foe) - flatCut(c.foe)) * takenMul(c.me);
    bubble('foe', txt, hurt, 'in');
    hurtMe(hurt);
  }
  updAll();
  if (!C || C.over || C.rescued) return;
  C.tellRound = C.round;
  C.nextTell = C.phase === 2 ? rnd(3, 4) : rnd(4, 6);
  next(1000);
}

/* ---------- 剧本：江伯出手 ---------- */

function rescue(): void {
  const c = C;
  if (!c || c.rescued || c.over) return;
  c.rescued = true;
  c.busy = true;
  clearTimeout(c.T.tick);
  clearTimeout(c.T.prompt);
  c.prompt = null;
  c.opening = null;
  hideOpening();
  setPromptUI(false);
  cancelCharge();
  updAll();
  bubble('sys', fmt('「{given}，退后！」', textVars()));
  bubble('foe', '不知何时，江伯已撑着床沿站了起来。他从你手中接过长剑，咳出一口血，竟笑了笑。');
  window.setTimeout(() => {
    playUlt('江伯 · 寒江剑法', '断水', '寒江', () => {
      if (!C) return;
      bubble('me crit', '江伯一剑横斩而出——剑气如匹练横江，屋外的雨幕竟被生生斩断了一瞬！');
      bubble('foe', '黑衣首领胸前鲜血迸射，腰间一块铜牌「当啷」落地。他怪叫一声，撞破窗棂，消失在雨夜里。', rnd(900, 1100), 'out');
      C.ehp = Math.max(1, C.ehp - 1000);
      updAll();
      window.setTimeout(() => endFight('win'), reduceMotion ? 300 : 1200);
    });
  }, reduceMotion ? 200 : 1100);
}

/* ---------- 主动招式 ---------- */

function useSkill(k: string): void {
  const c = C;
  if (!c || c.over || c.paused || c.busy) return;
  const now = performance.now();
  if (now < c.lock) return;
  const f = c.f;
  if (k === 'dart') {
    if ((S.items.fhs || 0) < 1 || c.prompt) return;
    c.lock = now + 500;
    S.items.fhs--;
    const p = pick(PARTS), d = rnd(30, 45);
    bubble('me', `你扬手打出一枚飞蝗石，「嗤」的一声正中${f.name}${H(p)}。`, d, 'out');
    hitFoe(d, p, 3);
    updAll();
    return;
  }
  if (c.prompt) return;
  if (k.startsWith('p')) { usePerform(Number(k.slice(1)), now); return; }
  if (k === 'ult') {
    const u = c.kit.ult;
    if (!u || c.rage < 100) return;
    c.rage = 0; c.busy = true; c.lock = now + 1500;
    hideOpening();
    c.opening = null;
    clearTimeout(c.T.tick);
    updAll();
    playUlt(u.u.title, u.def.name, u.def.school, () => {
      if (!C || C.over) return;
      const p = pick(PARTS);
      bubble('me crit', fmt(u.u.text, { foe: C.f.name, part: p }));
      const d = strikeFoe(u.move, realmPow(S, u.def.id) * chargeMul());
      bubble('foe', `${C.f.name}踉跄后退，${H(p + '受了重创')}！`, d, 'out');
      C.st.ult++;
      C.busy = false;
      hitFoe(d, p, 25, true);
      gainProf(u.def.id, 20);
      updAll();
      next(1100);
    });
    return;
  }
  if (k === 'jcy') {
    if ((S.items.jcy || 0) < 1 || S.hp >= S.hpMax) return;
    S.items.jcy--;
    c.lock = now + 1200;
    const h = Math.min(260, S.hpMax - S.hp);
    S.hp += h;
    bubble('sys', '你服下一包金疮药，伤口一阵清凉。', h, 'heal');
    updAll();
    return;
  }
  if (k === 'yield' || k === 'flee') {
    if (f.script) { bubble('sys', '此时此地，无路可退。'); return; }
    c.lock = now + 1000;
    if (k === 'yield') {
      if (f.spar) { bubble('me', '你收剑后退，抱拳道：「是我输了。」'); endFight('yield'); return; }
      bubble('foe', `${f.name}狞笑：「认输？晚了！」`);
      c.mom = clamp(c.mom - 3, 5, 95);
      updAll();
      return;
    }
    if (f.spar) { bubble('foe', `${f.name}收剑笑道：「兄台若有急事，改日再比。」`); endFight('flee'); return; }
    if (Math.random() < 0.25 + (c.mom - 50) / 100) { bubble('me', '你虚晃一剑，转身夺路而走。'); endFight('flee'); return; }
    bubble('foe', `${f.name}横${f.ws}拦住去路：「想走？」`);
    foeAuto();
    updAll();
  }
}

/** 全屏书法题字，播完后执行 after */
/**
 * 打出一招，交给战斗内核判定命中、伤害和效果（engine/combat.ts 的 strike）。
 * 气血、内力、怒气的账由实战界面记：出手前把数同步给内核，出手后取回来；对手掉的血返回，由 hitFoe 记账。
 */
function strikeFoe(move: Move, mul: number): number {
  const c = C!, me = c.me, foe = c.foe;
  me.hp = S.hp; me.mp = S.mp; me.rage = c.rage;
  foe.hp = c.ehp;
  const before = new Set(Object.keys(foe.st)), mine = new Set(Object.keys(me.st));
  const shi = foe.shi, mp = S.mp, hp = S.hp;
  strike(c.k, me, foe, move, mul);
  const d = Math.max(0, c.ehp - foe.hp);
  S.hp = Math.min(S.hpMax, me.hp); S.mp = me.mp; c.rage = me.rage;
  // 新上身的效果，说一句
  const said: FxKind[] = [];
  for (const k of Object.keys(foe.st) as FxKind[]) if (!before.has(k) || foe.st[k as keyof typeof foe.st]!.fresh) said.push(k);
  for (const k of Object.keys(me.st) as FxKind[]) if (!mine.has(k)) said.push(k);
  if (foe.shi < shi) said.push('fear');
  if (S.mp > mp) said.push('drain');
  if (S.hp > hp) said.push('heal');
  for (const k of new Set(said)) { const say = FX_SAY[k]; if (say) bubble('aside', say(c.f.name)); }
  return d;
}

/** 施展一门绝招 */
function usePerform(i: number, now: number): void {
  const c = C!, x = c.kit.performs[i];
  if (!x || c.pcd[i] > 0 || S.mp < x.p.mp) return;
  S.mp -= x.p.mp;
  c.pcd[i] = x.p.cd;
  c.lock = now + 600 + 150 * x.p.hits;
  const part = pick(PARTS);
  bubble('me', fmt(x.p.text, { foe: c.f.name, part }));
  const d = strikeFoe(x.move, realmPow(S, c.kit.outer?.id) * chargeMul());
  if (d > 0) {
    bubble('foe', `${c.f.name}${pick(['闷哼一声', '闪避不及', '回' + c.f.ws + '不及'])}，${H(part + '受伤')}。`, d, 'out');
    hitFoe(d, part, 6 + 2 * x.p.hits, true);
  } else if (x.p.hits) bubble('foe', `${c.f.name}拼着衣衫被划破，堪堪避过这一招。`);
  if (c.kit.outer) gainProf(c.kit.outer.id, 3);
  updAll();
}

function playUlt(label: string, word: string, seal: string, after: () => void): void {
  const L = $('#ultL')!;
  $('#ultLabel')!.textContent = label;
  $('#ultWord')!.textContent = word;
  $('#ultSeal')!.textContent = seal;
  L.hidden = false;
  L.classList.remove('go');
  void L.offsetWidth;
  L.classList.add('go');
  buzz([20, 40, 80]);
  window.setTimeout(shake, reduceMotion ? 0 : 950);
  window.setTimeout(() => { L.hidden = true; after(); }, reduceMotion ? 500 : 1650);
}

function bindCharge(): void {
  const b = $('#skCharge') as HTMLButtonElement;
  const start = (e: PointerEvent): void => {
    if (!C || b.disabled || C.prompt || C.chargeT) return;
    e.preventDefault();
    C.chargeT = performance.now();
    b.classList.add('charging');
    b.querySelector('small')!.textContent = '蓄力中…';
    try { b.setPointerCapture(e.pointerId); } catch { /* 少数浏览器不支持 */ }
  };
  const end = (): void => {
    if (!C || !C.chargeT) return;
    const held = performance.now() - C.chargeT;
    cancelCharge();
    if (held < 250) { bubble('sys', '按住「运功」不放即可蓄力，松手后下一招威力提升。'); updSkills(); return; }
    C.charge = Math.min(0.8, C.charge + Math.round(Math.min(1, held / 1500) * 80) / 100);
    bubble('me', `你凝神运转寒江心法，一股寒意缓缓注入剑身。<span class="note">下一招 +${Math.round(C.charge * 100)}%</span>`);
    updSkills();
  };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('lostpointercapture', end);
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => {
    if (e.detail !== 0 || !C || b.disabled || C.prompt) return;
    C.charge = Math.min(0.8, C.charge + 0.4);
    bubble('me', `你凝神运转寒江心法。<span class="note">下一招 +${Math.round(C.charge * 100)}%</span>`);
    updSkills();
  });
}

/* ---------- 暂停 ---------- */

function pauseFight(): void {
  const c = C;
  if (!c || c.over || c.paused) return;
  c.paused = true;
  clearTimeout(c.T.tick);
  if (c.prompt && !c.prompt.untimed) {
    c.prompt.rem = Math.max(400, c.prompt.end - performance.now());
    clearTimeout(c.T.prompt);
    clearInterval(c.T.cd);
    const fill = $('#rFill')!;
    const w = getComputedStyle(fill).width;
    fill.style.transition = 'none';
    fill.style.width = w;
  }
  if (c.opening) { c.opening = null; hideOpening(); }
  if (c.chargeT) cancelCharge();
  $('#pauseL')!.hidden = false;
  updSkills();
}

function resumeFight(): void {
  const c = C;
  if (!c || !c.paused) return;
  c.paused = false;
  $('#pauseL')!.hidden = true;
  if (c.prompt && !c.prompt.untimed) armPrompt(c.prompt.rem ?? 1000, (c.prompt.rem ?? 1000) / c.prompt.dur);
  else if (!c.prompt && !c.busy) next(600);
  updSkills();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFight(); });

/* ---------- 界面刷新 ---------- */

function updAll(): void {
  if (!C) return;
  updFoe(); updMom(); updPlayer(); updSkills();
  $('#fRound')!.textContent = `第 ${C.round} 合`;
}

function updFoe(): void {
  const c = C!;
  const pct = Math.round((c.ehp / c.ehpMax) * 100), hp = $('#fHp')!;
  hp.querySelector('i')!.style.width = pct + '%';
  hp.querySelector('span')!.textContent = pct + '%';
  const r = c.ehp / c.ehpMax;
  const breath = r > 0.7 ? '气息平稳' : r > 0.4 ? '气息粗重' : r > 0.15 ? '摇摇欲坠' : '强弩之末';
  const tags = [`<span class="tag">${breath}</span>`].concat(c.recent.slice(-2).reverse().map(p => `<span class="tag danger">${p}带伤</span>`));
  if (c.phase === 2) tags.push('<span class="tag warn">狂怒</span>');
  for (const k of Object.keys(c.foe.st) as FxKind[]) { const t = FOE_FX_TAG[k]; if (t) tags.push(`<span class="tag ${t[1]}">${t[0]}</span>`); }
  $('#fTags')!.innerHTML = tags.join('');
  $('#wounds')!.innerHTML = Object.entries(c.wounds).map(([p, n]) => { const [x, y] = PART_XY[p]; return `<circle class="wd" cx="${x}" cy="${y}" r="${Math.min(3 + n, 6)}"/>`; }).join('');
}

function updMom(): void {
  const m = Math.round(C!.mom);
  $('#mMe')!.textContent = `你 ${m}%`;
  $('#mOp')!.textContent = `${100 - m}% 对手`;
  $('#mSt')!.textContent = '攻守之势 · ' + (m >= 75 ? '你压制对手' : m >= 56 ? '你占上风' : m > 44 ? '势均力敌' : m > 25 ? '对手占优' : '你被压制');
  $('#mA')!.style.flexGrow = String(m);
  $('#mB')!.style.flexGrow = String(100 - m);
}

function updPlayer(): void {
  $('#pBars')!.innerHTML = mb('气血', S.hp, S.hpMax, 'hp') + mb('内力', S.mp, S.mpMax, 'mp') + mb('怒气', C!.rage, 100, 'rage');
}

function setSkill(id: string, disabled: boolean, sub: string): HTMLButtonElement {
  const b = $(id) as HTMLButtonElement;
  b.disabled = disabled;
  const s = b.querySelector('small');
  if (s) s.textContent = sub;
  return b;
}

function updSkills(): void {
  const c = C!;
  const dis = c.over || c.busy || c.paused, act = dis || !!c.prompt;
  c.kit.performs.forEach((x, i) => setSkill(`#skP${i}`, act || S.mp < x.p.mp || c.pcd[i] > 0, c.pcd[i] > 0 ? `调息 ${c.pcd[i]} 合` : `内力 ${x.p.mp}`));
  const ch = $('#skCharge') as HTMLButtonElement;
  ch.disabled = act;
  if (!c.chargeT) {
    ch.querySelector('small')!.textContent = c.charge > 0 ? `已蓄 +${Math.round(c.charge * 100)}%` : '长按蓄力';
    ch.classList.toggle('charged', c.charge > 0);
  }
  const ready = !!c.kit.ult && c.rage >= 100;
  const ult = setSkill('#skUlt', act || !ready, !c.kit.ult ? '没有杀招' : ready ? '怒气已满' : `怒气 ${Math.floor(c.rage)}/100`);
  ult.classList.toggle('ready', ready);
  const jcy = $('#skJcy') as HTMLButtonElement;
  jcy.textContent = `金疮药 ×${S.items.jcy || 0}`;
  jcy.disabled = act || (S.items.jcy || 0) < 1 || S.hp >= S.hpMax;
  const dart = $('#skDart') as HTMLButtonElement;
  dart.textContent = `暗器 ×${S.items.fhs || 0}`;
  dart.disabled = act || (S.items.fhs || 0) < 1;
}

/* ---------- 收场 ---------- */

function endFight(res: Res): void {
  const c = C;
  if (!c || c.over) return;
  c.over = true;
  c.res = res;
  clearTimeout(c.T.tick); clearTimeout(c.T.prompt); clearTimeout(c.T.open); clearInterval(c.T.cd);
  c.prompt = null;
  c.opening = null;
  hideOpening();
  setPromptUI(false);
  cancelCharge();
  if (res === 'win' && c.f.win) bubble('foe', c.f.win);
  else if (res === 'lose' && c.f.lose) bubble('sys', c.f.lose);
  updAll();
  window.setTimeout(showResult, reduceMotion ? 300 : 1300);
}

function composeStory(c: Fight): string {
  const st = c.st, parts: string[] = [];
  parts.push(`话说${dateStr(S)}${shichen(S.min)}，扬州${room(S.loc).name}细雨蒙蒙。${c.f.title}${c.f.name}正自横行，忽有一位青衫少年按剑而来，拦在当中。`);
  c.prep.forEach(p => { if (p.story) parts.push(p.story); });
  if (st.big.length) parts.push(`那${c.f.name}的${st.big.map(x => '「' + x + '」').join('、')}何等凶猛，少年却${st.parry ? liang(st.parry) + '次见招拆招，教他占不到半分便宜' : '硬是咬牙撑了下来'}。`);
  if (st.open) parts.push(`更有${liang(st.open)}次瞧出破绽，趁虚而入。`);
  if (st.ult) parts.push(`最后一招「${c.kit.ult?.def.name ?? '杀招'}」，石破天惊——`);
  parts.push(`两人斗到第${cn(c.round)}合，${c.f.name}终于弃${c.f.ws}跪倒。`);
  parts.push('此事一传十、十传百，扬州城里人人都在打听：这位少年，究竟是什么来头？');
  return parts.join('');
}

/** 由结算效果自动生成奖励标签 */
function rewardChips(effects: Effect[] | undefined): string[] {
  const chips: string[] = [];
  for (const e of effects || []) {
    if (e.type === 'prof') chips.push(`<span class="tag accent">${skillById(e.skill)?.name} 熟练 +${e.amount}</span>`);
    else if (e.type === 'lilian') chips.push(`<span class="tag accent">历练 +${e.amount}</span>`);
    else if (e.type === 'learn') chips.push(`<span class="tag accent">习得 ${skillById(e.skill)?.name}</span>`);
    else if (e.type === 'xia') chips.push(`<span class="tag accent">侠义 +${e.delta}</span>`);
    else if (e.type === 'eming') chips.push(`<span class="tag danger">恶名 +${e.delta}</span>`);
    else if (e.type === 'silver') chips.push(e.delta > 0 ? `<span class="tag accent">银两 +${e.delta} 文</span>` : `<span class="tag danger">银两 −${-e.delta} 文</span>`);
    else if (e.type === 'item' && e.delta > 0) chips.push(`<span class="tag accent">获得 ${itemById(e.id)?.name}</span>`);
    else if (e.type === 'title') chips.push(`<span class="tag purple">名号「${e.value}」</span>`);
    else if (e.type === 'heal' && e.hpAtLeast) chips.push(`<span class="tag">气血恢复至${cn(Math.round(e.hpAtLeast * 10))}成</span>`);
    else if (e.type === 'rel') chips.push(`<span class="tag">${npcName(e.npc)} · ${e.value}</span>`);
  }
  return chips;
}

const GROWTH = `<div class="r-sub">变强之道</div><div class="news">
  <div><span class="tag accent">历练</span><span>输了也有收获，这一战已记进历练。闭关时，历练会化成功夫。</span></div>
  <div><span class="tag accent">知彼</span><span>打不过的人，先去打听他的底细：常在他身边的人，往往知道他的软肋。</span></div>
  <div><span class="tag accent">帮手</span><span>一个人打不过，就去找肯帮你的人。你在江湖上做过的事，别人都记着。</span></div>
  <div><span class="tag accent">问道</span><span>大明寺的了尘大师见多识广，不妨去请教。</span></div></div>`;

function showResult(): void {
  const c = C;
  if (!c || !c.res) return;
  const results = c.f.results;
  const r: FightResult | undefined = results[c.res] ?? (c.res === 'yield' ? results.flee : c.res === 'flee' ? results.yield : undefined) ?? results.lose;
  if (!r) { closeFight(); return; }
  // 历练：打了这一架学到的东西（engine/lilian.ts）；带着帮手打，学到的少一些；剧本战是被人救下的，只算输
  const ll = fightLilian(S, c.f, c.f.script ? 'lose' : c.res);
  // 带着某项准备打赢时，准备的后果
  const extra = c.res === 'win' ? c.prep.flatMap(p => p.win ?? []) : [];
  if (r.silent) {
    run([...(r.do ?? []), ...extra]);
    closeFight();
    afterOutcome(run(r.then));
    return;
  }
  advanceMin(S, 15);
  const out = run([...(r.do ?? []), ...extra]);
  let story = r.story || '';
  if (story === '@compose') { story = composeStory(c); S.story = story; }
  else story = fmt(story, textVars());
  const statline = `<p class="statline">共 ${c.round} 合 · 见招拆招得手 ${c.st.parry} 次 · 破绽 ${c.st.open} 次 · 杀招 ${c.st.ult} 次</p>`;
  const chips = rewardChips([...(r.do ?? []), ...extra, ...(ll ? [{ type: 'lilian', amount: ll } as Effect] : [])]).concat(out.breaks.map(x => `<span class="tag info">${x}</span>`));
  c.then = r.then;
  save();
  openSheet(`<div class="r-h"><span class="tag ${c.res === 'win' ? (c.f.spar ? 'accent' : 'danger') : ''}">${r.tag || ''}</span><h2>${r.title || ''}</h2></div>
    ${r.story === '@compose' ? '<div class="r-sub">战后说书</div>' : ''}<p class="story">${story}</p>${statline}
    ${chips.length ? `<div class="rewards">${chips.join('')}</div>` : ''}${r.growth ? GROWTH : ''}
    <button class="btn" data-act="fResult">${r.button || '继续'}</button>`);
}

function closeFight(): void {
  if (C) { clearTimeout(C.T.tick); clearTimeout(C.T.prompt); clearTimeout(C.T.open); clearInterval(C.T.cd); }
  C = null;
  const L = $('#fightLayer')!;
  L.hidden = true;
  L.innerHTML = '';
  S.sel = null;
  S.reply = null;
  render();
  $('#main')!.scrollTop = 0;
}

registerHandlers({
  fSkill: v => useSkill(v),
  fReact: v => { if (C && C.prompt) resolveTell(v as RespKey); },
  fOpening: () => takeOpening(),
  fPause: () => pauseFight(),
  fResume: () => resumeFight(),
  fResult: () => {
    const then = C?.then;
    closeSheet();
    closeFight();
    if (then) afterOutcome(run(then));
  }
});

hooks.startFight = startFight;

/**
 * 即时回合战斗。规则说明见 docs/design.md 第四节。
 * 对手的数值、台词和结算都来自 src/content/foes.ts。
 */
import { S, save } from '../core/state';
import { advanceMin, dateStr, shichen } from '../core/time';
import { $, H, M, MO, buzz, clamp, cn, fmt, liang, pick, reduceMotion, rnd } from '../core/util';
import { foeById, itemById, room, skillById } from '../content';
import type { Effect, FightResult, FoeDef, TellDef } from '../content/types';
import { run, textVars } from '../engine/dsl';
import { gainProf } from '../engine/growth';
import { cheng, chengN, judgeText, respOptions, tellPw, type RespKey, type RespOption } from '../engine/formulas';
import { npcName } from '../engine/world';
import { IC } from './icons';
import { mb } from './widgets';
import { afterOutcome, closeSheet, hooks, openSheet, registerHandlers, render } from './shell';

const ROUND_MS = 1500;
const PARTS = ['左肩', '右肩', '左臂', '右臂', '胸口', '右肋', '左肋', '小腹', '左腿', '右腿'];
const PART_XY: Record<string, [number, number]> = { 左肩: [28, 19], 右肩: [12, 19], 左臂: [33, 32], 右臂: [7, 32], 胸口: [20, 26], 右肋: [15, 35], 左肋: [25, 35], 小腹: [20, 41], 左腿: [26, 58], 右腿: [14, 58] };
const MY_MOVES = ['孤帆远影', '江枫渔火', '寒潭映月', '烟波钓叟', '霜落寒江'];
const MY_FL = ['长剑斜挑', '剑光如一泓秋水', '手腕轻抖，抖出点点剑花', '身随剑走，衣袂飘飘', '剑势轻灵，如燕掠波'];
const FOE_HIT = [
  (f: FoeDef, p: string) => `${f.name}闪避不及，${H(p + '被划开一道血口')}。`,
  (f: FoeDef, p: string) => `噗的一声，剑尖已刺入${f.name}${H(p)}。`,
  (f: FoeDef, p: string) => `${f.name}躲闪稍慢，${H(p + '中剑')}，闷哼一声。`,
  (f: FoeDef, p: string) => `剑光过处，${f.name}${H(p)}衣衫碎裂，渗出血来。`
];
const FOE_PARRY = [(f: FoeDef) => `${f.name}横${f.ws}一架，「铛」的一声，火星四溅。`, (f: FoeDef) => `${f.name}${f.weapon}一封，将这一剑荡开。`];
const FOE_DODGE = [(f: FoeDef) => `${f.name}侧身急退，剑锋贴着衣襟掠过。`, (f: FoeDef) => `${f.name}矮身一闪，这一剑落了空。`];
const ME_DODGE = ['你足尖一点，身形斜飘，锋刃贴着衣角削过。', '你侧身一让，长剑顺势一引，将来势卸开。'];
const ME_PARRY = ['你横剑一格，只震得虎口发麻。', '你长剑一搭一引，将这一招带偏了半尺。'];
const ME_HIT = [(p: string) => `你闪避不及，${H(p)}已被扫中，鲜血迸流。`, (p: string) => `你急忙后跃，终究慢了半分，${H(p)}一阵剧痛。`, (p: string) => `你${H(p)}中招，踉跄退了两步。`];
const SAY: Record<RespKey, (f: FoeDef) => string> = {
  block: () => '你沉腰坐马，运起寒江心法，长剑横胸，硬接这一招！',
  dodge: () => '你足尖一点，「踏雪无痕」，身形斜飘而起——',
  parry: f => `你凝神细看${f.weapon}去势，长剑一引一带——`,
  rush: f => `你不退反进，${M('惊鸿照影')}抢在${f.name}招式未成之前刺出——`
};

interface Prompt { t: TellDef; opts: RespOption[]; dur: number; end: number; rem?: number; untimed?: boolean }
type Res = 'win' | 'lose' | 'flee' | 'yield';
interface Fight {
  f: FoeDef; ehp: number; ehpMax: number; mom: number; round: number;
  wounds: Record<string, number>; recent: string[]; rage: number; gu: number; jh: number;
  charge: number; chargeT: number; prompt: Prompt | null; opening: { part: string } | null;
  busy: boolean; paused: boolean; over: boolean; phase: number; nextTell: number; lastTell: number; lock: number;
  st: { parry: number; open: number; ult: number; big: string[] };
  floor: number; T: { tick?: number; prompt?: number; open?: number; cd?: number };
  res?: Res; then?: Effect[]; tellRound?: number; rescued?: boolean;
}
let C: Fight | null = null;
export const inFight = (): boolean => !!C;

/* ---------- 开打 ---------- */

export function startFight(fid: string): void {
  const f = foeById(fid);
  if (C || !f) return;
  C = {
    f, ehp: f.hp, ehpMax: f.hp, mom: 50, round: 0, wounds: {}, recent: [], rage: 30, gu: 0, jh: 0, charge: 0, chargeT: 0,
    prompt: null, opening: null, busy: false, paused: false, over: false, phase: 1,
    nextTell: f.firstTell ?? rnd(3, 4), lastTell: -1, lock: 0,
    st: { parry: 0, open: 0, ult: 0, big: [] },
    floor: f.spar ? Math.round(Math.min(S.hpMax * 0.3, S.hp * 0.5)) : f.script ? Math.round(S.hpMax * 0.25) : 0,
    T: {}
  };
  if (f.script && S.hp <= C.floor + 100) S.hp = C.floor + 300;
  const L = $('#fightLayer')!;
  L.innerHTML = fightHTML(C);
  L.hidden = false;
  bindCharge();
  updAll();
  bubble('sys', f.intro);
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
      <button class="skb" id="skGu" data-act="fSkill:gu"><b>寒江孤影</b><small></small></button>
      <button class="skb" id="skJh" data-act="fSkill:jh"><b>惊鸿照影</b><small></small></button>
      <button class="skb" id="skCharge"><b>运功</b><small>长按蓄力</small></button>
      <button class="skb ult" id="skUlt" data-act="fSkill:ult"><b>绝招·断水</b><small></small></button>
      <button class="skb minor" id="skJcy" data-act="fSkill:jcy"></button>
      <button class="skb minor" id="skDart" data-act="fSkill:dart"></button>
      <button class="skb minor" data-act="fSkill:yield">认输</button>
      <button class="skb minor" data-act="fSkill:flee">逃跑</button>
    </div>
  </section>
  <div class="ult-layer" id="ultL" hidden><small id="ultLabel">寒江剑法 · 绝招</small><div class="ult-w"><div class="ult-word">断水</div><span class="ult-seal">寒江</span></div><span class="ult-slash"></span></div>
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
  if (C.gu > 0) C.gu--;
  if (C.jh > 0) C.jh--;
  if (C.f.script === 'rescue' && C.tellRound !== undefined && C.round >= C.tellRound + 2) { rescue(); return; }
  C.nextTell--;
  if (C.nextTell <= 0) { startTell(); updAll(); return; }
  if (Math.random() < 0.26 + C.mom * 0.0048) playerAuto(); else foeAuto();
  if (C && !C.over && Math.random() < 0.1) bubble('aside', pick(C.f.asides));
  updAll();
  next();
}

function chargeMul(): number { const m = 1 + C!.charge; C!.charge = 0; return m; }
function cancelCharge(): void {
  if (!C) return;
  C.chargeT = 0;
  $('#skCharge')?.classList.remove('charging');
}

function playerAuto(): void {
  const c = C!, f = c.f, p = pick(PARTS);
  const t = `你使一招${M(pick(MY_MOVES))}，${pick(MY_FL)}，直指${f.name}${p}。`;
  const r = Math.random(), dg = 0.14 - (c.mom - 50) * 0.002, pr = 0.2 - (c.mom - 50) * 0.002;
  if (r < dg) bubble('me', t + pick(FOE_DODGE)(f));
  else if (r < dg + pr) bubble('me', t + pick(FOE_PARRY)(f));
  else {
    let d = rnd(55, 80) * chargeMul();
    const crit = Math.random() < 0.1;
    if (crit) d *= 1.6;
    bubble('me', t + pick(FOE_HIT)(f, p) + (crit ? '<span class="note">剑势如虹</span>' : ''), d, 'out');
    hitFoe(d, p, crit ? 8 : 5);
    maybeOpening(0.12);
  }
}

function armMul(): number {
  const n = ['左臂', '右臂', '左肩', '右肩'].reduce((s, k) => s + (C!.wounds[k] || 0), 0);
  return 1 - Math.min(0.25, n * 0.05);
}

function foeAuto(): void {
  const c = C!, f = c.f, p = pick(PARTS), charging = !!c.chargeT;
  let t = `${f.name}一招${MO(pick(f.moves))}，${f.weapon}${pick(f.flourish)}，直取你${p}！`;
  const r = Math.random();
  const dg = charging ? 0 : 0.2 + (c.mom - 50) * 0.003 + (S.skills.taxue?.r ?? 0) * 0.02;
  const pr = charging ? 0 : 0.15;
  if (r < dg) { bubble('foe', t + pick(ME_DODGE)); c.mom = clamp(c.mom + 2, 5, 95); maybeOpening(0.2); }
  else if (r < dg + pr) { bubble('foe', t + pick(ME_PARRY)); maybeOpening(0.12); }
  else {
    let d = rnd(f.atk[0], f.atk[1]) * (c.phase === 2 ? 1.2 : 1) * armMul();
    if (charging) { d *= 1.3; cancelCharge(); t += '你正凝神运功，躲闪不及——'; }
    bubble('foe', t + pick(ME_HIT)(p), d, 'in');
    c.mom = clamp(c.mom - 5, 5, 95);
    hurtMe(d);
  }
}

function hitFoe(d: number, p: string | null, mg: number): void {
  const c = C;
  if (!c || c.over) return;
  d = Math.round(d);
  c.ehp = Math.max(c.f.script === 'rescue' ? 1 : 0, c.ehp - d);
  if (p) { c.wounds[p] = (c.wounds[p] || 0) + 1; c.recent = c.recent.filter(x => x !== p); c.recent.push(p); }
  c.rage = Math.min(100, c.rage + 4);
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
  const d = rnd(200, 240) * chargeMul();
  bubble('me crit', `你看得真切，剑随身走，一招${M('寒潭映月')}直刺${c.f.name}${part}！`);
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
  const opts = respOptions(S, pw);
  $('#rTell')!.textContent = t.text;
  $('#rJudge')!.textContent = judgeText(S, pw, c.f.ws);
  $('#rOpts')!.innerHTML = opts.map(o => {
    const n = chengN(o.p);
    return `<button class="ropt" data-act="fReact:${o.k}"${o.dis ? ' disabled' : ''}><span class="rn"><b>${o.act}</b><span> · ${o.sname}</span></span><span class="ro ${n >= 6 ? 'hi' : n >= 3 ? 'mid' : 'low'}">成算${cheng(o.p)}</span><span class="rx">${o.note}</span></button>`;
  }).join('');
  const dur = Math.round((5000 + (S.skills.taxue?.r ?? 0) * 300) * (c.phase === 2 ? 0.85 : 1));
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
  const p = Math.max(0.05, o.p - (instinct ? 0.15 : 0));
  const ok = Math.random() < p;
  S.mp = Math.max(0, S.mp - o.cost);
  bubble('me', (instinct ? '你来不及细想，凭本能——' : '') + SAY[o.k](f) + `<span class="note">成算${cheng(p)}</span>`);
  if (ok) {
    c.st.parry++;
    c.rage = Math.min(100, c.rage + 12);
    if (o.k === 'block') { const d = rnd(80, 110); bubble('foe', `「当」的一声巨响，${MO(t.name)}被你硬生生接下！${f.name}反被震得连退三步。`, d, 'out'); hitFoe(d, null, 15); }
    else if (o.k === 'dodge') { bubble('foe', `${MO(t.name)}落了空，${t.after}`); c.mom = clamp(c.mom + 8, 5, 95); window.setTimeout(() => { if (C && !C.over && !C.prompt) maybeOpening(1); }, 450); }
    else if (o.k === 'parry') { const d = rnd(60, 90); bubble('foe', `你以巧破拙，将${MO(t.name)}化于无形，顺势一剑划过他${H(part)}！`, d, 'out'); hitFoe(d, part, 20); }
    else { const d = rnd(220, 280); bubble('foe', `${f.name}招式未成，${H(part + '先中一剑')}，${MO(t.name)}硬生生憋了回去！`, d, 'out'); hitFoe(d, part, 15); }
    gainProf(o.skill, 15);
    bubble('aside', `实战有得：「${o.sname}」熟练 +15`);
  } else {
    const mul = { block: 0.8, dodge: 1, parry: 1.1, rush: 1.3 }[o.k];
    const dm = { block: 10, dodge: 8, parry: 12, rush: 15 }[o.k];
    const txt = {
      block: `你内力不及，${MO(t.name)}破开护体真气，余劲震得你${H(part)}一阵剧痛！`,
      dodge: `你身法慢了半拍，${MO(t.name)}正中你${H(part)}！${t.after}`,
      parry: `你剑势一乱，非但没拆开${MO(t.name)}，反被${f.ws}锋带过${H(part)}！`,
      rush: `你抢攻慢了一步，正撞上${MO(t.name)}！${t.after}`
    }[o.k];
    c.mom = clamp(c.mom - dm, 5, 95);
    bubble('foe', txt, big * mul, 'in');
    hurtMe(big * mul);
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
    playUlt('江伯 · 寒江剑法', () => {
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
  if (k === 'gu') {
    if (S.mp < 60 || c.gu > 0) return;
    S.mp -= 60; c.gu = 1; c.lock = now + 700;
    const p = pick(PARTS);
    bubble('me', `你一招${M('寒江孤影')}，剑走偏锋，疾刺${f.name}${p}！`);
    if (Math.random() < 0.82 + (c.mom - 50) * 0.003) {
      const d = rnd(160, 200) * chargeMul();
      bubble('foe', `${f.name}${pick(['闷哼一声', '闪避不及', '回' + f.ws + '不及'])}，${H(p + '鲜血迸流')}。`, d, 'out');
      hitFoe(d, p, 8);
    } else bubble('foe', `${f.name}拼着衣衫被划破，堪堪避过这一剑。`);
    gainProf('hanjiang', 3);
    updAll();
    return;
  }
  if (k === 'jh') {
    if (!S.skills.jinghong || S.mp < 80 || c.jh > 0) return;
    S.mp -= 80; c.jh = 3; c.lock = now + 900;
    const ps = [pick(PARTS), pick(PARTS), pick(PARTS)];
    bubble('me', `你身形一晃，${M('惊鸿照影')}连出三剑，剑影如惊鸿掠水，分刺${f.name}${ps.join('、')}！`);
    const mul = chargeMul();
    let tot = 0;
    const hits: string[] = [];
    ps.forEach(p => { if (Math.random() < 0.78) { tot += rnd(60, 80) * mul; hits.push(p); } });
    if (hits.length) {
      const where = [...new Set(hits)].join('、');
      bubble('foe', `${hits.length === 3 ? '三剑尽数命中' : '三剑中了' + liang(hits.length) + '剑'}，${f.name}${H(where)}血流如注。`, tot, 'out');
      hits.slice(1).forEach(p => { c.wounds[p] = (c.wounds[p] || 0) + 1; });
      hitFoe(tot, hits[0], 6 + hits.length * 2);
    } else bubble('foe', `${f.name}${f.ws}光护体，三剑尽数挡下。`);
    gainProf('jinghong', 4);
    updAll();
    return;
  }
  if (k === 'ult') {
    if (!S.skills.duanshui || c.rage < 100) return;
    c.rage = 0; c.busy = true; c.lock = now + 1500;
    hideOpening();
    c.opening = null;
    clearTimeout(c.T.tick);
    updAll();
    playUlt('寒江剑法 · 绝招', () => {
      if (!C || C.over) return;
      const p = pick(PARTS), d = rnd(520, 600) * chargeMul();
      bubble('me crit', `你长剑一收，凝气于锋，一剑横斩而出——剑气如匹练横江，竟将${room(S.loc).region === 'yz' && S.loc === 'dukou' ? '江面的雨幕' : '眼前的雨幕'}生生斩断！`);
      bubble('foe', `${C.f.name}踉跄后退，${H(p + '鲜血狂喷')}！`, d, 'out');
      C.st.ult++;
      C.busy = false;
      hitFoe(d, p, 25);
      gainProf('duanshui', 20);
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
function playUlt(label: string, after: () => void): void {
  const L = $('#ultL')!;
  $('#ultLabel')!.textContent = label;
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
  setSkill('#skGu', act || S.mp < 60 || c.gu > 0, c.gu > 0 ? '调息 1 合' : '内力 60');
  if (S.skills.jinghong) setSkill('#skJh', act || S.mp < 80 || c.jh > 0, c.jh > 0 ? `调息 ${c.jh} 合` : '内力 80');
  else setSkill('#skJh', true, '未习得');
  const ch = $('#skCharge') as HTMLButtonElement;
  ch.disabled = act;
  if (!c.chargeT) {
    ch.querySelector('small')!.textContent = c.charge > 0 ? `已蓄 +${Math.round(c.charge * 100)}%` : '长按蓄力';
    ch.classList.toggle('charged', c.charge > 0);
  }
  const ready = !!S.skills.duanshui && c.rage >= 100;
  const ult = setSkill('#skUlt', act || !ready, !S.skills.duanshui ? '未习得' : ready ? '怒气已满' : `怒气 ${Math.floor(c.rage)}/100`);
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
  if (st.big.length) parts.push(`那${c.f.name}的${st.big.map(x => '「' + x + '」').join('、')}何等凶猛，少年却${st.parry ? liang(st.parry) + '次见招拆招，教他占不到半分便宜' : '硬是咬牙撑了下来'}。`);
  if (st.open) parts.push(`更有${liang(st.open)}次瞧出破绽，趁虚而入。`);
  if (st.ult) parts.push('最后一剑「断水」，剑气横江，满江雨幕为之一断——');
  parts.push(`两人斗到第${cn(c.round)}合，${c.f.name}终于弃${c.f.ws}跪倒。`);
  parts.push('此事一传十、十传百，扬州城里人人都在打听：这位少年，究竟是什么来头？');
  return parts.join('');
}

/** 由结算效果自动生成奖励标签 */
function rewardChips(effects: Effect[] | undefined): string[] {
  const chips: string[] = [];
  for (const e of effects || []) {
    if (e.type === 'prof') chips.push(`<span class="tag accent">${skillById(e.skill)?.name} 熟练 +${e.amount}</span>`);
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
  <div><span class="tag accent">闭关</span><span>境界越高，火候越足，见招拆招的成算越高。</span></div>
  <div><span class="tag accent">请教</span><span>小金山的棋痴能点拨剑法，抢攻会更有把握。</span></div>
  <div><span class="tag accent">问道</span><span>大明寺的了尘大师见多识广，不妨去请教。</span></div></div>`;

function showResult(): void {
  const c = C;
  if (!c || !c.res) return;
  const results = c.f.results;
  const r: FightResult | undefined = results[c.res] ?? (c.res === 'yield' ? results.flee : c.res === 'flee' ? results.yield : undefined) ?? results.lose;
  if (!r) { closeFight(); return; }
  if (r.silent) {
    run(r.do);
    closeFight();
    afterOutcome(run(r.then));
    return;
  }
  advanceMin(S, 15);
  const out = run(r.do);
  let story = r.story || '';
  if (story === '@compose') { story = composeStory(c); S.story = story; }
  else story = fmt(story, textVars());
  const statline = `<p class="statline">共 ${c.round} 合 · 见招拆招得手 ${c.st.parry} 次 · 破绽 ${c.st.open} 次 · 断水 ${c.st.ult} 次</p>`;
  const chips = rewardChips(r.do).concat(out.breaks.map(x => `<span class="tag info">${x}</span>`));
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

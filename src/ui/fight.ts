/**
 * 即时回合战斗的画面和点按。规则全部在 engine/duel.ts（实战和模拟器共用一套）：
 * 这里每一合让引擎走一步，照它吐出的事件写战斗记录、刷新画面；玩家点的按钮再交给引擎。
 * 对手的台词、预兆、帮手的话、胜负以后的去路和结算，都来自 src/content/packs/ 下各内容包的 foes 字段。
 */
import { S, save } from '../core/state';
import { dateStr, shichen } from '../core/time';
import { $, H, M, MO, buzz, cn, fmt, liang, pick, reduceMotion } from '../core/util';
import { REALMS, foeById, itemById, jobById, room, skillById } from '../content';
import type { AfterDef, AfterOpt, Effect, FoeDef, PrepDef, TellDef } from '../content/types';
import { run, textVars } from '../engine/dsl';
import { gainProf } from '../engine/growth';
import { Duel, JCY_MAX, ZONE_NAME, type DuelRes, type Ev, type Opt, type RespKey, type Wounds } from '../engine/duel';
import { RESP_ACT, cheng, chengN, judgeText } from '../engine/formulas';
import { respSkill } from '../engine/wuxue';
import { npcName } from '../engine/world';
import { SHENFEN, jobGongxian, jobPay } from '../engine/shenfen';
import { brace, fateOpts, settle, takeWounds } from '../engine/jiesuan';
import { checkYue } from '../engine/shiguang';
import { foeRepeats } from '../engine/lilian';
import { FOE_FX_TAG, FX_SAY, activePrep, alliesOf, fightKit, foeSpec, heroSpec, kanren, weaponWord, type FightKit } from '../engine/zhaoshi';
import { woundNote } from '../engine/shang';
import { IC } from './icons';
import { mb } from './widgets';
import { growthHTML } from './growth';
import { pickFresh } from './fresh';
import { afterOutcome, closeSheet, hooks, openSheet, registerHandlers, render, swapped, tooSoon } from './shell';

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
/** 点到为止的那几句另写（审查 F03、文字审查：拿正则把「鲜血迸流」换成「点到即收」，换出「左肩点到即收」这样的病句） */
const FOE_HIT_SPAR = [
  (f: FoeDef, p: string) => `${f.name}闪避不及，${H(p)}被你点中，你随即收了劲。`,
  (f: FoeDef, p: string) => `你这一招在${f.name}${H(p)}上一沾即走。${f.name}点头道：「好！」`,
  (f: FoeDef, p: string) => `${f.name}躲闪稍慢，${H(p)}被你拂中，退开一步。`,
  (f: FoeDef, p: string) => `${f.name}${H(p)}被你点了一下，脚下一顿。`
];
const ME_HIT_SPAR = [(p: string) => `你闪避不及，${H(p)}被他指尖点中，一阵酸麻。`, (p: string) => `你急忙后跃，终究慢了半分，${H(p)}被他轻轻拂了一下。`, (p: string) => `你${H(p)}被点中，退了两步。`];
const SAY: Record<RespKey, (f: FoeDef, sname: string) => string> = {
  block: (_f, n) => `你沉腰坐马，运起${M(n)}，硬接这一招！`,
  dodge: (_f, n) => `你足尖一点，${M(n)}，身形斜飘而起——`,
  parry: (f, n) => `你凝神细看${f.weapon}去势，${M(n)}一引一带——`,
  rush: (f, n) => `你不退反进，${M(n)}抢在${f.name}招式未成之前出手——`
};
const NOTE: Record<RespKey, string> = { block: '得手反震', dodge: '得手露破绽', parry: '得手还一记', rush: '得手重创' };

interface PromptUI { t: TellDef; dur: number; end: number; rem?: number; untimed?: boolean }
interface Fight {
  f: FoeDef; d: Duel; kit: FightKit;
  /** 本场用过的战报句子（ui/fresh.ts） */
  used: Set<string>;
  /** 生效的备战：知彼、帮手（engine/zhaoshi.ts 的 activePrep） */
  prep: PrepDef[];
  /** 帮手各自打掉了多少 */
  allyDealt: number[];
  /** 对手身上中招的部位（伤势图） */
  wounds: Record<string, number>; recent: string[];
  chargeT: number; ui: PromptUI | null; openPart: string | null;
  busy: boolean; paused: boolean; lock: number;
  /** 认识过的重招 */
  big: string[];
  T: { tick?: number; prompt?: number; open?: number; cd?: number };
  res?: DuelRes; then?: Effect[];
  /** 胜负以后：问不问、选了哪条路 */
  after?: AfterDef | null; pick?: AfterOpt;
  /** 这一场新落下的伤 */
  hurt?: Partial<Wounds>;
  /** 气血见底提醒过了 */
  lowWarned?: boolean;
  /** 「会使虚招」提醒过了 */
  feintWarned?: boolean;
  /** 开打前掂的斤两（赢面）：打赢了按它给落的伤封顶（engine/shang.ts） */
  odds?: number;
  /** 实战长熟练的折扣：七天之内反复打同一个人，一次比一次少（engine/lilian.ts 的 foeRepeats） */
  learn: number;
}
let C: Fight | null = null;
export const inFight = (): boolean => !!C;

/* ---------- 开打 ---------- */

export function startFight(fid: string, lead?: string): void {
  const f = foeById(fid);
  if (C || !f) return;
  const prep = activePrep(f);
  const kit = fightKit(S);
  // 开打前掂一掂斤两：打赢了比你弱的人，不该落一身伤（负责人 10-09）
  const odds = f.spar || f.script ? undefined : kanren(S, f, 24).p;
  brace(f);
  const d = new Duel(heroSpec(S, kit, f), foeSpec(f, prep), { rng: Math.random, allies: alliesOf(prep) });
  C = {
    f, d, kit, used: new Set(), prep, allyDealt: prep.filter(p => p.ally).map(() => 0), wounds: {}, recent: [],
    chargeT: 0, ui: null, openPart: null, busy: false, paused: false, lock: 0, big: [], T: {}, odds,
    learn: 0.5 ** foeRepeats(S, f.id)
  };
  const L = $('#fightLayer')!;
  L.innerHTML = fightHTML(C);
  L.hidden = false;
  bindCharge();
  updAll();
  if (lead) bubble('aside', lead.replace(/\n/g, '<br>'));
  bubble('sys', f.intro);
  prep.forEach(p => bubble(p.ally ? 'ally' : 'aside', p.text));
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
    <button class="opstrip" id="opening" data-act="fOpening" hidden><span class="ops-t"><b>趁虚而入</b><small id="opPart"></small></span><span class="ops-k">趁隙出手</span><i></i></button>
    <div class="rbody" id="rBody" hidden>
      <p class="rtip" id="rTip" hidden>对手要出重招了。下面是你能用的应对，来自你练成的武功；成算越高越稳。这一次不限时，慢慢看。</p>
      <p class="rtell" id="rTell"></p>
      <p class="rjudge" id="rJudge"></p>
      <div class="rbar"><i id="rFill"></i></div>
      <div class="ropts" id="rOpts"></div>
    </div>
    <div class="rbody" id="fateBody" hidden><p class="rtell" id="fatePlea"></p><div class="ropts" id="fateOpts"></div></div>
    <div class="pb" id="pBars"></div>
    <div class="sk" id="idleBody">
      ${c.kit.performs.map((p, i) => `<button class="skb" id="skP${i}" data-act="fSkill:p${i}"><b>${p.name}</b><small></small></button>`).join('')}
      ${c.kit.locked.map(p => `<button class="skb" disabled><b>${p.name}</b><small>${REALMS[p.realm ?? 0]}可用</small></button>`).join('')}
      <button class="skb" id="skCharge"><b>运功</b><small>按住运功</small></button>
      <button class="skb ult" id="skUlt" data-act="fSkill:ult"${c.kit.ult ? '' : ' hidden'}><b>${c.kit.ult ? '杀招·' + c.kit.ult.def.name : '杀招'}</b><small></small></button>
      <button class="skb minor" id="skJcy" data-act="fSkill:jcy"></button>
      <button class="skb minor" id="skDart" data-act="fSkill:dart"></button>
      ${f.spar ? '<button class="skb minor" id="skOut" data-act="fSkill:yield">认输</button>' : '<button class="skb minor" id="skOut" data-act="fSkill:flee">逃跑</button>'}
    </div>
  </section>
  <div class="ult-layer" id="ultL" hidden><small id="ultLabel"></small><div class="ult-w"><div class="ult-word" id="ultWord"></div><span class="ult-seal" id="ultSeal"></span></div><span class="ult-slash"></span></div>
  <div class="pause-layer" id="pauseL" hidden><div class="box"><b>按剑暂歇</b><small>对手也在等你</small><button class="btn" data-act="fResume">继续</button></div></div>
</div>`;
}

/* ---------- 战斗记录 ---------- */

/**
 * 点到为止（审查 F03）：切磋、考校、对手不是练家子（饿急了的孩子）时，战报不见血。
 * 长老刚说「只许点到，不许见血」，下一行就是「鲜血迸流」，出戏
 */
/** 武功里写的出招、杀招句子是内容包给的，没法逐句另写：这几处见血的说法照旧换掉，换出来的要读得通 */
const GENTLE: [RegExp, string][] = [
  [/，?鲜血迸流/g, ''], [/受了重创/g, '被点中要处'], [/血流不止/g, '一阵发麻'], [/一阵剧痛/g, '一阵酸麻'],
  [/受伤/g, '被点中'], [/结结实实打在/g, '轻轻点在'], [/破开护体真气，余劲震得/g, '压住了劲，震得']
];
const gentle = (f: FoeDef): boolean => !!f.spar || (f.weak ?? 1) <= 0.2;
const soften = (html: string): string => GENTLE.reduce((t, [re, to]) => t.replace(re, to), html);

function bubble(type: string, html: string, dmg?: number, kind?: 'out' | 'in' | 'heal'): void {
  const log = $('#flog');
  if (!log) return;
  if (C && gentle(C.f)) html = soften(html);
  const d = document.createElement('div');
  d.className = 'b ' + type;
  d.innerHTML = html + (dmg ? `<span class="dmg ${kind || 'out'}">${kind === 'heal' ? '+' : '−'}${Math.round(dmg)}</span>` : '');
  log.appendChild(d);
  const k = log.querySelectorAll('.b.me,.b.foe');
  k.forEach((el, i) => el.classList.toggle('old', i < k.length - 3));
  while (log.children.length > 46) log.removeChild(log.firstElementChild!);
  log.scrollTop = log.scrollHeight;
}

/** 本场没用过的句子里挑一句 */
const fresh = <T>(id: string, pool: readonly T[]): T => pickFresh(C!.used, id, pool);

/** 出手那门外功练到了的招式里挑一招；空手又没有拳脚功夫时，随手一拳 */
function myMove(part: string): { name: string; text: string } {
  const o = C!.kit.outer;
  const r = o ? S.skills[o.id]?.r ?? 0 : 0;
  // 跟绝招同名的招不当普通招式使：不然战报里刚使过「江枫渔火」，按钮上的「江枫渔火」却还灰着
  const perf = new Set((o?.performs ?? []).map(p => p.name));
  const all = (o?.moves ?? []).filter(m => (m.realm ?? 0) <= r);
  const ms = all.some(m => !perf.has(m.name)) ? all.filter(m => !perf.has(m.name)) : all;
  if (!ms.length) return { name: '随手一拳', text: `你挥拳打向${C!.f.name}${part}。` };
  const m = fresh('mv', ms);
  const text = m.alts?.length ? fresh(`mv:${m.name}`, [m.text, ...m.alts]) : m.text;
  return { name: m.name, text: fmt(text, { foe: C!.f.name, part }) };
}

/** 对手中招的部位记在伤势图上 */
function mark(part: string): void {
  const c = C!;
  c.wounds[part] = (c.wounds[part] || 0) + 1;
  c.recent = c.recent.filter(x => x !== part);
  c.recent.push(part);
  const hb = $('#fHp');
  if (hb) { hb.classList.remove('flash'); void hb.offsetWidth; hb.classList.add('flash'); }
}

function hurtFx(d: number): void {
  if (d >= 150) shake();
  buzz(d >= 150 ? 60 : 20);
}

function shake(): void {
  if (reduceMotion) return;
  const a = $('#app');
  if (!a) return;
  a.classList.remove('shake');
  void a.offsetWidth;
  a.classList.add('shake');
}

/**
 * 照引擎吐出的事件写战斗记录。重招（tell）、剧本（script）、收场（end）另有界面，在这里交出去。
 */
function narrate(evs: Ev[]): void {
  const c = C;
  if (!c) return;
  const f = c.f;
  for (const e of evs) {
    switch (e.k) {
      case 'auto': {
        const p = pick(PARTS);
        if (e.who === 'me') {
          const mv = myMove(p);
          const t = `你使一招${M(mv.name)}，${mv.text}`;
          if (e.res === 'dodge') bubble('me', t + fresh('fd', FOE_DODGE)(f));
          else if (e.res === 'parry') bubble('me', t + fresh('fp', FOE_PARRY)(f));
          else { bubble('me', t + fresh(gentle(f) ? 'fhs' : 'fh', gentle(f) ? FOE_HIT_SPAR : FOE_HIT)(f, p) + (e.crit ? `<span class="note">${weaponWord(S)}势如虹</span>` : ''), e.dmg, 'out'); mark(p); }
        } else {
          // 花样是自成一句的（「一脚踢翻了粥桶」「刀光一闪」），前面不拼兵器名：拼了就成「尖刀一脚踹翻了箩筐」
          let t = `${f.name}一招${MO(fresh('foeMove', f.moves))}，${fresh('foeFlourish', f.flourish)}，直取你${p}！`;
          if (e.res === 'dodge') bubble('foe', t + fresh('md', ME_DODGE));
          else if (e.res === 'parry') bubble('foe', t + fresh('mp', ME_PARRY)(weaponWord(S)));
          else {
            if (e.charging) { cancelCharge(); t += '你正凝神运功，躲闪不及——'; }
            bubble('foe', t + fresh(gentle(f) ? 'mhs' : 'mh', gentle(f) ? ME_HIT_SPAR : ME_HIT)(p), e.dmg, 'in');
            hurtFx(e.dmg);
          }
        }
        break;
      }
      case 'held': bubble('aside', e.why === 'busy' ? `${f.name}穴道受制，空自挣扎。` : `${f.name}寒气入体，出招慢了半拍。`); break;
      case 'dot': bubble('aside', { bleed: `${f.name}伤口血流不止。`, poison: `${f.name}毒性发作，脸色发青。`, burn: `${f.name}灼伤处火辣辣地疼。` }[e.kind], e.dmg, 'out'); break;
      case 'opening': showOpening(); break;
      case 'phase2': if (f.phase2) bubble('foe', f.phase2); break;
      case 'ease': bubble('aside', `${f.name}收了攻势，只守不攻，陪你把约好的招数走完。`); break;
      case 'ally': {
        const a = c.prep.filter(p => p.ally)[e.i]?.ally;
        if (!a) break;
        c.allyDealt[e.i] += e.dmg;
        // 前面已经标了名字，话头再是自己的名字就去掉，免得「柳寒舟柳寒舟收伞一拂」（审查 A30）
        const say = a.say[Math.min(e.n - 1, a.say.length - 1)];
        bubble('ally', `<span class="who">${a.name}</span>${say.startsWith(a.name) ? say.slice(a.name.length) : say}`, e.dmg, 'out');
        mark(pick(PARTS));
        break;
      }
      case 'fleeFail': bubble('foe', `${f.name}横${f.ws}拦住去路：「想走？」`); break;
      case 'script': window.setTimeout(e.what === 'rescue' ? rescue : cup, 50); break;
      case 'end': endFight(e.res); break;
      default: break;
    }
  }
}

/** 把引擎里的气血、内力记回存档 */
function sync(): void {
  if (!C) return;
  S.hp = Math.max(0, Math.round(C.d.hp));
  S.mp = Math.max(0, Math.round(C.d.mp));
}

/** 交给引擎做一件事，写记录、刷新画面 */
function act(evs: Ev[]): void {
  sync();
  narrate(evs);
  updAll();
}

/* ---------- 回合 ---------- */

function next(ms?: number): void {
  if (!C || C.d.over) return;
  clearTimeout(C.T.tick);
  C.T.tick = window.setTimeout(tick, ms || (C.d.phase === 2 ? 1300 : ROUND_MS));
}

function tick(): void {
  const c = C;
  if (!c || c.d.over || c.paused || c.ui || c.busy || c.openPart) return;
  act(c.d.tick());
  if (!C || C.d.over || C.busy) return;
  if (C.d.prompt) { startTell(); return; }
  if (C.d.waiting) return;
  if (!C.openPart && Math.random() < 0.1) bubble('aside', pick(C.f.asides));
  if (!C.openPart) next();
}

function cancelCharge(): void {
  if (!C) return;
  C.chargeT = 0;
  C.d.charging = false;
  $('#skCharge')?.classList.remove('charging');
}

/* ---------- 破绽 ---------- */

/** 引擎说露出了破绽：稍纵即逝，这期间回合停一停，等玩家点或者错过 */
function showOpening(): void {
  const c = C!;
  const part = pick(PARTS);
  c.openPart = part;
  clearTimeout(c.T.tick);
  window.setTimeout(() => {
    if (!C || C.openPart !== part || C.d.over || C.paused) return;
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
      if (!C || C.openPart !== part) return;
      C.openPart = null;
      hideOpening();
      C.d.dropOpening();
      bubble('aside', `破绽稍纵即逝，${C.f.name}已回${C.f.ws}护住要害。`);
      next(600);
    }, win);
  }, 400);
}

function hideOpening(): void {
  const b = $('#opening'), h = $('#rHead');
  if (b) b.hidden = true;
  if (h) h.hidden = false;
  if (C) clearTimeout(C.T.open);
}

function takeOpening(): void {
  const c = C;
  if (!c || !c.openPart || c.d.over || c.paused) return;
  const part = c.openPart;
  c.openPart = null;
  hideOpening();
  const evs = c.d.takeOpening();
  const e = evs.find(x => x.k === 'open');
  const mv = myMove(part);
  bubble('me crit', `你看得真切，一招${M(mv.name)}，${mv.text}`);
  if (e && e.k === 'open') { bubble('foe', `${c.f.name}${pick(['闷哼一声', '怪叫一声', '脸色大变'])}，${H(part + '鲜血迸流')}。`, e.dmg, 'out'); mark(part); }
  act(evs.filter(x => x.k !== 'open'));
  next(900);
}

/* ---------- 见招拆招 ---------- */

function startTell(): void {
  const c = C!, pr = c.d.prompt!;
  hideOpening();
  c.openPart = null;
  const t = c.f.tells[pr.tell];
  if (c.chargeT) cancelCharge();
  bubble('tell', `<span class="tl"><i></i>预兆</span>${t.text}`);
  buzz(30);
  $('#rTell')!.textContent = t.text;
  // 虚实：这一招是不是虚招，玩家看不出；按钮上的成算已经并进了「它可能是虚招」
  // 虚招的提醒：虚招两成以上的对手才说，一场只说一回（审查 F40：句句都说）
  const warnFeint = c.d.feintR >= 0.2 && !c.feintWarned;
  if (warnFeint) c.feintWarned = true;
  $('#rJudge')!.textContent = judgeText(pr.pw, c.d.hh, c.f.ws) + (warnFeint ? `${c.f.name}会使虚招，全力硬接最怕落空。` : '');
  $('#rOpts')!.innerHTML = pr.opts.map(o => optHTML(o)).join('');
  const qg = S.skills[S.loadout.qinggong ?? '']?.r ?? 0;
  const dur = Math.round((5000 + qg * 300) * (c.d.phase === 2 ? 0.85 : 1));
  if (!S.flags.tutTell) {
    // 第一次遇到重招：不计时，附上说明
    c.ui = { t, dur, end: 0, untimed: true };
    setPromptUI(true);
    $('#rTip')!.hidden = false;
    $('#rTime')!.textContent = '这一次不限时';
    updSkills();
    return;
  }
  c.ui = { t, dur, end: 0 };
  armPrompt(dur, 1);
}

function optHTML(o: Opt): string {
  const n = chengN(o.p), sname = respSkill(S, o.k)?.name ?? '';
  const note = o.dis ? '内力不足' : o.cost ? `耗内力 ${o.cost}` : NOTE[o.k];
  return `<button class="ropt" data-act="fReact:${o.k}"${o.dis ? ' disabled' : ''}><span class="rn"><b>${RESP_ACT[o.k]}</b><span> · ${sname}</span></span><span class="ro ${n >= 6 ? 'hi' : n >= 3 ? 'mid' : 'low'}">成算${cheng(o.p)}</span><span class="rx">${note}</span></button>`;
}

function armPrompt(rem: number, frac: number): void {
  const c = C!;
  if (!c.ui) return;
  setPromptUI(true);
  const fill = $('#rFill')!;
  fill.style.transition = 'none';
  fill.style.width = frac * 100 + '%';
  void fill.offsetWidth;
  fill.style.transition = `width ${rem}ms linear`;
  fill.style.width = '0%';
  c.ui.end = performance.now() + rem;
  clearTimeout(c.T.prompt);
  c.T.prompt = window.setTimeout(() => resolveTell(null), rem);
  clearInterval(c.T.cd);
  const lab = $('#rTime')!;
  // 倒计时不写「4.3s」这种现代记法，写还剩几息（审查 H22）
  const upd = (): void => { if (C && C.ui) lab.textContent = `还剩${cn(Math.ceil(Math.max(0, (C.ui.end - performance.now()) / 1000)))}息`; };
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
  swapped();
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
  if (!c || !c.ui || !c.d.prompt || c.d.over || c.paused) return;
  const { t } = c.ui;
  c.ui = null;
  clearTimeout(c.T.prompt);
  setPromptUI(false);
  S.flags.tutTell = true;
  if (!c.big.includes(t.name)) c.big.push(t.name);
  const f = c.f, part = pick(PARTS), ww = weaponWord(S);
  const evs = c.d.respond(choice);
  const e = evs.find(x => x.k === 'resp');
  if (e && e.k === 'resp') {
    if (!e.key) {
      bubble('foe', `你无从招架，${MO(t.name)}结结实实打在你${H(part)}！${t.after}`, e.dmg, 'in');
      hurtFx(e.dmg);
    } else {
      const sk = respSkill(S, e.key), act0 = RESP_ACT[e.key];
      bubble('me', (e.instinct ? '你来不及细想，凭本能——' : '') + SAY[e.key](f, sk?.name ?? '') + `<span class="note">成算${cheng(e.p)}</span>`);
      if (e.feint) {
        if (e.ok) bubble('foe', `${MO(t.name)}原来是虚的！你${act0}之际看得分明，${f.name}这一晃，门户反倒露了出来——`);
        else { bubble('foe', `${MO(t.name)}原来是虚招！你${act0}扑了个空，被${f.name}顺势带了一下，${H(part)}吃了一记。`, e.dmg, 'in'); hurtFx(e.dmg); }
      } else if (e.ok) {
        if (e.key === 'block') bubble('foe', `「当」的一声巨响，${MO(t.name)}被你硬生生接下！${f.name}反被震得连退三步。`, e.dmg, 'out');
        else if (e.key === 'dodge') bubble('foe', `${MO(t.name)}落了空，${t.after}`);
        else if (e.key === 'parry') { bubble('foe', `你以巧破拙，将${MO(t.name)}化于无形，顺势还了一${ww}，正中他${H(part)}！`, e.dmg, 'out'); mark(part); }
        else { bubble('foe', `${f.name}招式未成，${H(part + '先中一' + ww)}，${MO(t.name)}硬生生憋了回去！`, e.dmg, 'out'); mark(part); }
        const got = Math.round(15 * c.learn);
        if (sk && got > 0) { gainProf(sk.id, got); bubble('aside', `实战有得：「${sk.name}」熟练 +${cn(got)}`); }
      } else {
        const txt = {
          block: `你内力不及，${MO(t.name)}破开护体真气，余劲震得你${H(part)}一阵剧痛！`,
          dodge: `你身法慢了半拍，${MO(t.name)}正中你${H(part)}！${t.after}`,
          parry: `你${ww}势一乱，非但没拆开${MO(t.name)}，反被${f.ws}锋带过${H(part)}！`,
          rush: `你抢攻慢了一步，正撞上${MO(t.name)}！${t.after}`
        }[e.key];
        bubble('foe', txt, e.dmg, 'in');
        hurtFx(e.dmg);
      }
    }
  }
  act(evs.filter(x => x.k !== 'resp'));
  if (!C || C.d.over || C.busy || C.openPart || C.d.waiting) return;
  next(1000);
}

/* ---------- 剧本：有人出手 ---------- */

/** 序章第一场：你撑不住时，墙角的江伯掷出茶碗 */
function cup(): void {
  const c = C;
  if (!c || c.busy || c.d.over) return;
  c.busy = true;
  clearTimeout(c.T.tick);
  hideOpening();
  setPromptUI(false);
  cancelCharge();
  bubble('foe', `墙角的江伯挣扎着抓起茶碗掷出，正中${c.f.name}后脑——`);
  window.setTimeout(() => { if (C) { C.busy = false; act(C.d.finishScript()); } }, reduceMotion ? 200 : 700);
}

/** 序章第二场：江伯撑着站起来，一剑断水 */
function rescue(): void {
  const c = C;
  if (!c || c.busy || c.d.over) return;
  c.busy = true;
  clearTimeout(c.T.tick);
  clearTimeout(c.T.prompt);
  c.ui = null;
  c.openPart = null;
  hideOpening();
  setPromptUI(false);
  cancelCharge();
  updAll();
  bubble('sys', fmt('「{given}，退后！」', textVars()));
  bubble('foe', '不知何时，江伯已撑着床沿站了起来。他从你手中接过长剑，咳出一口血，竟笑了笑。');
  window.setTimeout(() => {
    playUlt('江伯 · 寒江剑法', '断水', '寒江', () => {
      if (!C) return;
      const d = Math.min(Math.round(C.d.ehpMax * 0.3), C.d.ehp - 1);
      C.d.ehp -= Math.max(0, d);
      bubble('me crit', '江伯一剑横斩而出——剑气如匹练横江，屋外的雨幕竟被生生斩断了一瞬！');
      bubble('foe', `${C.f.name}胸前鲜血迸射，腰间一块铜牌「当啷」落地。他怪叫一声，撞破窗棂，消失在雨夜里。`, d, 'out');
      updAll();
      window.setTimeout(() => { if (C) { C.busy = false; act(C.d.finishScript()); } }, reduceMotion ? 300 : 1200);
    });
  }, reduceMotion ? 200 : 1100);
}

/* ---------- 主动招式 ---------- */

/**
 * 出手以后的一小段时间锁（暗器、药、绝招、杀招、逃跑之后）：期间按钮真的变灰，锁一过再亮。
 * 原来锁着却不变灰，玩家点了没反应，以为「点不中」（负责人 10-09）
 */
function lockFor(c: Fight, ms: number): void {
  c.lock = performance.now() + ms;
  updSkills();
  window.setTimeout(() => { if (C === c) updSkills(); }, ms + 20);
}

function useSkill(k: string): void {
  const c = C;
  if (!c || c.d.over || c.paused || c.busy) return;
  const now = performance.now();
  if (now < c.lock) return;
  const f = c.f;
  if (k === 'dart') {
    if ((S.items.fhs || 0) < 1 || c.d.prompt) return;
    lockFor(c, 500);
    S.items.fhs--;
    const p = pick(PARTS), evs = c.d.dart(), e = evs.find(x => x.k === 'item');
    bubble('me', `你扬手打出一枚飞蝗石，「嗤」的一声正中${f.name}${H(p)}。`, e && e.k === 'item' ? e.v : 0, 'out');
    mark(p);
    act(evs.filter(x => x.k !== 'item'));
    return;
  }
  if (c.d.prompt) return;
  if (k.startsWith('p')) { usePerform(Number(k.slice(1))); return; }
  if (k === 'ult') {
    const u = c.kit.ult;
    if (!u || c.d.rage < 100) return;
    c.busy = true; lockFor(c, 1500);
    hideOpening();
    if (c.openPart) { c.openPart = null; c.d.dropOpening(); }
    clearTimeout(c.T.tick);
    updAll();
    playUlt(u.u.title, u.def.name, u.def.school, () => {
      if (!C || C.d.over) return;
      C.busy = false;
      const p = pick(PARTS), evs = C.d.ult(), e = evs.find(x => x.k === 'ult');
      bubble('me crit', fmt(u.u.text, { foe: C.f.name, part: p }));
      if (e && e.k === 'ult') { bubble('foe', `${C.f.name}踉跄后退，${H(p + '受了重创')}！`, e.dmg, 'out'); mark(p); sayFx(e.fx); }
      gainProf(u.def.id, Math.round(20 * C.learn));
      act(evs.filter(x => x.k !== 'ult'));
      if (C && !C.d.over && !C.d.waiting && !C.openPart) next(1100);
    });
    return;
  }
  if (k === 'jcy') {
    if ((S.items.jcy || 0) < 1 || c.d.hp >= c.d.hpMax || c.d.jcyN >= JCY_MAX) return;
    S.items.jcy--;
    lockFor(c, 1200);
    const evs = c.d.jcy(), e = evs.find(x => x.k === 'item');
    bubble('sys', '你服下一包金疮药，伤口一阵清凉。', e && e.k === 'item' ? e.v : 0, 'heal');
    act([]);
    return;
  }
  if (k === 'yield' || k === 'flee') {
    if (f.script) { bubble('sys', '此时此地，无路可退。'); return; }
    lockFor(c, 1000);
    if (k === 'yield') {
      if (f.spar) { bubble('me', '你收剑后退，抱拳道：「是我输了。」'); act(c.d.yieldUp()); return; }
      bubble('foe', `${f.name}狞笑：「认输？晚了！」`);
      c.d.mom = Math.max(5, c.d.mom - 3);
      updAll();
      return;
    }
    const evs = c.d.flee();
    if (evs.some(x => x.k === 'end')) bubble(f.spar ? 'foe' : 'me', f.spar ? `${f.name}收剑笑道：「兄台若有急事，改日再比。」` : '你虚晃一剑，转身夺路而走。');
    act(evs);
  }
}

/** 效果上身时说一句 */
function sayFx(fx: string[]): void {
  const c = C!;
  for (const k of new Set(fx)) { const say = FX_SAY[k as keyof typeof FX_SAY]; if (say) bubble('aside', say(c.f.name)); }
}

/** 施展一门绝招 */
function usePerform(i: number): void {
  const c = C!, x = c.kit.performs[i];
  if (!x || !c.d.canPerform(i)) return;
  lockFor(c, 600 + 150 * x.hits);
  const part = pick(PARTS);
  bubble('me', fmt(x.text, { foe: c.f.name, part }));
  const evs = c.d.perform(i), e = evs.find(y => y.k === 'perform');
  if (e && e.k === 'perform') {
    if (e.dmg > 0) { bubble('foe', gentle(c.f) ? `${c.f.name}回${c.f.ws}不及，${H(part)}被你点中。` : `${c.f.name}${pick(['闷哼一声', '闪避不及', '回' + c.f.ws + '不及'])}，${H(part + '受伤')}。`, e.dmg, 'out'); mark(part); }
    else if (x.hits) bubble('foe', `${c.f.name}拼着衣衫被划破，堪堪避过这一招。`);
    sayFx(e.fx);
  }
  if (c.kit.outer) gainProf(c.kit.outer.id, Math.round(3 * c.learn));
  act(evs.filter(y => y.k !== 'perform'));
}

/** 全屏书法题字，播完后执行 after */
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
  const inner = (): string => skillById(S.loadout.neigong ?? '')?.name ?? '内息';
  const start = (e: PointerEvent): void => {
    if (!C || b.disabled || C.d.prompt || C.chargeT) return;
    e.preventDefault();
    C.chargeT = performance.now();
    C.d.charging = true;
    b.classList.add('charging');
    b.querySelector('small')!.textContent = '蓄力中…';
    try { b.setPointerCapture(e.pointerId); } catch { /* 少数浏览器不支持 */ }
  };
  const end = (): void => {
    if (!C || !C.chargeT) return;
    const held = performance.now() - C.chargeT;
    cancelCharge();
    if (held < 250) { bubble('sys', '按住「运功」不放即可蓄力，松手后下一招威力提升。'); updSkills(); return; }
    C.d.addCharge(Math.round(Math.min(1, held / 1500) * 80) / 100);
    bubble('me', `你凝神运转${inner()}，一股劲力缓缓注入${weaponWord(S)}上。<span class="note">下一招 +${Math.round(C.d.charge * 100)}%</span>`);
    updSkills();
  };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('lostpointercapture', end);
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => {
    if (e.detail !== 0 || !C || b.disabled || C.d.prompt) return;
    C.d.addCharge(0.4);
    bubble('me', `你凝神运转${inner()}。<span class="note">下一招 +${Math.round(C.d.charge * 100)}%</span>`);
    updSkills();
  });
}

/* ---------- 暂停 ---------- */

function pauseFight(): void {
  const c = C;
  if (!c || c.d.over || c.paused) return;
  c.paused = true;
  clearTimeout(c.T.tick);
  if (c.ui && !c.ui.untimed) {
    c.ui.rem = Math.max(400, c.ui.end - performance.now());
    clearTimeout(c.T.prompt);
    clearInterval(c.T.cd);
    const fill = $('#rFill')!;
    const w = getComputedStyle(fill).width;
    fill.style.transition = 'none';
    fill.style.width = w;
  }
  if (c.openPart) { c.openPart = null; hideOpening(); c.d.dropOpening(); }
  if (c.chargeT) cancelCharge();
  $('#pauseL')!.hidden = false;
  updSkills();
}

function resumeFight(): void {
  const c = C;
  if (!c || !c.paused) return;
  c.paused = false;
  $('#pauseL')!.hidden = true;
  if (c.ui && !c.ui.untimed) armPrompt(c.ui.rem ?? 1000, (c.ui.rem ?? 1000) / c.ui.dur);
  else if (!c.ui && !c.busy) next(600);
  updSkills();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFight(); });

/* ---------- 界面刷新 ---------- */

function updAll(): void {
  if (!C) return;
  updFoe(); updMom(); updPlayer(); updSkills();
  // 考校「接三十招」：写明撑到第几合算过
  $('#fRound')!.textContent = C.f.rounds ? `第 ${C.d.round} / ${C.f.rounds} 合` : `第 ${C.d.round} 合`;
}

function updFoe(): void {
  const c = C!, d = c.d;
  const r = Math.max(0, d.ehp) / d.ehpMax, pct = Math.round(r * 100), hp = $('#fHp')!;
  hp.querySelector('i')!.style.width = pct + '%';
  hp.querySelector('span')!.textContent = pct + '%';
  const breath = r > 0.7 ? '气息平稳' : r > 0.4 ? '气息粗重' : r > 0.15 ? '摇摇欲坠' : '强弩之末';
  const tags = [`<span class="tag">${breath}</span>`].concat(c.recent.slice(-2).reverse().map(p => `<span class="tag danger">${p}带伤</span>`));
  if (d.phase === 2) tags.push('<span class="tag warn">狂怒</span>');
  for (const k of d.foeStatus()) { const t = FOE_FX_TAG[k]; if (t) tags.push(`<span class="tag ${t[1]}">${t[0]}</span>`); }
  if (c.prep.some(p => p.atk || p.big)) tags.push('<span class="tag info">知彼</span>');
  for (const p of c.prep) if (p.ally) tags.push(`<span class="tag accent">援手·${p.ally.name}</span>`);
  $('#fTags')!.innerHTML = tags.join('');
  $('#wounds')!.innerHTML = Object.entries(c.wounds).map(([p, n]) => { const [x, y] = PART_XY[p]; return `<circle class="wd" cx="${x}" cy="${y}" r="${Math.min(3 + n, 6)}"/>`; }).join('');
}

function updMom(): void {
  const m = Math.round(C!.d.mom);
  $('#mMe')!.textContent = `你 ${m}%`;
  $('#mOp')!.textContent = `${100 - m}% 对手`;
  $('#mSt')!.textContent = '攻守之势 · ' + (m >= 75 ? '你压制对手' : m >= 56 ? '你占上风' : m > 44 ? '势均力敌' : m > 25 ? '对手占优' : '你被压制');
  $('#mA')!.style.flexGrow = String(m);
  $('#mB')!.style.flexGrow = String(100 - m);
}

function updPlayer(): void {
  const c = C!, d = c.d;
  // 没有杀招的（序章头一场），怒气攒满了也没处使：不摆怒气条
  $('#pBars')!.innerHTML = mb('气血', Math.round(d.hp), d.hpMax, 'hp') + mb('内力', Math.round(d.mp), d.mpMax, 'mp') + (c.kit.ult ? mb('怒气', Math.floor(d.rage), 100, 'rage') : '');
  // 气血见底：攻守之势再好，也该吃药、该走了（势和气血是两回事）
  const low = d.hp > 0 && d.hp < d.hpMax * 0.25;
  $('#pBars')!.classList.toggle('low', low);
  if (low && !c.lowWarned && !d.over) {
    c.lowWarned = true;
    bubble('sys', '你气血见底了。攻守之势再好，挨上一记重的也撑不住——该吃药，或者走。');
  }
}

function setSkill(id: string, disabled: boolean, sub: string): HTMLButtonElement {
  const b = $(id) as HTMLButtonElement;
  b.disabled = disabled;
  const s = b.querySelector('small');
  if (s) s.textContent = sub;
  return b;
}

function updSkills(): void {
  const c = C!, d = c.d;
  const locked = performance.now() < c.lock;
  const dis = d.over || c.busy || c.paused || d.waiting || locked, act0 = dis || !!d.prompt;
  c.kit.performs.forEach((_, i) => setSkill(`#skP${i}`, act0 || !d.canPerform(i), d.pcd[i] > 0 ? `调息 ${d.pcd[i]} 合` : `内力 ${d.performCost(i)}`));
  const ch = $('#skCharge') as HTMLButtonElement;
  ch.disabled = act0;
  if (!c.chargeT) {
    ch.querySelector('small')!.textContent = d.charge > 0 ? `已蓄 +${Math.round(d.charge * 100)}%` : '按住运功';
    ch.classList.toggle('charged', d.charge > 0);
  }
  const ready = !!c.kit.ult && d.rage >= 100;
  const ult = setSkill('#skUlt', act0 || !ready, !c.kit.ult ? '没有杀招' : ready ? '怒气已满' : `怒气 ${Math.floor(d.rage)}/100`);
  ult.classList.toggle('ready', ready);
  const jcy = $('#skJcy') as HTMLButtonElement;
  jcy.textContent = d.jcyN >= JCY_MAX ? '金疮药 · 本场用尽' : `金疮药 ×${S.items.jcy || 0}`;
  jcy.disabled = act0 || (S.items.jcy || 0) < 1 || d.hp >= d.hpMax || d.jcyN >= JCY_MAX;
  const dart = $('#skDart') as HTMLButtonElement;
  dart.textContent = `暗器 ×${S.items.fhs || 0}`;
  dart.disabled = act0 || (S.items.fhs || 0) < 1;
  // 逃跑、认输也归这里管：原来从不变灰，锁着、暂停着点了也没反应
  const out = $('#skOut') as HTMLButtonElement | null;
  if (out) out.disabled = act0;
}

/* ---------- 收场 ---------- */

function endFight(res: DuelRes): void {
  const c = C;
  if (!c) return;
  c.res = res;
  clearTimeout(c.T.tick); clearTimeout(c.T.prompt); clearTimeout(c.T.open); clearInterval(c.T.cd);
  c.ui = null;
  c.openPart = null;
  hideOpening();
  setPromptUI(false);
  cancelCharge();
  sync();
  // 这一场吃重招落下的伤，打完才起作用，带到下一场（engine/jiesuan.ts）
  c.hurt = takeWounds(c.f, c.d.log.taken, res, c.odds);
  if (res === 'win' && c.f.win) bubble('foe', c.f.win);
  else if (res === 'lose' && c.f.lose) bubble('sys', c.f.lose);
  updAll();
  // 胜负以后：打倒对手，先问怎样处置他，再出结算
  const opts = fateOpts(c.f, res);
  c.after = opts.length ? { plea: c.f.results.win.after!.plea, opts } : null;
  window.setTimeout(c.after ? showAftermath : showResult, reduceMotion ? 300 : 1300);
}

/* ---------- 胜负以后 ---------- */

function showAftermath(): void {
  const c = C;
  if (!c || !c.after) return;
  $('#idleBody')!.hidden = true;
  $('#pBars')!.hidden = true;
  $('#rHead')!.innerHTML = '<b>胜负以后</b><span>怎样处置他，由你定</span>';
  $('#fatePlea')!.textContent = c.after.plea;
  $('#fateOpts')!.innerHTML = c.after.opts.map((o, i) =>
    `<button class="ropt fate" data-act="fFate:${i}"><span class="rn"><b>${o.label}</b></span><span class="rx">${o.sub ?? ''}</span></button>`).join('');
  $('#fateBody')!.hidden = false;
  swapped();
}

function chooseFate(i: number): void {
  const c = C;
  if (!c || !c.after || c.pick) return;
  const o = c.after.opts[i];
  if (!o) return;
  c.pick = o;
  $('#fateBody')!.hidden = true;
  bubble('foe', c.after.plea);
  bubble(o.label.includes('杀') ? 'me crit' : 'me', o.say);
  window.setTimeout(showResult, reduceMotion ? 300 : 1100);
}

function composeStory(c: Fight): string {
  const lg = c.d.log, parts: string[] = [];
  parts.push(`话说${dateStr(S)}${shichen(S.min)}，扬州${room(S.loc).name}细雨蒙蒙。${c.f.title}${c.f.name}正自横行，忽有一位青衫少年按剑而来，拦在当中。`);
  c.prep.forEach(p => { if (p.story) parts.push(p.story); });
  if (c.big.length) parts.push(`那${c.f.name}的${c.big.map(x => '「' + x + '」').join('、')}何等凶猛，少年却${lg.parry ? liang(lg.parry) + '次见招拆招，教他占不到半分便宜' : '硬是咬牙撑了下来'}。`);
  if (lg.saw) parts.push(`他的虚招，少年${liang(lg.saw)}次看破。`);
  if (lg.open) parts.push(`更有${liang(lg.open)}次瞧出破绽，趁虚而入。`);
  if (lg.ult) parts.push(`最后一招「${c.kit.ult?.def.name ?? '杀招'}」，石破天惊——`);
  parts.push(`两人斗到第${cn(c.d.round)}合，${c.f.name}终于弃${c.f.ws}跪倒。`);
  parts.push('此事一传十、十传百，扬州城里人人都在打听：这位少年，究竟是什么来头？');
  return parts.join('');
}

/** 由结算效果自动生成奖励标签 */
function rewardChips(effects: Effect[] | undefined, hpEnd = 0): string[] {
  const chips: string[] = [];
  for (const e of effects || []) {
    if (e.type === 'prof') chips.push(`<span class="tag accent">${skillById(e.skill)?.name} 熟练 +${e.amount}</span>`);
    else if (e.type === 'lilian') chips.push(`<span class="tag accent">历练 +${e.amount}</span>`);
    else if (e.type === 'learn') chips.push(`<span class="tag accent">习得 ${skillById(e.skill)?.name}</span>`);
    // 正负分开写：原来降恶名也写成「恶名 +-2」、还用红色（审查 H18）
    else if (e.type === 'xia') chips.push(e.delta >= 0 ? `<span class="tag accent">侠义 +${e.delta}</span>` : `<span class="tag danger">侠义 −${-e.delta}</span>`);
    else if (e.type === 'eming') chips.push(e.delta >= 0 ? `<span class="tag danger">恶名 +${e.delta}</span>` : `<span class="tag accent">恶名 −${-e.delta}</span>`);
    else if (e.type === 'silver') chips.push(e.delta > 0 ? `<span class="tag accent">银两 +${e.delta} 文</span>` : `<span class="tag danger">银两 −${-e.delta} 文</span>`);
    else if (e.type === 'item' && e.delta > 0) chips.push(`<span class="tag accent">获得 ${itemById(e.id)?.name}</span>`);
    else if (e.type === 'title') chips.push(`<span class="tag purple">名号「${e.value}」</span>`);
    // 打完时气血本就不止这几成的，不说「恢复」
    else if (e.type === 'heal' && e.hpAtLeast && hpEnd < S.hpMax * e.hpAtLeast) chips.push(`<span class="tag">气血恢复至${cn(Math.round(e.hpAtLeast * 10))}成</span>`);
    else if (e.type === 'rel') chips.push(`<span class="tag">${npcName(e.npc)} · ${e.value}</span>`);
    else if (e.type === 'jobDone') { const j = jobById(e.id); if (j) chips.push(`<span class="tag accent">交差 · ${j.sect ? `${j.sect}贡献 +${jobGongxian(j)}` : `银两 +${jobPay(j)} 文`}</span>`); }
    else if (e.type === 'jobFail') chips.push(`<span class="tag danger">差事办砸了 · ${jobById(e.id)?.sect ? '扣门派贡献' : '地位降一级'}</span>`);
    else if (e.type === 'standing' && e.delta > 0) chips.push(`<span class="tag accent">地位升一级</span>`);
    else if (e.type === 'shenfen') chips.push(`<span class="tag purple">身份 · ${SHENFEN[e.id]?.name ?? e.id}</span>`);
  }
  return chips;
}

/** 结算页上的「援手」：谁来帮了、打掉对手几成 */
function alliesHTML(c: Fight): string {
  const rows = c.prep.filter(p => p.ally).map((p, i) => {
    const n = Math.round((c.allyDealt[i] / c.d.ehpMax) * 10);
    return `<div><span class="tag accent">${p.ally!.name}</span><span>${c.allyDealt[i] > 0 ? `出手${liang(c.d.allyHits[i])}次，替你打掉他${n >= 1 ? liang(n) + '成' : '一些'}气血。` : '来了，还没来得及出手。'}</span></div>`;
  });
  return rows.length ? `<div class="r-sub">援手</div><div class="news">${rows.join('')}</div>` : '';
}

function showResult(): void {
  const c = C;
  if (!c || !c.res) return;
  // 结算：历练、结算效果、备战的后果、胜负以后那条路的后果（engine/jiesuan.ts）
  const pk = c.pick;
  const { r, ll, out, effects } = settle(c.f, c.res, c.prep, pk);
  if (!r) { closeFight(); return; }
  if (r.silent) {
    closeFight();
    afterOutcome(run(r.then));
    return;
  }
  let story = pk?.story ?? (r.story || '');
  if (story === '@compose') { story = composeStory(c); S.story = story; }
  else story = fmt(story, textVars());
  const lg = c.d.log;
  const statline = `<p class="statline">${c.f.rounds ? `接了 ${c.d.round} / ${c.f.rounds} 招` : `共 ${c.d.round} 合`} · 见招拆招得手 ${lg.parry} 次${lg.saw ? ` · 看破虚招 ${lg.saw} 次` : ''}${lg.fooled ? ` · 上当 ${lg.fooled} 次` : ''} · 破绽 ${lg.open} 次 · 杀招 ${lg.ult} 次</p>`;
  const fateLine = pk ? `<div class="r-sub">胜负以后 · ${pk.label}</div><p class="story">${pk.later}</p>` : '';
  const hurt = Object.entries(c.hurt ?? {}) as [keyof Wounds, number][];
  const WHAT: Record<keyof Wounds, string> = { hand: '拆招、抢攻差一截，出手轻一成', foot: '闪避差一截', inner: '硬接差一截，内力回得慢' };
  const hurtLine = hurt.length ? `<div class="r-sub">落下的伤</div><div class="news">${hurt.map(([z]) => `<div><span class="tag ${S.wounds[z] >= 2 ? 'danger' : 'warn'}">${ZONE_NAME[z]}伤 ${liang(S.wounds[z])}级</span><span>${WHAT[z]}。${woundNote(S.wounds[z])}。</span></div>`).join('')}</div>` : '';
  const chips = rewardChips([...effects, ...(ll ? [{ type: 'lilian', amount: ll } as Effect] : [])], c.d.hp).concat(out.breaks.map(x => `<span class="tag info">${x}</span>`));
  c.then = r.then;
  save();
  openSheet(`<div class="r-h"><span class="tag ${c.res === 'win' ? (c.f.spar ? 'accent' : 'danger') : ''}">${r.tag || ''}</span><h2>${pk?.title ?? (r.title || '')}</h2></div>
    ${r.story === '@compose' && !pk?.story ? '<div class="r-sub">战后说书</div>' : ''}<p class="story">${story}</p>${fateLine}${alliesHTML(c)}${hurtLine}${statline}
    ${chips.length ? `<div class="rewards">${chips.join('')}</div>` : ''}${r.growth ? growthHTML() : ''}
    <button class="btn" data-act="fResult">${pk && r.button === '定他的下场' ? '了结此事' : r.button || '继续'}</button>`);
  swapped();
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
  fReact: v => { if (C && C.ui && !tooSoon()) resolveTell(v as RespKey); },
  fOpening: () => takeOpening(),
  fPause: () => pauseFight(),
  fResume: () => resumeFight(),
  fFate: v => { if (!tooSoon()) chooseFate(Number(v)); },
  fResult: () => {
    if (tooSoon()) return;
    const then = C?.then;
    closeSheet();
    closeFight();
    // 打完一架时辰走了一刻，过了约期的算失约（engine/shiguang.ts）
    checkYue(S);
    if (then) afterOutcome(run(then));
  }
});

hooks.startFight = startFight;

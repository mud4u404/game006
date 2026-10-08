import { S } from '../../core/state';
import { GRADES, REALMS, REALM_NEED, SKILLS, SLOT_NAME, itemById, skillById } from '../../content';
import { CAT_WEAPON, OUTER } from '../../content/skills';
import type { SkillDef, Slot } from '../../content/types';
import { RESP, huohou } from '../../engine/formulas';
import { activeOuter, fits, respSkill, slotSkill, weaponReady, xiuwei } from '../../engine/wuxue';
import { canPerform, realmCap } from '../../engine/shicheng';
import { RETREAT } from '../../engine/lilian';

const GRADE_CLS: Record<string, string> = Object.fromEntries(GRADES);

export function viewWugong(): string {
  const opts: [string, string][] = [['1', '一日'], ['7', '七日'], ['30', '一月']];
  const learned = SKILLS.filter(k => S.skills[k.id]);
  return `
  ${loadoutCard()}
  <section class="card here"><div class="sec-h"><h2>闭关修炼</h2><span class="count">历练 ${S.lilian ?? 0}</span></div>
    <p class="muted">功夫是在江湖上长的：实战、了结一件事、高人一句指点，都会攒下历练。闭关是把历练消化成功夫，一日最多消化 ${RETREAT[1].cap}，七日 ${RETREAT[7].cap}，一月 ${RETREAT[30].cap}。没有历练，闭门造车，进境有限。</p>
    ${S.chapter === 0
      ? '<p class="muted">江伯还病着，眼下不是闭关的时候。</p>'
      : `<div class="acts">${opts.map(([d, l]) => `<button class="act spar" data-act="retreat:${d}">${l}</button>`).join('')}</div>`}
  </section>
  <section class="card here"><div class="sec-h"><h2>见招拆招</h2></div>
    <p class="muted">对手出重招时，你能用的应对来自你搭配的武功：内功硬接，轻功闪避，出手的那门外功拆招、抢攻。成算取决于你的火候与对手这一招的强弱，境界越高，成算越高；武功的性质还有相生相克。</p></section>
  <section class="card here"><div class="sec-h"><h2>品级</h2></div>
    <div class="grades">${GRADES.map(([g, c]) => `<span class="tag g-${c}">${g}</span>`).join('')}</div>
    <p class="muted">品级是武功的先天资质，境界是你的苦功。低品武功练到极致，一样能技惊四座。</p></section>
  ${learned.map(skillCard).join('')}`;
}

/* ---------- 搭配：五个位置，点一个位置换武功（docs/zhuangbei.md 第二节） ---------- */

const SLOT_ORDER: Slot[] = ['neigong', 'qinggong', 'fist', 'weapon', 'ult'];
/** 每个位置在见招拆招里管什么 */
const SLOT_ROLE: Record<Slot, string> = { neigong: '硬接 · 内力 · 绝招的根', qinggong: '闪避', fist: '空手时出手', weapon: '兵器对得上时出手', ult: '怒气满时的杀招' };

function loadoutCard(): string {
  const outer = activeOuter(S);
  const w = S.gear.weapon ? itemById(S.gear.weapon) : undefined;
  const hand = outer
    ? `出手：<b>${outer.name}</b>${weaponReady(S) && w ? `（${w.name}）` : '（空手）'}`
    : '出手：<b>没有能用的外功</b>，只能随手招架';
  const rows = SLOT_ORDER.map(slot => {
    const def = slotSkill(S, slot);
    const note = slot === 'weapon' && def && !weaponReady(S) ? `<small class="muted">手里没有${CAT_WEAPON[def.category] ?? '对得上的兵器'}，使不出来</small>`
      : def && (def.performs?.length || def.ult) && !canPerform(S, def) ? '<small class="muted">没有本门内功打底，只剩普通招式</small>'
      : `<small class="muted">${SLOT_ROLE[slot]}</small>`;
    return `<button class="row slotrow" data-act="slotPick:${slot}"><span class="sl">${SLOT_NAME[slot]}</span><span class="sv"><b>${def ? def.name : '空'}</b>${note}</span><span class="chev">换</span></button>`;
  }).join('');
  return `<section class="card here"><div class="sec-h"><h2>搭配</h2><span class="count">修为 · ${xiuwei(S).rank}</span></div>
    <div class="rows">${rows}</div>
    <p class="muted">${hand}。战斗中不能换。</p></section>`;
}

/** 换成这门武功以后，这个位置管的那几项应对，火候各是多少 */
function preview(slot: Slot, id: string | undefined): string {
  const t = { ...S, loadout: { ...S.loadout } };
  if (id) t.loadout[slot] = id; else delete t.loadout[slot];
  const ks = RESP.filter(r => respSkill(t, r.k) && (slot === 'neigong' ? r.k === 'block' : slot === 'qinggong' ? r.k === 'dodge' : slot !== 'ult' && (r.k === 'parry' || r.k === 'rush')));
  if (slot === 'ult') { const u = id ? skillById(id)?.ult : undefined; return u ? `杀招 ${u.dmg[0]}～${u.dmg[1]}` : ''; }
  return ks.map(r => `${r.act} ${huohou(t, r.k)}`).join(' · ');
}

export function slotSheet(slot: Slot): string {
  const cur = S.loadout[slot];
  const cands = SKILLS.filter(k => S.skills[k.id] && fits(k, slot));
  const rows = cands.map(k => {
    const on = k.id === cur;
    const warn = (k.performs?.length || k.ult) && !canPerform(S, k) ? ' · 没有本门内功，绝招使不出' : '';
    return `<div class="row"><span>${k.name}<small class="muted">${k.grade} · ${REALMS[S.skills[k.id]!.r]} · ${preview(slot, k.id) || '—'}${warn}</small></span>${on ? '<span class="tag accent">在用</span>' : `<button class="act" data-act="slotSet:${slot}:${k.id}">换上</button>`}</div>`;
  }).join('');
  return `<div class="r-h"><span class="tag accent">搭配</span><h2>${SLOT_NAME[slot]}</h2></div>
    <p class="muted">${SLOT_ROLE[slot]}。下面的数是换上以后的火候，越高成算越高。</p>
    <div class="rows">${rows || '<p class="muted">还没有学会能放进这里的武功。</p>'}</div>
    <div class="btnrow">${cur ? `<button class="btn ghost" data-act="slotSet:${slot}:">卸下</button>` : ''}<button class="btn ghost" data-act="sheetClose">关闭</button></div>`;
}

const kind = (k: SkillDef): string => (OUTER.includes(k.category) ? '外功 · ' + k.category : k.category);

function useText(k: SkillDef, realm: number): string {
  const parts: string[] = [`${k.nature}${k.reach && k.reach !== '徒手' ? ' · ' + k.reach + '兵' : ''}`];
  if (k.performs?.length) parts.push(`绝招 ${k.performs.map(p => (p.realm ?? 0) <= realm ? `「${p.name}」` : `「${p.name}」（${REALMS[p.realm!]}）`).join('')}`);
  if (k.ult) parts.push('杀招 · 怒气满时可用');
  return parts.join(' · ');
}

function skillCard(k: SkillDef): string {
  const s = S.skills[k.id]!;
  const need = REALM_NEED[s.r];
  const pct = Math.min(100, Math.round((s.p / need) * 100));
  // 外功受内功所限：攒够了熟练却突破不了，就是到了瓶颈（见 docs/menpai.md 第七节）
  const stuck = s.p >= need && s.r < REALMS.length - 1 && s.r >= realmCap(S, k);
  const slot = (Object.keys(SLOT_NAME) as Slot[]).find(x => S.loadout[x] === k.id);
  const resps = RESP.filter(r => respSkill(S, r.k)?.id === k.id);
  return `<section class="card sk-card">
    <div class="sk-h"><b>${k.name}</b><span class="tag g-${GRADE_CLS[k.grade]}">${k.grade}</span><span class="tag">${kind(k)}</span>${slot ? `<span class="tag accent">${SLOT_NAME[slot]}</span>` : ''}</div>
    <div class="realm"><span>${REALMS[s.r]}</span><small>${stuck ? '瓶颈 · 内功根基不够' : `熟练 ${s.p} / ${need}`}</small></div>
    <div class="tr2"><i style="width:${pct}%"></i></div>
    <p class="sk-d">${k.desc}</p>
    ${k.moves ? `<div class="moves">${k.moves.map(m => `<span class="tag"${(m.realm ?? 0) > s.r ? ' style="opacity:.4"' : ''}>${m.name}</span>`).join('')}</div>` : ''}
    <p class="muted">${useText(k, s.r)}</p>
    ${(k.performs?.length || k.ult) && !canPerform(S, k) ? '<p class="muted">没有本门内功打底，绝招、杀招使不出来，只剩普通招式。</p>' : ''}
    ${resps.map(r => `<div class="d-h"><span class="tag accent">见招拆招 · ${r.act}</span><small>当前火候 ${huohou(S, r.k)}</small></div>`).join('')}
  </section>`;
}

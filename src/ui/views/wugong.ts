import { S } from '../../core/state';
import { cn, liang } from '../../core/util';
import { GRADES, REALMS, REALM_NEED, SKILLS, SLOT_NAME, itemById, skillById } from '../../content';
import { CAT_WEAPON, JIANGHU_RULE, OUTER } from '../../content/skills';
import type { SkillDef, Slot } from '../../content/types';
import { RESP, huohou } from '../../engine/formulas';
import { activeOuter, fits, respSkill, slotSkill, weaponReady } from '../../engine/wuxue';
import { gongliText, tierNow } from '../../engine/ren';
import { canPerform, realmCap } from '../../engine/shicheng';
import { RETREAT, gongliCeiling } from '../../engine/lilian';
import { LODGING, allowance, zhuOf } from '../../engine/shiguang';
import type { Zhu } from '../../core/state';

const GRADE_CLS: Record<string, string> = Object.fromEntries(GRADES);

export function viewWugong(): string {
  const opts: [string, string][] = [['1', '一日'], ['7', '七日'], ['30', '一月']];
  const learned = SKILLS.filter(k => S.skills[k.id]);
  return `
  ${loadoutCard()}
  <section class="card here-card"><div class="sec-h"><h2>闭关修炼</h2><span class="count">历练 ${S.lilian ?? 0}</span></div>
    <p class="muted">功夫是在江湖上长的：实战、了结一件事、高人一句指点，都会攒下历练。闭关是把历练消化成功夫，一日最多消化 ${RETREAT[1].cap}，七日 ${RETREAT[7].cap}，一月 ${RETREAT[30].cap}。没有历练，闭门造车，进境有限。</p>
    <p class="muted">闭关也打坐长功力：闭关一月功力深近一年，内功越深越快，也熬得越深（现在${gongliText(S.gongli)}，内功这一重最多熬到${gongliText(gongliCeiling(S))}）。轻伤过一日自己好；重伤闭关养不好，要找郎中、服药。</p>
    <p class="muted">住处：${zhuPick()}</p>
    ${S.chapter === 0
      ? '<p class="muted">江伯还病着，眼下不是闭关的时候。</p>'
      : `<p class="muted">江湖跑不过现实：${allowance(S) >= 1 ? `现在最多还能闭关${cn(allowance(S))}日` : '这几日江湖上的日子已经走在现实前头，先下线歇歇'}。下线就是静修，现实一个钟头算江湖一日，回来先读出关邸报。</p>
        <div class="acts">${opts.map(([d, l]) => `<button class="act spar" data-act="retreat:${d}"${allowance(S) < 1 ? ' disabled' : ''}>${l}</button>`).join('')}</div>`}
  </section>
  <section class="card here-card"><div class="sec-h"><h2>见招拆招</h2></div>
    <p class="muted">对手出重招时，你能用的应对来自你搭配的武功：内功硬接，轻功闪避，出手的那门外功拆招、抢攻。成算取决于你的造诣与对手这一招的强弱，境界越高，成算越高；武功的性质还有相生相克。</p>
    <ul class="muted resp-help">
      <li><b>硬接</b>：比内力，稳；得手把他震退。最怕虚招，一掌落空。</li>
      <li><b>闪避</b>：比身法；得手他招式用老，露出空门。</li>
      <li><b>拆招</b>：比招数巧拙，不怕虚招；得手顺势还他一记。</li>
      <li><b>抢攻</b>：比谁先找到空隙，最险；得手重创，失手正撞上他这一招。</li>
    </ul></section>
  <section class="card here-card"><div class="sec-h"><h2>品级</h2></div>
    <div class="grades">${GRADES.map(([g, c]) => `<span class="tag g-${c}">${g}</span>`).join('')}</div>
    <p class="muted">品级是武功的先天资质，境界是你的苦功。低品武功练到极致，一样能技惊四座。</p></section>
  ${learned.map(skillCard).join('')}`;
}

/** 住处三选一（engine/shiguang.ts 的 zhuOf）：闭关、下线静修都按它 */
function zhuPick(): string {
  const cur = zhuOf(S);
  const opts: [Zhu, string, boolean][] = [
    ['inn', `客栈，一日${LODGING.inn}文`, true],
    ['lusu', '露宿，不花钱，打坐参悟打八折', true],
    ['home', S.sect ? `回${S.sect.school}住，不花钱` : '师门（拜了师才有）', !!S.sect]
  ];
  return `</p><div class="acts zhu">${opts.map(([k, l, ok]) => `<button class="act${cur === k ? ' on' : ''}" data-act="zhu:${k}"${ok ? '' : ' disabled'} aria-pressed="${cur === k}">${l}</button>`).join('')}</div><p class="muted">下线静修也住这儿。`;
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
  return `<section class="card here-card"><div class="sec-h"><h2>搭配</h2><span class="count">${tierNow(S).name} · 功力${gongliText(S.gongli)}</span></div>
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
    return `<div class="row"><span>${k.name}<small class="muted">${k.grade} · ${schoolName(k)} · ${REALMS[S.skills[k.id]!.r]} · ${preview(slot, k.id) || '—'}${warn}</small></span>${on ? '<span class="tag accent">在用</span>' : `<button class="act" data-act="slotSet:${slot}:${k.id}">换上</button>`}</div>`;
  }).join('');
  return `<div class="r-h"><span class="tag accent">搭配</span><h2>${SLOT_NAME[slot]}</h2></div>
    <p class="muted">${SLOT_ROLE[slot]}。下面的数是换上以后的造诣，越高成算越高。</p>
    <div class="rows">${rows || '<p class="muted">还没有学会能放进这里的武功。</p>'}</div>
    <div class="btnrow">${cur ? `<button class="btn ghost" data-act="slotSet:${slot}:">卸下</button>` : ''}<button class="btn ghost" data-act="sheetClose">关闭</button></div>`;
}

const kind = (k: SkillDef): string => (OUTER.includes(k.category) ? '外功 · ' + k.category : k.category);
/** 出处：门派武功写门派（绝招要本门内功打底），江湖散学谁都能学 */
const schoolName = (k: SkillDef): string => (k.school === JIANGHU_RULE.school ? '江湖散学' : k.school);

function useText(k: SkillDef, realm: number): string {
  const parts: string[] = [schoolName(k), `${k.nature}${k.reach && k.reach !== '徒手' ? ' · ' + k.reach + '兵' : ''}`];
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
    <div class="sk-h"><b>${k.name}</b><span class="tag g-${GRADE_CLS[k.grade]}">${k.grade}</span>${slot && SLOT_NAME[slot] === kind(k) ? '' : `<span class="tag">${kind(k)}</span>`}${slot ? `<span class="tag accent">${SLOT_NAME[slot]}</span>` : ''}</div>
    <div class="realm"><span>第${cn(s.r + 1)}重 · ${REALMS[s.r]}</span><small>${stuck ? '瓶颈 · 内功根基不够' : s.r >= REALMS.length - 1 ? '已到顶' : `${Math.floor((s.p / need) * 10) ? liang(Math.min(9, Math.floor((s.p / need) * 10))) + '成火候' : '初学'} · 熟练 ${s.p} / ${need}`}</small></div>
    <div class="tr2"><i style="width:${pct}%"></i></div>
    <p class="sk-d">${k.desc}</p>
    ${k.moves ? `<div class="moves">${k.moves.map(m => `<span class="tag"${(m.realm ?? 0) > s.r ? ' style="opacity:.4"' : ''}>${m.name}</span>`).join('')}</div>` : ''}
    <p class="muted">${useText(k, s.r)}</p>
    ${(k.performs?.length || k.ult) && !canPerform(S, k) ? '<p class="muted">没有本门内功打底，绝招、杀招使不出来，只剩普通招式。</p>' : ''}
    ${resps.map(r => `<div class="d-h"><span class="tag accent">见招拆招 · ${r.act}</span><small>造诣 ${huohou(S, r.k)}</small></div>`).join('')}
  </section>`;
}

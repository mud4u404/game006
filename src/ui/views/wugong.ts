import { S } from '../../core/state';
import { GRADES, REALMS, REALM_NEED, SKILLS, SLOT_NAME } from '../../content';
import { OUTER } from '../../content/skills';
import type { SkillDef, Slot } from '../../content/types';
import { RESP, huohou } from '../../engine/formulas';
import { RESP_SLOT, xiuwei } from '../../engine/wuxue';
import { canPerform, realmCap } from '../../engine/shicheng';
import { RETREAT } from '../../engine/lilian';

const GRADE_CLS: Record<string, string> = Object.fromEntries(GRADES);

export function viewWugong(): string {
  const opts: [string, string][] = [['1', '一日'], ['7', '七日'], ['30', '一月']];
  const learned = SKILLS.filter(k => S.skills[k.id]);
  return `
  <section class="card here"><div class="sec-h"><h2>闭关修炼</h2><span class="count">历练 ${S.lilian ?? 0}</span></div>
    <p class="muted">功夫是在江湖上长的：实战、了结一件事、高人一句指点，都会攒下历练。闭关是把历练消化成功夫，一日最多消化 ${RETREAT[1].cap}，七日 ${RETREAT[7].cap}，一月 ${RETREAT[30].cap}。没有历练，闭门造车，进境有限。</p>
    ${S.chapter === 0
      ? '<p class="muted">江伯还病着，眼下不是闭关的时候。</p>'
      : `<div class="acts">${opts.map(([d, l]) => `<button class="act spar" data-act="retreat:${d}">${l}</button>`).join('')}</div>`}
  </section>
  <section class="card here"><div class="sec-h"><h2>见招拆招</h2><span class="count">修为 · ${xiuwei(S).rank}</span></div>
    <p class="muted">对手出重招时，你能用的应对来自你搭配的武功：内功硬接，轻功闪避，主手外功拆招，副手外功抢攻。成算取决于你的火候与对手这一招的强弱，境界越高，成算越高；武功的性质还有相生相克。</p></section>
  <section class="card here"><div class="sec-h"><h2>品级</h2></div>
    <div class="grades">${GRADES.map(([g, c]) => `<span class="tag g-${c}">${g}</span>`).join('')}</div>
    <p class="muted">品级是武功的先天资质，境界是你的苦功。低品武功练到极致，一样能技惊四座。</p></section>
  ${learned.map(skillCard).join('')}`;
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
  const resp = slot && slot !== 'ult' ? RESP.find(r => RESP_SLOT[r.k] === slot) : undefined;
  return `<section class="card sk-card">
    <div class="sk-h"><b>${k.name}</b><span class="tag g-${GRADE_CLS[k.grade]}">${k.grade}</span><span class="tag">${kind(k)}</span>${slot ? `<span class="tag accent">${slot === 'main' || slot === 'off' ? SLOT_NAME[slot] : '已搭配'}</span>` : ''}</div>
    <div class="realm"><span>${REALMS[s.r]}</span><small>${stuck ? '瓶颈 · 内功根基不够' : `熟练 ${s.p} / ${need}`}</small></div>
    <div class="tr2"><i style="width:${pct}%"></i></div>
    <p class="sk-d">${k.desc}</p>
    ${k.moves ? `<div class="moves">${k.moves.map(m => `<span class="tag"${(m.realm ?? 0) > s.r ? ' style="opacity:.4"' : ''}>${m.name}</span>`).join('')}</div>` : ''}
    <p class="muted">${useText(k, s.r)}</p>
    ${(k.performs?.length || k.ult) && !canPerform(S, k) ? '<p class="muted">没有本门内功打底，绝招、杀招使不出来，只剩普通招式。</p>' : ''}
    ${resp ? `<div class="d-h"><span class="tag accent">见招拆招 · ${resp.act}</span><small>当前火候 ${huohou(S, resp.k)}</small></div>` : ''}
  </section>`;
}

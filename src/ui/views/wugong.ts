import { S } from '../../core/state';
import { GRADES, REALMS, REALM_NEED, SKILLS } from '../../content';
import type { SkillDef } from '../../content/types';
import { RESP, huohou } from '../../engine/formulas';

const GRADE_CLS: Record<string, string> = Object.fromEntries(GRADES);

export function viewWugong(): string {
  const opts: [string, string][] = [['1', '一日'], ['7', '七日'], ['30', '一月']];
  const learned = SKILLS.filter(k => S.skills[k.id]);
  return `
  <section class="card here"><div class="sec-h"><h2>闭关修炼</h2></div>
    <p class="muted">闭关时光阴流逝，武功与内力缓缓精进。江湖不会等你：出关时，会听到这段日子里的新鲜事。</p>
    ${S.chapter === 0
      ? '<p class="muted">江伯还病着，眼下不是闭关的时候。</p>'
      : `<div class="acts">${opts.map(([d, l]) => `<button class="act spar" data-act="retreat:${d}">${l}</button>`).join('')}</div>`}
  </section>
  <section class="card here"><div class="sec-h"><h2>见招拆招</h2></div>
    <p class="muted">对手出重招时，你能用的应对来自你练成的武功：内功可以硬接，轻功可以闪避，剑法可以拆招，有的剑法还能抢攻。成算取决于你的火候与对手这一招的强弱，境界越高，成算越高。</p></section>
  <section class="card here"><div class="sec-h"><h2>品级</h2></div>
    <div class="grades">${GRADES.map(([g, c]) => `<span class="tag g-${c}">${g}</span>`).join('')}</div>
    <p class="muted">品级是武功的先天资质，境界是你的苦功。低品武功练到极致，一样能技惊四座。</p></section>
  ${learned.map(skillCard).join('')}`;
}

function skillCard(k: SkillDef): string {
  const s = S.skills[k.id]!;
  const need = REALM_NEED[s.r];
  const pct = Math.min(100, Math.round((s.p / need) * 100));
  const resp = k.resp ? RESP.find(r => r.k === k.resp) : undefined;
  return `<section class="card sk-card">
    <div class="sk-h"><b>${k.name}</b><span class="tag g-${GRADE_CLS[k.grade]}">${k.grade}</span><span class="tag">${k.type}</span></div>
    <div class="realm"><span>${REALMS[s.r]}</span><small>熟练 ${s.p} / ${need}</small></div>
    <div class="tr2"><i style="width:${pct}%"></i></div>
    <p class="sk-d">${k.desc}</p>
    ${k.moves ? `<div class="moves">${k.moves.map(m => `<span class="tag">${m}</span>`).join('')}</div>` : ''}
    <p class="muted">${k.use}</p>
    ${resp ? `<div class="d-h"><span class="tag accent">见招拆招 · ${resp.act}</span><small>当前火候 ${huohou(S, resp.k)}</small></div>` : ''}
  </section>`;
}

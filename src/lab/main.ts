/** 武学试算台：调搭配、看成算与绝招预算。只给开发和平衡用，不出现在游戏里（Issue #33）。 */
import '../styles/app.css';
import { FOES, REALMS, SKILLS, SLOT_CATS, SLOT_NAME } from '../content';
import type { AttrKey, FoeDef, SkillNature, SkillReach, Slot, TellDef } from '../content/types';
import { cheng } from '../engine/formulas';
import { xiuwei } from '../engine/wuxue';
import { buildState, oddsTable, performReport, winRate } from './calc';
import { TIER_NAMES } from '../engine/person';

const SLOTS: Slot[] = ['neigong', 'qinggong', 'fist', 'weapon', 'ult'];
const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];
const NATURES: SkillNature[] = ['刚', '柔', '阴', '阳', '中正'];
const REACHES: SkillReach[] = ['长', '短', '徒手'];
const DOMS: TellDef['dom'][] = ['li', 'su', 'qiao'];
const DOM_NAME: Record<string, string> = { li: '力（沉猛）', su: '速（快）', qiao: '巧（变化多）' };
const BUILDS: NonNullable<FoeDef['build']>[] = ['even', 'outer', 'inner', 'light'];
const BUILD_NAME: Record<string, string> = { even: '均衡', outer: '外功见长', inner: '内功深厚', light: '轻功见长' };

const loadout: Partial<Record<Slot, string>> = { neigong: 'xinfa', qinggong: 'taxue', weapon: 'hanjiang' };
const realms: Record<string, number> = { xinfa: 1, taxue: 2, hanjiang: 1, jinghong: 0 };
const attr: Record<AttrKey, number> = { 体魄: 14, 根骨: 12, 身法: 16, 悟性: 15, 胆魄: 11 };
let rank = 1;
let build: NonNullable<FoeDef['build']> = 'even';
let dom: TellDef['dom'] = 'li';
let foeNature: SkillNature | '' = '';
let foeReach: SkillReach | '' = '';

const slotOptions = (slot: Slot): string =>
  '<option value="">（空）</option>' +
  SKILLS.filter(k => SLOT_CATS[slot].includes(k.category)).map(k => `<option value="${k.id}">${k.name}·${k.grade}</option>`).join('');

const realmOptions = (id: string | undefined): string =>
  REALMS.map((n, i) => `<option value="${i}"${realms[id ?? ''] === i ? ' selected' : ''}>${i}·${n}</option>`).join('');

const tellList = FOES.flatMap(f => f.tells.map((t, i) => ({ label: `${f.name}·${t.name}`, f, dom: t.dom, key: `${f.id}:${i}` })));

document.querySelector<HTMLDivElement>('#lab')!.innerHTML = `
  <main class="lab">
    <section class="card" id="in">
      <h1>武学试算台</h1>
      <p class="mut">只给开发和平衡用：调搭配与境界，看成算、修为与绝招预算。</p>
      ${SLOTS.map(slot => `
        <div class="row">
          <label class="f">${SLOT_NAME[slot]}<select id="slot-${slot}">${slotOptions(slot)}</select></label>
          <label class="f">境界<select id="realm-${slot}"></select></label>
        </div>`).join('')}
      <div class="row">
        ${ATTRS.map(k => `<label class="f">${k}<input type="number" id="attr-${k}" min="1" max="99" value="${attr[k]}"></label>`).join('')}
      </div>
      <div class="row">
        <label class="f">对手档次<span class="f"><input type="range" id="rank" min="0" max="5" step="0.1" value="${rank}"><b id="rank-v"></b></span></label>
        <label class="f">路数<select id="build">${BUILDS.map(b => `<option value="${b}">${BUILD_NAME[b]}</option>`).join('')}</select></label>
        <label class="f">重招主项<select id="dom">${DOMS.map(d => `<option value="${d}">${DOM_NAME[d]}</option>`).join('')}</select></label>
        <label class="f">套用内容里的对手<select id="tell"><option value="-1">（自定义）</option>${tellList.map((t, i) => `<option value="${i}">${t.label}</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <label class="f">对手性质<select id="fnature"><option value="">（不算）</option>${NATURES.map(n => `<option>${n}</option>`).join('')}</select></label>
        <label class="f">对手兵器<select id="freach"><option value="">（不算）</option>${REACHES.map(n => `<option>${n}</option>`).join('')}</select></label>
      </div>
    </section>
    <div id="out"></div>
  </main>`;

function syncRealmSelects(): void {
  for (const slot of SLOTS) {
    const sel = document.getElementById(`realm-${slot}`) as HTMLSelectElement;
    sel.innerHTML = realmOptions(loadout[slot]);
    sel.disabled = !loadout[slot];
  }
}

function readInputs(): void {
  for (const slot of SLOTS) loadout[slot] = (document.getElementById(`slot-${slot}`) as HTMLSelectElement).value || undefined;
  for (const slot of SLOTS) {
    const id = loadout[slot];
    if (id) realms[id] = Number((document.getElementById(`realm-${slot}`) as HTMLSelectElement).value) || 0;
  }
  for (const k of ATTRS) attr[k] = Number((document.getElementById(`attr-${k}`) as HTMLInputElement).value) || 0;
  rank = Number((document.getElementById('rank') as HTMLInputElement).value) || 0;
  document.getElementById('rank-v')!.textContent = `${rank.toFixed(1)} · ${TIER_NAMES[Math.floor(rank + 1e-9)]}`;
  build = (document.getElementById('build') as HTMLSelectElement).value as typeof build;
  dom = (document.getElementById('dom') as HTMLSelectElement).value as typeof dom;
  foeNature = (document.getElementById('fnature') as HTMLSelectElement).value as SkillNature | '';
  foeReach = (document.getElementById('freach') as HTMLSelectElement).value as SkillReach | '';
}

function render(): void {
  const s = buildState(loadout, realms);
  for (const k of ATTRS) s.attr[k] = attr[k];
  const foe = { rank, build, dom, nature: foeNature || undefined, reach: foeReach || undefined };
  const rows = oddsTable(s, foe);
  const wr = winRate(s, foe);
  const xw = xiuwei(s);
  const perf = SLOTS.map(slot => {
    const def = SKILLS.find(k => k.id === loadout[slot]);
    if (!def) return '';
    const rep = performReport(def);
    if (!rep.length) return '';
    return `<section class="card"><h2>${SLOT_NAME[slot]} · ${def.name}（${def.grade}）</h2>
      <table><tr><th>绝招</th><th>预算 / 上限</th><th>效率 / 上限</th><th>超标</th></tr>
      ${rep.map(r => `<tr${r.over ? ' class="over"' : ''}><td>${r.name}</td><td>${r.budget.toFixed(0)} / ${r.cap.toFixed(0)}</td><td>${r.efficiency.toFixed(2)} / ${r.effCap.toFixed(2)}</td><td>${r.over ? '是' : ''}</td></tr>`).join('')}
      </table></section>`;
  }).join('');
  document.getElementById('out')!.innerHTML = `
    <section class="card"><h2>成算表</h2>
      <table><tr><th>应对</th><th>武功</th><th>成算</th></tr>
      ${rows.map(r => `<tr><td>${r.act}</td><td>${r.sname}</td><td>${cheng(r.p)}</td></tr>`).join('')}
      </table>
      <p class="mut">修为 ${xw.value} · ${xw.rank}；用实战的引擎打两百场，胜率 ${Math.round(wr * 100)}%</p>
    </section>
    ${perf}`;
}

for (const slot of SLOTS) (document.getElementById(`slot-${slot}`) as HTMLSelectElement).value = loadout[slot] ?? '';
syncRealmSelects();
readInputs();
render();

document.getElementById('in')!.addEventListener('input', e => {
  readInputs();
  if ((e.target as HTMLElement).id.startsWith('slot-')) syncRealmSelects();
  render();
});

document.getElementById('tell')!.addEventListener('change', () => {
  const t = tellList[Number((document.getElementById('tell') as HTMLSelectElement).value)];
  if (!t) return;
  (document.getElementById('rank') as HTMLInputElement).value = String(t.f.rank);
  (document.getElementById('build') as HTMLSelectElement).value = t.f.build ?? 'even';
  (document.getElementById('dom') as HTMLSelectElement).value = t.dom;
  (document.getElementById('fnature') as HTMLSelectElement).value = t.f.nature ?? '';
  (document.getElementById('freach') as HTMLSelectElement).value = t.f.reach ?? '';
  readInputs();
  render();
});

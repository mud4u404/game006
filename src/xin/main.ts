import { Battle, HERO, FOES, MOVES, PERFORMS, PERFORM_MS, HITSTOP_MS, ULT_LEVEL, ULT_NAME, ULT_MS, ROUND_MS, batch, clean, probabilities, realm, simulate, tone, unlocked, windowMs, type Attributes, type Choice, type Fighter, type Summary } from './combat';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const attributes: [keyof Attributes, string][] = [['strength', '膂力'], ['insight', '悟性'], ['constitution', '根骨'], ['agility', '身法']];
let hero = clean(HERO);
const foes = FOES.map(clean);
let selected = 1;
let battle: Battle | null = null;
let paused = false;
let cinemaLeft = 0, cinemaImpact = false;
let busy = false;
let raf = 0, previous = 0, roundLeft = ROUND_MS, roundDuration = ROUND_MS, promptSpent = 0, logged = 0, chargeStart = 0;
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const field = (id: string, label: string, value: number, min: number, max: number): string => `<label for="${id}">${label}<input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${value}" inputmode="numeric"></label>`;
const fighterFields = (prefix: string, f: Fighter): string => `<div class="fields attrs">${attributes.map(([key, label]) => field(`${prefix}-${key}`, label, f.attrs[key], 10, 30)).join('')}</div><p class="field-note">先天四项共八十点；改一项时，其余项随之匀配。</p><div class="fields">${field(`${prefix}-level`, '拳法等级', f.level, 0, 300)}${field(`${prefix}-inner`, '内力修为', f.inner, 0, 300)}${field(`${prefix}-experience`, '实战经验', f.experience, 0, 300)}${field(`${prefix}-energy`, '开场内力 %', f.energy, 0, 100)}</div>`;
app.innerHTML = `<section id="arena" class="arena" aria-label="练武场">
  <div class="arena-head"><div><p class="eyebrow">江湖夜雨 · 练武场 · 点到为止</p><h2>这一拳，练前练后</h2></div><div class="head-buttons"><button id="lab-open" class="quiet">换对手</button><button id="pause" class="quiet" disabled>暂停</button></div></div>
  <div class="fighters"><div class="fighter"><div><strong>你</strong><span id="hero-realm"></span></div><div class="bar hp"><i id="hero-hp-bar"></i></div><small id="hero-hp"></small><div class="bar mp"><i id="hero-mp-bar"></i></div><small id="hero-mp"></small></div><span class="versus">对</span><div class="fighter"><div><strong id="foe-name">镖师</strong><span id="foe-realm"></span></div><div class="bar hp"><i id="foe-hp-bar"></i></div><small id="foe-hp"></small><small id="foe-mp"></small></div></div>
  <div class="round-line"><span id="phase">试探</span><span id="round">尚未交手</span><span id="manner">相持</span><span id="rage">劲势 30%</span><button id="latest" class="text-button">看最新一合 ↓</button></div>
  <div id="log" class="log" role="log" aria-label="交手记录" tabindex="0"><p class="intro">练过的拳会自己使出来。重招逼来时，以你已有的本事应对；练熟后还可主动使招，劲势积满便能使出绝招。</p></div>
  <div id="result" class="result" role="status" hidden></div>
  <section class="actions" aria-label="交手操作"><div class="action-head"><strong id="prompt-title">准备交手</strong><span id="countdown"></span></div><p id="prompt-text">默认与你功夫相近的镖师交手，再回头试试地痞与高手。</p><div class="timer"><i id="timer-fill"></i></div><div id="options" class="options" hidden></div><div id="skills" class="skills" hidden></div><div id="idle-actions" class="idle-actions"><button id="start" class="primary">与镖师交手</button><button id="charge" disabled>按住蓄势</button><button id="yield" class="quiet" disabled>认输</button></div><small id="action-note">平时自动交锋，每一合约一息半。</small></section>
<div class="ult-layer" id="cinema" hidden aria-live="polite"><small id="cinema-label"></small><div class="ult-w"><div class="ult-word" id="cinema-word"></div><span class="ult-seal" id="cinema-seal"></span></div><span class="ult-slash"></span><p id="cinema-text"></p></div>
</section>
<div id="lab" class="lab-panel" hidden role="dialog" aria-label="试验台"><div class="lab-top"><strong>试验台</strong><button id="lab-close" class="quiet">收起，回场上</button></div>
<section class="setup card"><div class="section-head"><h2>换个对手，再打一回</h2><button id="reset" class="text-button">恢复原样</button></div><div id="foe-picker" class="foe-picker">${foes.map((f, i) => `<button data-foe="${i}" aria-pressed="${i === selected}">${f.name}<small>${['不会武 · 只会乱打', '一门拳 · 有来有回', '真高手 · 一招压制'][i]}</small></button>`).join('')}</div>
<details id="settings"><summary>调整你与对手的底子 <span id="settings-summary"></span></summary><fieldset id="config"><legend>你的底子</legend>${fighterFields('hero', hero)}<h3 id="foe-settings-title">镖师的底子</h3><div id="foe-fields">${fighterFields('foe', foes[selected])}</div><div class="seed-field">${field('seed', '同场种子', 1011, 0, 4294967295)}<small>重打沿用同一场种子；换一个数，换一场交锋。</small></div></fieldset></details>
<div class="moves"><h3>入门拳 · 招式随火候渐开</h3><div id="moves"></div></div><details class="rules"><summary>查看这次试验的尺度</summary><p>结算沿用旧版 Duel / Person，主动招式、蓄势、状态与伤势均由旧内核处理。境界暂按拳法六成、内力修为二成半、实战经验一成半合成；这些比例供试手感，不是新游戏定案。先天四项仍分别影响拳劲、气血、闪避和应对时间。</p><p id="odds"></p><p>平时按住蓄势，松手后储下拳劲，最长一息半；耗四点内力。蓄势时自动出手照常，但防守松开，挨打会中断且更重。切到后台会暂停，回来可继续。</p><p>这里不写存档、账号、地图或剧情。输后的养伤只作战报说明，本原型不推进日子。</p></details></section>
<section class="card"><div class="section-head"><h2>同一门拳，三次对照</h2><button id="compare" class="secondary">一键对比</button></div><p class="subtle">初学二十、小成八十、大成一百八十。只变拳法等级，底子、内力、经验、对手与种子都相同。</p><div id="comparison" class="comparison"><p class="subtle">对着同一个人，看看昔日吃力的拳怎样使得从容。</p></div></section>
<section class="card"><div class="section-head"><h2>把偶然多走几遍</h2><button id="simulate" class="secondary">每档一千场</button></div><label class="policy" for="policy">模拟怎样应对 <select id="policy"><option value="manual">一息内应对，抓破绽，招式就绪即用</option><option value="idle">完全不点，超时凭本能</option></select></label><p class="subtle">实战与模拟用同一套规则。用时含等待选择，扣除暂停；模拟不能代替手机手感。</p><div id="simulation" aria-live="polite"><p class="subtle">按当前三档对手的底子，各打一千场。</p></div></section>
<footer>待维护者试玩，再交负责人验证境界差与节奏。</footer></div>`;

function seed(): number { const n = Number($<HTMLInputElement>('seed').value); return Number.isFinite(n) ? Math.max(0, Math.min(4294967295, Math.round(n))) : 1011; }
function active(): boolean { return !!battle && (!battle.result || cinemaLeft > 0); }
function updateLocks(): void {
  const lock = active() || busy;
  $<HTMLFieldSetElement>('config').disabled = lock;
  for (const id of ['reset', 'compare', 'simulate']) $<HTMLButtonElement>(id).disabled = lock;
  $<HTMLSelectElement>('policy').disabled = lock;
  $('comparison').querySelectorAll<HTMLButtonElement>('.try-level').forEach(b => { b.disabled = lock; });
  $('foe-picker').querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = lock; });
  $<HTMLButtonElement>('start').disabled = lock;
  $<HTMLButtonElement>('pause').disabled = !active();
  $<HTMLButtonElement>('lab-open').disabled = lock;
}
function updatePreview(): void {
  $('foe-picker').querySelectorAll<HTMLButtonElement>('button').forEach((button, i) => { button.querySelector('small')!.textContent = `拳法 ${foes[i].level} · 内力 ${foes[i].inner}`; });
  $('settings-summary').textContent = `拳法 ${hero.level} · 内力 ${hero.inner}`;
  $('moves').innerHTML = MOVES.map(m => `<span class="move ${hero.level < m.level ? 'locked' : ''}">${m.name}<small>${m.level} 级${hero.level < m.level ? ' · 未到' : ' · 已会'}</small></span>`).join('');
  if (!hero.level) $('moves').insertAdjacentHTML('afterbegin', '<span class="move">乱打一拳<small>不会武也能出手</small></span>');
  const gap = realm(hero) - realm(foes[selected]), p = probabilities(hero, foes[selected]);
  $('odds').textContent = `境界差 ${gap.toFixed(1)}；普通出手命中 ${(p.hit * 100).toFixed(1)}%，对方闪避 ${(p.dodge * 100).toFixed(1)}% 或招架 ${(p.parry * 100).toFixed(1)}%。察觉破绽随境界提高，至少间隔六合提示，每场最多五次关键选择；具体成算看当时按钮。重招时间窗 ${(windowMs(gap, hero.attrs.insight) / 1000).toFixed(2)} 息。`;
  $('start').textContent = `与${foes[selected].name}交手`;
  if (!active()) renderStats(new Battle(hero, foes[selected], seed()));
}
function renderStats(b: Battle): void {
  for (const [key, state] of [['hero', b.hero], ['foe', b.foe]] as const) {
    $(`${key}-hp`).textContent = `气血 ${state.hp} / ${state.hpMax}`;
    $(`${key}-mp`).textContent = key === 'hero' ? `内力 ${Math.floor(state.mp)} / ${state.spec.inner}` : `修为 ${state.spec.inner} · 内力 ${state.spec.energy}%`;
    $(`${key}-hp-bar`).style.width = `${state.hp / state.hpMax * 100}%`;
    if (key === 'hero') $(`${key}-mp-bar`).style.width = `${state.spec.inner ? state.mp / state.spec.inner * 100 : 0}%`;
    $(`${key}-realm`).textContent = `境界 ${realm(state.spec).toFixed(1)}`;
  }
  $('phase').textContent = b.phase;
  $('rage').textContent = `劲势 ${Math.floor(b.duel.rage)}%`;
  $('foe-name').textContent = b.foe.spec.name;
  $('manner').textContent = tone(b.gap);
  $('manner').dataset.tone = tone(b.gap);
}
function appendLog(): void {
  if (!battle) return;
  const log = $('log'), atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  for (const e of battle.entries.slice(logged)) {
    const row = document.createElement('p'); row.className = `entry ${e.kind}`;
    const n = document.createElement('span'); n.className = 'entry-round'; n.textContent = `${e.round}`;
    const t = document.createElement('span'); t.textContent = e.text;
    row.append(n, t);
    log.append(row);
  }
  logged = battle.entries.length;
  if (atBottom) log.scrollTop = log.scrollHeight;
}
function updateCharge(): void {
  const button = $<HTMLButtonElement>('charge');
  button.disabled = !active() || paused || cinemaLeft > 0 || !!battle?.prompt || (battle?.hero.mp ?? 0) < 4;
  button.textContent = battle?.hero.charging ? '蓄势中 · 松手出劲' : battle?.hero.charge ? `已蓄 +${Math.round(battle.hero.charge * 100)}%` : '按住蓄势';
  button.classList.toggle('charging', !!battle?.hero.charging);
}
function renderActions(): void {
  const p = battle?.prompt;
  $('prompt-text').hidden = !!p || active();
  $('pause').textContent = paused ? '继续' : '暂停';
  $('options').hidden = !p;
  $('idle-actions').hidden = !!p;
  $('start').hidden = active();
  $('skills').hidden = !!p || !active();
  const d = battle?.duel;
  const locked = paused || cinemaLeft > 0 || !!battle?.result;
  $('skills').innerHTML = PERFORMS.map((move) => {
    const index = d?.performs.findIndex(p => p.name === move.name) ?? -1;
    const cost = index >= 0 ? d!.performCost(index) : 0;
    const ready = index >= 0 && d!.canPerform(index);
    const note = index < 0 ? `${move.level} 级学会` : d!.pcd[index] ? `还须 ${d!.pcd[index]} 合` : `内力 ${cost}`;
    return `<button data-perform="${index}" ${locked || !ready ? 'disabled' : ''}>${move.name}<small>${note}</small></button>`;
  }).join('') + `<button id="ultimate" class="ultimate" ${locked || !d?.ultSpec || d.rage < 100 ? 'disabled' : ''}>${ULT_NAME}<small>${hero.level < ULT_LEVEL ? `${ULT_LEVEL} 级学会` : `劲势 ${Math.floor(d?.rage ?? 30)} / 100`}</small></button>`;
  $('timer-fill').style.width = p ? `${Math.max(0, 1 - promptSpent / p.duration) * 100}%` : '0%';
  if (p) $('countdown').textContent = `${(Math.max(0, p.duration - promptSpent) / 1000).toFixed(1)} 息`;
  if (p) {
    $('prompt-title').textContent = paused ? '暂歇 · 来势仍在' : p.title;
    $('prompt-text').textContent = p.text;
    $('options').innerHTML = p.options.map(o => `<button data-choice="${o.key}" ${o.disabled || paused || cinemaLeft > 0 ? 'disabled' : ''}><strong>${o.label}</strong><span>成算 ${Math.round(o.chance * 100)}%${o.cost ? ` · 内力 ${o.cost}` : p.kind === 'heavy' ? ' · 下合慢半息' : ''}</span><small>${o.note}</small></button>`).join('');
    $('action-note').textContent = p.kind === 'heavy' ? '倒计时尽，凭本能应对。' : '抓住空隙，或收稳架子。';
  } else {
    $('prompt-title').textContent = paused ? '抱拳暂歇' : cinemaLeft ? '劲力贯通' : battle?.result ? '这一趟走完了' : active() ? '拳来拳往' : '准备交手';
    $('prompt-text').textContent = paused ? '交锋与时机都已停住，点「继续」再打。' : active() ? '招式自行使出；招熟了可主动出手，蓄势会松开防守。' : '可重新打一场，或调整底子后再来。';
    $('countdown').textContent = '';
    $('action-note').textContent = active() ? '松手存劲；挨打会中断蓄势。' : '试探快些，随后相持；重击停顿，决胜收势。';
  }
  $<HTMLButtonElement>('yield').disabled = !active() || paused || cinemaLeft > 0;
  updateCharge(); updateLocks();
}
function showResult(): void {
  if (!battle?.result || cinemaLeft > 0) return;
  $('result').hidden = false;
  $('result').textContent = `${{ win: '你赢了', lose: '你输了', draw: '未分胜负', yield: '已认输' }[battle.result]} · ${battle.round} 合 · ${(battle.elapsed / 1000).toFixed(1)} 息 · 余下气血 ${battle.hero.hp}`;
}
function refresh(defer = true): void {
  if (!battle) return;
  if (defer && battle.entries.slice(logged).some(e => e.kind === 'key' && (e.damage ?? 0) > 0)) {
    cinemaLeft = HITSTOP_MS; cinemaImpact = true; $('cinema').hidden = true; renderActions(); return;
  }
  renderStats(battle); appendLog(); renderActions(); showResult();
}
function respond(choice: Choice | null): void {
  if (!battle?.prompt || paused || cinemaLeft > 0) return;
  const waited = promptSpent + Math.max(0, performance.now() - previous);
  if (!battle.respond(choice, waited)) return;
  roundDuration = battle.nextRoundMs; roundLeft = roundDuration; promptSpent = 0; previous = performance.now(); refresh();
}
function frame(now: number): void {
  if (!battle || (battle.result && !cinemaLeft) || paused) return;
  const dt = Math.max(0, now - previous); previous = now;
  if (cinemaLeft > 0) {
    cinemaLeft = Math.max(0, cinemaLeft - dt);
    if (!cinemaLeft) {
      $('cinema').hidden = true; refresh(false);
      const impact = cinemaImpact; cinemaImpact = false;
      if (impact) { $('arena').classList.remove('impact'); void $('arena').offsetWidth; $('arena').classList.add('impact'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.([20, 30, 45]); }
    }
    if (active()) raf = requestAnimationFrame(frame);
    return;
  }
  if (battle.prompt) {
    promptSpent += dt;
    const remaining = Math.max(0, battle.prompt.duration - promptSpent);
    $('countdown').textContent = `${(remaining / 1000).toFixed(1)} 息`;
    $('timer-fill').style.width = `${remaining / battle.prompt.duration * 100}%`;
    if (!remaining) { battle.respond(null, battle.prompt.duration); promptSpent = 0; roundDuration = battle.nextRoundMs; roundLeft = roundDuration; refresh(); }
  } else {
    roundLeft -= dt;
    if (roundLeft <= 0) { battle.tick(); roundDuration = battle.nextRoundMs; roundLeft = roundDuration; promptSpent = 0; refresh(); }
  }
  updateCharge();
  const spent = battle.elapsed + (battle.prompt ? promptSpent : roundDuration - roundLeft);
  $('round').textContent = `第 ${battle.round} 合 · ${(spent / 1000).toFixed(1)} 息`;
  if (active()) raf = requestAnimationFrame(frame);
}
function start(): void {
  if (active() || busy) return;
  cancelAnimationFrame(raf);
  battle = new Battle(hero, foes[selected], seed()); paused = false; logged = 0; promptSpent = 0; roundDuration = battle.nextRoundMs; roundLeft = roundDuration; chargeStart = 0; cinemaLeft = 0; cinemaImpact = false; $('cinema').hidden = true;
  $('log').replaceChildren(); $('result').hidden = true;
  refresh(); previous = performance.now(); raf = requestAnimationFrame(frame);
  $('lab').hidden = true;
}
function pause(): void {
  if (!active()) return;
  paused = !paused; cancelAnimationFrame(raf); battle!.cancelCharge(); chargeStart = 0;
  // 把最后一帧至暂停之间的时间也记进时间窗，继续时不赠送新窗口。
  if (paused) { const dt = Math.max(0, performance.now() - previous); if (cinemaLeft) cinemaLeft = Math.max(1, cinemaLeft - dt); else if (battle!.prompt) promptSpent += dt; else roundLeft -= dt; }
  if (!paused) { previous = performance.now(); raf = requestAnimationFrame(frame); }
  $('cinema').classList.toggle('paused', paused);
  renderActions();
}
$('start').addEventListener('click', start);
$('lab-open').addEventListener('click', () => { if (!active() && !busy) $('lab').hidden = false; });
$('lab-close').addEventListener('click', () => { $('lab').hidden = true; });
$('pause').addEventListener('click', pause);
$('yield').addEventListener('click', () => { if (!active() || paused || cinemaLeft) return; const dt = Math.max(0, performance.now() - previous); battle!.elapsed += battle!.prompt ? promptSpent + dt : roundDuration - roundLeft + dt; battle!.yield(); cancelAnimationFrame(raf); refresh(); });
$('options').addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]'); if (b && !b.disabled) respond(b.dataset.choice as Choice); });
$('skills').addEventListener('click', e => {
  if (!battle || paused || cinemaLeft || battle.result || battle.prompt) return;
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  const index = Number(button.dataset.perform);
  const ultimate = button.id === 'ultimate';
  const move = ultimate ? null : battle.duel.performs[index];
  if (!(ultimate ? battle.ultimate() : battle.perform(index))) return;
  cinemaLeft = ultimate ? ULT_MS : PERFORM_MS;
  cinemaImpact = battle.entries.slice(logged).some(e => (e.kind === 'ult' || e.kind === 'perform') && (e.damage ?? 0) > 0);
  chargeStart = 0;
  $('cinema-label').textContent = ultimate ? '入门拳 · 劲势贯通' : '入门拳 · 主动出手';
  $('cinema-word').textContent = ultimate ? '贯劲' : PERFORMS.find(p => p.name === move?.name)?.word ?? '';
  $('cinema-seal').textContent = ultimate ? ULT_NAME : move!.name;
  $('cinema-text').textContent = ultimate ? battle.entries.slice().reverse().find(e => e.kind === 'ult')?.text ?? '' : '';
  $('cinema-text').hidden = !ultimate;
  const layer = $('cinema'); layer.hidden = false; layer.classList.remove('go', 'paused'); void layer.offsetWidth; layer.classList.toggle('quick', !ultimate); layer.classList.toggle('full', ultimate); layer.classList.add('go');
  // 动画和回合用同一条可暂停的帧时钟，后台不补发招式。
  previous = performance.now(); renderActions();
});
$('latest').addEventListener('click', () => { $('log').scrollTop = $('log').scrollHeight; });
const charge = $<HTMLButtonElement>('charge');
charge.addEventListener('pointerdown', e => { if (charge.disabled || !battle?.beginCharge()) return; e.preventDefault(); chargeStart = performance.now(); charge.setPointerCapture(e.pointerId); updateCharge(); });
charge.addEventListener('pointerup', () => { if (!battle || !chargeStart) return; battle.releaseCharge(performance.now() - chargeStart); chargeStart = 0; appendLog(); renderStats(battle); updateCharge(); });
const cancelCharge = (): void => { battle?.cancelCharge(); chargeStart = 0; updateCharge(); };
charge.addEventListener('pointercancel', cancelCharge); charge.addEventListener('lostpointercapture', cancelCharge);
charge.addEventListener('contextmenu', e => e.preventDefault());
charge.addEventListener('click', e => { if (e.detail === 0 && !charge.disabled && battle?.beginCharge()) { battle.releaseCharge(750); appendLog(); renderStats(battle); updateCharge(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && active() && !paused) pause(); });

function redistribute(f: Fighter, key: keyof Attributes, desired: number): void {
  const n = Math.round(Math.max(10, Math.min(30, desired)));
  let delta = n - f.attrs[key]; f.attrs[key] = n;
  for (const [other] of attributes) { if (other === key) continue; const amount = delta > 0 ? Math.min(delta, f.attrs[other] - 10) : -Math.min(-delta, 30 - f.attrs[other]); f.attrs[other] -= amount; delta -= amount; }
}
const invalidateComparison = (): void => { $('comparison').innerHTML = '<p class="subtle">底子或种子已变化，请重新对比。</p>'; };
$('config').addEventListener('change', e => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'seed') { input.value = `${seed()}`; invalidateComparison(); return; }
  if (!input.id.includes('-')) return;
  const [who, key] = input.id.split('-'); const f = who === 'hero' ? hero : foes[selected];
  const value = Number(input.value); if (!Number.isFinite(value) || input.value === '') { updatePreview(); return; }
  if (attributes.some(([a]) => a === key)) {
    redistribute(f, key as keyof Attributes, value);
    for (const [a] of attributes) $<HTMLInputElement>(`${who}-${a}`).value = `${f.attrs[a]}`;
  } else if (['level', 'inner', 'experience', 'energy'].includes(key)) { const k = key as 'level' | 'inner' | 'experience' | 'energy'; f[k] = Math.round(Math.max(0, Math.min(k === 'energy' ? 100 : 300, value))); input.value = `${f[k]}`; }
  battle = null; $('result').hidden = true; invalidateComparison(); updatePreview();
});
$('foe-picker').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-foe]');
  if (!b || b.disabled) return;
  selected = Number(b.dataset.foe); battle = null; $('result').hidden = true; invalidateComparison();
  $('foe-fields').innerHTML = fighterFields('foe', foes[selected]); $('foe-settings-title').textContent = `${foes[selected].name}的底子`;
  $('foe-picker').querySelectorAll<HTMLButtonElement>('button').forEach((btn, i) => btn.setAttribute('aria-pressed', `${i === selected}`));
  updatePreview(); renderActions();
});
$('reset').addEventListener('click', () => { if (active() || busy) return; hero = clean(HERO); FOES.forEach((f, i) => { foes[i] = clean(f); });
  for (const [key] of attributes) $<HTMLInputElement>(`hero-${key}`).value = `${hero.attrs[key]}`;
  for (const key of ['level', 'inner', 'experience', 'energy'] as const) $<HTMLInputElement>(`hero-${key}`).value = `${hero[key]}`;
  $('foe-fields').innerHTML = fighterFields('foe', foes[selected]); battle = null; $('result').hidden = true; invalidateComparison(); updatePreview(); renderActions();
});
const names = ['初学', '小成', '大成'], levels = [20, 80, 180];
$('compare').addEventListener('click', () => {
  if (active() || busy) return;
  const opponent = clean(foes[selected]), base = clean(hero), sameSeed = seed();
  $('comparison').innerHTML = `<p class="subtle comparison-caption">同一${esc(opponent.name)} · 拳法 ${opponent.level} · 内力 ${opponent.inner} · 种子 ${sameSeed}；一息内应对，招式就绪即用，不蓄势。</p><div class="comparison-grid">${levels.map((level, i) => {
    const b = simulate({ ...base, level }, opponent, sameSeed);
    const highlight = b.entries.find(e => e.kind === 'key')?.text ?? b.entries.find(e => e.kind === 'auto')?.text ?? '';
    return `<article><small>${names[i]} · ${level} 级</small><h3>${b.result === 'win' ? '胜' : b.result === 'draw' ? '未分' : '负'}</h3><p>${b.round} 合<br>${(b.elapsed / 1000).toFixed(1)} 息<br>余血 ${b.hero.hp}</p><span class="tag">${tone(b.gap)}</span><p class="sample">${esc(highlight)}</p><button class="secondary try-level" data-level="${level}">亲手试${names[i]}</button><details><summary>这一场的招式</summary><p>${unlocked(level).map(m => m.name).join('、')}</p><p>${b.entries.map(e => esc(`${e.round} 合：${e.text}`)).join('<br>')}</p></details></article>`;
  }).join('')}</div>`;
});
$('comparison').addEventListener('click', e => { const button = (e.target as HTMLElement).closest<HTMLButtonElement>('.try-level'); if (!button || active() || busy) return; hero.level = Number(button.dataset.level); $<HTMLInputElement>('hero-level').value = `${hero.level}`; updatePreview(); start(); });
const paint = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));
$('simulate').addEventListener('click', async () => {
  if (active() || busy) return;
  busy = true; updateLocks();
  const base = clean(hero), opponents = foes.map(clean), firstSeed = seed(), policy = $<HTMLSelectElement>('policy').value === 'idle' ? 'idle' : 'manual';
  const results: { foe: Fighter; stats: Summary }[] = [];
  try {
    for (const foe of opponents) {
      $('simulation').textContent = `正在试 ${foe.name}，每档一千场……`; await paint();
      results.push({ foe, stats: batch(base, foe, 1000, firstSeed, policy) });
    }
    $('simulation').innerHTML = `<p class="subtle">你的拳法 ${base.level} · 内力 ${base.inner} · 种子 ${firstSeed} 起；${policy === 'manual' ? '一息内以己之长应对，抓破绽，招式就绪即用，不蓄势' : '不使主动招式，不点选择，超时凭本能'}。</p><div class="table-wrap"><table><thead><tr><th>对手</th><th>胜率</th><th>平均合数</th><th>平均用时</th></tr></thead><tbody>${results.map(({ foe, stats }) => `<tr><th>${foe.name}<small>拳法 ${foe.level}</small></th><td>${(stats.winRate * 100).toFixed(1)}%</td><td>${stats.rounds.toFixed(2)}</td><td>${stats.seconds.toFixed(1)} 息</td></tr>`).join('')}</tbody></table></div><p class="subtle">每档一千场，共 ${results.reduce((s, r) => s + r.stats.draws, 0)} 场未分胜负；两百合仍未分胜负才收场。实力悬殊时无需打满半分钟。</p>`;
  } finally { busy = false; updateLocks(); }
});
updatePreview(); renderActions();

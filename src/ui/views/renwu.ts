import { S, fullName } from '../../core/state';
import type { AttrKey } from '../../content/types';
import { npcName, roomNpcs } from '../../engine/world';
import { ROOMS } from '../../content';
import { attrLines } from '../../engine/gengu';
import { relGroup, type RelGroup } from '../../engine/renqing';
import { xiuwei } from '../../engine/wuxue';
import { cloudRowHTML } from './account-link';
import { PROTO, xushiOn } from '../../core/proto';

const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];

/** 人情：有意义的人分组列出，萍水相逢的收起来（docs/audit.md 第四节） */
function renqingHTML(): string {
  const groups: Record<RelGroup, [string, string][]> = { 至亲至交: [], 交好: [], 恩怨: [], 萍水相逢: [] };
  for (const [id, v] of Object.entries(S.rel)) groups[relGroup(v)].push([id, v]);
  const row = ([id, v]: [string, string]): string => {
    const where = ROOMS.find(r => roomNpcs(r.id).includes(id))?.name;
    const note = S.relNote?.[id];
    return `<div class="rq"><div class="rq-h"><b>${npcName(id)}</b><span class="tag">${v}</span></div>${where ? `<small>常在${where}</small>` : ''}${note ? `<p>${note}</p>` : ''}</div>`;
  };
  const shown = (['至亲至交', '交好', '恩怨'] as RelGroup[]).filter(g => groups[g].length)
    .map(g => `<div class="rq-g">${g}</div>${groups[g].map(row).join('')}`).join('');
  const casual = groups.萍水相逢.length
    ? `<details class="rq-more"><summary><span>萍水相逢 ${groups.萍水相逢.length} 人</span><small>展开</small></summary>${groups.萍水相逢.map(row).join('')}</details>` : '';
  return shown || casual ? shown + casual : '<p class="muted">还没有结识什么人。</p>';
}

let confirmRestart = false;
export const setConfirmRestart = (v: boolean): void => { confirmRestart = v; };

export function viewRenwu(): string {
  const attrs = ATTRS.map(a => `<div class="attr"><b>${S.attr[a]}</b><span>${a}</span></div>`).join('');
  const lines = attrLines(S);
  const effects = ATTRS.map(a => `<div class="row"><span>${a}</span><small class="muted">${lines[a]}</small></div>`).join('');
  const meaningful = Object.values(S.rel).filter(v => relGroup(v) !== '萍水相逢').length;
  // 和江湖页一致：没有名号时显示修为档
  const who = S.chapter === 0 ? '瓜洲渡渔家少年' : S.title ? '江湖人称「' + S.title + '」' : '游侠 · ' + xiuwei(S).rank;
  return `
  <section class="card status"><span class="ava t-accent">沈</span><div class="who"><b>${fullName()}</b><small>${who}</small></div></section>
  <section class="card here"><div class="sec-h"><h2>根基</h2></div><div class="attrs">${attrs}</div><div class="rows">${effects}</div></section>
  <section class="card"><div class="kv">
    <div><span>气血</span><b>${S.hp} / ${S.hpMax}</b></div><div><span>内力</span><b>${S.mp} / ${S.mpMax}</b></div>
    <div><span>身份</span><b>${S.chapter === 0 ? '渔家' : '游侠'}</b></div><div><span>门派</span><b>无门无派</b></div>
    <div><span>修为</span><b>${xiuwei(S).rank}</b></div><div><span>修为值</span><b>${xiuwei(S).value}</b></div>
    <div><span>侠义</span><b>${S.xia}</b></div><div><span>恶名</span><b>${S.eming}</b></div>
    <div><span>银两</span><b>${S.silver} 文</b></div><div><span>名号</span><b>${S.title || '—'}</b></div>
  </div></section>
  ${PROTO ? protoHTML() : ''}
  <section class="card here"><div class="sec-h"><h2>人情</h2><span class="count">${meaningful}</span></div>${renqingHTML()}</section>
  <section class="card here"><div class="sec-h"><h2>存档</h2></div>
    ${saveCardHTML()}
    ${confirmRestart
      ? `<p class="muted">清空前会先另存一份，之后在「找回备份」里还能换回来。</p><div class="btnrow"><button class="btn ghost" data-act="restartNo">算了</button><button class="btn warn" data-act="restartYes">清空存档</button></div>`
      : `<button class="act danger" data-act="restart">清空存档，重新开始</button>`}
  </section>`;
}

/** 原型里可以直接试打的对手：前三个打倒以后问放还是杀；草上飞的差事、屠千山的剧情已经定了结局，只试虚实 */
const PROTO_FOES: [string, string][] = [['ly_xiaozei', '小毛贼'], ['huafang_guard', '汪家护院'], ['cw_shuigui', '水鬼'], ['zy_csf', '草上飞'], ['tu', '屠千山']];

/** 原型（docs/foundation.md 第三版第八节）：只在原型的构建里出现 */
function protoHTML(): string {
  const on = xushiOn();
  return `<section class="card here"><div class="sec-h"><h2>原型</h2><span class="tag warn">试玩用</span></div>
    <p class="muted">这一版里多了三样，请凭手感判断：打倒有名有姓的对手以后，放还是杀；应对得手以后，硬接、拆招还的那一下更重；还有虚实，可以开关对照着打。</p>
    <div class="row"><span>虚实（随机应变）</span><small class="muted">${on ? '开着：对手的重招有虚有实，硬接最怕落空，拆招最不怕' : '关着：和正式的游戏一样'}</small></div>
    <button class="act" data-act="protoXushi">${on ? '关掉虚实' : '打开虚实'}</button>
    <p class="muted">不用满地图去找，在这里直接试打（原型的存档和正式的游戏分开，不会动你的进度）。打完一场，可以先到客栈歇息，养好伤再打。</p>
    <div class="btnrow">${PROTO_FOES.map(([id, n]) => `<button class="act" data-act="protoFight:${id}">${n}</button>`).join('')}</div>
  </section>`;
}

/** 存档一栏的按钮，处理函数在 ui/savecard.ts */
export function saveCardHTML(): string {
  return `${cloudRowHTML()}<p class="muted">进度自动保存在这台设备的浏览器里，每天另留一份备份。换手机、清缓存之前，先导出存档码带走。</p>
    <div class="btnrow"><button class="act" data-act="saveExport">导出存档码</button><button class="act" data-act="saveImport">导入存档码</button></div>
    <div class="btnrow"><button class="act" data-act="saveBackups">找回备份</button><button class="act" data-act="toTitle">回到标题</button></div>`;
}

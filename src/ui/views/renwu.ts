import { S, fullName } from '../../core/state';
import type { AttrKey } from '../../content/types';
import { npcName, roomNpcs } from '../../engine/world';
import { ROOMS } from '../../content';
import { attrLines } from '../../engine/gengu';
import { relGroup, type RelGroup } from '../../engine/renqing';
import { gongliText, houtianOf, tierNow } from '../../engine/ren';
import { LODGING, yueText } from '../../engine/shiguang';
import { shenfenOf, shenfenText } from '../../engine/shenfen';
import { menguiText, pastSectText, sectText } from '../../engine/shicheng';
import { fullDate } from '../../core/time';
import { ZONE_NAME } from '../../engine/duel';
import { cn } from '../../core/util';
import { cloudRowHTML } from './account-link';

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

/** 约与心事：答应过谁、哪天在哪里；心中有愧的事（docs/foundation.md 第三节第三、九条） */
function yueHTML(): string {
  const rows = S.yue.slice().sort((a, b) => a.due - b.due).map(y => `<div><span class="tag warn">约</span><span>${yueText(S, y)}</span></div>`);
  if (S.xinmo.n >= 0.05) rows.push(`<div><span class="tag danger">心魔</span><span>心中有愧（${S.xinmo.why}），静修打${cn(Math.round((1 - 0.2 * S.xinmo.n) * 10))}折。还诺、赔罪、了却这件事，才化得开；不化解，也会随日子慢慢淡。</span></div>`);
  return rows.length ? `<section class="card here"><div class="sec-h"><h2>约与心事</h2></div><div class="news">${rows.join('')}</div></section>` : '';
}

/** 营生：身份的义务和门路，过日子的开销（docs/foundation.md 第三节第六、八条） */
function yingshengHTML(): string {
  if (S.chapter === 0) return '';
  return `<section class="card here"><div class="sec-h"><h2>营生</h2><span class="count">${shenfenText(S)}</span></div>
    <p class="muted">${shenfenOf(S).desc}</p>
    <div class="news"><div><span class="tag">嚼用</span><span>静修时住店，一日一钱银子（${LODGING.inn} 文）；钱不够就露宿，不花钱，伤好得慢。</span></div></div></section>`;
}

/** 师门：门派、地位、门规；出过师、叛过门的写一行来历（docs/menpai.md 第七节） */
function shimenHTML(): string {
  const past = pastSectText(S);
  if (!S.sect && !past) return '';
  const rows: string[] = [];
  if (S.sect) rows.push(`<div><span class="tag">门规</span><span>${menguiText(S.sect.school)}</span></div>`);
  if (past) rows.push(`<div><span class="tag">来历</span><span>${past}。</span></div>`);
  return `<section class="card here"><div class="sec-h"><h2>师门</h2><span class="count">${sectText(S)}</span></div><div class="news">${rows.join('')}</div></section>`;
}

let confirmRestart = false;
export const setConfirmRestart = (v: boolean): void => { confirmRestart = v; };

export function viewRenwu(): string {
  const h = houtianOf(S);
  const attrs = ATTRS.map(a => `<div class="attr"><b>${S.attr[a]}</b><span>${a}</span><small>后天 ${h[a]}</small></div>`).join('');
  const lines = attrLines(S);
  const effects = ATTRS.map(a => `<div class="row"><span>${a}</span><small class="muted">${lines[a]}</small></div>`).join('');
  const meaningful = Object.values(S.rel).filter(v => relGroup(v) !== '萍水相逢').length;
  // 和江湖页一致：没有名号时显示修为档
  const tier = tierNow(S).name;
  const who = S.chapter === 0 ? '瓜洲渡渔家少年' : S.title ? '江湖人称「' + S.title + '」' : shenfenOf(S).name + ' · ' + tier;
  const hurt = (Object.entries(S.wounds) as ['hand' | 'foot' | 'inner', number][]).filter(([, n]) => n > 0).map(([z, n]) => `${ZONE_NAME[z]}${cn(n)}级`).join('、');
  return `
  <section class="card status"><span class="ava t-accent">沈</span><div class="who"><b>${fullName()}</b><small>${who}</small></div></section>
  <section class="card here"><div class="sec-h"><h2>根基</h2><span class="count">常人各二十</span></div><div class="attrs">${attrs}</div>
    <p class="muted">大字是先天，只有奇遇改得了；后天随武功长，内功长体魄、根骨，轻功长身法，外功长悟性、胆魄。交手看后天，多出常人的天赋另算。</p>
    <div class="rows">${effects}</div></section>
  <section class="card"><div class="kv">
    <div><span>气血</span><b>${S.hp} / ${S.hpMax}</b></div><div><span>内力</span><b>${S.mp} / ${S.mpMax}</b></div>
    <div><span>身份</span><b>${shenfenText(S)}</b></div><div><span>门派</span><b>${sectText(S)}</b></div>
    <div><span>档次</span><b>${tier}</b></div><div><span>功力</span><b>${gongliText(S.gongli)}</b></div>
    <div><span>伤</span><b>${hurt || '无'}</b></div><div><span>历练</span><b>${S.lilian}</b></div>
    <div><span>侠义</span><b>${S.xia}</b></div><div><span>恶名</span><b>${S.eming}</b></div>
    <div><span>银两</span><b>${S.silver} 文</b></div><div><span>名号</span><b>${S.title || '—'}</b></div>
    <div><span>江湖历</span><b>${fullDate(S)}</b></div>
  </div></section>
  ${yingshengHTML()}
  ${shimenHTML()}
  ${yueHTML()}
  <section class="card here"><div class="sec-h"><h2>人情</h2><span class="count">${meaningful}</span></div>${renqingHTML()}</section>
  <section class="card here"><div class="sec-h"><h2>存档</h2></div>
    ${saveCardHTML()}
    ${confirmRestart
      ? `<p class="muted">清空前会先另存一份，之后在「找回备份」里还能换回来。</p><div class="btnrow"><button class="btn ghost" data-act="restartNo">算了</button><button class="btn warn" data-act="restartYes">清空存档</button></div>`
      : `<button class="act danger" data-act="restart">清空存档，重新开始</button>`}
  </section>`;
}

/** 存档一栏的按钮，处理函数在 ui/savecard.ts */
export function saveCardHTML(): string {
  return `${cloudRowHTML()}<p class="muted">进度自动保存在这台设备的浏览器里，每天另留一份备份。换手机、清缓存之前，先导出存档码带走。</p>
    <div class="btnrow"><button class="act" data-act="saveExport">导出存档码</button><button class="act" data-act="saveImport">导入存档码</button></div>
    <div class="btnrow"><button class="act" data-act="saveBackups">找回备份</button><button class="act" data-act="toTitle">回到标题</button></div>`;
}

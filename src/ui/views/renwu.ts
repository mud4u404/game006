import { sectHome } from '../../engine/daohang';
import { S, fullName } from '../../core/state';
import type { AttrKey } from '../../content/types';
import { npcName, whereAt } from '../../engine/world';
import { room } from '../../content';
import { attrLines } from '../../engine/gengu';
import { relGroup, type RelGroup } from '../../engine/renqing';
import { gongliText, houtianOf, nextTierLine, tierNow } from '../../engine/ren';
import { LODGING, ZHU_NAME, xinmoLine, yueText, zhuOf } from '../../engine/shiguang';
import { shenfenOf, shenfenText, gongxianOf } from '../../engine/shenfen';
import { menguiText, pastSectText, sectText } from '../../engine/shicheng';
import { fullDate } from '../../core/time';
import { pingyuOf, renGuo, zhanliLine } from '../../engine/zhanli';
import { ZONE_NAME } from '../../engine/duel';
import { cn } from '../../core/util';
import { cloudRowHTML } from './account-link';
import { dollHTML } from './zhiwawa';

const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];

/** 人情：有意义的人分组列出，萍水相逢的收起来（docs/audit.md 第四节） */
function renqingHTML(): string {
  const groups: Record<RelGroup, [string, string][]> = { 至亲至交: [], 交好: [], 恩怨: [], 萍水相逢: [] };
  for (const [id, v] of Object.entries(S.rel)) groups[relGroup(v)].push([id, v]);
  const row = ([id, v]: [string, string]): string => {
    // 眼下在哪：走统一作息查询（含世事挪人、睡下、外出），查不到就不写这一行
    const wid = whereAt(id);
    const where = wid ? room(wid).name : null;
    const note = S.relNote?.[id];
    return `<div class="rq"><div class="rq-h"><b>${npcName(id)}</b><span class="tag">${v}</span></div>${where ? `<small>眼下在${where}</small>` : ''}${note ? `<p>${note}</p>` : ''}</div>`;
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
  if (S.xinmo.n >= 0.05) rows.push(`<div><span class="tag danger">心魔</span><span>${xinmoLine()}</span></div>`);
  return rows.length ? `<section class="card here-card"><div class="sec-h"><h2>约与心事</h2></div><div class="news">${rows.join('')}</div></section>` : '';
}

/** 营生：身份的义务和门路，过日子的开销（docs/foundation.md 第三节第六、八条） */
function yingshengHTML(): string {
  if (S.chapter === 0) return '';
  return `<section class="card here-card"><div class="sec-h"><h2>营生</h2><span class="count">${shenfenText(S)}</span></div>
    <p class="muted">${shenfenOf(S).desc}</p>
    <div class="news"><div><span class="tag">嚼用</span><span>静修住${ZHU_NAME[zhuOf(S)]}（武功页「闭关修炼」里换）。客栈一日一钱银子（${LODGING.inn} 文），身上留${cn(LODGING.keep)}文盘缠不动，钱不够的那几夜露宿；露宿不花钱，睡不安稳，打坐参悟打八折；拜了师的回师门住，不花钱。</span></div></div></section>`;
}

/** 师门：门派、地位、门规；出过师、叛过门的写一行来历（docs/menpai.md 第七节） */
function shimenHTML(): string {
  const past = pastSectText(S);
  if (!S.sect && !past) return '';
  const rows: string[] = [];
  if (S.sect) rows.push(`<div><span class="tag">门规</span><span>${menguiText(S.sect.school)}</span></div>`);
  // 门派贡献：替师门办差攒下，升地位、学外门以上的武功拿它去换（docs/menpai.md 第七节第八条）
  if (S.sect) rows.push(`<div><span class="tag">贡献</span><span>${S.sect.school}贡献 ${gongxianOf(S)}。替师门办差事攒下；升地位、学外门以上的武功要拿它去换。</span></div>`);
  if (past) rows.push(`<div><span class="tag">来历</span><span>${past}。</span></div>`);
  // 离开师门的两条路：辞别好聚好散，一辈子一回；叛门再也回不去（docs/paiban.md E05）。点了先弹一张卡把后果说清
  const home = S.sect ? sectHome() : null;
  if (home) rows.push(`<div><span class="tag">去处</span><span>${home.name}</span><button class="act" data-act="travelAsk:${home.to}">去</button></div>`);
  const acts = S.sect ? `<div class="acts">${canCibie() ? '<button class="act" data-act="sectLeaveAsk:辞别">辞别师门</button>' : ''}<button class="act danger" data-act="sectLeaveAsk:叛门">叛出师门</button></div>` : '';
  return `<section class="card here-card"><div class="sec-h"><h2>师门</h2><span class="count">${sectText(S)}</span></div><div class="news">${rows.join('')}</div>${acts}</section>`;
}

/** 一辈子只能辞别一回 */
const canCibie = (): boolean => !S.pastSects?.some(x => x.how === '辞别');

/** 离开师门之前的说明卡：后果照实写 */
export function sectLeaveSheet(how: '辞别' | '叛门'): string {
  if (!S.sect) return '';
  const school = S.sect.school;
  const lines = how === '辞别'
    ? [`学过的${school}武功都留着，往后照样能练，只是不能再学${school}的新功夫。`, `${school}的贡献一笔勾销。`, `${school}从此不再收你；同门念着旧情，见了面不翻脸。`, '辞别一辈子只有这一回：往后再离哪一门，就是叛门。']
    : [`${school}的武功从此封顶，练不上去了。`, '江湖上的人看你是叛徒，恶名加三。', `${school}永不收回。`];
  return `<div class="r-h"><span class="tag ${how === '叛门' ? 'danger' : 'accent'}">${how}</span><h2>${how === '辞别' ? '辞别' : '叛出'}${school}</h2></div>
    <div class="news">${lines.map(x => `<div><span>${x}</span></div>`).join('')}</div>
    <div class="acts"><button class="act" data-act="sheetClose">再想想</button><button class="act ${how === '叛门' ? 'strong' : 'danger'}" data-act="sectLeave:${how}">${how === '辞别' ? '拜别师门' : '就此叛出'}</button></div>`;
}

/** 斤两：战力数、离下一档差什么、一句评语、认得的人谁强谁弱（docs/sheji-s5-s6.md S5） */
function jinliangHTML(): string {
  const z = zhanliLine(S), gap = nextTierLine(S), g = renGuo(S);
  const cols: [string, typeof g.strong][] = [['强过你', g.strong], ['相仿', g.even], ['不如你', g.weak]];
  const known = cols.filter(([, rows]) => rows.length)
    .map(([name, rows]) => `<div><span class="tag">${name}</span><span>${rows.map(r => r.name).join('、')}</span></div>`).join('');
  return `<section class="card here-card"><div class="sec-h"><h2>斤两</h2><span class="count">战力 ${z.power}</span></div>
    <p class="zhanli"><b>${z.line}</b>${z.hurt ? `<br><span class="hurt">${z.hurt}</span>` : ''}</p>
    ${gap ? `<p class="muted">${gap}</p>` : ''}
    <p class="pingyu">${pingyuOf(S)}</p>
    ${known ? `<div class="sec-h"><h2>认得的人</h2><span class="count">交过手、掂过斤两的</span></div><div class="news">${known}</div>` : ''}</section>`;
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
  // 伤写明轻重：轻伤过一日自己好，重伤要看伤、服药（engine/shang.ts）
  const hurt = (Object.entries(S.wounds) as ['hand' | 'foot' | 'inner', number][]).filter(([, n]) => n > 0).map(([z, n]) => `${ZONE_NAME[z]}${cn(n)}级（${n >= 2 ? '重伤，要找郎中或服药' : '轻伤，自己会好'}）`).join('、');
  return `
  ${dollHTML(fullName(), who)}
  <section class="card here-card"><div class="sec-h"><h2>根基</h2><span class="count">常人各二十</span></div><div class="attrs">${attrs}</div>
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
  ${jinliangHTML()}
  ${yingshengHTML()}
  ${shimenHTML()}
  ${yueHTML()}
  <section class="card here-card"><div class="sec-h"><h2>人情</h2><span class="count">${meaningful}</span></div>${renqingHTML()}</section>
  <section class="card here-card"><div class="sec-h"><h2>存档</h2></div>
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

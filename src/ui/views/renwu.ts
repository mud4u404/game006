import { S, fullName } from '../../core/state';
import type { AttrKey } from '../../content/types';
import { npcName } from '../../engine/world';

const AD: Record<AttrKey, string> = { 体魄: '气血 · 外功', 根骨: '内力 · 硬接', 身法: '轻身 · 闪避', 悟性: '领悟 · 拆招', 胆魄: '胆气 · 抢攻' };

let confirmRestart = false;
export const setConfirmRestart = (v: boolean): void => { confirmRestart = v; };

export function viewRenwu(): string {
  const attrs = (Object.keys(AD) as AttrKey[]).map(a => `<div class="attr"><b>${S.attr[a]}</b><span>${a}</span><small>${AD[a]}</small></div>`).join('');
  const rels = Object.entries(S.rel).map(([id, v]) => `<div class="row"><span>${npcName(id)}</span><span class="tag">${v}</span></div>`).join('');
  const who = S.chapter === 0 ? '瓜洲渡渔家少年' : S.title ? '江湖人称「' + S.title + '」' : '初出茅庐 · 无名小卒';
  return `
  <section class="card status"><span class="ava t-accent">沈</span><div class="who"><b>${fullName()}</b><small>${who}</small></div></section>
  <section class="card here"><div class="sec-h"><h2>根基</h2></div><div class="attrs">${attrs}</div></section>
  <section class="card"><div class="kv">
    <div><span>气血</span><b>${S.hp} / ${S.hpMax}</b></div><div><span>内力</span><b>${S.mp} / ${S.mpMax}</b></div>
    <div><span>身份</span><b>${S.chapter === 0 ? '渔家' : '游侠'}</b></div><div><span>门派</span><b>无门无派</b></div>
    <div><span>侠义</span><b>${S.xia}</b></div><div><span>恶名</span><b>${S.eming}</b></div>
    <div><span>银两</span><b>${S.silver} 文</b></div><div><span>名号</span><b>${S.title || '—'}</b></div>
  </div></section>
  <section class="card here"><div class="sec-h"><h2>人情</h2><span class="count">${Object.keys(S.rel).length}</span></div><div class="rows">${rels}</div></section>
  <section class="card here"><div class="sec-h"><h2>存档</h2></div>
    <p class="muted">进度保存在这台设备的浏览器里。回到标题画面后，可以继续，也可以开始新的江湖。</p>
    ${confirmRestart
      ? `<div class="btnrow"><button class="btn ghost" data-act="restartNo">算了</button><button class="btn warn" data-act="restartYes">清空存档</button></div>`
      : `<div class="btnrow"><button class="act" data-act="toTitle">回到标题</button><button class="act danger" data-act="restart">清空存档</button></div>`}
  </section>`;
}

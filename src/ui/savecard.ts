/**
 * 人物页「存档」一栏的按钮：导出、导入存档码，从备份里找回。
 * 规则在 core/save.ts；栏目本身的 HTML 在 views/renwu.ts。
 * 由 main.ts 引入，避免和 shell.ts 循环引用。
 */
import { tupoClear } from '../engine/tupo';
import { S, setState } from '../core/state';
import { exportCode, importCodeAny, listBackups, rawBackup, replaceSave, summary } from '../core/save';
import type { GameState } from '../core/state';
import { $ } from '../core/util';
import { closeSheet, openSheet, registerHandlers, render, toast } from './shell';

let pending: GameState | null = null;

const head = (tag: string, title: string): string => `<div class="r-h"><span class="tag accent">${tag}</span><h2>${title}</h2></div>`;

function confirmReplace(st: GameState, from: string): void {
  pending = st;
  openSheet(`${head('存档', '换成这份进度？')}
    <p class="muted">${from}：<b>${summary(st)}</b></p>
    <p class="muted">现在的进度（${summary(S)}）会先另存一份，之后在「找回备份」里还能换回来。</p>
    <div class="btnrow"><button class="btn ghost" data-act="sheetClose">算了</button><button class="btn" data-act="saveReplaceYes">换成这份</button></div>`);
}

registerHandlers({
  saveExport: () => {
    openSheet(`${head('存档码', '导出存档')}
      <p class="muted">把下面这一整段字复制下来，存进备忘录或发给自己。换了手机、清了缓存，在「导入存档码」里粘回去，进度就回来了。</p>
      <textarea class="codebox" id="saveCode" readonly>${exportCode(S)}</textarea>
      <div class="btnrow"><button class="btn ghost" data-act="sheetClose">关闭</button><button class="btn" data-act="saveCopy">复制</button></div>`);
  },
  saveCopy: () => {
    const el = $<HTMLTextAreaElement>('#saveCode');
    if (!el) return;
    el.select();
    const done = (): void => toast('已复制存档码');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(el.value).then(done, () => { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  },
  saveImport: () => {
    openSheet(`${head('存档码', '导入存档')}
      <p class="muted">把存档码整段粘贴到下面，以 JHYY: 或 z1: 开头。</p>
      <textarea class="codebox" id="saveCodeIn" placeholder="JHYY:……"></textarea>
      <p class="muted" id="saveImportErr" hidden></p>
      <div class="btnrow"><button class="btn ghost" data-act="sheetClose">算了</button><button class="btn" data-act="saveImportGo">读取</button></div>`);
  },
  saveImportGo: () => {
    const el = $<HTMLTextAreaElement>('#saveCodeIn'), err = $('#saveImportErr');
    importCodeAny(el?.value ?? '').then(
      st => confirmReplace(st, '存档码里是'),
      e => { if (err) { err.hidden = false; err.textContent = (e as Error).message; } }
    );
  },
  saveBackups: () => {
    const list = listBackups();
    const rows = list.length
      ? list.map((b, i) => `<div class="row"><span>${b.label}<small class="muted"> ${b.state ? summary(b.state) : '读不出来，可导出交给维护者'}</small></span>${b.state ? `<button class="act" data-act="saveRestore:${i}">换回</button>` : `<button class="act" data-act="saveRaw:${i}">导出</button>`}</div>`).join('')
      : '<p class="muted">还没有备份。玩上一天就会有。</p>';
    openSheet(`${head('存档', '找回备份')}<div class="rows">${rows}</div><button class="btn ghost" data-act="sheetClose">关闭</button>`);
  },
  saveRaw: v => {
    const b = listBackups()[Number(v)];
    const raw = b ? rawBackup(b.key) : null;
    if (!raw) return;
    openSheet(`${head('存档', '读不出来的旧存档')}
      <p class="muted">把下面整段复制下来发给维护者，修好以后可以还给你。</p>
      <textarea class="codebox" id="saveCode" readonly></textarea>
      <div class="btnrow"><button class="btn ghost" data-act="sheetClose">关闭</button><button class="btn" data-act="saveCopy">复制</button></div>`);
    const el = $<HTMLTextAreaElement>('#saveCode');
    if (el) el.value = raw;
  },
  saveRestore: v => {
    const b = listBackups()[Number(v)];
    if (b?.state) confirmReplace(b.state, b.label);
  },
  saveReplaceYes: () => {
    if (!pending) return;
    replaceSave(pending);
    tupoClear(); // 换存档：旧档攒着没弹的突破卡不带过去
    setState(pending);
    pending = null;
    closeSheet();
    render();
    toast('进度已换好');
  }
});

/**
 * 巫师模式的界面：连点版本号开关、反馈浮层、巫师工具的处理函数。
 * 规则在 core/wushi.ts，工具栏的 HTML 在 views/wushi-tools.ts。由 main.ts 引入。
 */
import { S, save } from '../core/state';
import { exportCode, SAVE_VERSION } from '../core/save';
import { advanceMin, fullDate, shichenKe } from '../core/time';
import { room } from '../content';
import { tierNow } from '../engine/ren';
import { $ } from '../core/util';
import { addSilver, feedbackTitle, feedbackUrl, recentClicks, setWushi, teleport, verTap, wushiOn, type FeedbackInfo } from '../core/wushi';
import { closeSheet, hooks, openSheet, registerHandlers, render, syncWushi, toast } from './shell';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function feedbackInfo(): FeedbackInfo {
  const r = room(S.loc);
  return {
    loc: S.loc, locName: r.name,
    when: `${fullDate(S)} ${shichenKe(S.min)}`,
    ver: `存档 v${SAVE_VERSION}`,
    clicks: recentClicks(),
    realm: tierNow(S).name, hp: `${S.hp}/${S.hpMax}`, silver: S.silver,
    main: `${S.chapter === 0 ? '序章' : '第' + S.chapter + '回'}${S.track ? ' · ' + S.track : ''}`
  };
}

/** 发送链接：随文本框内容现拼 */
function refreshLink(): void {
  const a = $<HTMLAnchorElement>('#fbSend'), box = $<HTMLTextAreaElement>('#fbText');
  if (!a || !box) return;
  const { url, withCode } = feedbackUrl(box.value, feedbackInfo(), exportCode(S));
  a.href = url;
  const cp = $('#fbCopy');
  if (cp) cp.hidden = withCode;
  const note = $('#fbNote');
  if (note) note.textContent = withCode ? '存档码会附在正文里。' : '存档码太长放不进链接：先点「复制存档码」，发送后粘贴在正文末尾。';
  const t = $('#fbTitle');
  if (t) t.textContent = feedbackTitle(box.value);
}

document.addEventListener('input', e => { if ((e.target as HTMLElement).id === 'fbText') refreshLink(); });

registerHandlers({
  verTap: () => {
    if (!verTap()) return;
    const on = !wushiOn();
    setWushi(on);
    syncWushi();
    toast(on ? '巫师模式已打开' : '巫师模式已关闭');
    render();
  },
  wsOff: () => { setWushi(false); syncWushi(); toast('巫师模式已关闭'); render(); },
  wushiOpen: () => {
    if (!wushiOn()) return;
    const i = feedbackInfo();
    openSheet(`<div class="r-h"><span class="tag warn">巫师</span><h2>反馈给维护者</h2></div>
      <textarea class="wushi-fb-box" id="fbText" placeholder="哪里不对？怎么发现的？"></textarea>
      <p class="muted">标题：<span id="fbTitle">${esc(feedbackTitle(''))}</span></p>
      <div class="wushi-auto">场景：${esc(i.locName)}（${i.loc}）
江湖时辰：${esc(i.when)}
版本：${esc(i.ver)}
角色：${esc(i.realm)} · 气血 ${i.hp} · 银两 ${i.silver} · 主线 ${esc(i.main)}
最近点击：${esc(i.clicks.join(' → ') || '（无）')}
存档码：发送时自动附上</div>
      <p class="muted" id="fbNote"></p>
      <div class="btnrow"><button class="btn ghost" data-act="sheetClose">关闭</button>
      <a class="btn link" id="fbSend" href="#" target="_blank" rel="noopener">发送</a></div>
      <button class="btn ghost" id="fbCopy" data-act="wsCopyCode" hidden>复制存档码</button>`, false);
    refreshLink();
  },
  wsCopyCode: () => {
    const code = exportCode(S);
    const done = (): void => toast('已复制存档码');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => toast('复制失败，请用「导出存档码」'));
    else toast('复制失败，请用「导出存档码」');
  },
  wsGo: () => {
    const v = $<HTMLSelectElement>('#wsRoom')?.value;
    if (!v) return;
    teleport(S, v);
    S.tab = 'jianghu';
    save();
    render();
    toast('已到：' + room(v).name);
  },
  wsHour: v => {
    const n = Number(v);
    if (!(n > 0)) return;
    advanceMin(S, n * 60);
    save();
    render();
    toast(`时辰拨快 ${n} 小时`);
  },
  wsSilver: () => { addSilver(S, 1000); save(); render(); toast('银两 +1000'); },
  wsFight: () => {
    const v = $<HTMLSelectElement>('#wsFoe')?.value;
    if (!v) return;
    closeSheet();
    hooks.startFight(v);
  }
});

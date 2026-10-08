/** 标题画面和人物页上的账号入口。只拼 HTML，处理函数在 ui/account.ts */
import { isPreview } from '../../core/preview';
import { cloudEnabled, session } from '../../net/cloud';
import { syncStatus } from '../../net/sync';

/** 试玩预览不连云存档（core/preview.ts）：不给登录入口，写明一句 */
const PREVIEW_NOTE = '预览版不连云存档';

export function titleAccountHTML(): string {
  if (isPreview()) return `<p class="t-warn">${PREVIEW_NOTE}，进度只存在这台设备上</p>`;
  if (!cloudEnabled()) return '';
  const s = session();
  return s
    ? `<button class="t-link" data-act="acctMenu">已登录：${s.username} · 云存档</button>`
    : `<button class="t-link" data-act="acctOpen">登录 / 注册 · 换手机也不丢进度</button>`;
}

export function cloudRowHTML(): string {
  if (isPreview()) return `<div class="rows"><div class="row"><span>云存档<small class="muted">${PREVIEW_NOTE}。这里的进度和正式版分开存，只在这台设备上</small></span></div></div>`;
  if (!cloudEnabled()) return '';
  const s = session();
  return s
    ? `<div class="rows"><div class="row"><span>云存档<small class="muted">${s.username} · ${syncStatus() || '已登录'}</small></span><button class="act" data-act="acctSync">立即同步</button></div></div>
       <div class="btnrow"><button class="act" data-act="acctHistory">云上的备份</button><button class="act" data-act="acctLogout">退出登录</button></div>`
    : `<div class="rows"><div class="row"><span>云存档<small class="muted">登录以后，换手机、清缓存都不丢进度</small></span><button class="act" data-act="acctOpen">登录</button></div></div>`;
}

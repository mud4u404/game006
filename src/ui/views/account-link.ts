/** 标题画面和人物页上的账号入口。只拼 HTML，处理函数在 ui/account.ts */
import { cloudEnabled, session } from '../../net/cloud';
import { syncStatus } from '../../net/sync';

export function titleAccountHTML(): string {
  if (!cloudEnabled()) return '';
  const s = session();
  return s
    ? `<button class="t-link" data-act="acctMenu">已登录：${s.username} · 云存档</button>`
    : `<button class="t-link" data-act="acctOpen">登录 / 注册 · 换手机也不丢进度</button>`;
}

export function cloudRowHTML(): string {
  if (!cloudEnabled()) return '';
  const s = session();
  return s
    ? `<div class="rows"><div class="row"><span>云存档<small class="muted">${s.username} · ${syncStatus() || '已登录'}</small></span><button class="act" data-act="acctSync">立即同步</button></div></div>
       <div class="btnrow"><button class="act" data-act="acctHistory">云上的备份</button><button class="act" data-act="acctLogout">退出登录</button></div>`
    : `<div class="rows"><div class="row"><span>云存档<small class="muted">登录以后，换手机、清缓存都不丢进度</small></span><button class="act" data-act="acctOpen">登录</button></div></div>`;
}

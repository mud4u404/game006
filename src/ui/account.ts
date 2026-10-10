/**
 * 账号：登录、注册、退出，本机和云上进度不一致时让玩家选，云上的备份。
 * 规则在 net/cloud.ts、net/sync.ts；由 main.ts 引入。
 */
import { tupoClear } from '../engine/tupo';
import { setState, type GameState } from '../core/state';
import { migrate, readSave, replaceSave, summary } from '../core/save';
import { $ } from '../core/util';
import { CloudError, archive, cloudEnabled, history, pull, session, signIn, signOut, signUp, type CloudSave } from '../net/cloud';
import { decide, lastSyncedFp, markSynced, pushNow, setLatest } from '../net/sync';
import { closeSheet, openSheet, registerHandlers, render, toast } from './shell';
import { showTitle } from './story';

const head = (title: string): string => `<div class="r-h"><span class="tag accent">云存档</span><h2>${title}</h2></div>`;
const when = (t: number): string => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const onTitle = (): boolean => $('#titleLayer')?.hidden === false;
const refresh = (): void => { if (onTitle()) showTitle(true); else render(); };

let cloudCache: CloudSave | null = null;
let historyCache: CloudSave[] = [];

function loginSheet(err = ''): void {
  openSheet(`${head('登录 / 注册')}
    <p class="muted">用户名两到十二个字，可以用汉字。忘了密码，找负责人重设。</p>
    <input class="field" id="acctName" autocomplete="username" placeholder="用户名" maxlength="12">
    <input class="field" id="acctPass" type="password" autocomplete="current-password" placeholder="密码（至少六位）">
    <p class="muted err" id="acctErr"${err ? '' : ' hidden'}>${err}</p>
    <div class="btnrow"><button class="btn ghost" data-act="acctSignUp">注册新账号</button><button class="btn" data-act="acctSignIn">登录</button></div>
    <button class="btn ghost" data-act="sheetClose">先不登录</button>`);
}

async function auth(kind: 'in' | 'up'): Promise<void> {
  const name = ($<HTMLInputElement>('#acctName')?.value ?? '').trim();
  const pass = $<HTMLInputElement>('#acctPass')?.value ?? '';
  const err = $('#acctErr');
  if (err) { err.hidden = false; err.textContent = kind === 'in' ? '正在登录……' : '正在注册……'; }
  try {
    const s = kind === 'in' ? await signIn(name, pass) : await signUp(name, pass);
    closeSheet();
    toast(kind === 'in' ? `欢迎回来，${s.username}` : `账号已建好，${s.username}`);
    await reconcile();
  } catch (e) {
    if (err) { err.hidden = false; err.textContent = e instanceof CloudError ? e.message : '出错了，请再试一次'; }
  }
}

/** 登录后、或打开游戏时：把本机和云上的进度对齐 */
export async function reconcile(): Promise<void> {
  // 没配云端、或者是试玩预览（不连云存档，core/preview.ts）：什么也不做
  if (!cloudEnabled()) return;
  const s = session();
  if (!s) return;
  let cloud: CloudSave | null;
  try { cloud = await pull(); } catch { return; }
  const local = readSave().state;
  const d = decide(local, cloud, lastSyncedFp());
  if (d === 'none' && local) markSynced(s.uid, local);
  if (d === 'push' && local) { setLatest(local); await pushNow(); }
  if (d === 'pull' && cloud) useCloud(cloud);
  if (d === 'ask' && cloud && local) {
    cloudCache = cloud;
    openSheet(`${head('两边的进度不一样')}
      <p class="muted">这台设备和云上各有一份进度，选一份接着玩。没选的那份不会丢，会留作备份。</p>
      <div class="rows">
        <div class="row"><span>云上<small class="muted">${cloud.summary || '（无摘要）'} · ${when(cloud.updated)}</small></span><button class="act" data-act="acctUseCloud">用这份</button></div>
        <div class="row"><span>这台设备<small class="muted">${summary(local)}</small></span><button class="act" data-act="acctUseLocal">用这份</button></div>
      </div>`);
  }
}

function useCloud(cloud: CloudSave): void {
  const s = session();
  let st: GameState;
  try { st = migrate(cloud.data); } catch { toast('云上的存档读不出来，先用本机的'); return; }
  replaceSave(st);
  tupoClear(); // 换存档：旧档攒着没弹的突破卡不带过去
  setState(st);
  if (s) markSynced(s.uid, st);
  closeSheet();
  refresh();
  toast('已换成云上的进度');
}

registerHandlers({
  acctOpen: () => loginSheet(),
  acctMenu: () => {
    const s = session();
    openSheet(`${head(s ? s.username : '云存档')}
      <div class="btnrow"><button class="act" data-act="acctSync">立即同步</button><button class="act" data-act="acctHistory">云上的备份</button></div>
      <div class="btnrow"><button class="act" data-act="acctLogout">退出登录</button><button class="act" data-act="sheetClose">关闭</button></div>`);
  },
  acctSignIn: () => void auth('in'),
  acctSignUp: () => void auth('up'),
  acctUseCloud: () => { if (cloudCache) useCloud(cloudCache); },
  acctUseLocal: async () => {
    const local = readSave().state;
    if (!local) return;
    try { if (cloudCache) await archive(cloudCache.data, cloudCache.version, cloudCache.summary); } catch { /* 至少还有云上每天的历史 */ }
    setLatest(local);
    await pushNow();
    closeSheet();
    toast('已用这台设备的进度，云上原来那份留作备份');
  },
  acctSync: async () => {
    const local = readSave().state;
    if (!local) { toast('这台设备上还没有进度'); return; }
    setLatest(local);
    await pushNow();
    toast('已同步到云上');
    refresh();
  },
  acctLogout: async () => {
    const local = readSave().state;
    if (local) { setLatest(local); await pushNow(); }
    signOut();
    closeSheet();
    toast('已退出登录，进度仍在这台设备上');
    refresh();
  },
  acctHistory: async () => {
    try { historyCache = await history(); } catch (e) { toast((e as Error).message); return; }
    const rows = historyCache.length
      ? historyCache.map((h, i) => `<div class="row"><span>${when(h.updated)}<small class="muted">${h.summary}</small></span><button class="act" data-act="acctRestore:${i}">换回</button></div>`).join('')
      : '<p class="muted">云上还没有备份，玩上一天就会有。</p>';
    openSheet(`${head('云上的备份')}<div class="rows">${rows}</div><button class="btn ghost" data-act="sheetClose">关闭</button>`);
  },
  acctRestore: v => { const h = historyCache[Number(v)]; if (h) useCloud(h); }
});

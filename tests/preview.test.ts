import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 试玩预览（Pages 的 /preview/ 子目录）：存档换一套键，不连云存档。规则见 src/core/preview.ts
// 云存档的配置在测试里填上假的地址，确保「没发请求」不是因为没配云端
vi.mock('../src/net/config', () => ({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_KEY: 'sb_publishable_demo', EMAIL_DOMAIN: 'players.example.net' }));

const { isPreview, storageKey, MAIN_PREFIX, PREVIEW_PREFIX } = await import('../src/core/preview');
const { KEY, clearSaveSafely, listBackups, onSaved, readSave, replaceSave, saveKeys, savedAt, useStore, writeSave } = await import('../src/core/save');
const { newGame, skipToYangzhou } = await import('../src/core/state');
const { cloudEnabled, pull, push, session, signIn, signOut, signUp, useFetch } = await import('../src/net/cloud');
const { markSynced, pushNow, setLatest, startAutoSync, syncStatus } = await import('../src/net/sync');
const { cloudRowHTML, titleAccountHTML } = await import('../src/ui/views/account-link');

/** 内存里的 localStorage；云存档模块直接用全局的 localStorage，存档模块用 useStore 换进来的，两边是同一个 */
class MemStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(String(k), String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
  snapshot(pred: (k: string) => boolean) { return Object.fromEntries([...this.m].filter(([k]) => pred(k)).sort()); }
}

const MAIN_PAGE = '/game006/';
const PREVIEW_PAGE = '/game006/preview/';
const at = (pathname: string): void => { vi.stubGlobal('location', { pathname }); };
const isPreviewKey = (k: string): boolean => k.startsWith(PREVIEW_PREFIX);

let mem: MemStore;
let fetched: string[];
beforeEach(() => {
  mem = new MemStore();
  useStore(mem);
  vi.stubGlobal('localStorage', mem);
  fetched = [];
  useFetch((async (url: string) => {
    fetched.push(String(url));
    const body = { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'uid-1', user_metadata: { username: '孤舟' } } };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) } as Response;
  }) as typeof fetch);
});
afterEach(() => { useStore(null); vi.unstubAllGlobals(); vi.useRealTimers(); });

/** 正式版玩了几天的样子：当前存档、元数据、三份每日备份、重来之前的一份、一份读不出来的旧档，还登录了云存档 */
function seedMain(): Record<string, string> {
  at(MAIN_PAGE);
  const s = skipToYangzhou();
  s.name = '正式';
  const json = JSON.stringify(s);
  mem.setItem(KEY, json);
  mem.setItem('jhyy-save-meta', JSON.stringify({ savedAt: 1, v: s.v }));
  for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) mem.setItem('jhyy-bak-' + d, json);
  mem.setItem('jhyy-bak-restart', json);
  mem.setItem('jhyy-save-broken-1', '{坏了');
  mem.setItem('jhyy-cloud-session', JSON.stringify({ access: 'main-tok', refresh: 'r', expires: Date.now() + 3_600_000, uid: 'uid-main', username: '正式号' }));
  mem.setItem('jhyy-cloud-synced', JSON.stringify({ uid: 'uid-main', fp: 'x' }));
  mem.setItem('jhyy-cloud-history-day', '2026-10-03');
  return mem.snapshot(() => true);
}

describe('试玩预览：认得出来', () => {
  it('路径里有 /preview/ 才算预览', () => {
    for (const p of ['/game006/preview/', '/game006/preview/index.html', '/game006/preview', '/preview/', '/game006/preview/lab.html']) { at(p); expect(isPreview(), p).toBe(true); }
    for (const p of ['/game006/', '/game006/index.html', '/', '/game006/previews/', '/game006/preview-old/']) { at(p); expect(isPreview(), p).toBe(false); }
    vi.unstubAllGlobals();
    expect(isPreview()).toBe(false);   // 没有 location（测试、node）就是正式版
  });

  it('两套键谁也不是谁的前缀：正式版按前缀找备份、删旧备份时碰不到预览的，反过来也一样', () => {
    at(MAIN_PAGE);
    const main = Object.values(saveKeys());
    at(PREVIEW_PAGE);
    const prev = Object.values(saveKeys());
    for (const k of prev) expect(k.startsWith(PREVIEW_PREFIX), k).toBe(true);
    for (const a of main) for (const b of prev) {
      expect(b.startsWith(a), `${b} 以 ${a} 开头`).toBe(false);
      expect(a.startsWith(b), `${a} 以 ${b} 开头`).toBe(false);
    }
    expect(storageKey('jhyy-cloud-session')).toBe('jhyy-preview-cloud-session');
    expect(() => storageKey('other-key')).toThrow(MAIN_PREFIX);
  });
});

describe('试玩预览：存档和正式版分开', () => {
  it('预览页读不到正式版的存档，写、备份、清空、替换都只动 jhyy-preview- 开头的键，正式版的一个字节不变', () => {
    vi.useFakeTimers();
    const before = seedMain();
    at(PREVIEW_PAGE);
    // 正式版有进度，预览页照样是一片空白，从新游戏开始
    expect(readSave()).toEqual({ state: null, broken: false });
    expect(savedAt()).toBe(0);
    expect(listBackups()).toEqual([]);
    // 一连玩上五天：每天写存档、留备份（预览自己的备份轮换不能删正式版的）
    const s = newGame();
    s.name = '预览';
    for (let d = 4; d <= 8; d++) { vi.setSystemTime(new Date(`2026-10-0${d}T12:00:00Z`)); writeSave(s); }
    replaceSave({ ...s, name: '换过' });
    clearSaveSafely();
    mem.setItem(saveKeys().save, '{坏了');
    expect(readSave().broken).toBe(true);
    // 正式版的键原样不动
    expect(mem.snapshot(k => !isPreviewKey(k))).toEqual(before);
    // 预览自己的：三份每日备份、重来之前的一份、读不出来的一份
    const mine = Object.keys(mem.snapshot(isPreviewKey));
    expect(mine.filter(k => k.startsWith('jhyy-preview-bak-2026'))).toEqual(['jhyy-preview-bak-2026-10-06', 'jhyy-preview-bak-2026-10-07', 'jhyy-preview-bak-2026-10-08']);
    expect(mine).toContain('jhyy-preview-bak-restart');
    expect(mine.some(k => k.startsWith('jhyy-preview-save-broken-'))).toBe(true);
    expect(listBackups().every(b => b.key.startsWith(PREVIEW_PREFIX))).toBe(true);
  });

  it('反过来，正式版也碰不到预览的存档：读的是自己的，备份轮换、找回备份都不算预览的', () => {
    vi.useFakeTimers();
    at(PREVIEW_PAGE);
    const p = newGame();
    p.name = '预览';
    for (let d = 1; d <= 5; d++) { vi.setSystemTime(new Date(`2026-10-1${d}T12:00:00Z`)); writeSave(p); }
    const previewBefore = mem.snapshot(isPreviewKey);
    at(MAIN_PAGE);
    expect(readSave().state).toBeNull();
    const s = skipToYangzhou();
    s.name = '正式';
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    writeSave(s);
    expect(readSave().state?.name).toBe('正式');
    expect(listBackups().map(b => b.key)).toEqual(['jhyy-bak-2026-10-16']);
    clearSaveSafely();
    expect(mem.snapshot(isPreviewKey)).toEqual(previewBefore);
  });
});

describe('试玩预览：不连云存档', () => {
  it('正式版登录着，预览页也不算登录；登录、注册、拉、推都不发请求', async () => {
    const before = seedMain();
    at(MAIN_PAGE);
    expect(cloudEnabled()).toBe(true);
    expect(session()?.username).toBe('正式号');
    at(PREVIEW_PAGE);
    expect(cloudEnabled()).toBe(false);
    expect(session()).toBeNull();
    await expect(signIn('孤舟', 'secret1')).rejects.toThrow('预览版不连云存档');
    await expect(signUp('孤舟', 'secret1')).rejects.toThrow('预览版不连云存档');
    await expect(pull()).rejects.toThrow();
    await expect(push({ v: 99 }, 99, '预览')).rejects.toThrow();
    signOut();   // 预览页点了退出，也不能把正式版的登录弄掉
    expect(fetched).toEqual([]);
    expect(mem.snapshot(k => !isPreviewKey(k))).toEqual(before);
  });

  it('预览页写存档不会自动推到云上，立即同步也不推；同步记录只记在预览自己的键里', async () => {
    vi.useFakeTimers();
    const before = seedMain();
    at(PREVIEW_PAGE);
    let hooked = 0;
    onSaved(() => { hooked++; });
    startAutoSync();   // main.ts 每次打开页面都调；预览页里它什么也不挂
    const s = newGame();
    setLatest(s);
    writeSave(s);
    await vi.advanceTimersByTimeAsync(60_000);
    await pushNow();
    await pushNow(true);
    markSynced('uid-main', s);
    expect(hooked).toBe(1);
    expect(fetched).toEqual([]);
    expect(syncStatus()).toBe('');
    expect(mem.snapshot(k => !isPreviewKey(k))).toEqual(before);
  });

  it('打开预览页时的对齐（main.ts 调 reconcile）不拉云上的存档，也不动本机的', async () => {
    const before = seedMain();
    // 账号界面连带引入战斗界面，加载时要挂一个切后台的监听；测试里给个空的 document
    vi.stubGlobal('document', { addEventListener: () => undefined, hidden: false });
    const { reconcile } = await import('../src/ui/account');
    at(PREVIEW_PAGE);
    await reconcile();
    expect(fetched).toEqual([]);
    expect(mem.snapshot(() => true)).toEqual(before);
    // 对照：同样的本机数据，正式版打开时是要去云上拉的
    at(MAIN_PAGE);
    await reconcile().catch(() => undefined);
    expect(fetched.some(u => u.includes('/rest/v1/saves'))).toBe(true);
  });

  it('预览页不给登录入口，写明「预览版不连云存档」；正式版照旧', () => {
    seedMain();
    at(PREVIEW_PAGE);
    for (const html of [titleAccountHTML(), cloudRowHTML()]) {
      expect(html).toContain('预览版不连云存档');
      expect(html).not.toMatch(/data-act="acct/);
    }
    at(MAIN_PAGE);
    expect(titleAccountHTML()).toContain('data-act="acctMenu"');
    expect(cloudRowHTML()).toContain('data-act="acctSync"');
  });
});

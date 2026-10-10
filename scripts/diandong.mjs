/**
 * 点动全查：390×844 手机屏上，每个地点 × 每个主界面，把能点的东西逐个真点一遍。
 * 冒烟（smoke.mjs）走一条认好的路，乱点（luandian.mjs）随机点；这里是「不漏」的那一种：53 个地点一个不落。
 *
 * 做法：
 *  1. 借 vite 的 ssrLoadModule 取出全部地点和「跳过序章」的存档，逐个地点把存档的 loc 改成它，读档进游戏；
 *  2. 对每个地点的江湖页，以及每个地点的人物、武功、行囊、地图页，把 button / [data-act] / summary 枚举出来；
 *  3. 每个都查：露不露得出来（在 390 宽的屏内）、手指点下去落不落在自己身上（elementFromPoint；
 *     滚到上、中、下三个位置，哪个都落不到自己才算被盖住）、够不够大；
 *  4. 然后用手指（touchscreen.tap）真点一下，看有没有任何反应（页面、弹层、提示条、存档有一样变了即算有）。
 *     每点一个就重载一次，下一个从同一个起点开始，互不连累；
 *  5. 点开弹层的，弹层里的按钮也照样查一遍，再点一遍。
 *
 * 用法：npm run diandong（先打包，再自动起预览服务）。也可测指定网址：node scripts/diandong.mjs <网址>
 *   只查几个地点：DIANDONG_ROOMS=hu,gz_home；快速档（每个地点只点江湖页，其余页只查位置不点）：DIANDONG_FAST=1
 * 有「点不到」（被盖住、挤出屏幕、点了没反应）就以非零状态退出，CI 变红。
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }

const W = Number(process.env.DIANDONG_W ?? 390), H = Number(process.env.DIANDONG_H ?? 844);
const env = process.env;
const only = env.DIANDONG_ROOMS ? env.DIANDONG_ROOMS.split(',') : null;
const FAST = !!env.DIANDONG_FAST;

// ---- 取全部地点和跳过序章的存档（直接读源码，不经浏览器）----
const { createServer, preview } = await import('vite');
const vs = await createServer({ server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
const content = await vs.ssrLoadModule('/src/content/index.ts');
const state = await vs.ssrLoadModule('/src/core/state.ts');
const SAVE_KEY = (await vs.ssrLoadModule('/src/core/save.ts')).KEY;
const rooms = content.ROOMS.map(r => r.id).filter(id => !only || only.includes(id));
const base = state.skipToYangzhou();
base.silver = Number(env.DIANDONG_SILVER ?? 500);       // 有钱，买卖类按钮才不是灰的
if (env.DIANDONG_MIN) base.min = Number(env.DIANDONG_MIN);   // 改时辰：夜里（1410）有些去处、人物的按钮不一样
await vs.close();

let url = process.argv[2], server;
if (!url) { server = await preview({ preview: { port: 4174 }, logLevel: 'warn' }); url = server.resolvedUrls.local[0]; }

const exe = ['/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
let b;
try { b = await pw.chromium.launch(env.SMOKE_CHANNEL ? { channel: env.SMOKE_CHANNEL } : {}); }
catch (e) { if (!exe) throw e; b = await pw.chromium.launch({ executablePath: exe }); }

// 固定现实的钟：每次读档进来都一样
const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const errs = [];
const bad = [];                                         // { room, tab, what, name, why }
let nBtn = 0, nTapped = 0, nGeo = 0;
const seen = new Set();                                 // 同一个动作在同一地点同一页只点一次（参数不同的算不同）

const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
// 每次载入都把存档种成指定的样子；之后游戏自己写存档一律吞掉，重载就回到起点
// 种子放在 window.name 里，重载也留着
await p.addInitScript(({ key, now, wushi }) => {
  Date.now = () => now;
  const set = Storage.prototype.setItem;
  try { localStorage.clear(); } catch { /* 忽略 */ }
  if (window.name.startsWith('{')) set.call(localStorage, key, window.name);
  if (wushi) set.call(localStorage, 'jhyy-wushi', '1');
  Storage.prototype.setItem = function (k, v) { if (k.startsWith('jhyy-')) return; return set.call(this, k, v); };
}, { key: SAVE_KEY, now: NOW, wushi: !!env.DIANDONG_WUSHI });

let started = false, cur = '', dirty = true;
/** 去重的键：人物、武功、行囊、地图页和各页通用的按钮跟地点无关，只点一次；江湖页上随地点变的才逐地点点 */
const kk = (room, tab, path, act) => (tab !== 'jianghu' || /^(tab|quest|questbook|sheetClose|scrimClose|qtrack|qgo)(:|$)/.test(act)) ? `${tab}|${path}|${act}` : `${room}|${tab}|${path}|${act}`;

/** 进到某地的某一页。上一次点击没改动什么（点开的弹层已经关回去、主画面原样）就不重载，省时间；改动过的才重载回起点 */
async function enter(room, tab) {
  if (!dirty && cur === room + '/' + tab) return;
  const s = JSON.parse(JSON.stringify(base));
  s.loc = room; s.tab = tab; s.sel = null;
  if (!started) { await p.goto(url); started = true; }
  await p.evaluate(v => { window.name = v; }, JSON.stringify(s));
  await p.reload();
  await p.waitForSelector('[data-act="tContinue"]', { timeout: 8000 });
  await p.waitForTimeout(100);
  await p.tap('[data-act="tContinue"]');
  await p.waitForSelector('#main .card, #main section', { timeout: 8000 });
  await p.waitForTimeout(60);
  cur = room + '/' + tab; dirty = false;
}

/** 当前最上层里所有能点的东西 */
const LIST = () => {
  const layers = ['#sheetLayer', '#titleLayer', '#chapLayer', '#storyLayer', '#fightLayer'];
  const top = layers.map(s => document.querySelector(s)).find(e => e && !e.hidden) || document.querySelector('#app');
  const out = [];
  document.querySelectorAll('[data-dd]').forEach(e => e.removeAttribute('data-dd'));
  top.querySelectorAll('button,[data-act],summary,a[href]').forEach((el, i) => {
    el.dataset.dd = String(i);
    out.push({ i, act: el.dataset.act || '', text: el.textContent.trim().replace(/\s+/g, '').slice(0, 12), dis: !!el.disabled, vis: el.checkVisibility() });
  });
  return { layer: top.id || 'app', items: out };
};

/** 量一个：滚到上、中、下三个位置，只要有一个位置手指点得中它自己就算通；都点不中，就是被盖住或挤出屏幕 */
const PROBE = i => {
  const el = document.querySelector(`[data-dd="${i}"]`);
  if (!el) return { gone: true };
  const hit = () => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { ok: false, r, over: '大小为零' };
    let x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    // 弹层的遮罩铺满全屏，中心被面板盖着是设计如此：点它露在外面的边角（四个角里挑一个落在遮罩自己身上的）
    if (el.dataset.act === 'scrimClose') {
      for (const [cx, cy] of [[6, 6], [innerWidth - 6, 6], [6, innerHeight - 6], [innerWidth - 6, innerHeight - 6]]) {
        if (document.elementFromPoint(cx, cy) === el) { x = cx; y = cy; break; }
      }
    }
    const inside = r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1;
    const t = inside ? document.elementFromPoint(x, y) : null;
    const mine = el.closest('[data-act]');
    return { ok: !!t && (el.contains(t) || (!!mine && t.closest('[data-act]') === mine)), r, x, y, over: t ? (t.id || t.className || t.tagName) : '屏外' };
  };
  let best = null;
  for (const block of ['center', 'start', 'end']) {
    el.scrollIntoView({ block, inline: 'center' });
    const h = hit();
    if (h.ok) { best = h; break; }
    best = best || h;
  }
  const r = best.r;
  return {
    ok: best.ok, x: best.x, y: best.y, w: Math.round(r.width), h: Math.round(r.height),
    left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), over: best.over,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1
  };
};

/** 页面状态的指纹：只要点完以后这里有一样变了，就算有反应 */
const SIG = () => {
  const ids = ['appbar', 'main', 'tabs', 'travel', 'fightLayer', 'storyLayer', 'chapLayer', 'sheetLayer', 'titleLayer'];
  const parts = ids.map(id => { const e = document.getElementById(id); return e ? (e.hidden ? 'H' : e.innerHTML) : ''; });
  const t = document.getElementById('toast');
  return parts.join('|') + '|' + (t && !t.hidden ? t.textContent : '') + '|' + document.getElementById('app')?.className;
};
/** 底下三块主画面的指纹：用来判断「点开又关回去以后，是不是原样」 */
const BASE = () => ['appbar', 'main', 'tabs'].map(id => document.getElementById(id)?.innerHTML ?? '').join('|');
const OPEN = () => ['sheetLayer', 'fightLayer', 'storyLayer', 'chapLayer'].filter(id => { const e = document.getElementById(id); return e && !e.hidden; });

// 会离开游戏、清存档、联网的，不真点（只查位置）
const NO_TAP = /^(restart|restartYes|toTitle|save[A-Z]\w*|acct[A-Z]\w*|tNew|tGo|tBack|cloud\w*|exportSave|importSave)$/;
const label = it => (it.act || it.text) + (it.text && it.act ? `（${it.text}）` : '');

/** 查一层里每个东西的位置；返回点得中的那些 */
async function geometry(room, tag, items) {
  const ok = [];
  for (const it of items) {
    if (!it.vis) continue;
    nBtn++;
    const pr = await p.evaluate(PROBE, it.i);
    nGeo++;
    if (pr.gone) continue;
    const name = label(it);
    if (!pr.ok) { bad.push({ room, tab: tag, what: '被盖住或挤出屏幕', name, why: `点中心落在「${pr.over}」；位置 ${pr.left},${pr.top}～${pr.right},${pr.bottom}，屏宽 ${W}` }); continue; }
    if (pr.right > W + 1 || pr.left < -1) bad.push({ room, tab: tag, what: '超出屏宽', name, why: `${pr.left}～${pr.right}` });
    if (pr.overflowX) bad.push({ room, tab: tag, what: '页面横向溢出', name, why: '' });
    if (pr.w < 32 || pr.h < 32) bad.push({ room, tab: tag, what: '太小', name, why: `${pr.w}×${pr.h}` });
    ok.push(it);
  }
  return ok;
}

/** 回到「进了某地某页，依次点开 path 里每一步」的状态 */
async function openPath(room, tab, path) {
  await enter(room, tab);
  for (const step of path.split('>').filter(Boolean)) {
    const it = (await p.evaluate(LIST)).items.find(x => x.act === step);
    if (!it) return false;
    const pr = await p.evaluate(PROBE, it.i);
    if (!pr.ok) return false;
    await p.touchscreen.tap(pr.x, pr.y);
    await p.waitForTimeout(150);
  }
  return true;
}

/** 真点一个，判有没有反应；返回点完有没有弹出弹层。点完尽量收拾回原样，收拾不了的标脏，下一个重载 */
async function tapOne(room, tab, path, it) {
  const tag = `${room}/${tab}${path}`;
  const find = async () => (await p.evaluate(LIST)).items.find(x => x.act === it.act && x.text === it.text);
  let now = await find();
  // 偶尔重载后弹层没点开（页面刚起来，头几十毫秒的点击还没接上）：整条路重走一遍再找，两次都没有才算
  if (!now) { dirty = true; if (await openPath(room, tab, path)) now = await find(); }
  if (!now) { bad.push({ room, tab: tag, what: '重新进来后找不到', name: label(it), why: '' }); return false; }
  const pr = await p.evaluate(PROBE, now.i);
  if (!pr.ok) return false;
  const base0 = await p.evaluate(BASE);
  const before = await p.evaluate(SIG);
  const errN = errs.length;
  await p.touchscreen.tap(pr.x, pr.y);
  nTapped++;
  if (env.DIANDONG_V) console.log('  点', tag, label(it));
  await p.waitForTimeout(150);
  const after = await p.evaluate(SIG);
  const toast = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  const open = await p.evaluate(OPEN);
  if (errs.length > errN) bad.push({ room, tab: tag, what: '点了报错', name: label(it), why: errs[errs.length - 1] });
  else if (before === after && !toast) bad.push({ room, tab: tag, what: '点了没反应', name: label(it), why: '页面、弹层、提示条都没变' });
  const opened = open.length === 1 && open[0] === 'sheetLayer' && !path.includes('>');
  return { opened, restore: async () => {
    // 收拾：弹层关回去、主画面原样，才算没改动
    if ((await p.evaluate(OPEN)).length) { await p.evaluate(() => document.querySelector('#sheetLayer [data-act="sheetClose"]')?.click()); await p.waitForTimeout(60); }
    const clean = !(await p.evaluate(OPEN)).length && (await p.evaluate(BASE)) === base0;
    if (!clean) dirty = true;
  } };
}

/** 一页一页查：先量这一页所有东西的位置，再逐个真点；点开弹层的，弹层里也量一遍、点一遍 */
async function walk(room, tab) {
  await enter(room, tab);
  const tag = `${room}/${tab}`;
  const items = await geometry(room, tag, (await p.evaluate(LIST)).items);
  for (const it of items) {
    if (FAST && tab !== 'jianghu') break;
    const verb = it.act.split(':')[0];
    if (!it.act || NO_TAP.test(verb) || it.dis) continue;
    const key = kk(room, tab, '', it.act);
    if (seen.has(key)) continue;
    seen.add(key);
    await enter(room, tab);
    const r = await tapOne(room, tab, '', it);
    if (!r) continue;
    if (r.opened) {
      const path = '>' + it.act;
      const sub = await geometry(room, `${tag}${path}`, (await p.evaluate(LIST)).items);
      await r.restore();
      if (FAST) continue;
      for (const s of sub) {
        const sv = s.act.split(':')[0];
        if (!s.act || NO_TAP.test(sv) || s.dis) continue;
        const k2 = kk(room, tab, path, s.act);
        if (seen.has(k2)) continue;
        seen.add(k2);
        if (!(await openPath(room, tab, path))) continue;
        const r2 = await tapOne(room, tab, path, s);
        if (r2) await r2.restore();
      }
    } else await r.restore();
  }
}

const TABS = ['jianghu', 'renwu', 'wugong', 'xingnang', 'ditu'];
console.log(`· 共 ${rooms.length} 个地点 × ${TABS.length} 个主界面，${W}×${H}${FAST ? '（快速档）' : ''}`);
const t0 = Date.now();
for (const room of env.DIANDONG_ONLYFIGHT ? [] : rooms) {
  for (const tab of TABS) await walk(room, tab);
  console.log(`· ${room} 完，累计查位置 ${nGeo}，真点 ${nTapped}，问题 ${bad.length}（${Math.round((Date.now() - t0) / 1000)} 秒）`);
}
/**
 * 战斗界面：找一个肯动手的人，「动手」点两下确认，打起来以后：
 *  - 操作面板（出招、暂停）、每次弹出的「应对重招」按钮、「胜负以后」的去路，位置要点得中；
 *  - 应对按钮用 Playwright 的正常 click（带「稳定、没被盖住」检查，2 秒内点不下去算失败）真点，不派发事件；
 *  - 手指（touchscreen）也点一回，看打斗有没有往前走。
 * 打到出现结算页为止，最多等 90 秒；找不到肯动手的人就报「没打起来」（也算问题，等于战斗入口走不到）
 */
async function fightProbe() {
  let started = 0;
  for (const room of rooms) {
    if (started) break;
    await enter(room, 'jianghu');
    const ids = (await p.evaluate(LIST)).items.filter(x => x.act.startsWith('sel:')).map(x => x.act);
    for (const sel of ids) {
      await enter(room, 'jianghu');
      let it = (await p.evaluate(LIST)).items.find(x => x.act === sel);
      let pr = it && await p.evaluate(PROBE, it.i);
      if (!pr?.ok) continue;
      await p.touchscreen.tap(pr.x, pr.y); await p.waitForTimeout(150);
      it = (await p.evaluate(LIST)).items.find(x => x.act === 'do:动手' && !x.dis);
      if (!it) continue;
      pr = await p.evaluate(PROBE, it.i);
      if (!pr.ok) continue;
      await p.touchscreen.tap(pr.x, pr.y); await p.waitForTimeout(700);
      await p.touchscreen.tap(pr.x, pr.y);                       // 二次确认
      try { await p.waitForSelector('#fightLayer:not([hidden])', { timeout: 4000 }); } catch { continue; }
      started = 1; dirty = true;
      console.log(`· 战斗：在 ${room} 对 ${sel} 动手，打起来了`);
      let alerts = 0, panelDone = false, t = Date.now();
      while (Date.now() - t < 90000) {
        await p.waitForTimeout(200);
        if (await p.$('#sheetLayer:not([hidden]) [data-act="fResult"]')) break;
        if (!(await p.$('#fightLayer:not([hidden])'))) break;
        if (await p.$('#fsheet.alert')) {
          if (!env.DIANDONG_FASTCLICK) await p.waitForTimeout(450);   // 头 350 毫秒不收点击（tooSoon），像人一样看一眼
          const opts = await p.evaluate(() => [...document.querySelectorAll('#rOpts .ropt')].map((e, i) => {
            e.dataset.dd = 'r' + i; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { i, dis: e.disabled, ok: !!t && e.contains(t), top: Math.round(r.top), bottom: Math.round(r.bottom), over: t ? (t.id || t.className || t.tagName) : '屏外' };
          }));
          alerts++;
          for (const o of opts) if (!o.ok) bad.push({ room, tab: `${room}/战斗/应对`, what: '应对按钮被盖住或在屏外', name: `第${o.i + 1}个`, why: `落在「${o.over}」，${o.top}～${o.bottom}，屏高 ${H}` });
          const live = opts.find(o => !o.dis);
          if (live) {
            const t0 = Date.now();
            try { await p.click(`[data-dd="r${live.i}"]`, { timeout: 2000 }); nTapped++; }
            catch (e) {
              bad.push({ room, tab: `${room}/战斗/应对`, what: '应对按钮 Playwright 正常点击超时', name: `第${live.i + 1}个`, why: String(e.message).split('\n').slice(0, 4).join(' | ') });
              const r = await p.evaluate(i => { const e = document.querySelector(`[data-dd="r${i}"]`); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, live.i);
              await p.touchscreen.tap(r.x, r.y);
            }
            void t0;
          }
          continue;
        }
        if (!panelDone) {
          panelDone = true;
          await geometry(room, `${room}/战斗/面板`, (await p.evaluate(LIST)).items);
        }
        const fates = await p.$$eval('[data-act^="fFate:"]', els => els.filter(e => e.offsetParent && !e.disabled).map(e => e.dataset.act));
        if (fates.length) { await p.waitForTimeout(450); await p.tap(`[data-act="${fates[0]}"]`).catch(() => {}); continue; }
        if (await p.$('#opening:not([hidden])')) { await p.tap('#opening').catch(() => {}); continue; }
        for (const s of ['#skUlt', '#skP0', '#skP1', '#skP2']) { const el = await p.$(s + ':not([disabled])'); if (el) { await el.tap().catch(() => {}); break; } }
      }
      console.log(`· 战斗结束：应对按钮弹出 ${alerts} 次`);
      if (!alerts) bad.push({ room, tab: `${room}/战斗`, what: '没出现应对重招', name: '', why: '90 秒内没弹出应对按钮，未能检查' });
      break;
    }
  }
  if (!started) bad.push({ room: '-', tab: '战斗', what: '战斗没打起来', name: 'do:动手', why: '所有地点都找不到肯动手的人（或二次确认点不动）' });
}
if (!env.DIANDONG_NOFIGHT) await fightProbe();
await b.close();
await server?.close();

// 同一个毛病在不同地点重复出现的，合并着打
const grouped = new Map();
for (const x of bad) { const k = `${x.what}｜${x.name}｜${x.tab.replace(/^[^/]+\//, '')}`; (grouped.get(k) || grouped.set(k, []).get(k)).push(x); }
console.log(`\n== 汇总：地点 ${rooms.length}，查了 ${nGeo} 个可点的东西（位置），真点 ${nTapped} 次，问题 ${bad.length} 条（${grouped.size} 种）==`);
for (const [k, v] of grouped) console.log(`  ✗ ${k}  × ${v.length} 处：${v.slice(0, 3).map(x => x.room).join('、')}${v.length > 3 ? '…' : ''}  ${v[0].why}`);
if (errs.length) console.log('页面报错：\n' + [...new Set(errs)].join('\n'));
process.exit(bad.length || errs.length ? 1 : 0);

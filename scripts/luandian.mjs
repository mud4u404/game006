/**
 * 乱点测试：用无头 Chromium 从标题画面「新的江湖」起，随机点屏幕上看得见、点得到的按钮，
 * 看会不会报错、卡死、白屏。冒烟测试（smoke.mjs）走的是一条认好的路，这里专找没人走过的路。
 *
 * 用法：npm run luandian（先打包，再自动起一个本地预览服务来测）。
 *   也可以测指定网址：node scripts/luandian.mjs <网址> [截图目录]
 *   换种子：LUANDIAN_SEED=7 npm run luandian（默认 1；写 random 就随手挑一个，开头会打印出来）
 *   点几下：LUANDIAN_STEPS=1000（默认 400）；每下之后等多久：LUANDIAN_WAIT=200（毫秒，默认 120）
 *
 * 算失败的：页面报错（pageerror）；连续 STALL_MS 一个能点的按钮都没有（卡死）；点完以后页面空白。
 * 失败时打印种子和最近二十次点了什么。同一个种子点的顺序一样，但战斗按真实时间走，不保证每一下都分毫不差。
 * 页面出问题时以非零状态退出，CI 会因此变红。
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }

const env = process.env;
const SEED = env.LUANDIAN_SEED === 'random' ? Math.floor(Math.random() * 1e6) : Number(env.LUANDIAN_SEED ?? 1) || 1;
const STEPS = Number(env.LUANDIAN_STEPS ?? 400) || 400;
const WAIT = Number(env.LUANDIAN_WAIT ?? 120) || 120;
/** 连续这么久一个能点的按钮都没有，算卡死。战斗里应对按钮是定时弹出的，章回题字三秒多才收，所以给足 */
const STALL_MS = 15_000;
/** 点开以后会清掉、换掉存档或离开游戏的，不点：清空存档、回到标题、存档码与备份、登录与云存档、标题画面上的重新开始 */
const SKIP = /^(restart|restartYes|toTitle|save[A-Z]\w*|acct[A-Z]\w*|tNew|tGo|tBack)$/;

/**
 * 各类按钮被挑中的分量，没写的算 1。标签页、地图分区、细看这类随时都在、点了也不往前走的，分量轻些；
 * 找人、做事、赶路、剧情选项、战斗里的出手和应对，分量重些。不然四成的点击都花在切标签页上，一场架也打不到。
 */
const WEIGHT = {
  tab: 0.3, mapRegion: 0.3, itemLook: 0.5, gearSlot: 0.5, slotPick: 0.5, questbook: 0.5, qtrack: 0.5, stName: 0.5, fPause: 0.3,
  sel: 2, do: 3, quest: 2, stPick: 2, stNext: 2, fSkill: 2, fReact: 3, fOpening: 3, fFate: 2, fResult: 2, chapDone: 2
};

/** 带种子的随机数（mulberry32） */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);

let url = process.argv[2];
let server;
if (!url) {
  const { preview } = await import('vite');
  server = await preview({ preview: { port: 4174 }, logLevel: 'warn' });
  url = server.resolvedUrls.local[0];
}
const shots = process.argv[3];
// 和冒烟测试一样：CI 里用机器上装好的 Chrome（SMOKE_CHANNEL=chrome），找不到就退回 Playwright 自带的
const channel = env.SMOKE_CHANNEL;
let b;
try { b = await pw.chromium.launch(channel ? { channel } : {}); }
catch (e) {
  if (!channel) throw e;
  console.log(`· 找不到 ${channel}，改用 Playwright 自带的浏览器`);
  b = await pw.chromium.launch();
}
// 和冒烟测试一样用矮屏手机的尺寸：按钮露不出来的，玩家也点不到
const p = await b.newPage({ viewport: { width: 360, height: 560 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(url);
await p.evaluate(() => localStorage.clear());
await p.reload();

/** 现在屏幕上看得见、点得到、不在跳过名单里的按钮：取按钮露在屏幕里那一块的中心，那一点最上面的必须是它自己 */
const pickable = () => p.evaluate(skip => {
  const re = new RegExp(skip);
  const W = innerWidth, H = innerHeight, out = [];
  for (const el of document.querySelectorAll('[data-act]')) {
    if (el.disabled) continue;
    const act = el.dataset.act || '';
    if (re.test(act.split(':')[0])) continue;
    const r = el.getBoundingClientRect();
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, W), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, H);
    if (x1 - x0 < 4 || y1 - y0 < 4) continue;
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    const top = document.elementFromPoint(x, y);
    if (!top || !(top === el || el.contains(top))) continue;
    out.push({ act, x, y, text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14) });
  }
  return out;
}, SKIP.source);

/** 像玩家一样随手划一下：挑一个能滚的框，滚到某个位置（框和位置都由种子定） */
const scrollSome = (r1, r2) => p.evaluate(([r1, r2]) => {
  const boxes = [...document.querySelectorAll('#app *')].filter(e => {
    if (e.scrollHeight <= e.clientHeight + 8 || !e.getClientRects().length) return false;
    const oy = getComputedStyle(e).overflowY;
    return oy === 'auto' || oy === 'scroll';
  });
  const box = boxes[Math.floor(r1 * boxes.length)];
  if (box) box.scrollTop = Math.round(r2 * (box.scrollHeight - box.clientHeight));
}, [r1, r2]);

/** 屏幕上没有能点的：像玩家一样往下翻一页找（剧情长、屏幕矮时，按钮在下面）；翻到底了就回到顶上 */
const pageDown = () => p.evaluate(() => {
  for (const e of document.querySelectorAll('#app *')) {
    if (e.scrollHeight <= e.clientHeight + 8 || !e.getClientRects().length) continue;
    const oy = getComputedStyle(e).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const end = e.scrollHeight - e.clientHeight;
    e.scrollTop = e.scrollTop >= end - 2 ? 0 : Math.min(end, e.scrollTop + e.clientHeight * 0.8);
  }
});

/** 一眼看出现在在哪：地名 + 盖在上面的层 */
const where = () => p.evaluate(() => {
  const NAME = { titleLayer: '标题', chapLayer: '章回', storyLayer: '剧情', fightLayer: '战斗', sheetLayer: '弹层', travel: '赶路' };
  const on = Object.keys(NAME).filter(id => { const e = document.getElementById(id); return e && !e.hidden; }).map(id => NAME[id]);
  const h1 = document.querySelector('#appbar h1')?.textContent?.trim() || '';
  return [h1, ...on].filter(Boolean).join('·');
});

/** 页面空白：#app 里一个字都没有，或者屏幕正中什么也没画 */
const blank = () => p.evaluate(() => {
  const text = (document.getElementById('app')?.innerText || '').trim();
  const hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return !text || !hit || hit === document.body || hit === document.documentElement;
});

const recent = [];
const places = new Set();
const acts = new Map();
let fights = 0, wasFighting = false, step = 0;
const t0 = Date.now();

async function fail(why) {
  console.log(`\n✗ 乱点测试失败（种子 ${SEED}，第 ${step} 下，${((Date.now() - t0) / 1000).toFixed(0)} 秒）：${why}`);
  if (errs.length) console.log('页面报错：\n' + errs.join('\n---\n'));
  console.log(`最近 ${recent.length} 次点击（点之前在哪 → 点了什么）：`);
  for (const r of recent) console.log(`  #${r.step}  [${r.where}]  ${r.act}  「${r.text}」`);
  try {
    console.log('现在在：' + await where());
    console.log('屏幕上的字：' + await p.evaluate(() => (document.getElementById('app')?.innerText || '').replace(/\s+/g, ' ').slice(0, 400)));
    // 看得见但点不到的按钮：在屏幕外，或者被别的东西挡住
    const off = await p.evaluate(() => [...document.querySelectorAll('[data-act]')].filter(e => !e.disabled && e.getClientRects().length).map(e => {
      const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const inView = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
      const top = inView ? document.elementFromPoint(x, y) : null;
      const why = !inView ? `在屏幕外(${Math.round(x)},${Math.round(y)})` : top && (top === e || e.contains(top)) ? '' : `被 ${top?.id || top?.className || top?.tagName} 挡住`;
      return why ? `${e.dataset.act} ${why}` : '';
    }).filter(Boolean).slice(0, 12));
    if (off.length) console.log('点不到的按钮：' + off.join('；'));
  } catch { /* 页面都没了 */ }
  if (shots) { try { await p.screenshot({ path: `${shots}/luandian-fail.png` }); console.log(`截图：${shots}/luandian-fail.png`); } catch { /* 截不了就算了 */ } }
  const how = [`LUANDIAN_SEED=${SEED}`, env.LUANDIAN_STEPS ? `LUANDIAN_STEPS=${STEPS}` : '', env.LUANDIAN_WAIT ? `LUANDIAN_WAIT=${WAIT}` : ''].filter(Boolean).join(' ');
  console.log(`复现：${how} ${process.argv[2] ? 'node scripts/luandian.mjs ' + process.argv[2] : 'npm run luandian'}`);
  await b.close();
  await server?.close();
  process.exit(1);
}

console.log(`· 乱点测试：种子 ${SEED}，点 ${STEPS} 下，每下之后等 ${WAIT} 毫秒`);
await p.waitForSelector('[data-act="tGo:new"]', { timeout: 8000 });
await p.click('[data-act="tGo:new"]');
recent.push({ step: 0, where: '标题', act: 'tGo:new', text: '新的江湖' });

for (step = 1; step <= STEPS; step++) {
  await p.waitForTimeout(WAIT);
  if (errs.length) await fail('页面报错');
  if (await blank()) {
    await p.waitForTimeout(1000);   // 换场的一瞬间可能是空的，等一秒再看
    if (await blank()) await fail('点完以后页面空白');
  }
  if (rand() < 0.2) await scrollSome(rand(), rand());
  // 等到有能点的按钮为止；一直没有就是卡死
  let cands = await pickable();
  const since = Date.now();
  while (!cands.length) {
    if (errs.length) await fail('页面报错');
    if (Date.now() - since > STALL_MS) await fail(`卡死：连续 ${STALL_MS / 1000} 秒，屏幕上一个能点的按钮都没有`);
    await p.waitForTimeout(250);
    await pageDown();
    cands = await pickable();
  }
  const w = await where();
  const fighting = w.includes('战斗');
  if (fighting && !wasFighting) fights++;
  wasFighting = fighting;
  const h1 = w.split('·')[0];
  if (h1 && !['标题', '章回', '剧情', '战斗', '弹层', '赶路'].includes(h1)) places.add(h1);
  const ws = cands.map(x => WEIGHT[x.act.split(':')[0]] ?? 1);
  let r = rand() * ws.reduce((s, x) => s + x, 0), i = 0;
  while (i < cands.length - 1 && (r -= ws[i]) >= 0) i++;
  const c = cands[i];
  recent.push({ step, where: w, act: c.act, text: c.text });
  if (recent.length > 20) recent.shift();
  const k = c.act.split(':')[0];
  acts.set(k, (acts.get(k) ?? 0) + 1);
  await p.mouse.click(c.x, c.y);
}
await p.waitForTimeout(500);
if (errs.length) await fail('页面报错');
if (await blank()) await fail('页面空白');

const top = [...acts].sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k}×${n}`).join(' ');
console.log(`· 点了 ${STEPS} 下，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒；打了 ${fights} 场；走过 ${places.size} 处：${[...places].join('、')}`);
console.log(`· 点过的按钮：${top}`);
console.log(`· 最后停在：${await where()}`);
console.log('no page errors');
await b.close();
await server?.close();
process.exit(0);

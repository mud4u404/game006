/**
 * 端到端冒烟测试：用无头 Chromium 从标题画面一路玩到第一回首领战。
 * 用法：npm run smoke（先打包，再自动起一个本地预览服务来测）。
 * 也可以测指定网址：node scripts/smoke.mjs <网址> [截图目录]
 * 页面报错或流程走不通时，以非零状态退出，CI 会因此变红。
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }

let url = process.argv[2];
let server;
if (!url) {
  const { preview } = await import('vite');
  server = await preview({ preview: { port: 4173 }, logLevel: 'warn' });
  url = server.resolvedUrls.local[0];
}
const shots = process.argv[3];
// CI 里用机器上装好的 Chrome（SMOKE_CHANNEL=chrome），省掉每次下载浏览器；找不到就退回 Playwright 自带的
const channel = process.env.SMOKE_CHANNEL;
let b;
try { b = await pw.chromium.launch(channel ? { channel } : {}); }
catch (e) {
  if (!channel) throw e;
  console.log(`· 找不到 ${channel}，改用 Playwright 自带的浏览器`);
  b = await pw.chromium.launch();
}
// 用矮屏手机的尺寸跑：手机浏览器的工具栏、微信的标题栏会吃掉一截高度，按钮跑到屏幕外，玩家就会以为卡死了
const p = await b.newPage({ viewport: { width: 360, height: 560 }, deviceScaleFactor: 2 });
// 固定随机，每次走的路一样（路遇、打斗都不靠运气）：
// 世界的种子 = 名字 + 开局的现实时刻（core/state.ts 的 worldSeed），路遇的骰子、传闻的走样都出自它（engine/shijie.ts 的 worldRng）；
// 打斗的骰子用的是 Math.random（ui/fight.ts）。所以把现实的钟钉死在一个时刻，再把 Math.random 换成带种子的。
// 只在这个脚本的页面里生效，游戏代码里没有任何测试专用开关，正式玩家碰不到。换路：SMOKE_SEED=7（打斗的骰子）、SMOKE_DAY=5（开局的日子，世界种子由它定，路遇由世界种子定）。
// 默认 SMOKE_DAY=3：这一天开局，赶路会撞上路遇「使剑的船工」（先弹剧情卡，选第一项，开打，打完结算），
// 这样 settle() 的路遇处理（剧情卡、打斗、结算）每次冒烟都走一遍。实测同样会撞上它的还有 5、6；11 撞「拦路的小毛贼」；
// 0、1、2、4、7、8、9、10、12、13、14 一次路遇也没有。改了内容或引擎以后路遇的位置会变：日志里没有「路遇」行，就再挑一个日子
const SEED = Number(process.env.SMOKE_SEED ?? 1) || 1;
const FIXED_NOW = Date.UTC(2026, 0, 1, 12, 0, 0) + (Number(process.env.SMOKE_DAY ?? 3) || 0) * 86400000;
await p.addInitScript(({ seed, now }) => {
  Date.now = () => now;
  let a = seed >>> 0;
  Math.random = () => {                                // mulberry32，同 src/engine/rng.ts
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}, { seed: SEED, now: FIXED_NOW });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(url);
await p.evaluate(() => localStorage.clear());
await p.reload();
// 刚换上来的剧情卡、应对、胜负以后、结算，头三百多毫秒不收点击（ui/shell.ts 的 tooSoon，防连点误选）：像人一样看一眼再点
const FRESH = /data-act="(st|fReact|fFate|fResult)/;
const click = async sel => { await p.waitForSelector(sel, { timeout: 8000 }); if (FRESH.test(sel)) await p.waitForTimeout(400); await p.click(sel); };
const snap = async name => { if (shots) await p.screenshot({ path: `${shots}/${name}.png` }); };
const log = (...a) => console.log('·', ...a);

/**
 * 点动检查（docs/diandong-shencha.md）：当前最上面一层里，每个能点的东西都要露得出来、够大、没被别的盖住。
 * 手指点下去落在别的东西上、或者小得点不准，玩家只会说「点不动」。
 */
const AUDIT = () => {
  const top = ['#sheetLayer', '#titleLayer', '#chapLayer', '#storyLayer', '#fightLayer'].map(s => document.querySelector(s)).find(e => e && !e.hidden) || document.querySelector('#app');
  const bad = [];
  for (const el of top.querySelectorAll('button,[data-act],summary')) {
    if (el.disabled || !el.checkVisibility()) continue;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(), name = (el.dataset.act || el.textContent.trim()).slice(0, 14);
    if (r.width < 40 || r.height < 40) bad.push(`${name} 太小（${Math.round(r.width)}×${Math.round(r.height)}）`);
    const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    const mine = el.closest('[data-act]');
    if (!t || !(el.contains(t) || (mine && t.closest('[data-act]') === mine))) bad.push(`${name} 被「${t ? (t.id || t.className || t.tagName) : '屏幕外'}」盖住`);
  }
  return bad;
};
/**
 * 剧情卡的选项区钉在屏幕底部（app.css 的 .story-l>.choices）：文字比一屏长时，第一个选项不用滚动就在眼前、没被盖住。
 * 返回这张卡是不是「长卡」（文字要滚才读得完），好确认检查没有落空
 */
const choiceInView = async label => {
  await p.waitForSelector('#storyLayer:not([hidden]) [data-act^="stPick:"], #storyLayer:not([hidden]) [data-act="stNext"]');
  await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    const box = document.querySelector('#storyLayer .story-l');
    box.scrollTop = 0;
    const el = box.querySelector('[data-act^="stPick:"], [data-act="stNext"]');
    const b = el.getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { long: box.scrollHeight > box.clientHeight + 4, inView: b.top >= 0 && b.bottom <= innerHeight, hit: !!t && el.contains(t), top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight };
  });
  if (!r.inView || !r.hit) throw new Error(`点不动（${label}）：剧情卡的第一个选项要滚动才看得到或被盖住（${r.top}～${r.bottom}，屏高 ${r.vh}）`);
  return r.long;
};
const audit = async label => {
  const bad = await p.evaluate(AUDIT);
  if (bad.length) throw new Error(`点不动（${label}）：${bad.join('；')}`);
};

await audit('标题');
await snap('01-title');
// 标题页的登录入口：登录框必须盖在标题画面上面，点得到、能输入（曾被标题画面挡住，玩家点了没反应）
await click('[data-act="acctOpen"]');
await click('#acctName');
await p.fill('#acctName', '体检');
await click('[data-act="sheetClose"]');
await click('[data-act="tGo:new"]');
await audit('序章第一张卡');
await click('[data-act="stPick:0"]');                 // 回想
for (let i = 0; i < 3; i++) { await click(`[data-act="stPick:${i}"]`); await click('[data-act="stNext"]'); }
await snap('02-name');
await p.fill('#nameIn', '听雨');
await click('[data-act="stPick:0"]');                 // 就叫这个名字
// 第一夜（docs/kaipian.md）：四张「继续」，到「渡不渡」，选「渡」
let longCards = 0;
for (let i = 0; i < 4; i++) { if (await choiceInView('第一夜第' + (i + 1) + '张')) longCards++; await click('[data-act="stPick:0"]'); }
if (await choiceInView('渡不渡')) longCards++;
log('第一夜里文字长过一屏的卡：', longCards, '张，选项都钉在底部、不滚动就点得到');
await audit('渡不渡');
await snap('03-dubudu');
log('渡不渡', (await p.textContent('#storyLayer h2')).trim());
// 新序章中途刷新：「继续」要接回「渡不渡」这一屏，不能掉进旧序章
await p.reload();
await click('[data-act="tContinue"]');
await p.waitForSelector('#storyLayer:not([hidden]) h2');
const back = (await p.textContent('#storyLayer h2')).trim();
if (back !== '渡不渡') throw new Error('刷新后没有接回新序章：' + back);
log('刷新后接回', back);
await click('[data-act="stPick:0"]');                 // 「渡。」
await click('[data-act="stPick:0"]');                 // 继续（船离岸）
await click('[data-act="stPick:0"]');                 // 把船头偏向西汊口（认得浅滩）
await click('[data-act="stNext"]');

async function fight(tag, pickBest = true) {
  let audited = false;
  for (let i = 0; i < 300; i++) {
    await p.waitForTimeout(200);
    if (!(await p.$('#fightLayer:not([hidden])'))) return 'closed';
    if (await p.$('#sheetLayer:not([hidden]) [data-act="fResult"]')) return 'result';
    if (await p.$('#fsheet.alert')) {
      // 应对按钮刚换上来，头三百多毫秒不收点击（防连点误选）：像人一样看一眼再点
      await p.waitForTimeout(400);
      // 每个应对按钮都要露在屏幕里、点得到（不能靠自动滚动去找）
      const hidden = await p.$$eval('.ropt', els => els.filter(e => {
        const r = e.getBoundingClientRect(), cy = r.top + r.height / 2;
        const top = cy > 0 && cy < innerHeight ? document.elementFromPoint(r.left + r.width / 2, cy) : null;
        return !(top && (top === e || e.contains(top)));
      }).map(e => e.textContent.trim().slice(0, 8)));
      if (hidden.length) throw new Error('见招拆招的应对按钮在屏幕外或被挡住：' + hidden.join('、'));
      const opts = await p.$$eval('#rOpts .ropt', els => els.map(e => ({ act: e.dataset.act, dis: e.disabled, o: e.querySelector('.ro')?.textContent ?? '' })));
      if (!opts.length) continue;
      const live = opts.filter(o => !o.dis);
      const order = '一两三四五六七八九';
      const choice = pickBest ? live.sort((a, c) => order.indexOf(c.o[2]) - order.indexOf(a.o[2]))[0] : live[0];
      if (tag && !(await p.$('#rTip[hidden]'))) await snap(`${tag}-tutorial`);
      await p.click(`[data-act="${choice.act}"]`).catch(() => {});
      continue;
    }
    // 打斗的操作面板：技能按钮、暂停都点得到（开头查一次）
    if (tag && !audited) { audited = true; await audit('打斗'); }
    // 打到一半对手认栽（比如兵器被夺），弹出「胜负以后」的去路：挑一条不添恶名的
    const fates = await p.$$eval('[data-act^="fFate:"]', els => els.filter(e => e.offsetParent && !e.disabled).map(e => ({ act: e.dataset.act, t: e.textContent })));
    if (fates.length) { const f = fates.find(x => !x.t.includes('恶名')) ?? fates[0]; await p.click(`[data-act="${f.act}"]`).catch(() => {}); continue; }
    if (await p.$('#opening:not([hidden])')) { await p.click('#opening').catch(() => {}); continue; }
    // 杀招、绝招：按钮由搭配生成（engine/zhaoshi.ts）
    for (const s of ['#skUlt', '#skP0', '#skP1', '#skP2']) { const el = await p.$(s + ':not([disabled])'); if (el) { await el.click().catch(() => {}); break; } }
  }
  // 打斗卡住时把界面上看得见的东西打出来，CI 的日志里才查得出卡在哪
  const dump = await p.evaluate(() => ({
    按钮: [...document.querySelectorAll('#fightLayer button, #sheetLayer button')].filter(b => b.offsetParent).map(b => `${b.dataset.act || b.id}:${b.textContent.trim().slice(0, 10)}${b.disabled ? '(灰)' : ''}`).slice(0, 24),
    应对中: !!document.querySelector('#fsheet.alert'),
    破绽: !!document.querySelector('#opening:not([hidden])'),
    合数: document.querySelector('#fRound')?.textContent,
    战报末三条: [...document.querySelectorAll('#flog .b')].slice(-3).map(x => x.textContent.trim().slice(0, 50))
  })).catch(e => String(e));
  console.log('· 打斗卡住时的界面：', JSON.stringify(dump));
  return 'timeout';
}

// 赶路途中会遇到路遇：弹出剧情就点第一个选项，开打就打完，直到路走完。
// 种子固定以后遇上哪几次是定的（每次日志里的「路遇」几行应该一样）；这里仍要会处理，因为改了内容或引擎，路遇的位置会变
let lastCard = '', sameCard = 0;
// 同一张路遇卡连着出现三次，说明点的选项不起作用：把界面上的按钮打出来再报错，别空等到超时
async function stuckCard(title) {
  const dump = await p.evaluate(() => [...document.querySelectorAll('#storyLayer .choice')].map(b => `${b.dataset.act}:${b.textContent.trim().slice(0, 16)}${b.classList.contains('locked') ? '(锁)' : ''}`)).catch(e => String(e));
  console.log('· 路遇卡住时的选项：', JSON.stringify(dump));
  throw new Error('路遇「' + title + '」连着三次停在同一张卡，点的选项不起作用（选项见上一行）');
}
async function settle() {
  for (let i = 0; i < 80; i++) {
    await p.waitForTimeout(250);
    // 只点点得动的选项：条件不满足的选项渲染成 .choice.locked（ui/story.ts，点了没反应）。
    // 曾因「卖身葬父」第一项要五十两银子、机器玩家没钱，永远停在同一张卡，直到 CI 十分钟超时
    if (await p.$('#storyLayer:not([hidden]) .choice')) {
      const title = (await p.textContent('#storyLayer h2')).trim();
      log('路遇', title);
      if (title === lastCard) { if (++sameCard >= 3) await stuckCard(title); } else { lastCard = title; sameCard = 1; }
      // 刚换上来的卡头三百多毫秒不收点击（ui/shell.ts 的 tooSoon）：不等的话，点在这个窗口里，卡原样不动，
      // 三次判定就会被误触发（实测五次里红过一次，选项明明点得动）
      await p.waitForTimeout(400);
      await p.click('#storyLayer .choice:not(.locked)', { timeout: 4000 }).catch(() => {});
      continue;
    }
    // 先看结算页：打完以后结算页盖在战斗层上面，战斗层这时还没收起
    if (await p.$('#sheetLayer:not([hidden]) [data-act="fResult"]')) { await p.click('[data-act="fResult"]').catch(() => {}); continue; }
    if (await p.$('#fightLayer:not([hidden])')) {
      const r = await fight(null);
      lastCard = '';
      log('路遇开打', r);
      if (r === 'timeout') throw new Error('路遇的打斗打不完，卡住了（界面见上一行）');
      continue;
    }
    if (await p.$('#travel:not([hidden])')) continue;
    return;
  }
}
// 按任务横幅赶路；路上开了打、停在半路的，再点一次接着走
async function goQuest(dest) {
  for (let k = 0; k < 5; k++) {
    // 上一段路尾巴上弹出的路遇，出在脚本走开的那一刻（时机，不是运气）会盖住横幅：先处理掉；点不动就再处理一遍
    await settle();
    try { await p.waitForSelector('[data-act="quest"]', { timeout: 8000 }); await p.click('[data-act="quest"]', { timeout: 4000 }); }
    catch { await settle(); continue; }
    await settle();
    if ((await p.textContent('#appbar h1')).includes(dest)) return;
  }
  throw new Error('走不到' + dest);
}

log('卫家家丁', await fight('04-fight1'));
// 打完接着读：南岸、码头、三日后的第二夜、天亮；每张卡点第一个选项（最后一张是「登船 · 去扬州」）
for (let i = 0; i < 60; i++) {
  await p.waitForSelector('#storyLayer:not([hidden]) .choice, #chapLayer:not([hidden])', { timeout: 8000 });
  if (await p.$('#chapLayer:not([hidden])')) break;
  const t = (await p.textContent('#storyLayer h2')).trim();
  if (t === '焦船') await snap('06-doupeng');
  await click((await p.$('#storyLayer [data-act="stNext"]')) ? '[data-act="stNext"]' : '[data-act="stPick:0"]');
}
await p.waitForTimeout(500);
await snap('07-chapter');
await click('[data-act="chapDone"]');
log('到达', await p.textContent('#appbar h1'), '| 主线：', await p.textContent('.quest .qt'));
await audit('扬州首页');
await snap('08-yangzhou');
// 纸娃娃和行囊：人物页最上方的装备位点得开，兵器卸下再拿起；行囊里的道具能细看
await click('[data-act="tab:renwu"]');
await audit('人物');
await click('[data-act="gearSlot:weapon"]');
await click('#sheetLayer [data-act="gearSet:weapon:"]');
await click('[data-act="gearSlot:weapon"]');
await click('#sheetLayer [data-act="gearSet:weapon:kp_mujian"]');
log('纸娃娃 · 兵器：', (await p.textContent('[data-act="gearSlot:weapon"] b')).trim());
await click('[data-act="tab:xingnang"]');
await audit('行囊');
await click('[data-act="itemLook:jade"]');
log('细看：', (await p.textContent('#sheetLayer .sk-d')).slice(0, 12));
await audit('细看弹层');
await click('#sheetLayer [data-act="sheetClose"]');
await click('[data-act="tab:wugong"]');
await audit('武功'); await snap('wugong');
// 点一个搭配位置弹层；点弹层外面的遮罩要能关。iPhone 的 Safari 里，没有 cursor:pointer 的 div 点了不会有反应，样式见 app.css 的 .scrim[data-act]
await click('[data-act="slotPick:neigong"]');
await audit('搭配弹层');
if ((await p.$eval('#sheetLayer .scrim', e => getComputedStyle(e).cursor)) !== 'pointer') throw new Error('点不动：弹层的遮罩没有 cursor:pointer，iPhone 上点外面关不掉');
await p.mouse.click(180, 8);
if (!(await p.$('#sheetLayer[hidden]'))) throw new Error('点不动：点弹层外面的遮罩没有关掉弹层');
await click('[data-act="tab:ditu"]');
await audit('地图'); await snap('map'); await click('.node:not(.here)'); await snap('mapsheet'); await click('#sheetLayer [data-act="sheetClose"]');
await click('[data-act="tab:jianghu"]');
// 突破（S3）：升了档次弹一张醒目的「突破」卡，点一下就关；闭关出关的邸报，突破排在最上面。
// 手改本机存档：把「最高档次」记成最低、一门外功攒满熟练、给足历练，重新读档
await p.waitForTimeout(2300);
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('jhyy-save-v2'));
  s.tierTop = -1;
  s.skills.hanjiang = { r: 0, p: 199 };
  s.lilian = 3000;
  localStorage.setItem('jhyy-save-v2', JSON.stringify(s));
  // 刷新时页面会把当前状态再存一遍（切后台即存），盖掉手改的存档：先把写存档的口子堵上
  Storage.prototype.setItem = () => {};
});
await p.reload();
await click('[data-act="tContinue"]');
await p.waitForSelector('#sheetLayer .tupo', { timeout: 8000 }).catch(async e => { console.log(await p.evaluate(() => JSON.stringify({ t: JSON.parse(localStorage.getItem('jhyy-save-v2')).tierTop, layers: [...document.querySelectorAll('#app > div')].map(d => d.id + ':' + d.hidden), sheet: document.querySelector('#sheetLayer').innerHTML.slice(0, 200) }))); throw e; });
const card = (await p.textContent('#sheetLayer .tupo')).replace(/\s+/g, '');
if (!card.includes('升档')) throw new Error('突破卡里没有升档：' + card);
await snap('08b-tupo');
await click('#sheetLayer .tupo [data-act="sheetClose"]');
await p.waitForSelector('#sheetLayer', { state: 'hidden' });
log('突破卡', card.slice(0, 20), '| 点一下关掉了');
await click('[data-act="tab:wugong"]');
await click('[data-act="retreat:7"]');
await p.waitForSelector('#sheetLayer .tupo-blk', { timeout: 8000 });
const order = await p.evaluate(() => {
  const k = [...document.querySelectorAll('#sheetLayer .panel > *')].map(e => e.className);
  return [k.indexOf('tupo-blk'), k.indexOf('story'), k.indexOf('rewards')];
});
if (!(order[0] >= 0 && order[0] < order[1] && order[0] < order[2])) throw new Error('出关邸报里突破不在最上面：' + order);
log('出关邸报 · 突破在最上面', order.join(','));
await click('#sheetLayer [data-act="sheetClose"]');
await p.waitForSelector('#sheetLayer', { state: 'hidden' });
await click('[data-act="tab:jianghu"]');
// 赶路中，灰着的东西点了要有提示，不能静悄悄没反应
await click('[data-act="tab:ditu"]');
await click('[data-act="travelAsk:daming"]');
await audit('出发确认');
await click('[data-act="travelGo:daming"]');
await p.waitForSelector('#app.traveling', { timeout: 4000 });
{
  const bb = await (await p.$('[data-act="tab:renwu"]')).boundingBox();
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const tt = await p.textContent('#toast').catch(() => '');
  if (!tt.includes('赶路')) throw new Error('点不动：赶路时点底部标签没有任何提示：' + tt);
  log('赶路中点标签：', tt);
}
await goQuest('大明寺');
await click('[data-act="sel:liaochen"]');
await click('[data-act="do:交谈"]');
log('了尘：', (await p.textContent('.reply')).slice(0, 24));
await goQuest('运河渡口');
await click('[data-act="sel:tu"]');
await click('[data-act="do:动手"]');
await p.waitForTimeout(500);
await click('[data-act="do:动手"]');                  // 动手要再点一下才算
log('屠千山', await fight(null));
log('结算：', (await p.textContent('#sheetLayer .r-h')).trim());
await snap('09-result');
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
await b.close();
await server?.close();
process.exit(errs.length ? 1 : 0);

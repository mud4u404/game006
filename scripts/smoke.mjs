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

await snap('01-title');
// 标题页的登录入口：登录框必须盖在标题画面上面，点得到、能输入（曾被标题画面挡住，玩家点了没反应）
await click('[data-act="acctOpen"]');
await click('#acctName');
await p.fill('#acctName', '体检');
await click('[data-act="sheetClose"]');
await click('[data-act="tGo:new"]');
await click('[data-act="stPick:0"]');                 // 回想
for (let i = 0; i < 3; i++) { await click(`[data-act="stPick:${i}"]`); await click('[data-act="stNext"]'); }
await snap('02-name');
await p.fill('#nameIn', '听雨');
await click('[data-act="stPick:0"]');
await click('[data-act="stPick:0"]');                 // 回到小屋
log('序章开场完成', await p.textContent('.who b'));
await snap('03-guazhou');
await click('[data-act="do:交谈"]');                  // 江伯
await click('[data-act="quest"]');                    // 去瓜洲镇
await p.waitForTimeout(1200);
await click('[data-act="sel:huichun"]');
await click('[data-act="do:抓药"]');
await click('[data-act="quest"]');                    // 回小屋，触发夜袭
await p.waitForTimeout(1200);
await click('[data-act="stPick:0"]');                 // 拔剑迎敌

async function fight(tag, pickBest = true) {
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

// 赶路途中可能遇到路遇（随机）：弹出剧情就点第一个选项，开打就打完，直到路走完
let stuck = 0;
async function settle() {
  for (let i = 0; i < 80; i++) {
    await p.waitForTimeout(250);
    if (await p.$('#storyLayer:not([hidden]) .choice')) {
      log('路遇', (await p.textContent('#storyLayer h2')).trim());
      await p.click('#storyLayer .choice').catch(() => {});
      continue;
    }
    // 先看结算页：打完以后结算页盖在战斗层上面，战斗层这时还没收起
    if (await p.$('#sheetLayer:not([hidden]) [data-act="fResult"]')) { await p.click('[data-act="fResult"]').catch(() => {}); continue; }
    if (await p.$('#fightLayer:not([hidden])')) {
      const r = await fight(null);
      log('路遇开打', r);
      if (r === 'timeout' && ++stuck >= 2) throw new Error('路遇的打斗两次都打不完，卡住了（界面见上一行）');
      continue;
    }
    if (await p.$('#travel:not([hidden])')) continue;
    return;
  }
}
// 按任务横幅赶路；路上开了打、停在半路的，再点一次接着走
async function goQuest(dest) {
  for (let k = 0; k < 5; k++) {
    // 上一段路尾巴上弹出的路遇（随机，出在脚本走开的那一刻）会盖住横幅：先处理掉；点不动就再处理一遍
    await settle();
    try { await p.waitForSelector('[data-act="quest"]', { timeout: 8000 }); await p.click('[data-act="quest"]', { timeout: 4000 }); }
    catch { await settle(); continue; }
    await settle();
    if ((await p.textContent('#appbar h1')).includes(dest)) return;
  }
  throw new Error('走不到' + dest);
}

log('黑衣人', await fight('04-fight1'));
await click('[data-act="stPick:0"]');                 // 握紧长剑
log('黑衣首领', await fight('05-fight2'));
await p.waitForSelector('#storyLayer:not([hidden])');
await snap('06-death');
await click('[data-act="stPick:0"]');                 // 江伯——
await click('[data-act="stPick:0"]');                 // 掩埋江伯
await click('[data-act="stPick:0"]');                 // 登船
await p.waitForTimeout(500);
await snap('07-chapter');
await click('[data-act="chapDone"]');
log('到达', await p.textContent('#appbar h1'), '| 主线：', await p.textContent('.quest .qt'));
await snap('08-yangzhou');
// 纸娃娃和行囊：人物页最上方的装备位点得开，兵器卸下再拿起；行囊里的道具能细看
await click('[data-act="tab:renwu"]');
await click('[data-act="gearSlot:weapon"]');
await click('#sheetLayer [data-act="gearSet:weapon:"]');
await click('[data-act="gearSlot:weapon"]');
await click('#sheetLayer [data-act="gearSet:weapon:qingfeng"]');
log('纸娃娃 · 兵器：', (await p.textContent('[data-act="gearSlot:weapon"] b')).trim());
await click('[data-act="tab:xingnang"]');
await click('[data-act="itemLook:jade"]');
log('细看：', (await p.textContent('#sheetLayer .sk-d')).slice(0, 12));
await click('#sheetLayer [data-act="sheetClose"]');
await click('[data-act="tab:jianghu"]');
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

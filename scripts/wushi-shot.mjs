/**
 * 巫师模式截图与自检：390×844，截「反馈浮层」「巫师工具」两张图。
 * 用法：npm run build && node scripts/wushi-shot.mjs [截图目录]（默认 docs/img/youhua-1010）
 * 顺带检查：巫师关时没有反馈按钮；连点版本号七下后出现；点「发送」的链接带「反馈」标签。
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const { preview } = await import('vite');
const server = await preview({ preview: { port: 4174 }, logLevel: 'warn' });
const url = server.resolvedUrls.local[0];
const out = process.argv[2] || 'docs/img/youhua-1010';
const save = readFileSync(new URL('../tests/fixtures/saves/v5-1a.json', import.meta.url), 'utf8');
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(url);
await p.evaluate(s => { localStorage.clear(); localStorage.setItem('jhyy-save-v2', s); }, save);
await p.reload();
const fail = m => { console.error('✗', m); process.exitCode = 1; };
await p.click('[data-act="tContinue"]');
await p.waitForSelector('#main');
if (await p.isVisible('#wushiFb')) fail('巫师关着，却看得到反馈按钮');
await p.click('[data-act="tab:renwu"]');
if (await p.$('.wushi-tools')) fail('巫师关着，却看得到巫师工具');
const ver = '[data-act="verTap"]';
await p.locator(ver).scrollIntoViewIfNeeded();
for (let i = 0; i < 7; i++) await p.click(ver);
if (!(await p.isVisible('#wushiFb'))) fail('连点七下以后，没有出现反馈按钮');
// 点几下，让最近点击里有东西
await p.click('[data-act="tab:jianghu"]');
await p.click('#wushiFb');
await p.fill('#fbText', '这里的按钮点了没反应，想回到上一屏');
const href = await p.getAttribute('#fbSend', 'href');
const u = new URL(href);
if (u.searchParams.get('labels') !== '反馈') fail('链接没有带「反馈」标签');
await p.waitForTimeout(2300);
await p.screenshot({ path: `${out}/wushi-fankui.png` });
await p.click('[data-act="sheetClose"]');
await p.click('[data-act="tab:renwu"]');
await p.locator('.wushi-tools').scrollIntoViewIfNeeded();
await p.evaluate(() => { document.querySelector('.wushi-tools').scrollIntoView({ block: 'start' }); });
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/wushi-gongju.png` });
// 瞬移
const target = await p.evaluate(() => { const o = [...document.querySelectorAll('#wsRoom option')].find(x => !x.selected); return o.value; });
await p.selectOption('#wsRoom', target);
await p.click('[data-act="wsGo"]');
const loc = await p.evaluate(() => JSON.parse(localStorage.getItem('jhyy-save-v2')).loc ?? null);
console.log('· 瞬移目标', target, '存档里的 loc', loc);
if (errs.length) fail('页面报错：' + errs.join(' | '));
await b.close();
await server.close();

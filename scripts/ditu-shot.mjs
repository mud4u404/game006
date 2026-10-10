/**
 * 地图截图与量尺（负责人 #600：地图要整齐、不拥挤）。
 * 用法：node scripts/ditu-shot.mjs <网址> <存档json> [截图前缀]
 * 量：每个地区、深浅两种模式，地名按钮的包围盒两两不重叠、不出地图框；390 宽页面无横向滚动。
 * 有前缀就截图 <前缀>-<地区>-<light|dark>.png。出问题以非零状态退出。
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }
const [url, savePath, prefix] = process.argv.slice(2);
const save = readFileSync(savePath, 'utf8');
const b = await pw.chromium.launch();
const bad = [];
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const p = await ctx.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(url);
  await p.evaluate(s => localStorage.setItem('jhyy-save-v2', s), save);
  await p.reload();
  await p.click('[data-act="tContinue"]');
  await p.waitForSelector('[data-act="tab:ditu"]');
  for (let i = 0; i < 4 && (await p.$('#sheetLayer:not([hidden]) [data-act="sheetClose"]')); i++) { await p.click('#sheetLayer [data-act="sheetClose"]'); await p.waitForTimeout(500); }
  await p.click('[data-act="tab:ditu"]');
  await p.waitForSelector('.map');
  const regions = await p.$$eval('[data-act^="mapRegion:"]', els => els.map(e => [e.dataset.act.split(':')[1], e.textContent.trim()]));
  for (const [id, name] of regions) {
    await p.click(`[data-act="mapRegion:${id}"]`);
    await p.waitForTimeout(100);
    const r = await p.evaluate(() => {
      const m = document.querySelector('.map').getBoundingClientRect();
      const nodes = [...document.querySelectorAll('.map .node')];
      const boxes = nodes.map(e => {
        const nm = e.querySelector('.nm').getBoundingClientRect();
        return { t: e.querySelector('.nm').textContent, l: nm.left, r: nm.right, tp: nm.top, bt: nm.bottom };
      });
      const hit = nodes.map(e => e.getBoundingClientRect());
      const errs = [];
      const E = 0.5; // 紧挨着的格子允许有半像素的取整误差
      const cross = (a, c) => a.l < c.r - E && c.l < a.r - E && a.tp < c.bt - E && c.tp < a.bt - E;
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        if (a.l < m.left - 0.5 || a.r > m.right + 0.5 || a.tp < m.top - 0.5 || a.bt > m.bottom + 0.5) errs.push(`「${a.t}」出了地图框`);
        for (let j = i + 1; j < boxes.length; j++) if (cross(a, boxes[j])) errs.push(`「${a.t}」和「${boxes[j].t}」名字压在一起`);
      }
      for (let i = 0; i < hit.length; i++) for (let j = i + 1; j < hit.length; j++) {
        const a = hit[i], c = hit[j];
        if (cross({ l: a.left, r: a.right, tp: a.top, bt: a.bottom }, { l: c.left, r: c.right, tp: c.top, bt: c.bottom })) errs.push(`点击区「${boxes[i].t}」和「${boxes[j].t}」重叠`);
      }
      return { errs, n: boxes.length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    });
    for (const e of r.errs) bad.push(`${name}（${scheme}）：${e}`);
    if (r.sw > r.cw) bad.push(`${name}（${scheme}）：横向滚动 ${r.sw}>${r.cw}`);
    console.log(`· ${name} ${scheme}：${r.n} 处地名，${r.errs.length} 处问题`);
    if (prefix) {
      await p.evaluate(() => document.querySelector('.map').scrollIntoView({ block: 'start' }));
      await p.screenshot({ path: `${prefix}-${id}-${scheme}.png` });
    }
  }
  await ctx.close();
}
await b.close();
if (bad.length) { console.error('地图不整齐：\n' + bad.join('\n')); process.exit(1); }
console.log('地图量尺通过');

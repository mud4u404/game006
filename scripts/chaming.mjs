// 起名之前先查一下：node scripts/chaming.mjs 顾青 [别的名字…]
// 列出内容包里已有的同名、同姓的人物、对手、地点，以及主要人物（docs/story.md 第六节）的姓。
// 新人物不许与已有的重名，也不许与主要人物同姓（tests/yizhi.test.ts 会拦）。
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../src/content/packs/', import.meta.url);
const MAIN = ['沈孤舟', '江伯', '了尘', '柳寒舟', '秦红绡', '顾清漪', '月无痕', '赵铁衣', '雷大鹏', '陆千帆', '顾长风', '曹无咎', '屠千山'];
const rows = [];
for (const f of readdirSync(dir).filter(x => x.endsWith('.ts') && !x.startsWith('._'))) {
  for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/id:\s*'([a-z0-9_]+)',\s*name:\s*'([^']+)'/g)) rows.push({ id: m[1], name: m[2], f });
}
const want = process.argv.slice(2);
if (!want.length) { console.log('用法：node scripts/chaming.mjs 名字 [名字…]'); process.exit(0); }
for (const w of want) {
  console.log(`\n「${w}」`);
  const same = rows.filter(r => r.name === w);
  console.log(same.length ? `  ✗ 重名：${same.map(r => `${r.name}（${r.id}，${r.f}）`).join('；')}` : '  ✓ 没有重名');
  const mainHit = MAIN.filter(n => n[0] === w[0] && n !== w);
  console.log(mainHit.length ? `  ✗ 与主要人物同姓：${mainHit.join('、')}` : '  ✓ 不与主要人物同姓');
  const sur = rows.filter(r => r.name[0] === w[0] && r.name !== w).slice(0, 12);
  console.log(sur.length ? `  同姓的还有：${sur.map(r => r.name).join('、')}` : '  没有别的同姓');
}

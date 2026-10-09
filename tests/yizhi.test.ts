/**
 * 一致性的机器把关（负责人 10-09：「现在经常有逻辑性的问题，比如撞名」；每日一审连着两天点出同一类毛病）。
 * 做法是「棘轮」：现有的违例记在 tests/yizhi-baseline.json 里不动它，**新增的一律红**。
 * 要放行一个新的例外（确是故意的），把它写进 baseline，并在提交说明里写为什么；
 * 重新量一遍当前的违例：YIZHI_WRITE=1 npx vitest run tests/yizhi.test.ts（只许维护者用）。
 *
 * 查四类：
 * 1. 撞名：两个不同的人（含对手、地点）叫同一个名字；新人物与主要人物（docs/story.md 第六节）同姓；
 * 2. 写死兵器：「你的剑」「这口剑」「腰间的剑」「佩剑」——玩家不一定用剑；
 * 3. 抄来的台词：同一句（十四字以上）出现在两个不同人物的嘴里；
 * 4. 照抄文风规范里的反例原文（docs/wenfeng.md 第一节）。
 */
import { describe, expect, it } from 'vitest';
import { FOES, NPCS, ROOMS } from '../src/content';
import baseline from './yizhi-baseline.json';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const WRITE = env.YIZHI_WRITE === '1';

/** 主要人物的姓（docs/story.md 第六节）：新人物不许再用，免得玩家分不清 */
const MAIN_NAMES = ['沈孤舟', '江伯', '了尘', '柳寒舟', '秦红绡', '顾清漪', '月无痕', '赵铁衣', '雷大鹏', '陆千帆', '顾长风', '曹无咎', '屠千山'];
const MAIN_SURNAMES = new Set(['沈', '江', '柳', '秦', '顾', '月', '赵', '雷', '陆', '曹', '屠']);
const NAME_OK = new Set(MAIN_NAMES);

/** 文风规范里点名的反例，原文不许出现在人物的嘴里（docs/wenfeng.md） */
const COUNTER_EXAMPLES = [
  '帮里的账干净，人不干净',
  '攒够一百的贡献',
  '那伤落了根',
  '这不是学出来的利索，是打小在马背上长出来的',
  '你双掌平推，如排云见日，直直撞在',
  '稳得像钉子'
];

const SRC = import.meta.glob<string>('../src/content/packs/*.ts', { query: '?raw', import: 'default', eager: true });
const files = Object.entries(SRC).map(([p, text]) => ({ name: p.split('/').pop()!, text }));

const found: Record<string, string[]> = { 撞名: [], 同姓: [], 写死兵器: [], 抄来的台词: [], 反例原文: [] };

// 1. 撞名：人物、对手、地点各自的显示名
{
  const byName = new Map<string, string[]>();
  const add = (kind: string, id: string, name: string): void => {
    const k = `${kind}:${name}`;
    byName.set(k, [...(byName.get(k) ?? []), id]);
  };
  for (const n of NPCS) add('人', n.id, n.name);
  for (const f of FOES) add('对手', f.id, f.name);
  for (const r of ROOMS) add('地点', r.id, r.name);
  for (const [k, ids] of byName) if (new Set(ids).size > 1) found.撞名.push(`${k}（${[...new Set(ids)].sort().join('、')}）`);
  // 同姓：人物和对手的名字第一个字，撞上主要人物的姓，而名字本身不是主要人物
  for (const x of [...NPCS.map(n => ({ id: n.id, name: n.name })), ...FOES.map(f => ({ id: f.id, name: f.name }))]) {
    const nm = x.name.replace(/[·（(].*$/, '');
    if (nm.length < 2 || nm.length > 4) continue;
    if (NAME_OK.has(nm) || nm.startsWith('了尘')) continue;
    if (MAIN_SURNAMES.has(nm[0]) && /^[沈江柳秦顾月赵雷陆曹屠][^\s]{1,2}$/.test(nm) && !/(掌柜|娘子|郎中|师傅|镖头|捕头|先生|婆婆|老|爷|师太|道长|长老|大师|禅师)$/.test(nm)) {
      found.同姓.push(`${nm}（${x.id}）`);
    }
  }
}

// 2~4：逐个内容包扫字
for (const { name, text } of files) {
  const hard = text.match(/你的剑|这口剑|腰间的剑|佩剑/g);
  if (hard) found.写死兵器.push(`${name} × ${hard.length}`);
  for (const c of COUNTER_EXAMPLES) if (text.includes(c)) found.反例原文.push(`${name}：${c}`);
}

// 3. 抄来的台词：引号里十四字以上的整句，出现在两个不同的人物（以所在的文件里最近的 id 计）
{
  const seen = new Map<string, Set<string>>();
  for (const { name, text } of files) {
    let owner = name;
    for (const line of text.split('\n')) {
      const m = line.match(/\bid:\s*'([a-z0-9_]+)'/);
      if (m) owner = `${name}#${m[1]}`;
      for (const q of line.matchAll(/「([^「」]{14,})」/g)) {
        const s = q[1];
        seen.set(s, (seen.get(s) ?? new Set()).add(owner));
      }
    }
  }
  for (const [s, owners] of seen) if (owners.size > 1) found.抄来的台词.push(`${s.slice(0, 24)}…（${[...owners].sort().join('；')}）`);
}

for (const k of Object.keys(found)) found[k].sort();

describe('一致性的机器把关：现有的违例不动，新增的一律红', () => {
  if (WRITE) {
    it('（重新量一遍基线）', async () => {
      const fs: { writeFileSync(p: string, s: string): void } = await import(/* @vite-ignore */ 'node:' + 'fs');
      fs.writeFileSync('tests/yizhi-baseline.json', JSON.stringify(found, null, 2) + '\n');
    });
    return;
  }
  for (const kind of Object.keys(found)) {
    it(`${kind}：没有新增`, () => {
      const old = new Set((baseline as Record<string, string[]>)[kind] ?? []);
      const added = found[kind].filter(x => !old.has(x));
      expect(added, `新增的「${kind}」：换个名字、换个写法；确是故意的，请维护者写进 tests/yizhi-baseline.json 并说明`).toEqual([]);
    });
  }
});

/**
 * 文风补充检查（10-10 金庸编辑角色评估两天协作者文字后加的）。
 * 与 tests/style-rules.ts（负责人定的，不改）分开放，新规则都写在这里。
 * 说明见 docs/wenfeng.md 第四节末尾。
 *
 * 分两类：
 *   错误级：存量已清零，再出现就红。
 *   警告级：用 console.warn 打印「文件:行 原文」；计数超过下面的上限才红。
 *           上限只许往下调，清完一类就把上限改成 0（实际等于升成错误）。
 *
 * 扫描方式：逐行扫 src/content/packs/*.ts 的源码，跳过注释行（// 、/* 、* 开头）。
 */
import { describe, it, expect } from 'vitest';
import type { ContentPack, NpcDef } from '../src/content/types';

const sources = import.meta.glob<string>('../src/content/packs/*.ts', { query: '?raw', import: 'default', eager: true });

interface Line { file: string; no: number; text: string }

const lines: Line[] = [];
for (const [path, raw] of Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))) {
  const file = path.split('/').pop()!;
  raw.split('\n').forEach((text, i) => {
    const t = text.trim();
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
    lines.push({ file, no: i + 1, text });
  });
}

interface Hit { file: string; no: number; excerpt: string }

/** 按正则逐行找，返回每处命中（一行多处各算一处），excerpt 为命中点前后各带一小段 */
function scan(re: RegExp): Hit[] {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const hits: Hit[] = [];
  for (const l of lines) {
    for (const m of l.text.matchAll(g)) {
      const i = m.index ?? 0;
      const from = Math.max(0, i - 14);
      hits.push({ file: l.file, no: l.no, excerpt: l.text.slice(from, i + m[0].length + 14).trim() });
    }
  }
  return hits;
}

const show = (hits: Hit[]) => hits.map((h) => `${h.file}:${h.no} ${h.excerpt}`);

// ───────────── 错误级 ─────────────

describe('文风补充检查：错误级', () => {
  it('不许插入式对白（翻译腔）：「……，」他说，「……」', () => {
    const hits = scan(/「[^」]{2,40}，」(?:他|她|[^，。」「]{1,6})(?:说|道)，「/);
    expect(show(hits), '改成「……」他笑了笑，又道：「……」，或合成一句、拆成两句，意思不变').toEqual([]);
  });

  it('起草的自言自语不许漏进正文：「……？不对，……」', () => {
    const hits = scan(/[？?]\s*不对[，,]/);
    expect(show(hits), '把推翻自己的草稿删掉，只留定稿').toEqual([]);
  });

  it('不许写死玩家的兵器：你佩着剑、你的剑、你腰间的剑', () => {
    // 「你的剑法」「你的剑术」是武功，不算写死兵器
    const hits = scan(/你佩着剑|你的剑(?![法术招式谱客])|你腰间的剑/);
    expect(show(hits), '玩家可能用刀用枪赤手：改成不写死，如「你一身风尘地来」').toEqual([]);
  });
});

// ───────────── 警告级 ─────────────

interface WarnRule { id: string; name: string; re: RegExp; cap: number }

/** 上限 = 写这条规则时的当前计数。只许往下调，不许往上调；清完就改 0。 */
const WARN_RULES: WarnRule[] = [
  { id: '4a', name: '京片子（时间）', re: /今儿|昨儿|明儿|今个/, cap: 13 },
  { id: '4b', name: '京片子（口头语）', re: /甭|瞅|门儿清|哥们|倍儿|十几号/, cap: 5 },
  { id: '5a', name: '今语补充', re: /语速|钟点|效率|心态|搞定|靠谱|保护费|有担当|纸面上/, cap: 7 },
  { id: '5b', name: '今语：竖大拇指', re: /竖(?:起|了)?[^，。」]{0,3}大拇指/, cap: 7 },
  { id: '6', name: '对白里的游戏说法', re: /「[^」]*(略有小成|融会贯通|炉火纯青|攒够|攒满|贡献|经验|任务|属性|那一级|几级|升级)[^」]*」/, cap: 58 },
  { id: '7', name: '「不是 X，是 Y」', re: /不是[^，。；：「」！？]{1,12}，\s*(?:而)?是/, cap: 53 },
  { id: '10a', name: '套话：压低声音', re: /压低(?:了)?声音/, cap: 38 },
  { id: '10b', name: '套话：洗得发白', re: /洗得发白/, cap: 16 },
  { id: '10c', name: '套话：他顿了顿', re: /他顿了顿/, cap: 29 },
  { id: '10d', name: '套话：摆摆手', re: /摆(?:了)?摆手/, cap: 32 }
];

/** 第 8 条：文件级破折号占比上限（含文字字段的行里，含「——」的比例） */
const DASH_RATIO = 0.3;
/** 第 8 条：超标文件数的上限 */
const DASH_FILES_CAP = 18;
/** 第 9 条：近似克隆句的上限（同一子句出现在 4 个以上不同文件） */
const CLONE_CAP = 7;

describe('文风补充检查：警告级（计数超过上限才红）', () => {
  for (const r of WARN_RULES) {
    it(`${r.id} ${r.name}`, () => {
      const hits = scan(r.re);
      if (hits.length) console.warn(`[文风警告 ${r.id} ${r.name}] 共 ${hits.length} 处（上限 ${r.cap}）\n` + show(hits).join('\n'));
      expect(hits.length, `${r.id} ${r.name} 变多了：${hits.length} > 上限 ${r.cap}`).toBeLessThanOrEqual(r.cap);
    });
  }

  it('8 文件级破折号占比超过 0.30', () => {
    const FIELD = /\b(?:text|look|paras|desc|intro|line|lines|say|story|note)\s*:|观察\s*:/;
    const stat = new Map<string, { all: number; dash: number }>();
    for (const l of lines) {
      if (!FIELD.test(l.text) && !/^\s*['"`「]/.test(l.text)) continue;
      const s = stat.get(l.file) ?? { all: 0, dash: 0 };
      s.all++;
      if (l.text.includes('——')) s.dash++;
      stat.set(l.file, s);
    }
    const over = [...stat.entries()]
      .filter(([, s]) => s.all >= 5 && s.dash / s.all > DASH_RATIO)
      .map(([f, s]) => `${f} 含文字字段的 ${s.all} 行里 ${s.dash} 行有「——」（${(s.dash / s.all).toFixed(2)}）`);
    if (over.length) console.warn(`[文风警告 8 破折号占比] 共 ${over.length} 个文件（上限 ${DASH_FILES_CAP}）\n` + over.join('\n'));
    expect(over.length, `破折号超标的文件变多了：${over.length} > 上限 ${DASH_FILES_CAP}`).toBeLessThanOrEqual(DASH_FILES_CAP);
  });

  it('9 近似克隆句（同一子句出现在 4 个以上文件）', () => {
    const SECT = /少林|武当|峨眉|华山|全真|桃花岛|铁掌帮|丐帮|六扇门/g;
    const seen = new Map<string, Map<string, number>>(); // 子句 -> 文件 -> 首次行号
    for (const l of lines) {
      for (const piece of l.text.split(/[^一-鿿{}$]+/)) {
        if (!piece || /[{}$]/.test(piece)) continue; // 含 {foe}、{part}、${ 的跳过
        const clause = piece.replace(SECT, '〇');
        if ((clause.match(/[一-鿿〇]/g) ?? []).length < 8) continue;
        if (!/[一-鿿]/.test(clause.replace(/〇/g, ''))) continue;
        const m = seen.get(clause) ?? new Map<string, number>();
        if (!m.has(l.file)) m.set(l.file, l.no);
        seen.set(clause, m);
      }
    }
    const clones = [...seen.entries()]
      .filter(([, m]) => m.size >= 4)
      .map(([c, m]) => `「${c}」 ${m.size} 个文件：` + [...m.entries()].map(([f, n]) => `${f}:${n}`).join(' '));
    if (clones.length) console.warn(`[文风警告 9 近似克隆句] 共 ${clones.length} 句（上限 ${CLONE_CAP}）\n` + clones.join('\n'));
    expect(clones.length, `克隆句变多了：${clones.length} > 上限 ${CLONE_CAP}`).toBeLessThanOrEqual(CLONE_CAP);
  });
});

// ───────────── 路人不开店、不疗伤（质量调查，10-10） ─────────────

/**
 * 没有 service 的人物（路人）：不得有「购买」动作，也不得在动作里给 heal 效果。
 * 要买卖、疗伤的，得是写了 service 的店家、医馆（CI 按 service 查各地齐不齐）。
 * 白名单只许往下删：维护者订正后把条目删掉。
 */
const LUREN_WHITELIST: Record<string, string> = {
  sz_ym3: '卖茶的王阿婆（sz-yamen-lurens.ts）：三文一碗，回二十气血、无日限；维护者另修，修后删这一条'
};

describe('路人类 NPC 不开店、不疗伤', () => {
  const packs = import.meta.glob<{ default: ContentPack }>('../src/content/packs/*.ts', { eager: true });
  // 范围：路人包（文件名带 lurens、keren、tanfan、renwu：衙门口、茶馆、客船、摊贩、寒山的路人）。
  // 主城包里的店家和摊担（药铺、饼摊、馄饨担、面摊等）不在此列，那一批要另行判断（见 docs/wenfeng.md 第四节）。
  const LUREN_FILE = /(?:lurens|keren|tanfan|renwu)\.ts$/;
  const allNpcs = Object.entries(packs)
    .filter(([path]) => LUREN_FILE.test(path))
    .flatMap(([path, m]) => (m.default.npcs ?? []).map((npc) => ({ file: path.split('/').pop()!, npc })));
  const buys = (npc: NpcDef) => (npc.verbs ?? []).some((v) => (typeof v === 'string' ? v : v.verb) === '购买') || '购买' in (npc.actions ?? {});
  const heals = (npc: NpcDef) => /"type":"heal"/.test(JSON.stringify(npc.actions ?? {}));

  it('没有 service 的人物：无「购买」动作、无 heal 效果', () => {
    const errs: string[] = [];
    for (const { file, npc } of allNpcs) {
      if (npc.service?.length || LUREN_WHITELIST[npc.id]) continue;
      if (buys(npc)) errs.push(`${file} ${npc.id}「${npc.name}」没有 service 却有「购买」动作：路人不开店，要卖东西就写 service`);
      if (heals(npc)) errs.push(`${file} ${npc.id}「${npc.name}」没有 service 却在动作里给 heal：路人不疗伤，疗伤的写 service: ['医']`);
    }
    expect(errs).toEqual([]);
  });

  it('白名单里的人还在、确实违规（订正后要把白名单条目删掉）', () => {
    for (const id of Object.keys(LUREN_WHITELIST)) {
      const hit = allNpcs.find((x) => x.npc.id === id);
      expect(hit, `${id} 已不存在，请删白名单`).toBeTruthy();
      const n = hit!.npc;
      expect(!n.service?.length && (buys(n) || heals(n)), `${id} 已经不违规，请删白名单`).toBe(true);
    }
  });
});

/**
 * 界面句子不带计分板口气（金庸编辑 10-10）：数字放进小字，正文说人话。
 * 扫界面几个文件里的字符串字面量，出现这些说明书、计分腔的字眼就红。
 */
import { describe, expect, it } from 'vitest';
const fs: { readFileSync(p: string, enc: string): string } = await import(/* @vite-ignore */ 'node:' + 'fs');

const FILES = ['src/engine/jiemian.ts', 'src/engine/zhaoshi.ts', 'src/engine/jiesuan.ts', 'src/ui/chuguan.ts'];
const BAD = /高你\s*\d+\s*档|打八折|涨熟练|攒贡献|消化|闭门造车|帮得上|战力约 \+/;

/** 取出源码里的字符串字面量（单引号、双引号、反引号），连同所在行号；注释不看 */
function literals(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const start = line; let t = ''; i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { t += src[i + 1]; i += 2; continue; }
        if (src[i] === '\n') line++;
        t += src[i]; i++;
      }
      i++; out.push({ line: start, text: t }); continue;
    }
    i++;
  }
  return out;
}

describe('界面句子去计分腔', () => {
  for (const f of FILES) {
    it(`${f} 的字符串里没有计分板口气`, () => {
      const bad = literals(fs.readFileSync(f, 'utf8')).filter(l => BAD.test(l.text)).map(l => `${f}:${l.line} ${l.text.slice(0, 40)}`);
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }
  it('扫描器认得出字面量（防自己失灵）', () => {
    const got = literals("const a = '打八折'; // 涨熟练\nconst b = `闭门造车${1}`;");
    expect(got.map(g => g.text)).toEqual(['打八折', '闭门造车${1}']);
  });
});

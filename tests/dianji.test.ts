import { describe, expect, it } from 'vitest';
/**
 * 点动检查（docs/diandong-shencha.md）：界面上每个 data-act 的动作名，都要有处理函数接手。
 * 原来写了按钮、没注册处理函数，玩家点了没有任何反应，只能靠人试玩才发现。
 * 静态扫 src/ui：按钮上出现过的动作名 ⊆ registerHandlers 注册过的动作名。
 */

const raw = import.meta.glob<string>(['../src/ui/*.ts', '../src/ui/**/*.ts'], { query: '?raw', import: 'default', eager: true });
const text = Object.entries(raw);
// 样式表：vitest 默认不处理 css，直接用 node 读（写法同 tests/ids.test.ts）
const fs: { readFileSync(p: URL, enc: string): string } = await import(/* @vite-ignore */ 'node:' + 'fs');
const css = fs.readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');

/** 动作名：data-act="名:参数" 里冒号前面那段；名字本身是 ${...} 表达式的，取表达式里写死的字符串 */
function actNames(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/data-act=(["'])((?:(?!\1).)*)\1/g)) {
    const v = m[2];
    // 说明文字里的示例（「动作:参数」）不算
    if (/[^\x00-\x7f]/.test(v.split(':')[0])) continue;
    if (v.startsWith('${')) {
      const head = v.slice(0, v.indexOf('}:') + 1 || v.length);
      for (const s of head.matchAll(/'([A-Za-z]+)'/g)) out.push(s[1]);
      continue;
    }
    out.push(v.split(':')[0].replace(/\$\{.*$/, ''));
  }
  return out.filter(Boolean);
}

/** registerHandlers({...}) 里注册的动作名：对象第一层的键（本仓库写法是缩进两格） */
function handlerNames(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/registerHandlers\(\{/g)) {
    let i = m.index! + m[0].length, depth = 1;
    const start = i;
    for (; i < src.length && depth > 0; i++) { const c = src[i]; if (c === '{') depth++; else if (c === '}') depth--; }
    for (const k of src.slice(start, i).matchAll(/^ {2}([A-Za-z_]\w*)\s*[:(]/gm)) out.push(k[1]);
    const first = src.slice(start, i).match(/^\s*([A-Za-z_]\w*)\s*:/);
    if (first) out.push(first[1]);
  }
  return out;
}

describe('点动：每个按钮都有人接', () => {
  const used = new Map<string, string>();
  for (const [f, src] of text) for (const n of actNames(src)) if (!used.has(n)) used.set(n, f);
  const handled = new Set(text.flatMap(([, src]) => handlerNames(src)));

  it('扫得到按钮，也扫得到处理函数（防扫描本身失效）', () => {
    expect(used.size).toBeGreaterThan(40);
    expect(handled.size).toBeGreaterThan(40);
    expect(handled.has('sheetClose') && handled.has('stPick') && handled.has('fReact')).toBe(true);
  });

  it('data-act 的每个动作名都在 registerHandlers 里注册过', () => {
    const missing = [...used].filter(([n]) => !handled.has(n)).map(([n, f]) => `${n}（${f}）`);
    expect(missing, '这些按钮点了不会有任何反应：在 registerHandlers 里补上处理函数').toEqual([]);
  });

  it('注册了的处理函数都有按钮在用（没人点的是死代码，或者按钮写丢了）', () => {
    // 这几个由程序触发或别处另行绑定
    const free = new Set<string>();
    const dead = [...handled].filter(n => !used.has(n) && !free.has(n));
    expect(dead).toEqual([]);
  });

  it('不用 pointer-events:none 把可点的画面整块盖死，除非有处理（赶路时的灰面板见 shell.ts）', () => {
    const bad = css.split('\n').filter((l: string) => /#app\.traveling[^{]*\{[^}]*pointer-events:\s*none/.test(l));
    expect(bad, '赶路时点灰着的按钮要有提示，不能静悄悄点不动').toEqual([]);
  });

  it('不是按钮的可点元素（弹层遮罩）要写 cursor:pointer：iPhone 的 Safari 里，点在没有它的 div 上不触发 click', () => {
    const nonButton = text.flatMap(([f, src]) => [...src.matchAll(/<(div|span|li|p|section|label)\b[^>]*data-act=/g)].map(m => `${f}：${m[0].slice(0, 30)}`));
    // 现有的两个：弹层遮罩 .scrim、章回题字 .chap，样式里都要有 cursor:pointer
    expect(nonButton.length).toBeLessThanOrEqual(2);
    expect(css).toMatch(/\.scrim\[data-act\]\s*\{[^}]*cursor:\s*pointer/);
    expect(css).toMatch(/\.chap\s*\{[^}]*cursor:\s*pointer/);
  });
});

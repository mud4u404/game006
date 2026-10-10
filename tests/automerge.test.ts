import { describe, expect, it } from 'vitest';
import { allowedFiles, allowedSection, judgeFiles, parseBranch } from '../scripts/automerge.mjs';

const body = (section: string) => `## 背景\n无\n\n## 允许修改的文件\n${section}\n\n## 验收\n- src/content/packs/other.ts\n`;

describe('自动合并：允许改的文件', () => {
  it('完整路径照旧认', () => {
    const a = allowedFiles(body('- `src/content/packs/zhaoshi.ts`\n- docs/menpai.md'));
    expect([...a].sort()).toEqual(['docs/menpai.md', 'src/content/packs/zhaoshi.ts']);
  });

  it('裸名：当作 src/content/packs 下的文件（文档 .md 当作 docs 下的）', () => {
    expect([...allowedFiles(body('- `zhaoshi.ts`、caoshangfei.ts、menpai.md'))].sort()).toEqual(['docs/menpai.md', 'src/content/packs/caoshangfei.ts', 'src/content/packs/zhaoshi.ts']);
  });

  it('写成别处的路径不算裸名：src/engine/zhaoshi.ts 不会放行内容包 zhaoshi.ts', () => {
    expect([...allowedFiles(body('- src/engine/zhaoshi.ts'))]).toEqual([]);
  });

  it('也认「## 允许改的文件」；只看这一节，不看别的节', () => {
    expect([...allowedFiles('## 允许改的文件\n- zhaoshi.ts\n## 验收\n- caoshangfei.ts')]).toEqual(['src/content/packs/zhaoshi.ts']);
    expect(allowedSection('没有这一节')).toBe('');
    expect([...allowedFiles(null)]).toEqual([]);
  });
});

describe('自动合并：文件范围', () => {
  const allowed = allowedFiles(body('- zhaoshi.ts'));
  const f = (status: string, filename: string, deletions = 0) => ({ status, filename, deletions });

  it('新增内容包：Issue 点名了才合（裸名也算）；没点名的不合（#259：Issue 暂缓、PR 只新增了一个内容包）', () => {
    expect(judgeFiles([f('added', 'src/content/packs/zhaoshi.ts')], allowed)).toEqual({ ok: true, bad: [] });
    expect(judgeFiles([f('added', 'src/content/packs/new.ts')], allowed)).toEqual({ ok: false, bad: ['src/content/packs/new.ts'] });
    expect(judgeFiles([f('added', 'src/content/packs/new.ts')], allowedFiles(body('- src/content/packs/new.ts')))).toEqual({ ok: true, bad: [] });
  });

  it('改已有内容包：点名了才合（裸名也算）', () => {
    expect(judgeFiles([f('modified', 'src/content/packs/zhaoshi.ts')], allowed).ok).toBe(true);
    expect(judgeFiles([f('modified', 'src/content/packs/caoshangfei.ts')], allowed)).toEqual({ ok: false, bad: ['src/content/packs/caoshangfei.ts'] });
  });

  it('改了引擎、删了文件、改名：不合，并列出越界的文件', () => {
    const r = judgeFiles([f('added', 'src/content/packs/zhaoshi.ts'), f('modified', 'src/engine/duel.ts'), f('removed', 'src/content/packs/old.ts')], allowed);
    expect(r.ok).toBe(false);
    expect(r.bad).toEqual(['src/engine/duel.ts', 'src/content/packs/old.ts']);
    expect(judgeFiles([f('renamed', 'src/content/packs/x.ts')], allowed).ok).toBe(false);
  });

  it('forbidden-names 只许加词，不许删；没有改动文件不合', () => {
    expect(judgeFiles([f('modified', 'tests/forbidden-names.ts', 0)], allowed).ok).toBe(true);
    expect(judgeFiles([f('modified', 'tests/forbidden-names.ts', 2)], allowed).ok).toBe(false);
    expect(judgeFiles([], allowed).ok).toBe(false);
  });
});

describe('自动合并：分支名', () => {
  it('取出工具名和 Issue 编号；claude/ 和不合格式的不处理', () => {
    expect(parseBranch('Trae/12-huafang')).toEqual({ tool: 'trae', issue: 12 });
    expect(parseBranch('claude/12-x')).toBeNull();
    expect(parseBranch('feature-x')).toBeNull();
    expect(parseBranch('zcode/abc')).toBeNull();
  });
});

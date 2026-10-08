/**
 * 人情：关系阶梯、旧称谓的迁移、人物页的分组（docs/design.md 4.5 节，docs/audit.md 第四节）。
 * 关系的高低只用阶梯里的词；味道写在人情备注里（rel 效果的 note）。
 */
import type { GameState } from '../core/state';

/** 正向阶梯，由浅到深 */
export const REL_UP = ['素不相识', '点头之交', '相谈甚欢', '知交'] as const;
/** 最深的两种，二选一 */
export const REL_TOP = ['结拜兄弟', '情缘'] as const;
/** 负向阶梯，由轻到重 */
export const REL_DOWN = ['心存芥蒂', '有隙', '仇敌'] as const;
/** 特殊关系：亲人、师徒；亲人故去是「阴阳两隔」 */
export const REL_SPECIAL = ['相依为命', '师徒', '阴阳两隔'] as const;
export const REL_WORDS: string[] = [...REL_UP, ...REL_TOP, ...REL_DOWN, ...REL_SPECIAL];

/** 早期内容里用过的称谓 → 阶梯里的词（读档时迁移，原词留作人情备注） */
export const REL_LEGACY: Record<string, string> = {
  初识: '点头之交', 笑脸相迎: '点头之交', 旧识: '相谈甚欢', 不打不相识: '相谈甚欢', 颇有好感: '相谈甚欢',
  感念高义: '相谈甚欢', 心存感激: '相谈甚欢', 知恩图报: '相谈甚欢', 感恩戴德: '相谈甚欢'
};

/** 旧称谓原来的味道，迁移时写成人情备注（每个旧词只在一处内容里用过，知道说的是谁） */
const LEGACY_NOTE: Record<string, string> = {
  旧识: '当年你叫来巡检讨公道，如今他是扬州府捕头',
  不打不相识: '湖畔切磋，不打不相识',
  感念高义: '藏经阁一案，了尘感念你的高义',
  心存感激: '画舫上的歌女，心存感激',
  知恩图报: '画舫上的歌女，说要知恩图报',
  感恩戴德: '你斗败屠千山，夺回了漕帮的三船盐'
};

/** 读档时把旧称谓换成阶梯里的词；原来的词有味道的，写成人情备注 */
export function migrateRel(s: Pick<GameState, 'rel' | 'relNote'>): void {
  for (const [id, v] of Object.entries(s.rel)) {
    const to = REL_LEGACY[v];
    if (!to) continue;
    s.rel[id] = to;
    if (LEGACY_NOTE[v] && !s.relNote?.[id]) (s.relNote ??= {})[id] = LEGACY_NOTE[v];
  }
}

/** 往上走一级（赠礼这类小人情用），最多到「相谈甚欢」；有过节的不变 */
export function warmer(v: string | undefined): string {
  const i = REL_UP.indexOf((v ?? '素不相识') as (typeof REL_UP)[number]);
  if (i < 0) return v ?? '素不相识';
  return REL_UP[Math.min(i + 1, 2)];
}

export type RelGroup = '至亲至交' | '交好' | '恩怨' | '萍水相逢';

/** 人物页的分组：萍水相逢的人收起来，只把有意义的人摆在前面 */
export function relGroup(v: string): RelGroup {
  if ((REL_DOWN as readonly string[]).includes(v)) return '恩怨';
  if (v === '相谈甚欢') return '交好';
  if (v === '素不相识' || v === '点头之交') return '萍水相逢';
  return '至亲至交';
}

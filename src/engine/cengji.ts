/**
 * 武学的层级表现：同一招、同一句应对，随境界分四段（生、熟、精、化）写法不同。
 * 这里只管「取哪一组句子」，是纯函数；战报怎么摆、什么样式在 ui/fight.ts 与 styles/app.css。
 * 取法：按当前境界定段；这一段没写，往下一段退（化→精→熟），最后退到原来的 text/alts（生段）。
 */
import { duanOf } from '../content/skills';
import type { Duan, LvText, SkillDef } from '../content/types';

const DOWN: Duan[] = ['化', '精', '熟', '生'];

/** 战报条加的 class：随段不同的样子（styles/app.css 的「武学层级」） */
export const DUAN_CLS: Record<Duan, string> = { 生: 'd-sheng', 熟: 'd-shu', 精: 'd-jing', 化: 'd-hua' };

/**
 * 出招描写：lv 里按境界段往下退着找；都没写就用 base（text 与 alts）。
 * 返回实际取到的那一段，战报的样式跟着它走（写了熟段、没写精段的招式，到精段仍照熟段的样子）。
 */
export function lvPool(lv: LvText | undefined, realm: number, base: string[]): { duan: Duan; pool: string[] } {
  const from = DOWN.indexOf(duanOf(realm));
  for (const d of DOWN.slice(from)) {
    if (d === '生') break;
    const t = lv?.[d];
    if (t?.length) return { duan: d, pool: t };
  }
  return { duan: '生', pool: base };
}

/** 内功硬接、轻功闪避成功时的那一句：按境界段往下退，都没写返回 null（用通用的那句） */
export function respPool(sk: SkillDef | undefined, realm: number): { duan: Duan; pool: string[] } | null {
  if (!sk?.resp) return null;
  for (const d of DOWN.slice(DOWN.indexOf(duanOf(realm)))) {
    const t = sk.resp[d];
    if (t?.length) return { duan: d, pool: t };
  }
  return null;
}

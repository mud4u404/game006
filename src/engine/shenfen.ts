/**
 * 身份与营生（docs/foundation.md 第三节第六、八条，数由 src/lab/model/life.ts 验过：M1 到 M5）。
 * - 钱来自替人办事，不来自打怪：走镖、悬赏、护院，本事越大接的活越大，所以和武功仍然有关；
 *   但每一件都在某个身份之下，宗师走一趟镖也不过三流的九倍半（按档次给钱是五十七倍，后期银子泛滥）。
 * - 身份 = 义务 + 门路 + 营生。义务只以「约」的形式出现（接下差事就定一个约，误了就是失职）。
 * - 地位：一新进、二正经、三老手；误事、违了行规降一级，降到零就被辞退，做回游侠；赔罪、立功升回来。
 */
import type { GameState } from '../core/state';
import { dayNo } from '../core/time';
import { jobById } from '../content';
import type { JobDef } from '../content/types';

export interface ShenfenDef {
  name: string;
  /** 人物页上的一句：义务和门路 */
  desc: string;
  /** 每在线一小时挣多少两（按档次，不入流到宗师），src/lab/model/life.ts 的 SHENFEN_INCOME */
  pay: number[];
}

export const SHENFEN: Record<string, ShenfenDef> = {
  yumin: { name: '渔家', desc: '瓜洲渡的渔家少年，跟着江伯过日子。', pay: [0, 0, 0, 0, 0, 0] },
  youxia: { name: '游侠', desc: '无门无派，靠赏金、谢礼和旧日的人情过日子。府衙的悬赏榜、路见不平，都是营生。', pay: [0.5, 1.6, 3, 4.5, 6, 7.5] },
  biaoshi: { name: '镖师', desc: '威远镖局的镖师。镖局派镖，按期送到；走镖的路上，镖局的趟子手跟着你。误了镖期要受罚。', pay: [0.5, 2.2, 5, 9, 14, 20] }
};

/** 本行里的地位 */
export const STANDING = ['被辞退', '新进', '正经', '老手'];
/** 一件差事算多少在线时辰的活（半个时辰）；一两合一千文 */
export const JOB_HOURS = 0.5;

/** 这件差事给多少文：身份在这一档每在线小时的收入 × 半个时辰 × 难易，取整到十文 */
export function jobPay(j: Pick<JobDef, 'shenfen' | 'tier' | 'k'>): number {
  const sf = SHENFEN[j.shenfen];
  const t = Math.max(0, Math.min(5, Math.round(j.tier)));
  return sf ? Math.round((sf.pay[t] * 1000 * JOB_HOURS * (j.k ?? 1)) / 10) * 10 : 0;
}

/** 现在的营生 */
export const shenfenOf = (s: Pick<GameState, 'shenfen'>): ShenfenDef => SHENFEN[s.shenfen.id] ?? SHENFEN.youxia;
/** 「镖师 · 新进」 */
export const shenfenText = (s: Pick<GameState, 'shenfen'>): string =>
  s.shenfen.id === 'yumin' || s.shenfen.id === 'youxia' ? shenfenOf(s).name : `${shenfenOf(s).name} · ${STANDING[s.shenfen.standing] ?? ''}`;

/** 这件差事眼下接得：身份对、地位在、手上没有别的差事、上回办完已经隔够了日子 */
export function jobOpen(s: Pick<GameState, 'shenfen' | 'job' | 'jobLog' | 'year' | 'month' | 'day'>, id: string): boolean {
  const j = jobById(id);
  if (!j || s.job) return false;
  if (s.shenfen.id !== j.shenfen || s.shenfen.standing < 1) return false;
  const last = s.jobLog[id];
  return last === undefined || dayNo(s) - last >= (j.again ?? 3);
}

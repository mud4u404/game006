import { cn } from './util';

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

/** 一天之中的分钟数 → 时辰，例如 7:40 → 辰时 */
export function shichen(min: number): string {
  const h = Math.floor(min / 60) % 24;
  return SHICHEN[Math.floor(((h + 1) % 24) / 2)] + '时';
}

/**
 * 时辰加刻，例如 15:50 → 申时三刻。一个时辰两个钟头、八刻，每刻十五分钟；整时辰只说时辰。
 * 顶栏用它，玩家每做一件事都看得到时间在走。
 */
export function shichenKe(min: number): string {
  const ke = Math.floor((((min + 60) % 120) + 120) % 120 / 15);
  return shichen(min) + (ke ? cn(ke) + '刻' : '');
}

/** 1–30 → 初一 … 三十 */
export function dayName(d: number): string {
  if (d <= 10) return '初' + (d === 10 ? '十' : cn(d));
  if (d < 20) return '十' + cn(d - 10);
  if (d === 20) return '二十';
  if (d < 30) return '廿' + cn(d - 20);
  return '三十';
}

/** 江湖历：景和元年起（year 为 0），每月三十天，一年十二个月（docs/foundation.md 第三节第三条） */
export interface Clock { year?: number; month: number; day: number; min: number }

export function dateStr(c: Clock): string { return MONTHS[c.month - 1] + '月' + dayName(c.day); }

/** 景和元年、景和二年…… */
export const yearStr = (c: Pick<Clock, 'year'>): string => '景和' + ((c.year ?? 0) === 0 ? '元' : cn((c.year ?? 0) + 1)) + '年';
export const fullDate = (c: Clock): string => yearStr(c) + dateStr(c);

/** 从景和元年正月初一起的第几天（算间隔用）。旧存档都算景和元年，和改版前「一年里的第几天」一样 */
export const dayNo = (c: Pick<Clock, 'year' | 'month' | 'day'>): number => (c.year ?? 0) * 360 + (c.month - 1) * 30 + c.day;
/** 从景和元年起的第几分钟 */
export const absMin = (c: Clock): number => dayNo(c) * 1440 + c.min;

export function advanceDays(c: Clock, n: number): void {
  c.day += n;
  while (c.day > 30) {
    c.day -= 30;
    c.month++;
    if (c.month > 12) { c.month = 1; c.year = (c.year ?? 0) + 1; }
  }
}

/** 现实的钟（毫秒）。测试里可以换掉 */
let clock = (): number => Date.now();
export const nowMs = (): number => clock();
export const setNowMs = (f: () => number): void => { clock = f; };

export function advanceMin(c: Clock, m: number): void {
  c.min += m;
  while (c.min >= 1440) { c.min -= 1440; advanceDays(c, 1); }
}

/** 干一件活耗时的说法：60 分钟是半个时辰，120 分钟一个时辰，180 分钟一个半时辰；按半个时辰一档取整 */
export function spanLabel(m: number): string {
  const h = Math.max(1, Math.round(m / 60)); // 以半个时辰（六十分钟）为一档
  const sc = Math.floor(h / 2);
  if (h % 2) return sc ? `${sc === 2 ? '两' : cn(sc)}个半时辰` : '半个时辰';
  return `${sc === 2 ? '两' : cn(sc)}个时辰`;
}

/** 赶路耗时的说法：10 分钟以内「片刻」，否则按刻计 */
export function minLabel(m: number): string {
  if (m <= 10) return '片刻';
  const n = Math.max(1, Math.round(m / 15));
  return (n === 2 ? '两' : cn(n)) + '刻';
}

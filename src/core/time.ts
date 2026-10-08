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

export interface Clock { month: number; day: number; min: number }

export function dateStr(c: Clock): string { return MONTHS[c.month - 1] + '月' + dayName(c.day); }

/** 一年里的第几天（每月三十天），算间隔用；跨年时会变小，调用方把负数当作「很久以前」 */
export const dayNo = (c: Pick<Clock, 'month' | 'day'>): number => (c.month - 1) * 30 + c.day;
/** 一年里的第几分钟 */
export const absMin = (c: Clock): number => dayNo(c) * 1440 + c.min;

export function advanceDays(c: Clock, n: number): void {
  c.day += n;
  while (c.day > 30) { c.day -= 30; c.month = (c.month % 12) + 1; }
}

export function advanceMin(c: Clock, m: number): void {
  c.min += m;
  while (c.min >= 1440) { c.min -= 1440; advanceDays(c, 1); }
}

/** 赶路耗时的说法：10 分钟以内「片刻」，否则按刻计 */
export function minLabel(m: number): string {
  if (m <= 10) return '片刻';
  const n = Math.max(1, Math.round(m / 15));
  return (n === 2 ? '两' : cn(n)) + '刻';
}

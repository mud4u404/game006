/** 横向进度条：气血、内力、怒气 */
export const mb = (label: string, v: number, max: number, cls: string): string =>
  `<div class="mb ${cls}"><span>${label}</span><div class="tr"><i style="width:${Math.round((v / max) * 100)}%"></i></div><span class="v">${Math.round(v)}</span></div>`;

/** 见闻标签的配色 */
export const FEED_TONE: Record<string, string> = { 传闻: 'warn', 出关: 'accent', 主线: 'info', 江湖: 'purple', 突破: 'accent', 收获: 'accent' };

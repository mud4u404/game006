const sv = (body: string, extra = ''): string =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;
const sm = (body: string): string =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const IC: Record<string, string> = {
  jianghu: sv('<path d="M2 20 L9 8 L13 14 L16 10 L22 20 Z"/>'),
  renwu: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21 C4 16.5 7.6 14 12 14 C16.4 14 20 16.5 20 21"/>'),
  wugong: sv('<path d="M20 4 L10 14"/><path d="M20 4 L16 4 M20 4 L20 8"/><path d="M7 11 L13 17"/><path d="M10 14 L5 19"/>'),
  xingnang: sv('<path d="M5 9 H19 L18 21 H6 Z"/><path d="M9 9 V7 A3 3 0 0 1 15 7 V9"/>'),
  ditu: sv('<path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z"/><path d="M9 4 V18 M15 6 V20"/>'),
  pause: sv('<path d="M9 5 V19 M15 5 V19"/>', ' stroke-width="2.2"'),
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6 L15 12 L9 18"/></svg>',
  rain: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15 A4.5 4.5 0 0 1 7.5 6 A5.5 5.5 0 0 1 18 8 A3.5 3.5 0 0 1 17.5 15 Z"/><path d="M9 18 L8 20 M13 18 L12 20 M17 18 L16 20"/></svg>',
  stele: sm('<path d="M7 21 V6 A5 5 0 0 1 17 6 V21 Z"/><path d="M5 21 H19 M10 9 H14 M10 13 H14"/>'),
  go: sm('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12 H20 M12 4 V20"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/><circle cx="16" cy="16" r="1.8"/>'),
  boat: sm('<path d="M3 15 H21 L18 20 H6 Z"/><path d="M12 15 V4 L18 12 H12"/>'),
  door: sm('<path d="M6 21 V3 H18 V21"/><path d="M4 21 H20"/><circle cx="15" cy="12" r="1" fill="currentColor"/>'),
  quest: sv('<path d="M4 5 A2 2 0 0 1 6 3 H18 V19 H6 A2 2 0 0 1 4 17 Z"/><path d="M8 7 H16 M8 11 H14 M8 15 H12"/>')
};

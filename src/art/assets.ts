/**
 * 手绘美术素材（与 ChatGPT 共创，经 scripts/ingest-art.ts 入库）
 * 有素材时优先使用，没有时回退到程序生成的像素美术。
 */
export interface ArtManifest {
  portraits: Record<string, string[]>;
  keyart: string[];
  cg: string[];
}

const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
let manifest: ArtManifest = { portraits: {}, keyart: [], cg: [] };
let useArt = true;

export async function loadArtManifest(): Promise<void> {
  try {
    const r = await fetch(`${BASE}art/manifest.json`, { cache: 'no-cache' });
    if (r.ok) manifest = (await r.json()) as ArtManifest;
  } catch {
    /* 没有清单：全部使用像素美术 */
  }
}

/** 设置：立绘使用手绘（true）还是像素（false） */
export function setUseArt(on: boolean) {
  useArt = on;
}

export function hasPortraitArt(): boolean {
  return Object.keys(manifest.portraits).length > 0;
}

/** 手绘立绘地址；缺少该表情时退回 normal */
export function portraitArt(id: string, emotion: string): string | null {
  if (!useArt) return null;
  const list = manifest.portraits[id];
  if (!list?.length) return null;
  const e = list.includes(emotion) ? emotion : list.includes('normal') ? 'normal' : list[0];
  return `${BASE}art/portraits/${id}/${e}.webp`;
}

export function keyArt(): string | null {
  return manifest.keyart.includes('title') ? `${BASE}art/keyart/title.webp` : null;
}

export function chapterCg(chapterId: string): string | null {
  return manifest.cg.includes(chapterId) ? `${BASE}art/cg/${chapterId}.webp` : null;
}

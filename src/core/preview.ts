/**
 * 试玩预览：GitHub Pages 的 /preview/ 子目录放的是维护者分支的构建（.github/workflows/pages.yml），
 * 负责人合并之前先在这里玩一下。
 *
 * 同一个网站的 localStorage 不分子目录，云存档也是同一个账号；预览版的存档格式可能比正式版新，
 * 一不小心就会把朋友们的正式存档改坏。所以预览页：
 * - 本机存储换一套键：开头的 jhyy- 换成 jhyy-preview-（存档、元数据、每日备份、读不出来的旧档、云存档的会话和指纹，全部）；
 * - 不连云存档：不登录、不上传、不下载（net/cloud.ts 的 cloudEnabled 和 call 把关）。
 *
 * 为什么不是在键的末尾加后缀：存档按前缀找备份、删旧备份（core/save.ts 的 listKeys）。
 * 末尾加后缀的话，jhyy-bak-日期-preview 也以 jhyy-bak- 开头，正式版轮换备份时会把它算进去，
 * 反倒把正式版自己的备份挤掉一份。换开头以后，两套键谁也不是谁的前缀（tests/preview.test.ts 把关）。
 */

/** 正式版所有本机存储键的共同开头 */
export const MAIN_PREFIX = 'jhyy-';
/** 预览版的开头；pages.yml 部署前在预览版的构建里找这串字，找不到（分支还没有这套隔离）就不部署预览 */
export const PREVIEW_PREFIX = 'jhyy-preview-';

/** 当前页面是不是试玩预览：路径里有 /preview/（或以 /preview 结尾） */
export function isPreview(): boolean {
  try {
    const path = (globalThis as { location?: { pathname?: string } }).location?.pathname ?? '';
    return /\/preview(\/|$)/.test(path);
  } catch { return false; }
}

/** 本机存储的键：正式版原样；预览版把开头的 jhyy- 换成 jhyy-preview-。每次用时现算，测试里换了路径也跟着变 */
export function storageKey(base: string): string {
  if (!base.startsWith(MAIN_PREFIX)) throw new Error(`本机存储的键要以 ${MAIN_PREFIX} 开头：${base}`);
  return isPreview() ? PREVIEW_PREFIX + base.slice(MAIN_PREFIX.length) : base;
}

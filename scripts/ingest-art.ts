/**
 * 美术素材入库：把 art/incoming/ 中 ChatGPT 生成的原图处理成游戏用图
 * --------------------------------------------------------------
 * 用法：npx tsx scripts/ingest-art.ts [--preview 目录]
 *
 * 命名约定（见 art/README.md）：
 *   portrait_<角色id>_a.png          2×2 表情表（竖版）：平静 微笑 愤怒 悲伤
 *   portrait_<角色id>_b.png          2×2 表情表（竖版）：惊讶 坚毅 受伤 思索
 *   portrait_<角色id>.png            8 种表情的 4×2 表情表（横版，分辨率较低，备用）
 *   portrait_<角色id>_<表情>.png     单张表情（覆盖表情表中的同名表情）
 *   keyart_title.png                 标题主视觉
 *   cg_ch00.png … cg_ch10.png        章节插画
 * 处理：去背景（纯色或假透明棋盘格）→ 切分表情表 → 统一缩放 → 输出 WebP 到 public/art/，原图存档到 art/processed/。
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN = 'art/incoming';
const DONE = 'art/processed';
const OUT = 'public/art';
const EMOTIONS = ['normal', 'smile', 'angry', 'sad', 'surprised', 'determined', 'hurt', 'thinking'];
const PORTRAIT_W = 768;
const PORTRAIT_H = 1024;
const WIDE_W = 2560;
const WIDE_H = 1440;

const previewDir = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1] : null;

interface Img {
  w: number;
  h: number;
  px: Buffer; // RGBA
}

async function load(file: string): Promise<Img> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: data };
}

const toSharp = (im: Img) => sharp(im.px, { raw: { width: im.w, height: im.h, channels: 4 } });

/** 若几乎没有透明像素，则从四边取背景色并做泛洪去背景 */
function removeBackground(im: Img): { im: Img; removed: boolean } {
  const { w, h, px } = im;
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 16) transparent++;
  if (transparent / (w * h) > 0.05) return { im, removed: false };
  // 边缘采样估计背景色
  const samples: number[][] = [];
  for (let x = 0; x < w; x += 4) samples.push(rgb(px, x, 0, w), rgb(px, x, h - 1, w));
  for (let y = 0; y < h; y += 4) samples.push(rgb(px, 0, y, w), rgb(px, w - 1, y, w));
  // 背景可能是纯色，也可能是 ChatGPT 画出来的「假透明」棋盘格：按颜色聚类兼容两种情况
  const bgs = bgColors(samples);
  const dist = (i: number) => Math.min(...bgs.map((bg) => Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2])));
  const TH = 34;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const k = y * w + x;
    if (seen[k]) return;
    seen[k] = 1;
    if (dist(k * 4) < TH) stack.push(k);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const bgMask = new Uint8Array(w * h);
  while (stack.length) {
    const k = stack.pop()!;
    bgMask[k] = 1;
    const x = k % w;
    const y = (k - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  const out = Buffer.from(px);
  for (let k = 0; k < w * h; k++) {
    if (bgMask[k]) out[k * 4 + 3] = 0;
  }
  // 边缘羽化：与背景相邻、颜色接近背景的像素半透明
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      if (bgMask[k]) continue;
      if (bgMask[k - 1] || bgMask[k + 1] || bgMask[k - w] || bgMask[k + w]) {
        const d = dist(k * 4);
        if (d < TH * 2.2) out[k * 4 + 3] = Math.round(255 * Math.min(1, d / (TH * 2.2)));
      }
    }
  return { im: { w, h, px: out }, removed: true };
}

function rgb(px: Buffer, x: number, y: number, w: number): number[] {
  const i = (y * w + x) * 4;
  return [px[i], px[i + 1], px[i + 2]];
}
/** 边缘颜色聚类：取占比 ≥12% 的颜色作为背景色（纯色背景得到一类，棋盘格得到两类） */
function bgColors(samples: number[][]): number[][] {
  const buckets = new Map<number, { n: number; s: number[] }>();
  for (const c of samples) {
    const k = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4);
    const b = buckets.get(k) ?? { n: 0, s: [0, 0, 0] };
    b.n++;
    for (let i = 0; i < 3; i++) b.s[i] += c[i];
    buckets.set(k, b);
  }
  const list = [...buckets.values()].map((b) => ({ n: b.n, c: b.s.map((v) => v / b.n) })).sort((x, y) => y.n - x.n);
  const clusters: { n: number; c: number[] }[] = [];
  for (const b of list) {
    const near = clusters.find((k) => Math.hypot(k.c[0] - b.c[0], k.c[1] - b.c[1], k.c[2] - b.c[2]) < 28);
    if (near) {
      near.c = near.c.map((v, i) => (v * near.n + b.c[i] * b.n) / (near.n + b.n));
      near.n += b.n;
    } else clusters.push({ ...b });
  }
  const keep = clusters.filter((k) => k.n >= samples.length * 0.12).map((k) => k.c);
  return keep.length ? keep : [clusters[0].c];
}

/** 在目标位置附近找不透明像素最少的列/行（表情之间的空隙） */
function findGap(profile: number[], target: number, radius: number): number {
  let best = target;
  let bestV = Infinity;
  for (let i = Math.max(0, Math.round(target - radius)); i <= Math.min(profile.length - 1, Math.round(target + radius)); i++) {
    const v = profile[i] + Math.abs(i - target) * 0.02;
    if (v < bestV) {
      bestV = v;
      best = i;
    }
  }
  return best;
}

function crop(im: Img, x0: number, y0: number, x1: number, y1: number): Img {
  const w = x1 - x0;
  const h = y1 - y0;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) im.px.copy(px, y * w * 4, ((y0 + y) * im.w + x0) * 4, ((y0 + y) * im.w + x1) * 4);
  return { w, h, px };
}

/** 不透明内容的包围盒 */
function bbox(im: Img): [number, number, number, number] | null {
  let x0 = im.w;
  let y0 = im.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (im.px[(y * im.w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/** 表情表 → cols×rows 个格子（按行从左到右） */
function splitSheet(im: Img, cols: number, rows: number): Img[] {
  const col = new Array(im.w).fill(0);
  const row = new Array(im.h).fill(0);
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (im.px[(y * im.w + x) * 4 + 3] > 24) {
        col[x]++;
        row[y]++;
      }
  const cuts = (n: number, len: number, prof: number[]) => [0, ...Array.from({ length: n - 1 }, (_, k) => findGap(prof, (len * (k + 1)) / n, len / (n * 2.4))), len];
  const xs = cuts(cols, im.w, col);
  const ys = cuts(rows, im.h, row);
  const cells: Img[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(crop(im, xs[c], ys[r], xs[c + 1], ys[r + 1]));
  return cells;
}

/** 立绘：统一比例缩放到 768×1024，底部居中 */
async function writePortraits(id: string, cells: { emo: string; im: Img }[]) {
  const trimmed = cells
    .map((c) => {
      const b = bbox(c.im);
      return b ? { emo: c.emo, im: crop(c.im, ...b) } : null;
    })
    .filter((c): c is { emo: string; im: Img } => !!c);
  if (!trimmed.length) return [];
  // 同一角色的所有表情用同一个缩放比例，保证头身大小一致
  const scale = Math.min(...trimmed.map((t) => Math.min((PORTRAIT_W * 0.96) / t.im.w, (PORTRAIT_H * 0.98) / t.im.h)));
  const dir = join(OUT, 'portraits', id);
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const t of trimmed) {
    const w = Math.max(1, Math.round(t.im.w * scale));
    const h = Math.max(1, Math.round(t.im.h * scale));
    const resized = await toSharp(t.im).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp({ create: { width: PORTRAIT_W, height: PORTRAIT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left: Math.round((PORTRAIT_W - w) / 2), top: PORTRAIT_H - h }])
      .webp({ quality: 90, alphaQuality: 95 })
      .toFile(join(dir, `${t.emo}.webp`));
    written.push(t.emo);
  }
  return written;
}

async function writeWide(file: string, out: string) {
  mkdirSync(join(OUT, out.split('/')[0]), { recursive: true });
  await sharp(file).resize(WIDE_W, WIDE_H, { fit: 'cover', position: 'attention', kernel: 'lanczos3' }).webp({ quality: 88 }).toFile(join(OUT, `${out}.webp`));
}

function buildManifest() {
  const m: { portraits: Record<string, string[]>; keyart: string[]; cg: string[] } = { portraits: {}, keyart: [], cg: [] };
  const pdir = join(OUT, 'portraits');
  if (existsSync(pdir))
    for (const id of readdirSync(pdir).filter((d) => !d.startsWith('.'))) m.portraits[id] = readdirSync(join(pdir, id)).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')).sort();
  for (const k of ['keyart', 'cg'] as const) {
    const d = join(OUT, k);
    if (existsSync(d)) m[k] = readdirSync(d).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', '')).sort();
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  return m;
}

async function main() {
  mkdirSync(DONE, { recursive: true });
  const files = existsSync(IN) ? readdirSync(IN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
  if (!files.length) console.log('art/incoming/ 中没有待处理的图片。');
  for (const f of files) {
    const name = f.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase();
    const path = join(IN, f);
    let m: RegExpExecArray | null;
    try {
      if ((m = /^portrait_([a-z]+)(?:_([a-z]+))?$/.exec(name))) {
        const [, id, emo] = m;
        const { im, removed } = removeBackground(await load(path));
        if (emo && emo !== 'a' && emo !== 'b') {
          if (!EMOTIONS.includes(emo)) throw new Error(`未知表情 ${emo}`);
          const w = await writePortraits(id, [{ emo, im }]);
          console.log(`✓ ${f} → 立绘 ${id}/${w.join(',')}${removed ? '（已去背景）' : ''}`);
        } else {
          const emos = emo === 'a' ? EMOTIONS.slice(0, 4) : emo === 'b' ? EMOTIONS.slice(4) : EMOTIONS;
          const cells = (emo ? splitSheet(im, 2, 2) : splitSheet(im, 4, 2)).map((c, i) => ({ emo: emos[i], im: c }));
          const w = await writePortraits(id, cells);
          console.log(`✓ ${f} → 立绘 ${id} ×${w.length}${removed ? '（已去背景）' : ''}`);
          if (previewDir) {
            mkdirSync(previewDir, { recursive: true });
            const tiles = await Promise.all(w.map((e) => sharp(join(OUT, 'portraits', id, `${e}.webp`)).resize(192, 256).png().toBuffer()));
            await sharp({ create: { width: 192 * 4, height: 256 * Math.ceil(tiles.length / 4), channels: 4, background: '#3a3a46' } })
              .composite(tiles.map((t, i) => ({ input: t, left: (i % 4) * 192, top: Math.floor(i / 4) * 256 })))
              .png()
              .toFile(join(previewDir, `${name}.png`));
          }
        }
      } else if (name === 'keyart_title') {
        await writeWide(path, 'keyart/title');
        console.log(`✓ ${f} → 标题主视觉`);
      } else if ((m = /^cg_(ch\d\d)$/.exec(name))) {
        await writeWide(path, `cg/${m[1]}`);
        console.log(`✓ ${f} → 章节插画 ${m[1]}`);
      } else {
        console.log(`✗ ${f}：文件名不符合约定，已跳过`);
        continue;
      }
      // 原图以高质量 WebP 存档（体积约为 PNG 的十分之一），便于以后重新处理
      await sharp(path).webp({ quality: 95, alphaQuality: 100 }).toFile(join(DONE, `${name}.webp`));
      unlinkSync(path);
    } catch (e) {
      console.log(`✗ ${f}：${(e as Error).message}`);
    }
  }
  const man = buildManifest();
  console.log(`清单：立绘 ${Object.keys(man.portraits).length} 人，主视觉 ${man.keyart.length}，章节插画 ${man.cg.length}`);
}

void main();

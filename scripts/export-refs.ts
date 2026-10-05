/**
 * 导出美术参考图：每个角色的像素立绘 + 战场精灵（正面/背面），放大后拼成一张 PNG
 * 用法：npx tsx scripts/export-refs.ts
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { CHARACTERS } from '@/data/characters';
import { NPCS } from '@/data/npcs';
import { portraitLook } from '@/data/portraits';
import { drawPortrait } from '@/art/portrait';
import { drawHumanoid, SPRITE_H, SPRITE_W } from '@/art/humanoid';
import { creatureFrame, drawCreature } from '@/art/creatures';
import { poseFor } from '@/art/frames';
import { PixelBuf } from '@/art/pixel';
import { buildModelSpec } from '@/game/unit';
import type { UnitModelSpec } from '@/render/contracts';

const OUT = 'art/refs';
mkdirSync(OUT, { recursive: true });

function png(buf: PixelBuf, scale: number) {
  return sharp(Buffer.from(buf.data.buffer), { raw: { width: buf.w, height: buf.h, channels: 4 } })
    .resize(buf.w * scale, buf.h * scale, { kernel: 'nearest' })
    .png()
    .toBuffer();
}

function sprite(spec: UnitModelSpec, view: 'front' | 'back'): PixelBuf {
  const human = (spec.body === 'humanoid' || spec.body === 'skeleton') && (!spec.mount || spec.mount === 'none');
  if (human) {
    const b = new PixelBuf(SPRITE_W, SPRITE_H);
    drawHumanoid(b, spec, poseFor('idle', 0, spec.weapon), view);
    b.outline(0.38);
    return b;
  }
  const info = creatureFrame(spec);
  const b = new PixelBuf(info.w, info.h);
  drawCreature(b, spec, 'idle', 0, view);
  b.outline(0.38);
  return b;
}

async function exportOne(id: string, spec: UnitModelSpec) {
  const look = portraitLook(id);
  if (!look) return;
  const P = 5;
  const S = 5;
  const por = drawPortrait(look, 'normal');
  const front = sprite(spec, 'front');
  const back = sprite(spec, 'back');
  const parts = [
    { img: await png(por, P), w: por.w * P, h: por.h * P },
    { img: await png(front, S), w: front.w * S, h: front.h * S },
    { img: await png(back, S), w: back.w * S, h: back.h * S },
  ];
  const pad = 40;
  const W = parts.reduce((s, p) => s + p.w + pad, pad);
  const H = Math.max(...parts.map((p) => p.h)) + pad * 2;
  let x = pad;
  const comps = parts.map((p) => {
    const c = { input: p.img, left: x, top: H - pad - p.h };
    x += p.w + pad;
    return c;
  });
  await sharp({ create: { width: W, height: H, channels: 4, background: '#3a3a46' } })
    .composite(comps)
    .png()
    .toFile(`${OUT}/${id}.png`);
  console.log(`${OUT}/${id}.png`);
}

for (const c of Object.values(CHARACTERS)) await exportOne(c.id, buildModelSpec(c.classId, 'player', undefined, c.model));
for (const id of ['mordis', 'vesper', 'gregor', 'edmund', 'alberic', 'otto']) {
  const n = NPCS[id];
  await exportOne(id, buildModelSpec(n.classId, id === 'alberic' || id === 'otto' ? 'player' : 'enemy', n.model));
}

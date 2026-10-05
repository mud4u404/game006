import { CHARACTERS } from '@/data/characters';
import { buildModelSpec } from '@/game/unit';
import { unitAtlas, frameIndex } from '@/art/atlas';
import { ANIM_FRAMES, ANIM_ORDER, type SpriteAnim } from '@/art/frames';
import type { UnitModelSpec } from '@/render/contracts';

const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 4);
const mode = q.get('mode') ?? 'chars';
const g = document.getElementById('g')!;

function cell(spec: UnitModelSpec, label: string, anim: SpriteAnim, frame: number, row: number) {
  const a = unitAtlas(spec);
  const c = document.createElement('canvas');
  c.width = a.frameW;
  c.height = a.frameH;
  c.style.width = `${a.frameW * scale}px`;
  c.style.height = `${a.frameH * scale}px`;
  c.getContext('2d')!.drawImage(a.canvas, frameIndex(anim, frame) * a.frameW, row * a.frameH, a.frameW, a.frameH, 0, 0, a.frameW, a.frameH);
  const d = document.createElement('div');
  d.className = 'cell';
  const l = document.createElement('div');
  l.className = 'lbl';
  l.textContent = label;
  d.append(c, l);
  g.appendChild(d);
}

if (mode === 'chars') {
  for (const ch of Object.values(CHARACTERS)) {
    const spec = buildModelSpec(ch.classId, 'player', { mount: 'none' }, { ...ch.model, mount: 'none' });
    cell(spec, `${ch.name}`, 'idle', 0, 0);
  }
  for (const ch of Object.values(CHARACTERS).slice(0, 6)) {
    const spec = buildModelSpec(ch.classId, 'player', { mount: 'none' }, { ...ch.model, mount: 'none' });
    cell(spec, `${ch.name}·背`, 'idle', 0, 1);
  }
} else if (mode === 'anims') {
  const id = q.get('id') ?? 'rein';
  const ch = CHARACTERS[id];
  const spec = buildModelSpec(ch.classId, 'player', { mount: 'none' }, { ...ch.model, mount: 'none' });
  for (const a of ANIM_ORDER) for (let f = 0; f < ANIM_FRAMES[a].frames; f++) cell(spec, `${a} ${f}`, a, f, Number(q.get('row') ?? 0));
} else if (mode === 'beasts') {
  const row = Number(q.get('row') ?? 0);
  const anim = (q.get('anim') ?? 'idle') as SpriteAnim;
  const fr = Number(q.get('f') ?? 0);
  const list: [string, UnitModelSpec][] = [
    ['cavalier', buildModelSpec('cavalier', 'player')],
    ['paladin', buildModelSpec('paladin', 'player')],
    ['pegasus', buildModelSpec('pegasus_knight', 'player')],
    ['wyvern_rider', buildModelSpec('wyvern_rider', 'enemy')],
    ['dark_knight', buildModelSpec('dark_knight', 'enemy')],
    ['wolf', buildModelSpec('wolf', 'enemy')],
    ['salamander', buildModelSpec('salamander', 'enemy')],
    ['golem', buildModelSpec('golem', 'enemy')],
    ['wraith', buildModelSpec('wraith', 'enemy')],
    ['wild_wyvern', buildModelSpec('wild_wyvern', 'enemy')],
    ['ash_dragon', buildModelSpec('ash_dragon', 'enemy')],
  ];
  for (const [n, s] of list) cell(s, n, anim, fr, row);
} else if (mode === 'banims') {
  const id = q.get('id') ?? 'cavalier';
  const team = (q.get('team') ?? 'player') as 'player' | 'enemy';
  const spec = buildModelSpec(id, team);
  for (const a of ANIM_ORDER) for (let f = 0; f < ANIM_FRAMES[a].frames; f++) cell(spec, `${a} ${f}`, a, f, Number(q.get('row') ?? 0));
} else {
  for (const id of ['soldier', 'brigand', 'archer', 'armor_knight', 'dark_mage', 'cult_priest', 'thief', 'myrmidon', 'general', 'sorcerer', 'witch', 'high_priest', 'skeleton']) {
    cell(buildModelSpec(id, 'enemy', { mount: 'none' }), id, 'idle', 0, 0);
  }
}
(window as unknown as { __ready: boolean }).__ready = true;

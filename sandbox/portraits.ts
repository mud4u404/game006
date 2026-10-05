import { pixelPortraitUrl } from '@/ui/portraits';
import { CHARACTERS } from '@/data/characters';
import { NPC_LOOKS } from '@/data/portraits';
import type { Emotion } from '@/ui/portraitContracts';

const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 3);
const mode = q.get('mode') ?? 'all';
const g = document.getElementById('g')!;
const EMOS: Emotion[] = ['normal', 'smile', 'angry', 'sad', 'surprised', 'determined', 'hurt', 'thinking'];

function cell(id: string, label: string, emo: Emotion) {
  const url = pixelPortraitUrl(id, emo);
  const d = document.createElement('div');
  d.className = 'cell';
  const img = document.createElement('img');
  if (url) img.src = url;
  img.style.width = `${80 * scale}px`;
  img.style.height = `${96 * scale}px`;
  const l = document.createElement('div');
  l.className = 'lbl';
  l.textContent = label;
  d.append(img, l);
  g.appendChild(d);
}

if (mode === 'all') {
  for (const c of Object.values(CHARACTERS)) cell(c.id, c.name, (q.get('emo') as Emotion) ?? 'normal');
} else if (mode === 'npc') {
  for (const id of Object.keys(NPC_LOOKS)) cell(id, id, (q.get('emo') as Emotion) ?? 'normal');
} else {
  const id = q.get('id') ?? 'rein';
  for (const e of EMOS) cell(id, e, e);
}
(window as unknown as { __ready: boolean }).__ready = true;

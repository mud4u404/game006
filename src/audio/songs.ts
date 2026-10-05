/**
 * 原创配乐（程序化编曲）
 * --------------------------------------------------------------
 * 全篇围绕一段原创主旋律「誓约动机」（D 小调，8 小节）展开：
 *  标题：圆号庄严地奏出；悲伤：钢琴慢速独奏；希望：D 大调辉煌变奏；
 *  战斗：铜管激昂的节奏化变奏；终局：管风琴与合唱；结局：F 大调长笛版。
 * 记谱：'D4:1' = D4 一拍；'r:1' = 休止；'[D4,F4]:2' = 和弦；后缀 '!' 为重音。
 */
import type { MusicId } from './contracts';
import type { InstrumentId } from './synth';

export interface Note {
  t: number;
  d: number;
  p: number;
  v?: number;
}
export interface Part {
  inst: InstrumentId;
  notes: Note[];
  vol?: number;
  pan?: number;
}
export interface Song {
  tempo: number;
  beats: number;
  loop: boolean;
  parts: Part[];
  reverb?: number;
  /** 响度校正（各曲目 RMS 统一到约 -22dB） */
  gain?: number;
}

/* ================================================================== */
/* 记谱工具                                                            */
/* ================================================================== */

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteNum(s: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  let n = NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (Number(m[3]) + 1) * 12;
  return n;
}

/** 旋律：返回音符与总拍数 */
export function mel(str: string, start = 0, vel = 0.8, transpose = 0): Note[] {
  const out: Note[] = [];
  let t = start;
  for (const tok of str.split(/\s+/).filter((x) => x && x !== '|')) {
    const accent = tok.endsWith('!');
    const [head, durS] = (accent ? tok.slice(0, -1) : tok).split(':');
    const d = Number(durS);
    if (head !== 'r') {
      const ps = head.startsWith('[') ? head.slice(1, -1).split(',') : [head];
      for (const p of ps) out.push({ t, d, p: noteNum(p) + transpose, v: accent ? Math.min(1, vel + 0.2) : vel });
    }
    t += d;
  }
  return out;
}

const QUAL: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  m9: [0, 3, 7, 14],
};

/** 和弦符号 → 构成音（根音置于 oct 八度） */
export function chord(sym: string, oct = 3): number[] {
  const [main, bassS] = sym.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main)!;
  const root = noteNum(`${m[1]}${oct}`);
  const tones = (QUAL[m[2]] ?? QUAL['']).map((i) => root + i);
  if (bassS) tones.unshift(noteNum(`${bassS}${oct - 1}`));
  return tones;
}

type Prog = [string, number][];

function progTimes(prog: Prog, start = 0): { sym: string; t: number; d: number }[] {
  let t = start;
  return prog.map(([sym, d]) => {
    const r = { sym, t, d };
    t += d;
    return r;
  });
}

/** 持续和弦 */
export function pads(prog: Prog, oct = 3, vel = 0.6, start = 0): Note[] {
  const out: Note[] = [];
  for (const c of progTimes(prog, start)) for (const p of chord(c.sym, oct)) out.push({ t: c.t, d: c.d, p, v: vel });
  return out;
}

/** 分解和弦：pattern 为和弦音索引（可超出，自动升八度），step 为每个音的拍数 */
export function arps(prog: Prog, oct: number, pattern: number[], step: number, vel = 0.6, start = 0, dur?: number): Note[] {
  const out: Note[] = [];
  for (const c of progTimes(prog, start)) {
    const tones = chord(c.sym, oct).filter((_, i, a) => !(a.length > 3 && i === 0 && c.sym.includes('/')));
    const n = Math.round(c.d / step);
    for (let i = 0; i < n; i++) {
      const idx = pattern[i % pattern.length];
      const p = tones[idx % tones.length] + 12 * Math.floor(idx / tones.length);
      out.push({ t: c.t + i * step, d: dur ?? step * 1.5, p, v: vel * (i % pattern.length === 0 ? 1.1 : 1) });
    }
  }
  return out;
}

/** 低音：每个和弦的根音按节奏型演奏 */
export function bass(prog: Prog, oct: number, rhythm: [number, number][], vel = 0.8, start = 0, fifthOn: number[] = []): Note[] {
  const out: Note[] = [];
  for (const c of progTimes(prog, start)) {
    const [main, bassS] = c.sym.split('/');
    const rootName = bassS ?? /^([A-G][#b]?)/.exec(main)![1];
    const root = noteNum(`${rootName}${oct}`);
    let k = 0;
    for (let off = 0; off < c.d - 1e-6; ) {
      for (const [o, d] of rhythm) {
        if (off + o >= c.d - 1e-6) break;
        const p = fifthOn.includes(k) ? root + 7 : root;
        out.push({ t: c.t + off + o, d, p, v: vel });
        k++;
      }
      off += Math.max(...rhythm.map(([o, d]) => o + d), 1);
    }
  }
  return out;
}

/** 鼓：'x' 重音，'o' 普通，'.' 休止；step 为每格拍数 */
export function drums(pattern: string, step: number, bars: number, barLen: number, pitch = 48, vel = 0.8, start = 0): Note[] {
  const out: Note[] = [];
  const cells = pattern.replace(/\s/g, '');
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c === '.') continue;
      out.push({ t: start + b * barLen + i * step, d: step, p: pitch, v: c === 'x' ? vel : vel * 0.6 });
    }
  }
  return out;
}

const cat = (...lists: Note[][]): Note[] => lists.flat();

/* ================================================================== */
/* 誓约动机                                                            */
/* ================================================================== */

const OATH_A = 'D4:1 A4:1.5 G4:.5 | F4:1 E4:.5 F4:.5 G4:2 | A4:1 D5:1.5 C5:.5 | A4:3 r:1';
const OATH_B = 'Bb4:1 A4:1 G4:1 F4:1 | E4:1.5 F4:.5 G4:2 | F4:1 E4:1 D4:1 C#4:1 | D4:4';
const OATH_PROG: Prog = [
  ['Dm', 4],
  ['Bb', 4],
  ['F', 4],
  ['A', 4],
  ['Gm', 4],
  ['C', 4],
  ['Bb', 2],
  ['A', 2],
  ['Dm', 4],
];
// D 大调变奏
const HOPE_A = 'D4:1 A4:1.5 G4:.5 | F#4:1 E4:.5 F#4:.5 G4:2 | A4:1 D5:1.5 C#5:.5 | A4:3 r:1';
const HOPE_B = 'B4:1 A4:1 G4:1 F#4:1 | E4:1.5 F#4:.5 G4:2 | F#4:1 E4:1 D4:1 C#4:1 | D4:4';
const HOPE_PROG: Prog = [
  ['D', 4],
  ['G', 4],
  ['D/F#', 4],
  ['A', 4],
  ['Em', 4],
  ['A', 4],
  ['G', 2],
  ['A', 2],
  ['D', 4],
];

/* ================================================================== */
/* 曲目                                                                */
/* ================================================================== */

function title(): Song {
  const intro: Prog = [
    ['Dm', 8],
    ['Bb', 4],
    ['A', 4],
  ];
  const outro: Prog = [
    ['Bb', 4],
    ['C', 4],
    ['Dm', 4],
    ['Asus4', 2],
    ['A', 2],
  ];
  const prog = [...intro, ...OATH_PROG, ...outro];
  return {
    tempo: 66,
    beats: 64,
    loop: true,
    reverb: 0.45,
    parts: [
      { inst: 'strings', notes: pads(prog, 3, 0.5), vol: 0.8 },
      { inst: 'lowstrings', notes: bass(prog, 2, [[0, 4]], 0.6), vol: 0.7 },
      { inst: 'harp', notes: arps(prog, 3, [0, 1, 2, 3, 4, 5, 4, 3], 0.5, 0.45), vol: 0.7, pan: -0.3 },
      { inst: 'horn', notes: mel(`${OATH_A} ${OATH_B}`, 16, 0.85), vol: 1 },
      { inst: 'choir', notes: pads(OATH_PROG, 4, 0.35, 16), vol: 0.6 },
      { inst: 'flute', notes: mel('D5:1 A5:1.5 G5:.5 F5:4 r:2 E5:2 F5:1 E5:1 D5:2', 48, 0.6), vol: 0.6, pan: 0.3 },
      { inst: 'timpani', notes: cat(mel('D2:.25 D2:.25 D2:.25 D2:.25 D2:.25 D2:.25 A1:.5', 14, 0.5), mel('D2:2', 16, 0.9), mel('D2:2', 32, 0.8), mel('D2:1 A1:1', 60, 0.7)) },
      { inst: 'cymbal', notes: mel('C4:4', 16, 0.5) },
    ],
  };
}

function camp(): Song {
  // 3/4 拍民谣
  const A: Prog = [
    ['F', 3],
    ['C', 3],
    ['Dm', 3],
    ['Bb', 3],
    ['F', 3],
    ['C', 3],
    ['Bb', 1.5],
    ['C', 1.5],
    ['F', 3],
  ];
  const B: Prog = [
    ['Bb', 3],
    ['F', 3],
    ['Gm', 3],
    ['C', 3],
    ['Bb', 3],
    ['F', 3],
    ['C', 3],
    ['F', 3],
  ];
  const prog = [...A, ...B];
  const melA = 'C5:1 A4:.5 C5:.5 F5:1 | E5:1.5 D5:.5 C5:1 | D5:1 F5:.5 E5:.5 D5:1 | C5:2 r:1 | C5:1 A4:.5 C5:.5 F5:1 | G5:1.5 F5:.5 E5:1 | D5:1 E5:1 G5:1 | F5:3';
  const melB = 'D5:1 F5:.5 D5:.5 Bb4:1 | A4:1.5 C5:.5 F5:1 | G5:1 F5:.5 E5:.5 D5:1 | E5:2 r:1 | D5:1 F5:.5 Bb5:.5 A5:1 | G5:1.5 F5:.5 A4:1 | C5:1 E5:1 G5:1 | F5:3';
  return {
    tempo: 104,
    beats: 48,
    loop: true,
    reverb: 0.3,
    parts: [
      { inst: 'harp', notes: arps(prog, 3, [0, 2, 3, 4, 3, 2], 0.5, 0.55), vol: 0.9, pan: -0.25 },
      { inst: 'flute', notes: mel(`${melA} ${melB}`, 0, 0.75), vol: 0.9, pan: 0.2 },
      { inst: 'bass', notes: bass(prog, 2, [[0, 1.5]], 0.5), vol: 0.6 },
      { inst: 'strings', notes: pads(B, 3, 0.3, 24), vol: 0.5 },
      { inst: 'hat', notes: drums('.oo', 1, 16, 3, 60, 0.4) },
    ],
  };
}

function storyCalm(): Song {
  const prog: Prog = [
    ['F', 4],
    ['Am', 4],
    ['Bb', 4],
    ['C', 4],
    ['Dm', 4],
    ['Bb', 4],
    ['Gm7', 4],
    ['C', 4],
  ];
  return {
    tempo: 72,
    beats: 32,
    loop: true,
    reverb: 0.4,
    parts: [
      { inst: 'piano', notes: arps(prog, 3, [0, 1, 2, 4, 3, 2, 1, 2], 0.5, 0.5), vol: 0.8 },
      { inst: 'strings', notes: pads(prog, 3, 0.3), vol: 0.5 },
      { inst: 'flute', notes: mel('A4:2 C5:1 F5:1 | E5:3 C5:1 | D5:2 F5:1 D5:1 | C5:4 | A4:2 D5:1 F5:1 | F5:1.5 E5:.5 D5:2 | Bb4:1 C5:1 D5:1 G5:1 | E5:4', 0, 0.6), vol: 0.7 },
      { inst: 'bass', notes: bass(prog, 2, [[0, 4]], 0.4), vol: 0.5 },
    ],
  };
}

function storyTense(): Song {
  const prog: Prog = [
    ['Am', 4],
    ['Am', 4],
    ['F', 4],
    ['E', 4],
    ['Am', 4],
    ['Dm', 4],
    ['F', 4],
    ['E', 4],
  ];
  return {
    tempo: 84,
    beats: 32,
    loop: true,
    reverb: 0.35,
    parts: [
      { inst: 'lowstrings', notes: bass(prog, 2, [[0, 0.3], [0.5, 0.3]], 0.6), vol: 0.9 },
      { inst: 'synth', notes: arps(prog, 3, [0, 0, 2, 0], 0.5, 0.35, 0, 0.2), vol: 0.5 },
      { inst: 'strings', notes: cat(mel('[E5,F5]:8', 0, 0.3), mel('[G#4,A4]:8', 8, 0.3), mel('[E5,F5]:8', 16, 0.3), mel('[G#4,A4]:8', 24, 0.3)), vol: 0.5 },
      { inst: 'hat', notes: drums('o.o.o.o.o.o.o.o.', 0.25, 8, 4, 60, 0.35) },
      { inst: 'timpani', notes: cat(mel('A1:2', 0, 0.8), mel('A1:2', 16, 0.8), mel('E2:1 E2:1', 14, 0.6)) },
      { inst: 'horn', notes: mel('A3:3 C4:1 | B3:4 | A3:2 F3:2 | G#3:4', 16, 0.5), vol: 0.6 },
    ],
  };
}

function storySad(): Song {
  return {
    tempo: 58,
    beats: 32,
    loop: true,
    reverb: 0.5,
    parts: [
      { inst: 'piano', notes: mel(`${OATH_A} ${OATH_B}`, 0, 0.6), vol: 0.9 },
      { inst: 'piano', notes: arps(OATH_PROG, 2, [0, 2, 4, 2], 1, 0.3), vol: 0.6 },
      { inst: 'strings', notes: pads(OATH_PROG, 3, 0.28), vol: 0.6 },
      { inst: 'lowstrings', notes: bass(OATH_PROG, 2, [[0, 4]], 0.35), vol: 0.5 },
    ],
  };
}

function storyHope(): Song {
  return {
    tempo: 80,
    beats: 32,
    loop: true,
    reverb: 0.42,
    parts: [
      { inst: 'horn', notes: mel(`${HOPE_A} ${HOPE_B}`, 0, 0.8), vol: 1 },
      { inst: 'strings', notes: pads(HOPE_PROG, 3, 0.45), vol: 0.75 },
      { inst: 'harp', notes: arps(HOPE_PROG, 3, [0, 1, 2, 3, 2, 1, 2, 3], 0.5, 0.45), vol: 0.7, pan: -0.3 },
      { inst: 'lowstrings', notes: bass(HOPE_PROG, 2, [[0, 2], [2, 2]], 0.5), vol: 0.6 },
      { inst: 'timpani', notes: cat(mel('D2:2', 0, 0.7), mel('D2:2', 16, 0.7), mel('A1:.5 A1:.5 A1:.5 A1:.5', 30, 0.5)) },
      { inst: 'bell', notes: mel('A5:2 r:6 F#5:2 r:6 D6:2 r:6 A5:4', 0, 0.35), vol: 0.5, pan: 0.35 },
    ],
  };
}

function battlePlayer(): Song {
  const prog1: Prog = [
    ['Dm', 4],
    ['Dm', 4],
    ['Bb', 4],
    ['C', 4],
    ['Dm', 4],
    ['Dm', 4],
    ['Bb', 4],
    ['A', 4],
  ];
  const prog = [...prog1, ...OATH_PROG];
  const m1 =
    'D5:.5 D5:.5 A4:.5 D5:.5 F5:1 E5:.5 D5:.5 | C5:1.5 A4:.5 C5:2 | Bb4:.5 Bb4:.5 F4:.5 Bb4:.5 D5:1 C5:.5 Bb4:.5 | C5:3 r:1 | D5:.5 D5:.5 A4:.5 D5:.5 F5:1 G5:.5 A5:.5 | A5:1.5 G5:.5 F5:2 | E5:1 F5:.5 G5:.5 D5:1 E5:1 | C#5:3 r:1';
  return {
    tempo: 138,
    beats: 64,
    loop: true,
    reverb: 0.25,
    parts: [
      { inst: 'strings', notes: arps(prog, 3, [0, 0, 2, 0, 3, 0, 2, 0], 0.5, 0.55, 0, 0.35), vol: 0.85 },
      { inst: 'brass', notes: cat(mel(m1, 0, 0.85), mel(`${OATH_A} ${OATH_B}`, 32, 0.9, 12)), vol: 0.95 },
      { inst: 'horn', notes: pads(OATH_PROG, 3, 0.45, 32), vol: 0.55 },
      { inst: 'bass', notes: bass(prog, 2, [[0, 0.45], [0.5, 0.45]], 0.7), vol: 0.75 },
      { inst: 'kick', notes: drums('x...x...x...x.o.', 0.25, 16, 4) },
      { inst: 'snare', notes: cat(drums('....x.......x...', 0.25, 15, 4), drums('....x...x.o.xoxo', 0.25, 1, 4, 48, 0.8, 60)) },
      { inst: 'hat', notes: drums('x.o.x.o.x.o.x.o.', 0.25, 16, 4, 60, 0.5) },
      { inst: 'cymbal', notes: cat(mel('C4:4', 0, 0.6), mel('C4:4', 32, 0.7)) },
      { inst: 'timpani', notes: cat(mel('D2:.5 D2:.5 A1:1', 14, 0.7), mel('D2:.5 D2:.5 A1:1', 46, 0.7)) },
    ],
  };
}

function battleEnemy(): Song {
  const prog: Prog = [
    ['Cm', 4],
    ['Cm', 4],
    ['Ab', 4],
    ['G', 4],
    ['Cm', 4],
    ['Fm', 4],
    ['Ab', 4],
    ['G', 4],
  ];
  return {
    tempo: 110,
    beats: 32,
    loop: true,
    reverb: 0.3,
    parts: [
      { inst: 'lowstrings', notes: bass(prog, 2, [[0, 0.22], [0.25, 0.22], [0.5, 0.22], [0.75, 0.22]], 0.55), vol: 0.85 },
      { inst: 'timpani', notes: drums('x.o.', 1, 8, 4, 36, 0.8) },
      { inst: 'brass', notes: cat(mel('[C4,Eb4,G4]:.5!', 0, 0.8), mel('[C4,Eb4,G4]:.5', 16, 0.8), mel('[Ab3,C4,Eb4]:.5!', 8, 0.8), mel('[G3,B3,D4]:.5!', 12, 0.8), mel('[Ab3,C4,Eb4]:.5', 24, 0.8), mel('[G3,B3,D4]:.5!', 28, 0.8)), vol: 0.8 },
      { inst: 'horn', notes: mel('C4:2 Eb4:1 D4:1 | C4:3 G3:1 | Ab3:2 C4:1 Eb4:1 | D4:4 | C4:2 Eb4:1 G4:1 | F4:2 Eb4:1 D4:1 | C4:2 Ab3:2 | B3:4', 0, 0.7), vol: 0.85 },
      { inst: 'synth', notes: mel('C5:.25 B4:.25 C5:.25 Db5:.25 r:3 C5:.25 B4:.25 C5:.25 Db5:.25 r:3', 0, 0.4).concat(mel('C5:.25 B4:.25 C5:.25 Db5:.25 r:3 C5:.25 B4:.25 C5:.25 Db5:.25 r:3', 16, 0.4)), vol: 0.45 },
      { inst: 'snare', notes: drums('........x.......', 0.25, 8, 4, 48, 0.5) },
    ],
  };
}

function boss(): Song {
  const prog: Prog = [
    ['Em', 4],
    ['C', 4],
    ['D', 4],
    ['B', 4],
    ['Em', 4],
    ['C', 4],
    ['Am', 4],
    ['B', 4],
  ];
  return {
    tempo: 158,
    beats: 32,
    loop: true,
    reverb: 0.22,
    parts: [
      { inst: 'strings', notes: arps(prog, 3, [0, 2, 3, 2], 0.25, 0.5, 0, 0.2), vol: 0.8 },
      { inst: 'brass', notes: mel('E5:1 B4:.5 E5:.5 G5:1 F#5:1 | E5:1.5 D5:.5 C5:2 | D5:1 A4:.5 D5:.5 F#5:1 E5:1 | D#5:4 | E5:1 B4:.5 E5:.5 G5:1 A5:1 | B5:2 A5:1 G5:1 | A5:1 G5:.5 F#5:.5 E5:1 C5:1 | B4:4', 0, 0.9), vol: 1 },
      { inst: 'horn', notes: pads(prog, 3, 0.4), vol: 0.45 },
      { inst: 'bass', notes: bass(prog, 2, [[0, 0.22], [0.25, 0.22], [0.5, 0.22], [0.75, 0.22]], 0.6), vol: 0.75 },
      { inst: 'kick', notes: drums('x..xx..xx..xx.x.', 0.25, 8, 4) },
      { inst: 'snare', notes: cat(drums('....x.......x...', 0.25, 7, 4), drums('....x...x.xxxxxx', 0.25, 1, 4, 48, 0.8, 28)) },
      { inst: 'hat', notes: drums('xoxoxoxoxoxoxoxo', 0.25, 8, 4, 60, 0.45) },
      { inst: 'cymbal', notes: cat(mel('C4:4', 0, 0.7), mel('C4:4', 16, 0.6)) },
      { inst: 'timpani', notes: mel('B1:.5 B1:.5 B1:.5 B1:.5 B1:2', 28, 0.8) },
    ],
  };
}

function finalBattle(): Song {
  const prog = [...OATH_PROG, ...OATH_PROG];
  return {
    tempo: 102,
    beats: 64,
    loop: true,
    reverb: 0.4,
    parts: [
      { inst: 'organ', notes: pads(prog, 3, 0.55), vol: 0.8 },
      { inst: 'choir', notes: pads(prog, 4, 0.45), vol: 0.7 },
      { inst: 'brass', notes: cat(mel(`${OATH_A} ${OATH_B}`, 0, 0.85), mel(`${OATH_A} ${OATH_B}`, 32, 0.95, 12)), vol: 1 },
      { inst: 'strings', notes: cat(arps(OATH_PROG, 3, [0, 1, 2, 1], 0.25, 0.45, 32, 0.2)), vol: 0.7 },
      { inst: 'lowstrings', notes: bass(prog, 2, [[0, 0.45], [0.5, 0.45]], 0.65), vol: 0.8 },
      { inst: 'kick', notes: drums('x.......x.......', 0.25, 8, 4).concat(drums('x...x...x...x.x.', 0.25, 8, 4, 48, 0.8, 32)) },
      { inst: 'snare', notes: drums('....x.......x...', 0.25, 8, 4, 48, 0.7, 32) },
      { inst: 'timpani', notes: cat(drums('x...............', 0.25, 8, 4, 38, 0.8), drums('x.......x.......', 0.25, 8, 4, 38, 0.8, 32)) },
      { inst: 'cymbal', notes: cat(mel('C4:4', 0, 0.6), mel('C4:4', 32, 0.8)) },
      { inst: 'bell', notes: mel('D6:4 r:12 A5:4 r:12', 32, 0.4), vol: 0.5 },
    ],
  };
}

function victory(): Song {
  return {
    tempo: 120,
    beats: 12,
    loop: false,
    reverb: 0.4,
    parts: [
      { inst: 'brass', notes: mel('D4:.33 F#4:.33 A4:.34 D5:1.5 A4:.5 | D5:.5 E5:.5 F#5:4!', 0, 0.9), vol: 1 },
      { inst: 'brass', notes: mel('r:1 A4:1.5 F#4:.5 | A4:.5 C#5:.5 D5:4', 0, 0.7), vol: 0.7 },
      { inst: 'strings', notes: pads([['D', 3], ['A', 1], ['D', 6]], 3, 0.5), vol: 0.7 },
      { inst: 'timpani', notes: mel('D2:.25 D2:.25 D2:.25 D2:.25 A1:.5 D2:1 r:1 D2:.25 D2:.25 D2:.5 D2:2', 0, 0.8) },
      { inst: 'cymbal', notes: mel('C4:4', 4, 0.7) },
    ],
  };
}

function defeat(): Song {
  return {
    tempo: 56,
    beats: 14,
    loop: false,
    reverb: 0.55,
    parts: [
      { inst: 'strings', notes: mel('A4:2 G4:1 F4:1 | E4:2 D4:2 | C#4:2 D4:4', 0, 0.55), vol: 0.9 },
      { inst: 'lowstrings', notes: pads([['Dm', 4], ['Gm/D', 4], ['A', 2], ['Dm', 4]], 2, 0.4), vol: 0.6 },
      { inst: 'timpani', notes: mel('D2:4', 0, 0.5) },
    ],
  };
}

function ending(): Song {
  const prog: Prog = [
    ['F', 4],
    ['Bb', 4],
    ['F', 4],
    ['C', 4],
    ['Gm', 4],
    ['C', 4],
    ['Bb', 2],
    ['C', 2],
    ['F', 4],
  ];
  const A = 'F4:1 C5:1.5 Bb4:.5 | A4:1 G4:.5 A4:.5 Bb4:2 | C5:1 F5:1.5 E5:.5 | C5:3 r:1';
  const B = 'D5:1 C5:1 Bb4:1 A4:1 | G4:1.5 A4:.5 Bb4:2 | A4:1 G4:1 F4:1 E4:1 | F4:4';
  const full = [...prog, ...prog];
  return {
    tempo: 70,
    beats: 64,
    loop: true,
    reverb: 0.5,
    parts: [
      { inst: 'flute', notes: mel(`${A} ${B}`, 0, 0.7), vol: 0.85 },
      { inst: 'harp', notes: arps(full, 3, [0, 1, 2, 3, 4, 3, 2, 1], 0.5, 0.45), vol: 0.75, pan: -0.25 },
      { inst: 'strings', notes: cat(pads(prog, 3, 0.3), mel(`${A} ${B}`, 32, 0.7, 12)), vol: 0.8 },
      { inst: 'horn', notes: pads(prog, 3, 0.4, 32), vol: 0.6 },
      { inst: 'lowstrings', notes: bass(full, 2, [[0, 4]], 0.4), vol: 0.55 },
      { inst: 'bell', notes: mel('C6:2 r:14 A5:2 r:14', 32, 0.35), vol: 0.5, pan: 0.3 },
      { inst: 'timpani', notes: mel('F2:2', 32, 0.6) },
    ],
  };
}

export const SONGS: Record<MusicId, Song> = {
  title: { ...title(), gain: 1.45 },
  camp: { ...camp(), gain: 2.0 },
  story_calm: { ...storyCalm(), gain: 1.8 },
  story_tense: { ...storyTense(), gain: 1.5 },
  story_sad: { ...storySad(), gain: 2.0 },
  story_hope: { ...storyHope(), gain: 1.15 },
  battle_player: { ...battlePlayer(), gain: 1.0 },
  battle_enemy: { ...battleEnemy(), gain: 0.95 },
  boss: { ...boss(), gain: 0.9 },
  final: { ...finalBattle(), gain: 0.9 },
  victory: { ...victory(), gain: 1.3 },
  defeat: { ...defeat(), gain: 1.5 },
  ending: { ...ending(), gain: 1.8 },
};

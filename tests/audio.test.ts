/**
 * 配乐数据校验：所有曲目都能解析，音符落在循环长度之内
 */
import { describe, expect, it } from 'vitest';
import { SONGS, chord, mel, noteNum } from '@/audio/songs';

describe('记谱', () => {
  it('音名换算', () => {
    expect(noteNum('A4')).toBe(69);
    expect(noteNum('C4')).toBe(60);
    expect(noteNum('Bb3')).toBe(58);
    expect(noteNum('F#5')).toBe(78);
  });
  it('旋律与和弦', () => {
    const m = mel('D4:1 r:1 [F4,A4]:2!');
    expect(m.length).toBe(3);
    expect(m[1].t).toBe(2);
    expect(chord('Dm', 3)).toEqual([50, 53, 57]);
    expect(chord('D/F#', 3)[0]).toBe(noteNum('F#2'));
  });
});

describe('曲目', () => {
  for (const [id, s] of Object.entries(SONGS)) {
    it(id, () => {
      expect(s.tempo).toBeGreaterThan(30);
      expect(s.parts.length).toBeGreaterThan(0);
      for (const p of s.parts) {
        for (const n of p.notes) {
          expect(Number.isFinite(n.t) && Number.isFinite(n.d) && Number.isFinite(n.p)).toBe(true);
          expect(n.d).toBeGreaterThan(0);
          expect(n.t).toBeGreaterThanOrEqual(0);
          expect(n.t, `${id}/${p.inst} 音符超出循环`).toBeLessThan(s.beats);
          expect(n.p).toBeGreaterThan(20);
          expect(n.p).toBeLessThan(110);
        }
      }
    });
  }
});

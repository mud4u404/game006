/**
 * WebAudio 合成器：乐器、音序器与音效
 * --------------------------------------------------------------
 * 全部声音在运行时合成，不使用任何外部音频文件。
 * 音乐使用前瞻调度（lookahead scheduling）保证节拍稳定、无缝循环。
 */
import type { AudioEngine, MusicId, SfxId } from './contracts';
import { SONGS, type Song } from './songs';

export type InstrumentId =
  | 'strings'
  | 'lowstrings'
  | 'pad'
  | 'choir'
  | 'brass'
  | 'horn'
  | 'flute'
  | 'harp'
  | 'piano'
  | 'organ'
  | 'bass'
  | 'bell'
  | 'synth'
  | 'timpani'
  | 'kick'
  | 'snare'
  | 'hat'
  | 'tom'
  | 'cymbal';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class SynthAudio implements AudioEngine {
  currentMusic: MusicId | null = null;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbIn!: GainNode;
  private noiseBuf!: AudioBuffer;
  private vol = { master: 0.8, music: 0.7, sfx: 0.8 };
  private player: { song: Song; gain: GainNode; start: number; next: number; timer: number; id: MusicId } | null = null;
  private pendingMusic: MusicId | null = null;
  private lastSfx = new Map<SfxId, number>();

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.build(new AC({ latencyHint: 'interactive' }));
    }
    if (this.ctx!.state === 'suspended') void this.ctx!.resume();
    if (this.pendingMusic) {
      const id = this.pendingMusic;
      this.pendingMusic = null;
      this.currentMusic = null;
      this.playMusic(id);
    }
  }

  /** 搭建混音总线（实时或离线上下文共用） */
  private build(ctx: BaseAudioContext) {
    this.ctx = ctx as AudioContext;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    this.reverbIn.connect(this.reverb).connect(this.master);
    // 白噪声缓冲（打击乐与音效共用）
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  /** 离线渲染一首曲目（用于测试与可视化） */
  async renderOffline(id: MusicId, seconds: number, sampleRate = 22050): Promise<AudioBuffer> {
    const saved = { ctx: this.ctx, master: this.master, musicBus: this.musicBus, sfxBus: this.sfxBus, reverb: this.reverb, reverbIn: this.reverbIn, noiseBuf: this.noiseBuf };
    const off = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
    this.build(off);
    const song = SONGS[id];
    const spb = 60 / song.tempo;
    const loopLen = song.beats * spb;
    const gain = off.createGain();
    gain.gain.value = song.gain ?? 1;
    gain.connect(this.musicBus);
    const send = off.createGain();
    send.gain.value = song.reverb ?? 0.32;
    gain.connect(send).connect(this.reverbIn);
    for (let base = 0; base < seconds; base += loopLen) {
      for (const part of song.parts)
        for (const n of part.notes) {
          const when = base + n.t * spb;
          if (when < seconds) this.note(part.inst, when + 0.01, n.d * spb, n.p, (n.v ?? 0.8) * (part.vol ?? 1), gain, part.pan ?? 0);
        }
      if (!song.loop) break;
    }
    const buf = await off.startRendering();
    Object.assign(this, saved);
    return buf;
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx as BaseAudioContext;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1);
      }
    }
    return buf;
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.7, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * 0.8, t, 0.05);
  }

  setVolume(ch: 'master' | 'music' | 'sfx', v: number) {
    this.vol[ch] = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  getVolume(ch: 'master' | 'music' | 'sfx') {
    return this.vol[ch];
  }

  /* ================================================================ */
  /* 音乐                                                              */
  /* ================================================================ */

  playMusic(id: MusicId, fadeSeconds = 1.2) {
    if (this.currentMusic === id && this.player) return;
    this.currentMusic = id;
    if (!this.ctx || this.ctx.state !== 'running') {
      this.pendingMusic = id;
      if (!this.ctx) return;
    }
    const song = SONGS[id];
    if (!song) return;
    this.stopMusic(fadeSeconds);
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(song.gain ?? 1, ctx.currentTime + Math.max(0.05, fadeSeconds * 0.6));
    gain.connect(this.musicBus);
    const send = ctx.createGain();
    send.gain.value = song.reverb ?? 0.32;
    gain.connect(send).connect(this.reverbIn);
    const start = ctx.currentTime + 0.12;
    const p = { song, gain, start, next: 0, timer: 0, id };
    p.timer = window.setInterval(() => this.schedule(p), 40);
    this.player = p;
    this.schedule(p);
  }

  stopMusic(fadeSeconds = 1) {
    const p = this.player;
    if (!p || !this.ctx) return;
    clearInterval(p.timer);
    const t = this.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
    p.gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fadeSeconds));
    const g = p.gain;
    setTimeout(() => g.disconnect(), (fadeSeconds + 0.5) * 1000);
    this.player = null;
  }

  /** 前瞻调度：把接下来 0.35 秒内要发声的音符提前排进时间线 */
  private schedule(p: NonNullable<SynthAudio['player']>) {
    const ctx = this.ctx!;
    const spb = 60 / p.song.tempo;
    const loopLen = p.song.beats * spb;
    const horizon = ctx.currentTime + 0.35;
    // p.next = 已调度到的绝对时间（相对 start 的秒数）
    while (p.start + p.next < horizon) {
      const from = p.next;
      const to = Math.min(from + 0.25, p.song.loop ? Infinity : loopLen);
      if (to <= from) {
        clearInterval(p.timer);
        return;
      }
      const loopIndex = Math.floor(from / loopLen);
      const base = loopIndex * loopLen;
      const a = from - base;
      const b = to - base;
      for (const part of p.song.parts) {
        for (const n of part.notes) {
          const nt = n.t * spb;
          // 跨越循环边界时分两段处理
          const inRange = (nt >= a && nt < b) || (b > loopLen && nt + loopLen >= a && nt + loopLen < b);
          if (!inRange) continue;
          const when = p.start + base + (nt >= a ? nt : nt + loopLen);
          this.note(part.inst, when, n.d * spb, n.p, (n.v ?? 0.8) * (part.vol ?? 1), p.gain, part.pan ?? 0);
        }
      }
      p.next = to;
    }
  }

  /* ================================================================ */
  /* 乐器                                                              */
  /* ================================================================ */

  private env(g: GainNode, t: number, a: number, peak: number, d: number, s: number, dur: number, r: number) {
    const gg = g.gain;
    gg.setValueAtTime(0.0001, t);
    gg.linearRampToValueAtTime(peak, t + a);
    gg.linearRampToValueAtTime(peak * s, t + a + d);
    gg.setValueAtTime(peak * s, t + Math.max(a + d, dur));
    gg.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
    return t + Math.max(a + d, dur) + r + 0.05;
  }

  private out(dest: AudioNode, pan: number): AudioNode {
    if (!pan) return dest;
    const p = this.ctx!.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    return p;
  }

  private osc(type: OscillatorType, f: number, t: number, end: number, detune = 0): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    o.start(t);
    o.stop(end);
    return o;
  }

  private noise(t: number, end: number): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(end);
    return s;
  }

  private filter(type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
    const b = this.ctx!.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }

  note(inst: InstrumentId, t: number, dur: number, midi: number, vel: number, dest: AudioNode, pan = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const f = mtof(midi);
    const o = this.out(dest, pan);
    const g = ctx.createGain();
    g.connect(o);
    switch (inst) {
      case 'strings':
      case 'lowstrings': {
        const low = inst === 'lowstrings';
        const end = this.env(g, t, low ? 0.04 : 0.12, 0.16 * vel, 0.2, 0.85, dur, low ? 0.25 : 0.45);
        const lp = this.filter('lowpass', low ? 900 + vel * 600 : 1800 + vel * 1600, 0.5);
        lp.connect(g);
        const oscs = [-9, 0, 8].map((det) => this.osc('sawtooth', f, t, end, det));
        for (const o1 of oscs) o1.connect(lp);
        // 长音加轻微颤音（以音分为单位作用于 detune）
        if (dur > 0.6 && !low) {
          const lfo = this.osc('sine', 5.2, t + 0.2, end);
          const lg = ctx.createGain();
          lg.gain.value = 6;
          lfo.connect(lg);
          for (const o1 of oscs) lg.connect(o1.detune);
        }
        break;
      }
      case 'pad':
      case 'choir': {
        const end = this.env(g, t, inst === 'choir' ? 0.35 : 0.6, 0.12 * vel, 0.3, 0.9, dur, 0.9);
        if (inst === 'choir') {
          // 「啊」的共振峰
          const mix = ctx.createGain();
          mix.gain.value = 1;
          for (const [ff, q, gain] of [
            [730, 8, 1],
            [1090, 9, 0.6],
            [2440, 10, 0.25],
          ] as [number, number, number][]) {
            const bp = this.filter('bandpass', ff, q);
            const bg = ctx.createGain();
            bg.gain.value = gain * 3.2;
            mix.connect(bp).connect(bg).connect(g);
          }
          for (const det of [-12, 0, 11]) this.osc('sawtooth', f, t, end, det).connect(mix);
        } else {
          const lp = this.filter('lowpass', 1400, 0.4);
          lp.connect(g);
          for (const det of [-6, 6]) this.osc('sawtooth', f, t, end, det).connect(lp);
          this.osc('triangle', f / 2, t, end).connect(lp);
        }
        break;
      }
      case 'brass':
      case 'horn': {
        const horn = inst === 'horn';
        const end = this.env(g, t, horn ? 0.07 : 0.035, (horn ? 0.15 : 0.17) * vel, 0.15, 0.75, dur, 0.22);
        const lp = this.filter('lowpass', 600, horn ? 0.6 : 1.2);
        const top = horn ? 1500 + vel * 900 : 2600 + vel * 1800;
        lp.frequency.setValueAtTime(400, t);
        lp.frequency.exponentialRampToValueAtTime(top, t + (horn ? 0.12 : 0.06));
        lp.frequency.exponentialRampToValueAtTime(top * 0.6, t + 0.4);
        lp.connect(g);
        this.osc('sawtooth', f, t, end, -4).connect(lp);
        this.osc('sawtooth', f, t, end, 5).connect(lp);
        if (horn) this.osc('triangle', f, t, end).connect(lp);
        break;
      }
      case 'flute': {
        const end = this.env(g, t, 0.06, 0.16 * vel, 0.1, 0.8, dur, 0.18);
        const o1 = this.osc('sine', f, t, end);
        const lfo = this.osc('sine', 5.4, t + 0.25, end);
        const lg = ctx.createGain();
        lg.gain.value = f * 0.006;
        lfo.connect(lg).connect(o1.frequency);
        o1.connect(g);
        const o2 = this.osc('triangle', f * 2, t, end);
        const g2 = ctx.createGain();
        g2.gain.value = 0.12;
        o2.connect(g2).connect(g);
        const n = this.noise(t, end);
        const bp = this.filter('bandpass', f * 2, 2);
        const ng = ctx.createGain();
        ng.gain.value = 0.05;
        n.connect(bp).connect(ng).connect(g);
        break;
      }
      case 'harp': {
        const dec = Math.min(2.2, 0.8 + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        const lp = this.filter('lowpass', 3200, 0.5);
        lp.frequency.setValueAtTime(5000, t);
        lp.frequency.exponentialRampToValueAtTime(900, t + dec);
        lp.connect(g);
        this.osc('triangle', f, t, t + dec + 0.05).connect(lp);
        const o2 = this.osc('sine', f * 2, t, t + dec + 0.05);
        const g2 = ctx.createGain();
        g2.gain.value = 0.3;
        o2.connect(g2).connect(lp);
        break;
      }
      case 'piano': {
        const dec = Math.min(3, 1.2 + dur * 0.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.3);
        g.gain.setValueAtTime(0.06 * vel, t + Math.max(0.3, dur));
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.3, dur) + Math.min(dec, 1.2));
        const end = t + Math.max(0.3, dur) + 1.3;
        const lp = this.filter('lowpass', 2600 + vel * 2000, 0.4);
        lp.connect(g);
        this.osc('triangle', f, t, end).connect(lp);
        for (const [m, a] of [
          [2, 0.35],
          [3, 0.12],
          [4.01, 0.06],
        ] as [number, number][]) {
          const oo = this.osc('sine', f * m, t, end);
          const gg = ctx.createGain();
          gg.gain.value = a;
          oo.connect(gg).connect(lp);
        }
        break;
      }
      case 'organ': {
        const end = this.env(g, t, 0.03, 0.09 * vel, 0.05, 1, dur, 0.25);
        for (const [m, a] of [
          [0.5, 0.6],
          [1, 1],
          [2, 0.7],
          [3, 0.35],
          [4, 0.4],
          [6, 0.15],
        ] as [number, number][]) {
          const oo = this.osc('sine', f * m, t, end);
          const gg = ctx.createGain();
          gg.gain.value = a;
          oo.connect(gg).connect(g);
        }
        break;
      }
      case 'bass': {
        const end = this.env(g, t, 0.01, 0.26 * vel, 0.12, 0.7, dur, 0.12);
        const lp = this.filter('lowpass', 520, 1.2);
        lp.connect(g);
        this.osc('sawtooth', f, t, end).connect(lp);
        this.osc('sine', f / 2, t, end).connect(g);
        break;
      }
      case 'bell': {
        const dec = 2.4;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        const car = this.osc('sine', f, t, t + dec);
        const mod = this.osc('sine', f * 3.5, t, t + dec);
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 1.2);
        mod.connect(mg).connect(car.frequency);
        car.connect(g);
        break;
      }
      case 'synth': {
        const end = this.env(g, t, 0.005, 0.1 * vel, 0.08, 0.5, dur, 0.08);
        const lp = this.filter('lowpass', 1200, 3);
        lp.frequency.setValueAtTime(2400, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
        lp.connect(g);
        this.osc('square', f, t, end).connect(lp);
        break;
      }
      case 'timpani': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5 * vel, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        const o1 = this.osc('sine', f * 1.6, t, t + 1.2);
        o1.frequency.exponentialRampToValueAtTime(f, t + 0.06);
        o1.connect(g);
        const n = this.noise(t, t + 0.08);
        const lp = this.filter('lowpass', 900);
        const ng = ctx.createGain();
        ng.gain.value = 0.4;
        n.connect(lp).connect(ng).connect(g);
        break;
      }
      case 'kick': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.6 * vel, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        const o1 = this.osc('sine', 130, t, t + 0.35);
        o1.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        o1.connect(g);
        break;
      }
      case 'snare': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        const n = this.noise(t, t + 0.2);
        const hp = this.filter('highpass', 1400);
        n.connect(hp).connect(g);
        const body = this.osc('triangle', 190, t, t + 0.1);
        body.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        const bg = ctx.createGain();
        bg.gain.value = 0.6;
        body.connect(bg).connect(g);
        break;
      }
      case 'hat': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + dur * 0.1);
        const n = this.noise(t, t + 0.12);
        const hp = this.filter('highpass', 7500);
        n.connect(hp).connect(g);
        break;
      }
      case 'tom': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.4 * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        const o1 = this.osc('sine', f * 1.4, t, t + 0.5);
        o1.frequency.exponentialRampToValueAtTime(f, t + 0.1);
        o1.connect(g);
        break;
      }
      case 'cymbal': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.12 * vel, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        const n = this.noise(t, t + 2.3);
        const hp = this.filter('highpass', 4500);
        const bp = this.filter('peaking', 8000, 1);
        bp.gain.value = 6;
        n.connect(hp).connect(bp).connect(g);
        break;
      }
    }
  }

  /* ================================================================ */
  /* 音效                                                              */
  /* ================================================================ */

  private offline = false;

  /** 离线渲染一个音效（测试用） */
  async renderSfxOffline(id: SfxId, seconds = 2, sampleRate = 22050): Promise<AudioBuffer> {
    const saved = { ctx: this.ctx, master: this.master, musicBus: this.musicBus, sfxBus: this.sfxBus, reverb: this.reverb, reverbIn: this.reverbIn, noiseBuf: this.noiseBuf };
    const off = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
    this.build(off);
    this.offline = true;
    this.lastSfx.clear();
    try {
      this.sfx(id);
    } finally {
      this.offline = false;
    }
    const buf = await off.startRendering();
    Object.assign(this, saved);
    return buf;
  }

  sfx(id: SfxId, opts: { volume?: number; pan?: number; pitch?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || (ctx.state !== 'running' && !this.offline)) return;
    const now = ctx.currentTime;
    // 同一音效的过密触发合并
    const last = this.lastSfx.get(id) ?? -1;
    if (now - last < (id === 'text' ? 0.05 : 0.025)) return;
    this.lastSfx.set(id, now);
    const v = opts.volume ?? 1;
    const p = opts.pitch ?? 1;
    const bus = ctx.createGain();
    bus.gain.value = v;
    const dest = this.out(this.sfxBus, opts.pan ?? 0);
    bus.connect(dest);
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    bus.connect(wet).connect(this.reverbIn);
    const t = now + 0.005;
    const N = (inst: InstrumentId, dt: number, d: number, m: number, vel = 0.8) => this.note(inst, t + dt, d, m + 12 * Math.log2(p), vel, bus);
    const blip = (f0: number, f1: number, d: number, type: OscillatorType = 'square', vol = 0.12, dt = 0) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(vol, t + dt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
      const o = this.osc(type, f0 * p, t + dt, t + dt + d + 0.02);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), t + dt + d);
      o.connect(g).connect(bus);
    };
    const whoosh = (f0: number, f1: number, d: number, vol = 0.3, dt = 0, q = 1.2) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(vol, t + dt + d * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
      const n = this.noise(t + dt, t + dt + d + 0.05);
      const bp = this.filter('bandpass', f0 * p, q);
      bp.frequency.exponentialRampToValueAtTime(f1 * p, t + dt + d);
      n.connect(bp).connect(g).connect(bus);
    };
    const thud = (f: number, d: number, vol = 0.5, dt = 0) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(vol, t + dt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
      const o = this.osc('sine', f * 2.2 * p, t + dt, t + dt + d + 0.02);
      o.frequency.exponentialRampToValueAtTime(f * p, t + dt + 0.06);
      o.connect(g).connect(bus);
    };
    switch (id) {
      case 'cursor':
        blip(1800, 1600, 0.03, 'sine', 0.05);
        break;
      case 'select':
        blip(880, 880, 0.06, 'triangle', 0.12);
        blip(1320, 1320, 0.09, 'triangle', 0.12, 0.05);
        break;
      case 'cancel':
        blip(700, 420, 0.1, 'triangle', 0.12);
        break;
      case 'error':
        blip(160, 140, 0.16, 'square', 0.08);
        blip(150, 130, 0.16, 'sawtooth', 0.05);
        break;
      case 'text':
        blip(1100 + Math.random() * 120, 1000, 0.025, 'sine', 0.03);
        break;
      case 'step':
        whoosh(900, 500, 0.06, 0.12, 0, 0.8);
        break;
      case 'gallop':
        for (let i = 0; i < 4; i++) thud(90 + (i % 2) * 20, 0.1, 0.25, i * 0.11);
        break;
      case 'wing':
        whoosh(400, 1400, 0.22, 0.25);
        whoosh(500, 1600, 0.22, 0.2, 0.26);
        break;
      case 'slash':
        whoosh(2500, 6000, 0.14, 0.45, 0, 1.5);
        break;
      case 'heavy':
        whoosh(1200, 3000, 0.2, 0.4);
        thud(60, 0.35, 0.7, 0.05);
        break;
      case 'pierce':
        whoosh(3000, 8000, 0.09, 0.35, 0, 3);
        blip(900, 1800, 0.05, 'sawtooth', 0.06);
        break;
      case 'bow':
        blip(300, 220, 0.12, 'triangle', 0.18);
        whoosh(1800, 4000, 0.25, 0.22, 0.05, 2);
        break;
      case 'hit':
        thud(80, 0.2, 0.6);
        whoosh(1500, 600, 0.1, 0.25);
        break;
      case 'armor_hit':
        thud(90, 0.18, 0.5);
        N('bell', 0, 0.2, 86, 0.5);
        N('bell', 0.01, 0.2, 91, 0.35);
        whoosh(4000, 2500, 0.12, 0.2, 0, 4);
        break;
      case 'crit':
        thud(55, 0.4, 0.8);
        whoosh(3000, 9000, 0.25, 0.4, 0, 2);
        N('brass', 0.02, 0.25, 62, 0.9);
        N('brass', 0.02, 0.25, 69, 0.8);
        N('cymbal', 0, 0.5, 60, 0.9);
        break;
      case 'miss':
        whoosh(800, 3000, 0.25, 0.3, 0, 2);
        break;
      case 'fire':
        whoosh(300, 2500, 0.45, 0.5, 0, 0.6);
        for (let i = 0; i < 6; i++) whoosh(3000 + Math.random() * 3000, 2000, 0.05, 0.15, 0.1 + i * 0.06, 6);
        thud(70, 0.4, 0.4, 0.15);
        break;
      case 'ice':
        for (let i = 0; i < 5; i++) N('bell', i * 0.05, 0.3, 88 + ((i * 5) % 12), 0.5);
        whoosh(6000, 3000, 0.4, 0.2, 0, 3);
        break;
      case 'thunder':
        whoosh(5000, 300, 0.12, 0.7, 0, 0.5);
        thud(40, 1.2, 0.8, 0.05);
        whoosh(200, 100, 1.2, 0.4, 0.08, 0.5);
        break;
      case 'holy':
        for (const m of [74, 78, 81, 86]) N('choir', 0, 0.8, m, 0.5);
        N('bell', 0.05, 0.5, 93, 0.6);
        N('bell', 0.2, 0.5, 98, 0.5);
        break;
      case 'dark':
        N('lowstrings', 0, 0.8, 38, 0.8);
        N('lowstrings', 0, 0.8, 39, 0.6);
        whoosh(300, 120, 0.9, 0.4, 0, 1);
        break;
      case 'heal':
        for (let i = 0; i < 5; i++) N('bell', i * 0.07, 0.3, [79, 83, 86, 91, 95][i], 0.4);
        N('pad', 0, 0.6, 67, 0.4);
        break;
      case 'buff':
        for (let i = 0; i < 4; i++) N('harp', i * 0.06, 0.2, [67, 71, 74, 79][i], 0.7);
        break;
      case 'death':
        blip(400, 60, 0.6, 'sawtooth', 0.08);
        whoosh(1200, 200, 0.7, 0.3);
        break;
      case 'levelup':
        for (let i = 0; i < 5; i++) N('brass', i * 0.09, 0.18, [62, 66, 69, 74, 78][i], 0.7);
        N('brass', 0.5, 0.6, 74, 0.8);
        N('brass', 0.5, 0.6, 78, 0.7);
        N('bell', 0.5, 0.6, 86, 0.6);
        break;
      case 'promote':
        N('timpani', 0, 0.5, 38, 0.9);
        for (let i = 0; i < 6; i++) N('brass', 0.1 + i * 0.1, 0.2, [62, 66, 69, 74, 78, 81][i], 0.8);
        for (const m of [62, 69, 74, 78]) N('brass', 0.75, 1.2, m, 0.8);
        for (const m of [74, 78, 81]) N('choir', 0.75, 1.2, m, 0.6);
        N('cymbal', 0.75, 1, 60, 0.8);
        break;
      case 'chest':
        N('harp', 0, 0.2, 72, 0.7);
        N('harp', 0.08, 0.2, 76, 0.7);
        N('harp', 0.16, 0.2, 79, 0.7);
        N('bell', 0.24, 0.5, 84, 0.6);
        break;
      case 'gold':
      case 'buy':
        N('bell', 0, 0.15, 88, 0.5);
        N('bell', 0.07, 0.25, 93, 0.5);
        break;
      case 'item':
        N('bell', 0, 0.2, 84, 0.5);
        N('bell', 0.1, 0.3, 91, 0.5);
        break;
      case 'phase':
        N('timpani', 0, 0.4, 38, 0.8);
        N('horn', 0.02, 0.5, 62, 0.6);
        N('horn', 0.02, 0.5, 69, 0.5);
        break;
      case 'roar': {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        const o = this.osc('sawtooth', 90 * p, t, t + 1.7);
        o.frequency.linearRampToValueAtTime(60 * p, t + 1.5);
        const lfo = this.osc('sine', 28, t, t + 1.7);
        const lg = ctx.createGain();
        lg.gain.value = 25;
        lfo.connect(lg).connect(o.frequency);
        const lp = this.filter('lowpass', 900, 2);
        o.connect(lp).connect(g).connect(bus);
        whoosh(600, 200, 1.5, 0.3, 0, 0.8);
        break;
      }
      case 'explosion':
        thud(38, 1.1, 0.9);
        whoosh(1800, 120, 1, 0.6, 0, 0.5);
        break;
      case 'door':
        blip(120, 90, 0.4, 'sawtooth', 0.05);
        thud(60, 0.4, 0.6, 0.35);
        break;
      case 'recruit':
        for (const [i, m] of [62, 66, 69, 74].entries()) N('harp', i * 0.08, 0.3, m, 0.7);
        for (const m of [62, 66, 69]) N('strings', 0.32, 0.9, m, 0.6);
        break;
    }
    setTimeout(() => bus.disconnect(), 4000);
  }
}

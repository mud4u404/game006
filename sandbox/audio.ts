import { SynthAudio } from '@/audio/synth';
import { SONGS } from '@/audio/songs';
import type { MusicId } from '@/audio/contracts';

const q = new URLSearchParams(location.search);
const secs = Number(q.get('s') ?? 14);
const only = q.get('id');
const g = document.getElementById('g')!;
const out: Record<string, unknown> = {};

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
}

async function run() {
  const synth = new SynthAudio();
  for (const id of Object.keys(SONGS) as MusicId[]) {
    if (only && id !== only) continue;
    const buf = await synth.renderOffline(id, secs);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    let peak = 0;
    let sum = 0;
    let clip = 0;
    for (let i = 0; i < L.length; i++) {
      const v = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      peak = Math.max(peak, v);
      sum += (L[i] * L[i] + R[i] * R[i]) / 2;
      if (v > 0.99) clip++;
    }
    const rms = Math.sqrt(sum / L.length);
    out[id] = { peak: +peak.toFixed(3), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), clip };
    // 频谱图
    const N = 1024;
    const hop = 512;
    const cols = Math.floor((L.length - N) / hop);
    const rows = 160;
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(cols, rows);
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let x = 0; x < cols; x++) {
      for (let i = 0; i < N; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
        re[i] = ((L[x * hop + i] + R[x * hop + i]) / 2) * w;
        im[i] = 0;
      }
      fft(re, im);
      for (let y = 0; y < rows; y++) {
        // 对数频率轴：40Hz ~ 8kHz
        const f = 40 * Math.pow(8000 / 40, y / rows);
        const bin = Math.min(N / 2 - 1, Math.round((f / buf.sampleRate) * N));
        const mag = Math.hypot(re[bin], im[bin]);
        const db = 20 * Math.log10(mag + 1e-6);
        const v = Math.max(0, Math.min(255, (db + 40) * 4));
        const k = ((rows - 1 - y) * cols + x) * 4;
        img.data[k] = v;
        img.data[k + 1] = v * 0.7;
        img.data[k + 2] = 255 - v * 0.6;
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const row = document.createElement('div');
    row.className = 'row';
    const lbl = document.createElement('div');
    lbl.style.width = '260px';
    lbl.textContent = `${id}  peak ${(out[id] as { peak: number }).peak}  rms ${(out[id] as { rmsDb: number }).rmsDb}dB  clip ${clip}`;
    row.append(lbl, c);
    g.appendChild(row);
  }
  (window as unknown as { __out: unknown; __ready: boolean }).__out = out;
  (window as unknown as { __ready: boolean }).__ready = true;
}
void run();

// ?sfx=1：逐个渲染全部音效，报告峰值
if (q.get('sfx')) {
  (async () => {
    const ids = ['cursor', 'select', 'cancel', 'error', 'step', 'gallop', 'wing', 'slash', 'heavy', 'pierce', 'bow', 'hit', 'armor_hit', 'crit', 'miss', 'fire', 'ice', 'thunder', 'holy', 'dark', 'heal', 'buff', 'death', 'levelup', 'promote', 'chest', 'gold', 'item', 'buy', 'phase', 'text', 'roar', 'explosion', 'door', 'recruit'] as const;
    const synth = new SynthAudio();
    const res: Record<string, number> = {};
    for (const id of ids) {
      const b = await synth.renderSfxOffline(id, 2.5);
      const d = b.getChannelData(0);
      let pk = 0;
      for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
      res[id] = +pk.toFixed(3);
    }
    (window as unknown as { __sfx: unknown }).__sfx = res;
  })();
}

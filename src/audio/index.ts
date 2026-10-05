/**
 * 音频引擎入口（完整实现见后续提交；此处先提供安全的空实现，保证在 Node 测试环境中可导入）
 */
import type { AudioEngine, MusicId, SfxId } from './contracts';

class SilentAudio implements AudioEngine {
  currentMusic: MusicId | null = null;
  private vol = { master: 0.8, music: 0.7, sfx: 0.8 };
  unlock() {}
  playMusic(id: MusicId) {
    this.currentMusic = id;
  }
  stopMusic() {
    this.currentMusic = null;
  }
  sfx(_id: SfxId) {}
  setVolume(ch: 'master' | 'music' | 'sfx', v: number) {
    this.vol[ch] = v;
  }
  getVolume(ch: 'master' | 'music' | 'sfx') {
    return this.vol[ch];
  }
}

export let audio: AudioEngine = new SilentAudio();

/** 由真正的合成器实现替换（浏览器环境下） */
export function setAudioEngine(a: AudioEngine) {
  audio = a;
}

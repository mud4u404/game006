/**
 * 设置面板：画质 / 分辨率（最高 4K）/ 战斗演出 / 文字速度 / 音量 / 操作选项
 */
import { audio } from '@/audio';
import { saveSettings, type Settings } from '@/core/settings';
import type { Engine } from '@/render/engine';
import { h } from './dom';

type Opt<T> = { v: T; label: string };

export function openSettings(parent: HTMLElement, settings: Settings, engine: Engine): Promise<void> {
  return new Promise((resolve) => {
    const back = h('div.modal-backdrop.interactive');
    const box = h('div.panel.modal.settings');
    back.appendChild(box);
    box.appendChild(h('h2.title-serif', null, '设置'));
    const grid = h('div.settings-grid');
    box.appendChild(grid);

    const apply = () => {
      engine.setSettings({ quality: settings.quality, resolution: settings.resolution });
      audio.setVolume('master', settings.master);
      audio.setVolume('music', settings.music);
      audio.setVolume('sfx', settings.sfx);
      saveSettings(settings);
    };

    const seg = <K extends keyof Settings>(label: string, key: K, opts: Opt<Settings[K]>[], desc?: string) => {
      const row = h('div.seg');
      const btns = opts.map((o) => {
        const b = h(`button.btn.small${settings[key] === o.v ? '.on' : ''}`, {
          on: {
            click: () => {
              settings[key] = o.v;
              for (const x of btns) x.classList.remove('on');
              b.classList.add('on');
              audio.sfx('select');
              apply();
            },
          },
        }, o.label);
        row.appendChild(b);
        return b;
      });
      grid.append(h('div.slabel', null, label, desc ? h('small', null, desc) : null), row);
    };
    const slider = (label: string, key: 'master' | 'music' | 'sfx') => {
      const input = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(settings[key] * 100)) }) as HTMLInputElement;
      const val = h('span.num', null, `${Math.round(settings[key] * 100)}`);
      input.addEventListener('input', () => {
        settings[key] = Number(input.value) / 100;
        val.textContent = input.value;
        apply();
      });
      input.addEventListener('change', () => audio.sfx('cursor'));
      grid.append(h('div.slabel', null, label), h('div.seg', null, input, val));
    };

    seg('画质', 'quality', [
      { v: 'low', label: '低' },
      { v: 'medium', label: '中' },
      { v: 'high', label: '高' },
      { v: 'ultra', label: '极致' },
    ]);
    seg('渲染分辨率', 'resolution', [
      { v: 'auto', label: '自动' },
      { v: 'native', label: '原生' },
      { v: '1080p', label: '1080p' },
      { v: '1440p', label: '1440p' },
      { v: '2160p', label: '4K' },
    ], '4K 为超采样渲染');
    seg('战斗演出', 'battleAnim', [
      { v: 'full', label: '完整' },
      { v: 'short', label: '简略' },
      { v: 'off', label: '关闭' },
    ]);
    seg('文字速度', 'textSpeed', [
      { v: 25, label: '慢' },
      { v: 45, label: '中' },
      { v: 90, label: '快' },
      { v: 0, label: '瞬间' },
    ]);
    seg('敌方行动速度', 'enemySpeed', [
      { v: 1, label: '×1' },
      { v: 1.5, label: '×1.5' },
      { v: 2, label: '×2' },
      { v: 3, label: '×3' },
    ]);
    seg('自动结束回合', 'autoEnd', [
      { v: true, label: '开' },
      { v: false, label: '关' },
    ]);
    seg('单位血条', 'hpBars', [
      { v: true, label: '显示' },
      { v: false, label: '隐藏' },
    ]);
    seg('地图网格', 'grid', [
      { v: true, label: '显示' },
      { v: false, label: '隐藏' },
    ]);
    slider('主音量', 'master');
    slider('音乐', 'music');
    slider('音效', 'sfx');

    const close = () => {
      window.removeEventListener('keydown', onKey, true);
      back.remove();
      audio.sfx('cancel');
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    box.appendChild(h('div.modal-buttons', null, h('button.btn', { on: { click: close } }, '完成')));
    parent.appendChild(back);
  });
}

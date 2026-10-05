/**
 * 《烬龙誓约》入口
 */
import './ui/ui.css';
import { loadSettings } from '@/core/settings';
import { newGame } from '@/game/state';
import { Engine } from '@/render/engine';
import { audio } from '@/audio';
import { h } from '@/ui/dom';
import { DialoguePlayer } from '@/ui/dialogue';
import { openSettings } from '@/ui/settingsPanel';
import type { App } from '@/scenes/app';
import { runTitle } from '@/scenes/title';
import { runGame } from '@/scenes/flow';
import { devState } from '@/scenes/dev';

const root = document.getElementById('app')!;
const settings = loadSettings();
const engine = new Engine(root, { quality: settings.quality, resolution: settings.resolution });
const ui = h('div');
ui.id = 'ui';
root.appendChild(ui);
audio.setVolume('master', settings.master);
audio.setVolume('music', settings.music);
audio.setVolume('sfx', settings.sfx);

/** 像素立绘按设备像素整数倍缩放 */
function updatePixelScale() {
  const dpr = window.devicePixelRatio || 1;
  const n = Math.max(2, Math.floor((window.innerHeight * dpr) / 230));
  document.documentElement.style.setProperty('--pp', `${n / dpr}px`);
}
updatePixelScale();
window.addEventListener('resize', updatePixelScale);

const app: App = {
  engine,
  ui,
  settings,
  state: newGame(),
  dialogue: new DialoguePlayer(ui, () => settings.textSpeed),
  openSettings: () => openSettings(ui, settings, engine),
};

// 首次交互时解锁音频
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

engine.start();

async function main() {
  const dev = devState();
  if (dev) {
    app.state = dev;
    await runGame(app);
  }
  for (;;) {
    const choice = await runTitle(app);
    app.state = choice.state;
    await runGame(app);
  }
}
void main();

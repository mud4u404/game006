/**
 * 场景共享的应用上下文
 */
import type { Engine } from '@/render/engine';
import type { Settings } from '@/core/settings';
import type { GameState } from '@/game/state';
import type { DialoguePlayer } from '@/ui/dialogue';

export interface App {
  engine: Engine;
  /** 界面根节点 */
  ui: HTMLElement;
  settings: Settings;
  state: GameState;
  dialogue: DialoguePlayer;
  /** 打开设置面板 */
  openSettings(): Promise<void>;
}

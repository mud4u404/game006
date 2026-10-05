/**
 * 对话播放器：立绘、名牌、打字机文本、剧情指令
 */
import { CHARACTERS, NPC_NAMES } from '@/data/characters';
import type { DialogueLine, SceneCommand, StoryLine } from '@/data/types';
import { audio } from '@/audio';
import { h, sleep } from './dom';
import { portraitHtml } from './portraits';

export interface Stage {
  /** 执行剧情指令（移动演员、镜头、特效等） */
  run(cmd: SceneCommand): Promise<void>;
}

export function speakerName(id: string): string {
  return CHARACTERS[id]?.name ?? NPC_NAMES[id] ?? id;
}

export function isCommand(l: StoryLine): l is SceneCommand {
  return (l as SceneCommand).cmd !== undefined;
}

export class DialoguePlayer {
  private root: HTMLElement;
  private parent: HTMLElement;
  private getSpeed: () => number;
  private skipAll = false;

  constructor(parent: HTMLElement, getTextSpeed: () => number) {
    this.parent = parent;
    this.getSpeed = getTextSpeed;
    this.root = h('div.dialogue-root');
  }

  async play(lines: StoryLine[], stage?: Stage): Promise<void> {
    this.skipAll = false;
    this.parent.appendChild(this.root);
    const slots: Record<'L' | 'R', { id: string; el: HTMLElement } | null> = { L: null, R: null };
    let lastSide: 'L' | 'R' = 'R';
    const box = h('div.dialogue.hidden');
    const panel = h('div.panel.box');
    const nameEl = h('div.speaker');
    const textEl = h('div.text');
    const next = h('div.next', null, '▼');
    const skip = h('button.btn.skip', { on: { click: (e) => { e.stopPropagation(); this.skipAll = true; advance?.(); } } }, '跳过 ▶▶');
    panel.append(nameEl, textEl, next);
    box.append(panel, skip);
    this.root.appendChild(box);

    let advance: (() => void) | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') advance?.();
      if (e.key === 'Escape') {
        this.skipAll = true;
        advance?.();
      }
    };
    const onClick = () => advance?.();
    window.addEventListener('keydown', onKey);
    box.addEventListener('click', onClick);

    const setPortrait = (side: 'L' | 'R', id: string | null, emotion: DialogueLine['e']) => {
      const cur = slots[side];
      if (!id) {
        cur?.el.remove();
        slots[side] = null;
        return;
      }
      if (cur && cur.id === id) {
        cur.el.innerHTML = portraitHtml(id, speakerName(id), emotion ?? 'normal', side === 'R');
        return;
      }
      cur?.el.remove();
      const el = h(`div.dialogue-portrait.${side === 'L' ? 'left' : 'right'}.enter`, { html: portraitHtml(id, speakerName(id), emotion ?? 'normal', side === 'R') });
      this.root.insertBefore(el, box);
      requestAnimationFrame(() => el.classList.remove('enter'));
      slots[side] = { id, el };
    };

    try {
      for (const line of lines) {
        if (this.skipAll) {
          // 跳过时仍然执行会改变状态的指令
          if (isCommand(line) && stage && ['spawn', 'remove', 'tile', 'move', 'face'].includes(line.cmd)) await stage.run({ ...line, wait: false } as SceneCommand);
          continue;
        }
        if (isCommand(line)) {
          box.classList.add('hidden');
          if (line.cmd === 'caption') {
            const c = h('div.caption-card', null, h('div.c1', null, line.text), line.sub ? h('div.c2', null, line.sub) : null);
            this.root.appendChild(c);
            await sleep(2600);
            c.remove();
          } else if (line.cmd === 'wait') await sleep(line.ms);
          else if (line.cmd === 'music') audio.playMusic(line.id);
          else if (line.cmd === 'sfx') audio.sfx(line.id);
          else if (stage) await stage.run(line);
          continue;
        }
        // 对话
        box.classList.remove('hidden');
        const narr = !line.s;
        box.classList.toggle('narration', narr);
        if (narr) {
          nameEl.classList.add('hidden');
          for (const s of ['L', 'R'] as const) slots[s]?.el.classList.add('dim');
        } else {
          nameEl.classList.remove('hidden');
          nameEl.textContent = line.n ?? speakerName(line.s);
          let side: 'L' | 'R';
          if (line.pos) side = line.pos;
          else if (slots.L?.id === line.s) side = 'L';
          else if (slots.R?.id === line.s) side = 'R';
          else side = lastSide === 'L' ? 'R' : 'L';
          if (!slots[side] && !line.pos && side === 'R' && !slots.L) side = 'L';
          setPortrait(side, line.s, line.e);
          lastSide = side;
          box.classList.toggle('right', side === 'R');
          slots[side]?.el.classList.remove('dim');
          const other = side === 'L' ? 'R' : 'L';
          slots[other]?.el.classList.add('dim');
        }
        await this.type(textEl, line.t, next, (fn) => (advance = fn));
      }
    } finally {
      window.removeEventListener('keydown', onKey);
      box.removeEventListener('click', onClick);
      this.root.remove();
      this.root.innerHTML = '';
    }
  }

  /** 打字机效果：第一次点击显示全部，第二次点击继续 */
  private type(el: HTMLElement, text: string, next: HTMLElement, setAdvance: (fn: () => void) => void): Promise<void> {
    return new Promise((resolve) => {
      const speed = this.getSpeed();
      let i = 0;
      let done = false;
      next.style.visibility = 'hidden';
      el.textContent = '';
      let timer = 0;
      const finish = () => {
        done = true;
        clearInterval(timer);
        el.textContent = text;
        next.style.visibility = 'visible';
      };
      setAdvance(() => {
        if (this.skipAll) {
          finish();
          resolve();
          return;
        }
        if (!done) finish();
        else resolve();
      });
      if (speed <= 0) {
        finish();
        return;
      }
      timer = window.setInterval(() => {
        i += 1;
        el.textContent = text.slice(0, i);
        if (i % 3 === 0) audio.sfx('text', { volume: 0.25 });
        if (i >= text.length) finish();
      }, 1000 / speed);
    });
  }
}

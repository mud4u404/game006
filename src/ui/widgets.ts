/**
 * 通用界面组件：可键盘操作的竖排菜单、模态确认框、提示
 */
import { audio } from '@/audio';
import { h } from './dom';

export interface ListItem {
  id: string;
  label: string;
  sub?: string;
  right?: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * 竖排菜单：方向键/鼠标选择，回车确认，Esc 取消（cancellable 时返回 null）
 * onFocus 在焦点变化时回调（用于右侧显示详情）
 */
export function menuList(
  parent: HTMLElement,
  items: ListItem[],
  opts: { cancellable?: boolean; className?: string; onFocus?: (id: string) => void; start?: number } = {},
): { el: HTMLElement; result: Promise<string | null>; close: () => void } {
  const el = h(`div.vmenu.interactive${opts.className ? '.' + opts.className : ''}`);
  let index = Math.max(0, Math.min(items.length - 1, opts.start ?? items.findIndex((i) => !i.disabled)));
  let resolveFn: (v: string | null) => void = () => {};
  const result = new Promise<string | null>((r) => (resolveFn = r));
  const rows = items.map((it, i) => {
    const row = h(
      `div.vitem${it.disabled ? '.disabled' : ''}`,
      {
        on: {
          mouseenter: () => focus(i),
          click: (e) => {
            e.stopPropagation();
            focus(i);
            choose();
          },
        },
        title: it.hint,
      },
      h('span.vlabel', null, it.label),
      it.sub ? h('span.vsub', null, it.sub) : null,
      it.right ? h('span.vright', null, it.right) : null,
    );
    el.appendChild(row);
    return row;
  });
  const focus = (i: number) => {
    if (i === index && rows[i].classList.contains('focus')) return;
    rows[index]?.classList.remove('focus');
    index = i;
    rows[index]?.classList.add('focus');
    rows[index]?.scrollIntoView({ block: 'nearest' });
    opts.onFocus?.(items[index].id);
  };
  const choose = () => {
    const it = items[index];
    if (!it || it.disabled) {
      audio.sfx('error');
      return;
    }
    audio.sfx('select');
    finish(it.id);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 's') {
      focus((index + 1) % items.length);
      audio.sfx('cursor');
    } else if (e.key === 'ArrowUp' || e.key === 'w') {
      focus((index - 1 + items.length) % items.length);
      audio.sfx('cursor');
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') choose();
    else if ((e.key === 'Escape' || e.key === 'x') && opts.cancellable) {
      audio.sfx('cancel');
      finish(null);
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };
  let done = false;
  const finish = (v: string | null) => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    resolveFn(v);
  };
  window.addEventListener('keydown', onKey, true);
  parent.appendChild(el);
  if (items.length) {
    rows[index]?.classList.add('focus');
    opts.onFocus?.(items[index].id);
  }
  return {
    el,
    result,
    close: () => {
      finish(null);
      el.remove();
    },
  };
}

/** 模态对话框：返回所选按钮 id；Esc 返回最后一个按钮 */
export async function modal(parent: HTMLElement, title: string, body: string | HTMLElement, buttons: { id: string; label: string }[]): Promise<string> {
  const back = h('div.modal-backdrop.interactive');
  const box = h('div.panel.modal', null, h('h2.title-serif', null, title), typeof body === 'string' ? h('p.modal-body', null, body) : body);
  back.appendChild(box);
  parent.appendChild(back);
  const holder = h('div.modal-buttons');
  box.appendChild(holder);
  const m = menuList(
    holder,
    buttons.map((b) => ({ id: b.id, label: b.label })),
    { cancellable: true, className: 'horizontal' },
  );
  const r = await m.result;
  back.remove();
  return r ?? buttons[buttons.length - 1].id;
}

/** 浮动提示 */
export function toast(parent: HTMLElement, text: string, ms = 2200) {
  let stack = parent.querySelector('.toast-stack.global') as HTMLElement | null;
  if (!stack) {
    stack = h('div.toast-stack.global');
    parent.appendChild(stack);
  }
  const t = h('div.toast', null, text);
  stack.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

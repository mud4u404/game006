/**
 * 极简 DOM 工具
 */

type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & {
  class?: string;
  style?: Partial<CSSStyleDeclaration> | string;
  on?: Record<string, (e: Event) => void>;
  html?: string;
};

/** 创建元素：h('div.panel.plain', { ... }, child1, child2) */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | string, props: Props | null = null, ...children: Child[]): HTMLElement {
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') el.className = [el.className, v as string].filter(Boolean).join(' ');
      else if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k === 'on') {
        for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      } else if (k === 'html') el.innerHTML = v as string;
      else if (k.startsWith('data-') || k === 'title') el.setAttribute(k, String(v));
      else (el as unknown as Record<string, unknown>)[k] = v;
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function bar(ratio: number, kind = ''): HTMLElement {
  const b = h(`div.bar${kind ? '.' + kind : ''}`);
  const i = h('i');
  i.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  b.appendChild(i);
  return b;
}

export function setBar(b: HTMLElement, ratio: number) {
  const i = b.querySelector('i') as HTMLElement | null;
  if (i) i.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 等待一次点击 / 确认键 */
export function waitForConfirm(target: HTMLElement | Document = document): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      target.removeEventListener('click', onClick as EventListener);
      window.removeEventListener('keydown', onKey);
      resolve();
    };
    const onClick = () => done();
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'z', 'Z', 'Escape'].includes(e.key)) done();
    };
    target.addEventListener('click', onClick as EventListener);
    window.addEventListener('keydown', onKey);
  });
}

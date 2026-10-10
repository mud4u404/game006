/** 复审回归：用真实剧情界面的按钮、灰态和继续入口核对本次凭据。 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveStore } from '../src/core/save';

const ui = vi.hoisted(() => ({ handlers: {} as Record<string, (v: string) => void>, hooks: {}, toast: vi.fn() }));
vi.mock('../src/ui/shell', () => ({
  hooks: ui.hooks, registerHandlers: (map: typeof ui.handlers) => Object.assign(ui.handlers, map),
  render: vi.fn(), swapped: vi.fn(), tooSoon: () => false, toast: ui.toast, afterOutcome: vi.fn()
}));
vi.mock('../src/ui/chuguan', () => ({ welcomeBack: () => false }));
vi.mock('../src/ui/views/account-link', () => ({ titleAccountHTML: () => '' }));

class MemStore implements SaveStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
const layer = { hidden: true, innerHTML: '' };
const box = { scrollTop: 0, querySelector: () => null };

beforeEach(() => {
  vi.resetModules();
  ui.toast.mockClear();
  layer.hidden = true; layer.innerHTML = '';
  vi.stubGlobal('document', { querySelector: (selector: string) => selector.endsWith('.story-l') ? box : layer });
});
afterEach(async () => {
  (await import('../src/core/save')).useStore(null);
  (await import('../src/core/time')).setNowMs(() => Date.now());
  vi.unstubAllGlobals();
});

describe('剧情界面的本次奖励凭据', () => {
  it('江心起风第二次的选项仍可点；结果页上重交按钮、刷新、七天后重遇都处理正确', async () => {
    // resetModules 仅模拟界面刷新；共享当前存档和真引擎，避免把页面内的 cur 带到下一次。
    let { openStory } = await import('../src/ui/story');
    // 重新导入模块后状态实例也重新装载，用当前实例的接口测试真实界面。
    let state = await import('../src/core/state');
    let storage = await import('../src/core/save');
    let clock = await import('../src/core/time');
    const mem = new MemStore(); storage.useStore(mem);
    clock.setNowMs(() => 1_000_000_000_000); state.setState(state.skipToYangzhou());
    const lilian = state.S.lilian;
    openStory('ly_jiang_feng');
    expect(layer.innerHTML).toContain('data-act="stPick:0"');
    const started = state.S.storyAt!.started;
    const raw = storage.readSave().state!;
    vi.resetModules();
    ({ openStory } = await import('../src/ui/story'));
    state = await import('../src/core/state'); storage = await import('../src/core/save'); clock = await import('../src/core/time');
    storage.useStore(mem); clock.setNowMs(() => 1_000_000_000_000); state.setState(raw);
    ui.handlers.tContinue('');
    expect(state.S.storyAt!.started).toBe(started);
    ui.handlers.stPick('0');
    expect(state.S.lilian).toBe(lilian + 30);
    ui.handlers.stPick('0'); expect(state.S.lilian).toBe(lilian + 30);
    expect(storage.readSave().state?.storyAt).toBeUndefined();
    ui.handlers.stNext('');
    clock.advanceDays(state.S, 7);
    openStory('ly_jiang_feng');
    expect(layer.innerHTML).toContain('data-act="stPick:0"');
    expect(layer.innerHTML).not.toContain('这件事已经结算过了');
    expect(state.S.storyAt!.started).not.toBe(started);
    ui.handlers.stPick('0'); expect(state.S.lilian).toBe(lilian + 60);
    ui.handlers.stNext('');
    storage.useStore(null); clock.setNowMs(() => Date.now());
  });

  it('付钱的剧情选项，在结果页重复提交也只付一次、领一次', async () => {
    const { openStory } = await import('../src/ui/story');
    const state = await import('../src/core/state');
    const storage = await import('../src/core/save');
    const clock = await import('../src/core/time');
    storage.useStore(new MemStore()); clock.setNowMs(() => 1_000_000_000_000);
    state.setState(state.skipToYangzhou()); state.S.silver = 100;
    const lilian = state.S.lilian;
    openStory('ly_yz_suanming');
    ui.handlers.stPick('0'); ui.handlers.stPick('0');
    expect(state.S.silver).toBe(80); expect(state.S.lilian).toBe(lilian + 20);
    ui.handlers.stNext('');
    clock.advanceDays(state.S, 7); openStory('ly_yz_suanming'); ui.handlers.stPick('0');
    expect(state.S.silver).toBe(60); expect(state.S.lilian).toBe(lilian + 40);
    ui.handlers.stNext('');
    storage.useStore(null); clock.setNowMs(() => Date.now());
  });
});

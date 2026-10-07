/** 引擎向界面发消息用的极简事件总线，避免引擎反向依赖界面模块 */
type Handler = (payload: string) => void;
const handlers: Record<string, Handler[]> = {};

export function on(event: 'toast', fn: Handler): void {
  (handlers[event] ||= []).push(fn);
}

export function emit(event: 'toast', payload: string): void {
  (handlers[event] || []).forEach(fn => fn(payload));
}

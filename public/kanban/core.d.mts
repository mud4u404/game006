// core.mjs 的类型声明（只给测试和脚本用，页面不读）
export const REPO: string;
export const HOUR: number;
export function refsOf(text: string): number[];
export function slimIssue(x: unknown): { n: number; title: string; labels: string[]; created: number; dep: string; refs: number[] };
export function slimClosed(x: unknown): { n: number; refs: number[]; closed: true };
export function milestoneOf(
  jindu: unknown,
  openIssues: { n: number; refs?: number[]; closed?: boolean }[],
  closedIssues: { n: number; refs?: number[]; closed?: boolean }[],
): { name: string; upto: number; done: number; total: number; remaining: { id: number; title: string; open: number[]; noIssue: boolean }[] };
export type YaoqiuLink = { n: number; kind: string; state: string; label: string; cls: string; done: boolean };
export function yaoqiuLink(n: number, data: unknown, checks?: unknown): YaoqiuLink;
export function yaoqiuStatus(
  item: { status?: string; links?: number[] },
  data: unknown,
): { status: 'done' | 'doing' | 'todo'; auto: boolean; note: string; links: YaoqiuLink[] };
export function yaoqiuSummary(
  items: { status?: string; links?: number[] }[],
  data: unknown,
): { total: number; done: number; doing: number; todo: number; pct: number };

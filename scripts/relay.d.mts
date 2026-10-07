export interface GhItem {
  number: number;
  title: string;
  body?: string | null;
  labels?: (string | { name: string })[];
  pull_request?: unknown;
  html_url?: string;
}
export const WORK_LABELS: string[];
export const HOLD_LABEL: string;
export function deps(body: string | null | undefined): number[];
export function branchIssue(name: string): number | null;
export function pickWork<T extends GhItem>(items: T[], branches?: string[]): T | null;
export function describe(w: GhItem): string;

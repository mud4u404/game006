export interface KanbanAi {
  k: string; done48: number; doing: number; waiting: number; none: boolean; late: boolean; last: number;
  task: string; pulls: number[]; claimed: string[]; issues: number[];
}
export interface KanbanMilestone {
  name: string; upto: number; done: number; total: number;
  remaining: { id: number; title: string; open: number[]; noIssue: boolean }[];
}
export interface KanbanData {
  generatedAt: string;
  repo: string;
  t: number;
  issues: { n: number; title: string; labels: string[]; created: number; dep: string; refs: number[] }[];
  pulls: { n: number; title: string; ref: string; sha: string; labels: string[]; updated: number; draft: boolean }[];
  closedFull: boolean;
  closedOldest: number;
  merged: { n: number; title: string; ref: string; at: number }[];
  pushes: { ref: string; t: number }[];
  evOldest: number;
  evFull: boolean;
  checks: Record<string, { check: string; smoke: string }>;
  derived: {
    merged24: number; merged24AtLeast: boolean; merged48: number; hourly: number[];
    ais: KanbanAi[];
    pool: { open: number[]; paused: number[]; other: number[] };
    milestone: KanbanMilestone | null;
  };
}
export function buildData(get: (path: string) => Promise<any>, now?: number): Promise<KanbanData>;
export function githubGetter(repo: string, token: string | undefined, fetchImpl?: typeof fetch): (path: string) => Promise<any>;
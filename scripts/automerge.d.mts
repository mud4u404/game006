export interface PrFile {
  status: string;
  deletions?: number;
  filename: string;
}
export function parseBranch(name: string): { tool: string; issue: number } | null;
export function allowedSection(body: string | null | undefined): string;
export function allowedFiles(body: string | null | undefined): Set<string>;
export function judgeFiles(files: PrFile[], allowed: Set<string>): { ok: boolean; bad: string[] };

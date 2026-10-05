/**
 * 章节列表（按顺序）
 */
import type { ChapterDef } from '../types';
import { ch00 } from './ch00';
import { ch01 } from './ch01';
import { ch02 } from './ch02';
import { ch03 } from './ch03';
import { ch04 } from './ch04';
import { ch05 } from './ch05';

export const CHAPTERS: ChapterDef[] = [ch00, ch01, ch02, ch03, ch04, ch05];

export function chapterById(id: string): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

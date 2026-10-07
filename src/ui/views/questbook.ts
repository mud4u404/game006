import { S } from '../../core/state';
import { questById, room } from '../../content';
import { minLabel } from '../../core/time';
import { pathMin } from '../../engine/world';
import { IC } from '../icons';
import { openSheet, render } from '../shell';

/**
 * 任务簿的纯函数部分：给定 quests 记录和 QUESTS 定义，分成「进行中」和「已完成」两组。
 * 为了测试，不直接读 S；调用方把 S.quests 传进来。
 */

export interface QuestRow {
  id: string;
  name: string;
  stage: number; // 当前阶段下标，0-based
  total: number; // 总共多少阶段
  title: string; // 当前阶段的标题
  to?: string;   // 当前阶段的目的地（可选）
  done: boolean;  // 是否已完成
}

/**
 * 筛选玩家已开始的所有任务，并按「进行中 / 已完成」分组。
 * @param playerQuests 玩家存档里的 quests 记录（来自 S.quests）
 * @param track        当前追踪的任务 id（来自 S.track）
 */
export function partitionQuests(
  playerQuests: Record<string, number>,
  track?: string
): { active: QuestRow[]; done: QuestRow[]; trackId: string } {
  const active: QuestRow[] = [];
  const done: QuestRow[] = [];

  for (const [id, stage] of Object.entries(playerQuests)) {
    const def = questById(id);
    if (!def) continue; // QUESTS 里没定义，跳过
    const total = def.stages.length;
    const lastIdx = Math.min(stage, total - 1);
    const last = def.stages[lastIdx];
    // 规则：当前阶段就是最后一个阶段、且最后一个阶段没有目的地，算已完成。
    const isDone = lastIdx === total - 1 && !last.to;
    const row: QuestRow = { id, name: def.name, stage: lastIdx, total, title: last.title, to: last.to, done: isDone };
    (isDone ? done : active).push(row);
  }

  active.sort((a, b) => a.stage - b.stage);
  done.sort((a, b) => a.stage - b.stage);

  return {
    active,
    done,
    trackId: (track && Object.hasOwn(playerQuests, track) && questById(track)) ? track : '',
  };
}

/** 任务簿弹层 HTML。纯 UI：读 S，产出字符串，不直接渲染。 */
export function questbookSheetHtml(): string {
  const { active, done, trackId } = partitionQuests(S.quests, S.track);
  if (!active.length && !done.length) {
    return `
      <div class="qb-wrap">
        <div class="qb-h"><h2>任务簿</h2><button class="qb-close" data-act="sheetClose" aria-label="关闭">×</button></div>
        <p class="qb-empty">江湖寂寥，暂无要事。</p>
      </div>`;
  }
  const renderRow = (r: QuestRow, group: 'active' | 'done') => {
    const dist = r.to ? pathMin(S.loc, r.to) : 0;
    const here = r.to && S.loc === r.to;
    const target = r.to ? room(r.to) : null;
    const trackable = group === 'active';
    const isTrack = r.id === trackId;
    const action = trackable
      ? `<button class="qb-act ${isTrack ? 'on' : ''}" data-act="qtrack:${r.id}" aria-pressed="${isTrack}">${isTrack ? '已追踪' : '追踪'}</button>`
      : '';
    const goBtn = (trackable && r.to && target)
      ? `<button class="qb-go${here ? ' dim' : ''}" data-act="qgo:${r.id}"${here ? ' disabled' : ''}>${here ? '就在此处' : '去'}${IC.chev}</button>`
      : '';
    const toLabel = target ? (here ? '就在此处' : `约${minLabel(dist)}`) : (r.to ? r.to : '');
    const toSpan = toLabel ? `<small class="qb-to">${toLabel}</small>` : '';
    const stageNum = `${r.stage + 1} / ${r.total}`;
    return `
      <div class="qb-row ${group} ${isTrack ? 'track' : ''}">
        <div class="qb-info">
          <b>${r.name}</b>
          <span class="qb-stage">${stageNum}</span>
          <p>${r.title}</p>
          ${toSpan}
        </div>
        <div class="qb-acts">${action}${goBtn}</div>
      </div>`;
  };

  const activeHtml = active.length
    ? `<h3 class="qb-sec">进行中 · ${active.length}</h3>${active.map(r => renderRow(r, 'active')).join('')}`
    : `<h3 class="qb-sec muted">进行中 · 0</h3><p class="qb-empty">暂无进行中的事。</p>`;
  const doneHtml = done.length
    ? `<h3 class="qb-sec">已完成 · ${done.length}</h3>${done.map(r => renderRow(r, 'done')).join('')}`
    : `<h3 class="qb-sec muted">已完成 · 0</h3>`;

  return `
    <div class="qb-wrap">
      <div class="qb-h"><h2>任务簿</h2><button class="qb-close" data-act="sheetClose" aria-label="关闭">×</button></div>
      ${activeHtml}
      ${doneHtml}
    </div>`;
}

/** 打开任务簿弹层（供 explore.ts 的 handler 调用） */
export function openQuestbook(): void { openSheet(questbookSheetHtml()); }

/** 追踪指定任务，刷新弹层和主视图 */
export function trackQuest(id: string): void {
  if (!questById(id)) return;
  S.track = id;
  openSheet(questbookSheetHtml());
  render();
}

/** 前往指定任务的目的地。调用方负责 import travelTo 以避免循环。 */
export const QUEST_NAMESPACE = true; // 标记此模块的 UI 入口

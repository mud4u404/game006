import { S } from '../../core/state';
import { REGIONS, jobById, questById, room } from '../../content';
import { yueText } from '../../engine/shiguang';
import { knownShi, type ShiRow } from '../../engine/shishi';
import { minLabel } from '../../core/time';
import { pathMin, travelMin } from '../../engine/world';
import { IC } from '../icons';
import { closeSheet, openSheet, render } from '../shell';

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
    // Issue #7：当前阶段就是最后一个阶段，算作已完成
    const isDone = lastIdx === total - 1;
    const row: QuestRow = { id, name: def.name, stage: lastIdx, total, title: last.title, to: last.to, done: isDone };
    (isDone ? done : active).push(row);
  }

  active.sort((a, b) => a.stage - b.stage);
  done.sort((a, b) => a.stage - b.stage);

  return {
    active,
    done,
    trackId: (track && Object.prototype.hasOwnProperty.call(playerQuests, track) && questById(track)) ? track : '',
  };
}

/** 江湖上的事（世事，engine/shishi.ts）：写到玩家知道的那一步；隔久了没打听，就是旧消息 */
function shiRow(r: ShiRow): string {
  const where = REGIONS[r.region]?.name ?? '';
  return `
      <div class="qb-row ${r.ended ? 'done' : ''}">
        <div class="qb-info">
          <b>${r.name}</b>
          ${where ? `<span class="qb-stage">${where}</span>` : ''}
          <p>${r.now}</p>
          ${r.stale ? '<small class="qb-to">这是你上回听说的，后来怎样，得再去打听。</small>' : ''}
        </div>
      </div>`;
}

/**
 * 见闻弹层 HTML（docs/huojianghu.md 第三节第四条：不指路）。纯 UI：读 S，产出字符串，不直接渲染。
 * 江湖上的事：听说的、看见的世事；心事：主线和别的私事，自己选一件记挂，江湖页顶上才挂它；了结的。
 */
export function questbookSheetHtml(): string {
  const { active, done, trackId } = partitionQuests(S.quests, S.track);
  const shi = knownShi();
  const shiOpen = shi.filter(r => !r.ended), shiDone = shi.filter(r => r.ended);
  const head = `<div class="qb-h"><h2>见闻</h2><button class="qb-close" data-act="sheetClose" aria-label="关闭">×</button></div>`;
  if (!active.length && !done.length && !shi.length && !S.job) {
    return `<div class="qb-wrap">${head}<p class="qb-empty">江湖寂寥，暂无要事。四处走走，找人打听打听。</p></div>`;
  }
  const renderRow = (r: QuestRow, group: 'active' | 'done') => {
    const dist = r.to ? travelMin(pathMin(S.loc, r.to)) : 0;
    const here = r.to && S.loc === r.to;
    const target = r.to ? room(r.to) : null;
    const trackable = group === 'active';
    const isTrack = r.id === trackId;
    // 记挂：江湖页顶上挂着它，地图上标着它；再点一下就放下
    const action = trackable
      ? `<button class="qb-act ${isTrack ? 'on' : ''}" data-act="qtrack:${r.id}" aria-pressed="${isTrack}">${isTrack ? '记挂着' : '记挂'}</button>`
      : '';
    const goBtn = (trackable && r.to && target)
      ? `<button class="qb-go${here ? ' dim' : ''}" data-act="qgo:${r.id}"${here ? ' disabled' : ''}>${here ? '就在此处' : '去'}${IC.chev}</button>`
      : '';
    const toLabel = target ? `${target.name} · ${here ? '就在此处' : '约' + minLabel(dist)}` : '';
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

  const shiHtml = `<h3 class="qb-sec${shiOpen.length ? '' : ' muted'}">江湖上的事 · ${shiOpen.length}</h3>${shiOpen.length
    ? shiOpen.map(shiRow).join('')
    : '<p class="qb-empty">还没听说什么。找人打听打听，或者到处走走看看。</p>'}`;
  const activeHtml = `<h3 class="qb-sec${active.length ? '' : ' muted'}">心事 · ${active.length}</h3>${active.map(r => renderRow(r, 'active')).join('')}`;
  // 手上的差事：限期几日，到哪儿交差（江湖页顶上也挂着「有约」）
  const job = S.job && jobById(S.job.id);
  const jy = job && S.yue.find(y => y.id === 'job_' + job.id);
  const jobHere = !!job && S.loc === job.at;
  const jobHtml = job && jy ? `<h3 class="qb-sec">差事 · 1</h3>
      <div class="qb-row active">
        <div class="qb-info">
          <b>${job.title}</b>
          <span class="qb-stage">${job.sect ? job.sect + '的差事' : '营生'}</span>
          <p>${yueText(S, jy)}</p>
          <small class="qb-to">误了期${job.sect ? '，扣门派贡献' : '，地位降一级'}。</small>
        </div>
        <div class="qb-acts"><button class="qb-go${jobHere ? ' dim' : ''}" data-act="jgo:${job.at}"${jobHere ? ' disabled' : ''}>${jobHere ? '就在此处' : '去'}${IC.chev}</button></div>
      </div>` : '';
  const doneN = done.length + shiDone.length;
  const doneHtml = `<h3 class="qb-sec${doneN ? '' : ' muted'}">了结的 · ${doneN}</h3>${shiDone.map(shiRow).join('')}${done.map(r => renderRow(r, 'done')).join('')}`;

  return `
    <div class="qb-wrap">
      ${head}
      ${jobHtml}
      ${shiHtml}
      ${activeHtml}
      ${doneHtml}
    </div>`;
}

/** 打开见闻弹层（供 explore.ts 的 handler 调用） */
export function openQuestbook(): void { openSheet(questbookSheetHtml()); }

/** 记挂一件心事：设 S.track、关闭弹层、刷新，顶部横幅随之切换；已经记挂着的，再点一下就放下（不挂横幅） */
export function trackQuest(id: string): void {
  if (!questById(id)) return;
  S.track = S.track === id ? '' : id;
  closeSheet();
  render();
}

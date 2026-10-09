import { S } from '../../core/state';
import { REGIONS, jobById, npc, questById, room } from '../../content';
import type { JobDef } from '../../content/types';
import { yueText } from '../../engine/shiguang';
import { knownShi, type ShiRow } from '../../engine/shishi';
import { minLabel } from '../../core/time';
import { cn } from '../../core/util';
import { questNav, sectNav, whoNav, type NavState, type QuestNav } from '../../engine/daohang';
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
          ${where ? `<span class="qb-stage">${where}${r.round > 1 ? ` · 第${cn(r.round)}回` : ''}</span>` : ''}
          <p>${r.now}</p>
          ${r.stale ? '<small class="qb-to">这是你上回听说的，后来怎样，得再去打听。</small>' : ''}
          ${r.missed ? `<small class="qb-why">这一回你没赶上。${r.again ? '这样的事，过些日子还会有。' : ''}</small>` : ''}
        </div>
      </div>`;
}

/** 导航的状态签：能做、要等、卡住、未竟（engine/daohang.ts） */
const ST_TONE: Record<NavState, string> = { 能做: 'accent', 要等: 'warn', 卡住: 'danger', 未竟: '', 了结: '' };
export const navTag = (s: NavState): string => `<span class="tag ${ST_TONE[s]}">${s}</span>`;

/** 找的人在不在：在就写在哪，不在写什么时辰在 */
function whoLine(n: QuestNav): string {
  const w = n.who;
  if (!w) return '';
  const at = w.now ? `眼下在${room(w.now).name}` : w.when ? `${w.when}在${n.toName ?? ''}` : '眼下见不到';
  return `<li>找${w.name}：${at}</li>`;
}

/** 师门：眼下什么地位，升下一级找谁、要什么（engine/daohang.ts 的 sectNav） */
function sectRow(): string {
  const n = sectNav();
  if (!n) return '';
  const body = !n.next ? '<p>已是真传弟子。</p>'
    : n.note ? `<p>想升${n.next}弟子。</p><small class="qb-why">${n.note}</small>`
    : `<p>想升${n.next}弟子：找${n.who?.name ?? ''}「${n.verb}」。</p>
      ${n.toName ? `<small class="qb-to">${n.who?.now ? `眼下在${n.toName}` : n.who?.when ? `${n.who.when}在${n.toName}` : n.toName}</small>` : ''}
      ${n.needs.length ? `<ul class="qb-need">${n.needs.map(x => `<li class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '×'} ${x.text}${x.lack ? `（${x.lack}）` : ''}</li>`).join('')}</ul>` : ''}`;
  const state: NavState = !n.next ? '了结' : n.note ? '卡住' : n.needs.every(x => x.ok) ? '能做' : '卡住';
  return `
      <div class="qb-row active">
        <div class="qb-info">
          <div class="qb-top"><b>师门 · ${n.school}</b>${state === '了结' ? '' : navTag(state)}</div>
          <span class="qb-stage">${n.rank}弟子</span>
          ${body}
        </div>
      </div>`;
}

/**
 * 一件心事：走到第几步、这一步去哪找谁怎么做、门槛逐条打勾、做不成了写为什么。
 * 做过的步骤收在「前情」里，后面的步骤不剧透。
 */
function questRow(n: QuestNav, trackId: string): string {
  const live = n.state !== '了结' && n.state !== '未竟';
  const isTrack = n.id === trackId;
  const here = !!n.to && n.dist === 0;
  // 记挂：江湖页顶上挂着它，地图上标着它；再点一下就放下
  const action = live
    ? `<button class="qb-act ${isTrack ? 'on' : ''}" data-act="qtrack:${n.id}" aria-pressed="${isTrack}">${isTrack ? '记挂着' : '记挂'}</button>` : '';
  const goBtn = live && n.to
    ? `<button class="qb-go${here ? ' dim' : ''}" data-act="qgo:${n.id}"${here ? ' disabled' : ''}>${here ? '就在此处' : '去'}${IC.chev}</button>` : '';
  const toLine = live && n.toName ? `<small class="qb-to">${n.toName} · ${here ? '就在此处' : '约' + minLabel(n.dist)}</small>` : '';
  // 只因人不在而要等的，「找某某」那一行已经写了什么时辰在哪，不再重复
  const why = n.why && !(n.who && !n.who.now && live) ? `<small class="qb-why ${n.state === '卡住' ? 'bad' : ''}">${n.why}</small>` : '';
  const needs = live && n.needs.length
    ? n.needs.map(x => `<li class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '×'} ${x.text}${x.lack ? `（${x.lack}）` : ''}</li>`).join('') : '';
  const detail = live ? `${n.hint ? `<p class="qb-hint">${n.hint}</p>` : ''}${whoLine(n) || needs ? `<ul class="qb-need">${whoLine(n)}${needs}</ul>` : ''}` : '';
  const past = n.past.length
    ? `<details class="qb-past"><summary>前情 · ${n.past.length} 步</summary><ul>${n.past.map(t => `<li>✓ ${t}</li>`).join('')}</ul></details>` : '';
  const stageNum = n.state === '了结' ? `共 ${n.total - 1} 步` : `第 ${n.stage + 1} 步 · 共 ${n.total - 1} 步`;
  return `
      <div class="qb-row ${live ? 'active' : 'done'} ${isTrack ? 'track' : ''}">
        <div class="qb-info">
          <div class="qb-top"><b>${n.name}</b>${n.state === '了结' ? '' : navTag(n.state)}</div>
          <span class="qb-stage">${stageNum}</span>
          <p>${n.title}</p>
          ${why}${toLine}${detail}${past}
        </div>
        <div class="qb-acts">${action}${goBtn}</div>
      </div>`;
}

/**
 * 见闻弹层 HTML。纯 UI：读 S，产出字符串，不直接渲染。
 * 差事；心事：主线和别的私事，每件写清走到哪、卡在哪、做不做得成（engine/daohang.ts），自己选一件记挂，江湖页顶上才挂它；
 * 江湖上的事：听说的、看见的世事；了结的、未竟的。
 */
export function questbookSheetHtml(): string {
  const { active, done, trackId } = partitionQuests(S.quests, S.track);
  const navs = [...active, ...done].map(r => questNav(r.id)).filter((n): n is QuestNav => !!n);
  const open = navs.filter(n => n.state !== '了结' && n.state !== '未竟');
  const failed = navs.filter(n => n.state === '未竟'), finished = navs.filter(n => n.state === '了结');
  // 记挂着的排最前，能做的在前，卡住的在后
  const ORDER: NavState[] = ['能做', '要等', '卡住'];
  open.sort((a, b) => Number(b.id === trackId) - Number(a.id === trackId) || ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
  const shi = knownShi();
  const shiOpen = shi.filter(r => !r.ended), shiDone = shi.filter(r => r.ended);
  const head = `<div class="qb-h"><h2>见闻</h2><button class="qb-close" data-act="sheetClose" aria-label="关闭">×</button></div>`;
  if (!navs.length && !shi.length && !S.job && !S.sect) {
    return `<div class="qb-wrap">${head}<p class="qb-empty">江湖寂寥，暂无要事。四处走走，找人打听打听。</p></div>`;
  }

  const shiHtml = `<h3 class="qb-sec${shiOpen.length ? '' : ' muted'}">江湖上的事 · ${shiOpen.length}</h3>${shiOpen.length
    ? shiOpen.map(shiRow).join('')
    : '<p class="qb-empty">还没听说什么。找人打听打听，或者到处走走看看。</p>'}`;
  const sect = sectRow();
  const activeHtml = `<h3 class="qb-sec${open.length || sect ? '' : ' muted'}">心事 · ${open.length + (sect ? 1 : 0)}</h3>${sect}${open.map(n => questRow(n, trackId)).join('')}`;
  // 手上的差事：限期几日，到哪儿交差，交差的人眼下在不在（江湖页顶上也挂着「有约」）
  const job = S.job && jobById(S.job.id);
  const jy = job && S.yue.find(y => y.id === 'job_' + job.id);
  const jobHere = !!job && S.loc === job.at;
  const jw = job ? whoNav(job.npc, job.at) : null;
  const jwLine = jw && !jw.now ? `<small class="qb-why">${jw.when ? `${jw.name}${jw.when}在${room(job!.at).name}` : `眼下见不到${jw.name}`}</small>` : '';
  const jobHtml = job && jy ? `<h3 class="qb-sec">差事 · 1</h3>
      <div class="qb-row active">
        <div class="qb-info">
          <div class="qb-top"><b>${job.title}</b>${navTag(jw && !jw.now ? (jw.when ? '要等' : '卡住') : '能做')}</div>
          <span class="qb-stage">${job.sect ? job.sect + '的差事' : '营生'}</span>
          <p>${yueText(S, jy)}</p>
          ${jwLine}
          <small class="qb-to">误了期，${missText(job)}。</small>
        </div>
        <div class="qb-acts"><button class="qb-go${jobHere ? ' dim' : ''}" data-act="jgo:${job.at}"${jobHere ? ' disabled' : ''}>${jobHere ? '就在此处' : '去'}${IC.chev}</button></div>
      </div>` : '';
  const failHtml = failed.length ? `<h3 class="qb-sec">未竟 · ${failed.length}</h3>${failed.map(n => questRow(n, trackId)).join('')}` : '';
  const doneN = finished.length + shiDone.length;
  const doneHtml = `<h3 class="qb-sec${doneN ? '' : ' muted'}">了结的 · ${doneN}</h3>${shiDone.map(shiRow).join('')}${finished.map(n => questRow(n, trackId)).join('')}`;

  return `
    <div class="qb-wrap">
      ${head}
      ${jobHtml}
      ${activeHtml}
      ${shiHtml}
      ${failHtml}
      ${doneHtml}
    </div>`;
}

/** 打开见闻弹层（供 explore.ts 的 handler 调用） */
export function openQuestbook(): void { openSheet(questbookSheetHtml(), true); }

/** 记挂一件心事：设 S.track、关闭弹层、刷新，顶部横幅随之切换；已经记挂着的，再点一下就放下（不挂横幅） */
export function trackQuest(id: string): void {
  const n = questNav(id);
  if (!n || n.state === '了结' || n.state === '未竟') return;
  S.track = S.track === id ? '' : id;
  closeSheet();
  render();
}

/** 差事误了期会怎样：照实写（审查 D12：游侠的差事卡写「地位降一级」，实际降不了） */
function missText(job: JobDef): string {
  if (job.sect) return '扣门派贡献';
  const free = S.shenfen.id === 'youxia' || S.shenfen.id === 'yumin';
  if (!free) return '地位降一级，降到底就被辞退';
  return npc(job.npc)?.obj ? '这一张就白揭了，过几日才能再揭' : '失信于人，心里落一层心魔';
}

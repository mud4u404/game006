// 看板的取数整理和统计口径：页面（浏览器）和 scripts/kanban-data.mjs（Actions 定时算数据）共用这一份，
// 两边的数字不会对不上。这里只放纯函数，不碰网络、不碰页面。
export const REPO = 'mud4u404/game006';
export const HOUR = 3600 * 1000;

export const AIS = [
  { k: 'codex', n: 'Codex' }, { k: 'codebuddy', n: 'CodeBuddy' }, { k: 'qoder', n: 'Qoder' }, { k: 'minimax', n: 'MiniMax' },
  { k: 'zcode', n: 'zcode', tag: '再试' }, { k: 'trae', n: 'Trae' }, { k: 'autoclaw', n: 'autoclaw' }, { k: 'workbuddy', n: 'WorkBuddy', old: 'step5' },
  { k: 'claude', n: '维护者（Claude）', boss: true },
];

export function has(labels, x) { return labels.indexOf(x) >= 0; }
/** 改过名的（如 step5 → workbuddy），新旧两个名字的分支和标签都算他的 */
export function isMe(ai, key) { return !!key && (key === ai.k || key === ai.old); }
export function prefixOf(ref) { const i = (ref || '').indexOf('/'); return i > 0 ? ref.slice(0, i) : ''; }
export function aiOf(ref) { const p = prefixOf(ref); for (const a of AIS) if (a.k === p || a.old === p) return a; return null; }
export function nameOfRef(ref) { const a = aiOf(ref); return a ? a.n : (prefixOf(ref) || '其他'); }
export function giveOf(labels) {
  for (const l of labels) { const m = /^给[:：](.+)$/.exec(l); if (m) return m[1].trim().toLowerCase(); }
  return '';
}
export function isTask(i) { return has(i.labels, '内容') || has(i.labels, '功能'); }
export function taskNo(p) { const m = /\[#(\d+)/.exec(p.title || ''); return m ? m[1] : String(p.n); }

/* 短标题：去掉 [#N] 前缀，取第一个冒号/逗号前的一段，最多 12 字 */
export function shortTitle(t) {
  t = (t || '').replace(/^\s*\[#?\d+\]\s*/, '');
  const m = /^(.{2,}?)[：:，,（(]/.exec(t);
  if (m) t = m[1];
  const a = Array.from(t);
  return a.length > 12 ? a.slice(0, 12).join('') + '…' : t;
}
export function ago(t, now) {
  if (!t) return '未知';
  const s = Math.max(0, ((now == null ? Date.now() : now) - t) / 1000);
  if (s < 90) return '刚刚';
  if (s < 3600) return Math.round(s / 60) + ' 分钟前';
  if (s < 86400) return (s / 3600).toFixed(s < 36000 ? 1 : 0).replace(/\.0$/, '') + ' 小时前';
  return Math.round(s / 86400) + ' 天前';
}

/* ---------- 接口响应 -> 精简数据 ---------- */
export function slimIssue(x) {
  const labels = (x.labels || []).map((l) => l.name);
  let dep = '';
  const m = /依赖[：:]\s*([^\n\r]*)/.exec(x.body || '');
  if (m) dep = (m[1].match(/#\d+/g) || []).join(' ');
  return { n: x.number, title: x.title, labels, created: Date.parse(x.created_at), dep };
}
export function slimPull(x) {
  return {
    n: x.number, title: x.title, ref: x.head && x.head.ref, sha: x.head && x.head.sha,
    labels: (x.labels || []).map((l) => l.name), updated: Date.parse(x.updated_at), draft: !!x.draft,
  };
}
/* 五个接口的原始响应：开着的 Issue（含 PR，要剔掉）、开着的 PR、已关的 PR、仓库事件两页（推送时间） */
export function processRaw(raw, now) {
  const ev = raw.events1.concat(raw.events2);
  const closed = raw.closedPulls;
  return {
    t: now,
    issues: raw.issues.filter((x) => !x.pull_request).map(slimIssue),
    pulls: raw.openPulls.map(slimPull),
    closedFull: closed.length >= 100,
    closedOldest: closed.length ? Date.parse(closed[closed.length - 1].updated_at) : 0,
    merged: closed.filter((x) => x.merged_at).map((x) => ({
      n: x.number, title: x.title, ref: x.head && x.head.ref, at: Date.parse(x.merged_at),
    })).sort((a, b) => b.at - a.at),
    pushes: ev.filter((e) => e.type === 'PushEvent' && e.payload && e.payload.ref)
      .map((e) => ({ ref: e.payload.ref.replace('refs/heads/', ''), t: Date.parse(e.created_at) })),
    evOldest: ev.length ? Date.parse(ev[ev.length - 1].created_at) : now,
    evFull: ev.length >= 100,
  };
}
/* 检查结果：每个提交的 check、smoke 两个 job 取最新一次 */
export function sumRuns(runs) {
  const out = {};
  for (const nm of ['check', 'smoke']) {
    let best = null;
    for (const r of runs) if (r.name === nm && (!best || r.id > best.id)) best = r;
    if (!best) { out[nm] = 'none'; continue; }
    if (best.status !== 'completed') { out[nm] = 'run'; continue; }
    out[nm] = (best.conclusion === 'success' || best.conclusion === 'neutral' || best.conclusion === 'skipped') ? 'ok' : 'fail';
  }
  return out;
}
export function prState(res) {
  if (!res) return { cls: '', txt: '未查' };
  const v = [res.check, res.smoke];
  if (v.indexOf('fail') >= 0) return { cls: 'bad', txt: '红' };
  if (v.indexOf('run') >= 0) return { cls: 'run', txt: '在跑' };
  if (v[0] === 'ok' && v[1] === 'ok') return { cls: 'ok', txt: '绿' };
  if (v.indexOf('none') >= 0 && v.indexOf('ok') >= 0) return { cls: 'run', txt: '未跑全' };
  return { cls: '', txt: '无结果' };
}

/* ---------- 统计：看板第一屏要的数 ---------- */
const SEV = { r: 3, y: 2, g: 1 };

/* data：processRaw 的结果；checks：{ sha: {check, smoke} }；now：算数的时刻（毫秒） */
export function computeBoard(data, checks, now) {
  checks = checks || {};
  const { pulls, issues, merged, pushes } = data;
  const prNums = {};   // 已经有 PR 在做的 Issue 编号
  pulls.forEach((p) => { const m = /\[#(\d+)/.exec(p.title); if (m) prNums[m[1]] = p.n; });
  const mergedRef = {}; merged.forEach((m) => { if (m.ref) mergedRef[m.ref] = 1; });
  const issueByN = {}; issues.forEach((i) => { issueByN[i.n] = i; });
  const prLamp = (p) => {
    if (prState(checks[p.sha]).cls === 'bad') return 'r';
    if (has(p.labels, '要改')) return 'y';
    return 'g';
  };

  const merged24 = merged.filter((m) => now - m.at < 24 * HOUR).length;
  // 接口一次最多给 100 件已关的 PR；若最老的一件还在窗口里，说明窗口没取全，数字只是下限
  const sat24 = !!data.closedFull && now - data.closedOldest < 24 * HOUR;

  // 最近 24 小时每小时合并数：hourly[0] 是 24 小时前那一格，hourly[23] 是最近一小时
  const hourly = [];
  for (let i = 0; i < 24; i++) hourly.push(0);
  merged.forEach((m) => {
    const age = now - m.at;
    if (age >= 0 && age < 24 * HOUR) hourly[23 - Math.floor(age / HOUR)]++;
  });

  const ais = AIS.map((ai) => {
    const myIssues = ai.boss ? [] : issues.filter((i) => isMe(ai, giveOf(i.labels)) && isTask(i) && !has(i.labels, '暂缓'));
    const waiting = myIssues.filter((i) => !prNums[i.n]).sort((a, b) => a.n - b.n);
    const myPulls = pulls.filter((p) => isMe(ai, prefixOf(p.ref)))
      .sort((a, b) => b.updated - a.updated);
    const recent = pushes.filter((p) => isMe(ai, prefixOf(p.ref)));
    const lastPush = recent.reduce((a, p) => Math.max(a, p.t), 0);
    const last = Math.max(lastPush, myPulls.reduce((a, p) => Math.max(a, p.updated), 0));
    // 已领的任务分支：24 小时内有推送、还没有 PR、也没合并的分支
    const openRef = {}; myPulls.forEach((p) => { openRef[p.ref] = 1; });
    const claimed = [];
    recent.forEach((p) => {
      if (now - p.t < 24 * HOUR && !openRef[p.ref] && !mergedRef[p.ref] && claimed.indexOf(p.ref) < 0) claimed.push(p.ref);
    });

    let lamp = '', txt = '', none = false;
    if (myPulls.length) {
      const ranked = myPulls.slice().sort((a, b) => SEV[prLamp(b)] - SEV[prLamp(a)] || b.updated - a.updated);
      lamp = prLamp(ranked[0]);
      txt = '#' + taskNo(ranked[0]) + ' ' + shortTitle(ranked[0].title);
    } else if (claimed.length) {
      lamp = 'g';
      const tail = claimed[0].slice(claimed[0].indexOf('/') + 1), mm = /^(\d+)/.exec(tail);
      const is = mm && issueByN[mm[1]];
      txt = mm ? ('#' + mm[1] + ' ' + (is ? shortTitle(is.title) : tail.replace(/^\d+-/, ''))) : tail;
    } else if (waiting.length) {
      txt = '#' + waiting[0].n + ' ' + shortTitle(waiting[0].title) + ' · 没开工';
    } else { txt = '没活'; none = true; }

    let late = !!(last && now - last > 6 * HOUR);
    if (!last && data.evFull && now - data.evOldest > 6 * HOUR) late = true;
    const done48 = merged.filter((m) => isMe(ai, prefixOf(m.ref)) && now - m.at < 48 * HOUR).length;
    // 要叫醒：手上有活（PR、已领分支、排着的），却超过九十分钟没动静（停用的、维护者不算）
    const hasWork = myPulls.length + claimed.length + waiting.length > 0;
    // 从「最后一次动静」和「最近一次接到新活」里取晚的那个算起，免得刚派下去的活就被当成停了
    const since = Math.max(last || 0, ...waiting.map((i) => i.created || 0));
    const stalled = !ai.boss && ai.tag !== '停用' && hasWork && (!since || now - since > 90 * 60 * 1000);
    const nextNo = myPulls.length ? myPulls[0].n : (waiting.length ? waiting[0].n : null);
    return {
      k: ai.k, n: ai.n, boss: !!ai.boss, tag: ai.tag || '',
      done48, doing: myPulls.length + claimed.length, waiting: waiting.length,
      lamp, txt, none, late, last, stalled, nextNo,
      lastTxt: last ? ago(last, now) : (data.evFull ? '>' + Math.round((now - data.evOldest) / HOUR) + ' 小时' : '—'),
      claimed, myPulls: myPulls.map((p) => p.n), waitingIssues: waiting.map((i) => i.n),
    };
  });
  const wake = ais.filter((a) => a.stalled).map((a) => ({ n: a.n, no: a.nextNo, lastTxt: a.lastTxt }));
  return { prNums, merged24, sat24, hourly, ais, prLamp, wake };
}

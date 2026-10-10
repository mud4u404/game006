import { S } from '../../core/state';
import { REGIONS, ROOMS, room } from '../../content';
import { questNav, sectHome } from '../../engine/daohang';
import { busyRooms, roomBrief, wentSet } from '../../engine/jiemian';
import { tripCost } from '../../engine/world';
import { FAR_MIN, chufaLine } from '../../engine/chufa';
import { minLabel } from '../../core/time';
import { cn } from '../../core/util';
import { DOT_Y, layoutRegion, type MapNode } from '../maplayout';

/** 正在看的地区；不设时看所在的地区。走到别的地区时自动回到所在地区 */
let viewing: string | null = null;
let viewedFrom = '';
export function setMapRegion(r: string): void { viewing = r; viewedFrom = room(S.loc).region; }

/** 有地点的地区，按 order 排 */
const regionsWithRooms = (): string[] => Object.keys(REGIONS).filter(r => ROOMS.some(x => x.region === r))
  .sort((a, b) => (REGIONS[a].order ?? 99) - (REGIONS[b].order ?? 99));

/** 地图：上方切换地区；地区里的地点按出口连线；通往别的地区的出口列在下面 */
export function viewDitu(): string {
  const here = room(S.loc).region;
  if (viewedFrom !== here) viewing = null;
  const region = viewing ?? here;
  const rooms = ROOMS.filter(r => r.region === region);
  // 记挂着的心事眼下该去的地方（engine/daohang.ts：找的人在哪就标哪）；做不成的不标
  const nav = S.track ? questNav(S.track) : null;
  const q = nav && nav.state !== '未竟' && nav.state !== '了结' ? nav.to : undefined;
  // 摆地图（ui/maplayout.ts）：街边的去处收进那条街，压在一起的地名推开、不出框
  const w = Math.max(240, ((typeof document !== 'undefined' && document.getElementById('main')?.clientWidth) || 390) - 32);
  const lay = layoutRegion(rooms, w, q);
  const pos = new Map(lay.nodes.map(n => [n.id, n]));
  const hubOf = new Map(lay.nodes.flatMap(n => n.leaves.map(l => [l, n.id] as const)));
  const shownAs = (id: string): string => hubOf.get(id) ?? id;
  // 圆点在格子顶往下 DOT_Y 处；线从点到点
  const dot = (n: { x: number; y: number; h: number }): [number, number] => [n.x, n.y - n.h / 2 + DOT_Y];
  const pct = ([x, y]: [number, number]): [string, string] => [((x / lay.w) * 100).toFixed(2), ((y / lay.h) * 100).toFixed(2)];
  // 线只留必要的：一条线要是从第三处的圆点或地名上穿过，就不画（点开那处的说明看得到怎么走）
  const blocked = (a: MapNode, b: MapNode): boolean => {
    const [x1, y1] = dot(a), [x2, y2] = dot(b);
    return lay.nodes.some(c => {
      if (c === a || c === b) return false;
      const [cx, cy] = dot(c);
      for (let i = 1; i < 24; i++) {
        const x = x1 + ((x2 - x1) * i) / 24, y = y1 + ((y2 - y1) * i) / 24;
        if (Math.abs(x - cx) < c.w * 0.45 && y > cy - 9 && y < c.y + c.h / 2 - 2) return true;
      }
      return false;
    });
  };
  const seen = new Set<string>();
  const lines: string[] = [];
  const out: { from: string; to: string }[] = [];
  for (const r of rooms) {
    for (const [, to] of r.exits) {
      if (!rooms.some(x => x.id === to)) { out.push({ from: r.id, to }); continue; }
      const a = shownAs(r.id), b = shownAs(to);
      const key = [a, b].sort().join('|');
      if (a === b || seen.has(key)) continue;
      seen.add(key);
      if (blocked(pos.get(a)!, pos.get(b)!)) continue;
      const [x1, y1] = pct(dot(pos.get(a)!)), [x2, y2] = pct(dot(pos.get(b)!));
      // 水路：两头有一头是要付船钱的船、渡（RoomDef.fare）；其余是陆路
      const wet = room(r.id).fare !== undefined || room(to).fare !== undefined;
      lines.push(`<line${wet ? ' class="wet"' : ''} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
    }
  }
  // 标记：当前所在（高亮圈）、主线目标、有事、去过（engine/jiemian.ts）；没到过的画成空心点
  const busy = busyRooms(), went = wentSet();
  const mark = (id: string, leaves: string[] = []): string => {
    const ids = [id, ...leaves];
    return [shownAs(S.loc) === id ? 'here' : '', q && ids.includes(q) && shownAs(S.loc) !== id ? 'zhu' : '', ids.some(x => busy.has(x)) ? 'busy' : '', ids.some(x => went.has(x)) ? 'went' : ''].filter(Boolean).join(' ');
  };
  // 一个地点只有一种状态标记（点的样子）：所在 > 主线目标 > 有事 > 去过 > 没去过；一条街一带的处数写在名字后头
  const nodes = lay.nodes.map(n => {
    const at = shownAs(S.loc) === n.id;
    const [x, y] = [((n.x / lay.w) * 100).toFixed(2), ((n.y / lay.h) * 100).toFixed(2)];
    const major = at || n.leaves.length > 0 || mark(n.id, n.leaves).includes('zhu');
    return `<button class="node ${mark(n.id, n.leaves)}${major ? " major" : ""}" style="left:${x}%;top:${y}%;width:${n.w.toFixed(1)}px;height:${n.h}px" data-act="travelAsk:${n.id}"${at ? ' aria-current="location"' : ''}><i class="pt"></i><span class="nm">${n.name}${n.leaves.length ? `<em>${n.leaves.length}处</em>` : ''}</span></button>`;
  }).join('');
  // 收进街里的去处：列在地图下面，点了照样赶路
  const hubs = lay.nodes.filter(n => n.leaves.length).map(n => `<section class="mhub"><h3>${n.name}一带</h3><div class="mleaves">${n.leaves.map(id => {
    const at = S.loc === id;
    return `<button class="mleaf ${mark(id)}${at ? ' here' : ''}" data-act="travelAsk:${id}"${at ? ' aria-current="location"' : ''}><i class="pt"></i>${room(id).name}</button>`;
  }).join('')}</div></section>`).join('');
  // 快捷：回师门、去记挂着的事、赴约（都是现成的数据，点了先看耗时再走）
  const chips: { label: string; to: string; name: string }[] = [];
  const home = sectHome();
  if (home && home.to !== S.loc) chips.push({ label: '回师门', to: home.to, name: home.name });
  if (nav && q && q !== S.loc) chips.push({ label: '记挂的事', to: q, name: room(q).name });
  const yue = S.yue.find(y => y.at && y.at !== S.loc && ROOMS.some(r => r.id === y.at));
  if (yue?.at) chips.push({ label: '有约', to: yue.at, name: room(yue.at).name });
  const quick = chips.length ? `<div class="mchips" aria-label="快捷">${chips.map(c => `<button data-act="travelAsk:${c.to}"><small>${c.label}</small><b>${c.name}</b></button>`).join('')}</div>` : '';
  const tabs = regionsWithRooms();
  const info = REGIONS[region];
  return `${quick}${tabs.length > 1 ? `<nav class="mtabs" aria-label="地区">${tabs.map(t => `<button class="${t === region ? 'on' : ''}" data-act="mapRegion:${t}" aria-pressed="${t === region}">${REGIONS[t].name}${t === here ? '<i></i>' : ''}</button>`).join('')}</nav>` : ''}
    <section class="map" style="height:${lay.h}px" aria-label="${info?.name || ''}地图">
      <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
      ${nodes}</section>
    ${hubs}
    ${out.length ? `<div class="mout">${out.map(o => `<button data-act="travelAsk:${o.to}"><small>${room(o.from).name}</small><b>往${REGIONS[room(o.to).region]?.name ?? ''} · ${room(o.to).name}</b></button>`).join('')}</div>` : ''}
    <details class="legend"><summary>图例</summary>
      <div class="lg"><span><i class="pt here"></i>你在这里</span><span><i class="pt zhu"></i>主线目标</span><span><i class="pt busy"></i>有事</span><span><i class="pt went"></i>去过</span><span><i class="pt"></i>没去过</span>
      <span><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" class="land"/></svg>陆路</span><span><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" class="wet"/></svg>水路</span></div>
      <p class="muted mhint">点地名，看那里有什么人、什么事、要走多久，再点「去」赶路。</p></details>
    ${info ? `<section class="card"><p class="muted">${info.note}</p></section>` : ''}`;
}


/** 地图上点一处弹出的说明：有什么人、什么事、要走多久、花多少钱；再放一个「去」，点了直接赶路（explore.ts 的 travelAsk） */
export function mapSheet(id: string): string {
  const b = roomBrief(id);
  const c = b.here ? null : tripCost(id);
  const tag = b.here ? '<span class="tag accent">你在这里</span>' : `<span class="tag">${REGIONS[room(id).region]?.name ?? ''}</span>`;
  const rows = [
    ['人', b.folks.length ? b.folks.join('、') : '眼下不见人影'],
    ['事', b.things.length ? b.things.join('<br>') : '眼下没听说有什么事'],
    ['路', b.here ? '就在这里' : c ? `约 <b>${minLabel(c.min)}</b>，经过 ${cn(c.hops)} 处${c.fee ? `；船钱和过路钱共 <b>${cn(c.fee)} 文</b>` : '；一路不花钱'}` : '从这里去不了那儿']
  ].map(([k, v]) => `<div><span class="tag">${k}</span><span>${v}</span></div>`).join('');
  const short = !!c && c.fee > S.silver;
  // 出远门（赶路超过一个时辰）：带伤、气血、内力、过夜的店钱，点之前说一声（engine/chufa.ts）。船钱不够的另有一句，不重复
  const warn = c && c.min > FAR_MIN ? chufaLine(S, short ? undefined : c) : null;
  return `<div class="r-h">${tag}<h2>${b.name}</h2></div>
    <p class="muted">${b.area}</p>
    <div class="news mbrief">${rows}</div>
    ${short ? '<p class="muted">身上的钱不够，剩下的要替船家、码头干活抵，路上多耗一个时辰。</p>' : ''}${warn ? `<p class="muted chufa">${warn}</p>` : ''}
    <div class="acts">${c ? `<button class="btn" data-act="travelGo:${id}">去</button>` : ''}<button class="btn ghost" data-act="sheetClose">${c ? '再看看' : '知道了'}</button></div>`;
}

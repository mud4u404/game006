import { S } from '../../core/state';
import { REGIONS, ROOMS, room } from '../../content';
import { questNav } from '../../engine/daohang';
import { layoutRegion } from '../maplayout';

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
  const pct = (n: { x: number; y: number }): [string, string] => [((n.x / lay.w) * 100).toFixed(2), ((n.y / lay.h) * 100).toFixed(2)];
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
      const [x1, y1] = pct(pos.get(a)!), [x2, y2] = pct(pos.get(b)!);
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
    }
  }
  const nodes = lay.nodes.map(n => {
    const at = shownAs(S.loc) === n.id;
    const marked = q && !at && shownAs(q) === n.id;
    const [x, y] = pct(n);
    return `<button class="node${at ? ' here' : ''}" style="left:${x}%;top:${y}%" data-act="travel:${n.id}"${at ? ' aria-current="location"' : ''}>${marked ? '<span class="qdot"></span>' : ''}${n.name}${n.leaves.length ? `<span class="nbadge">${n.leaves.length}</span>` : ''}</button>`;
  }).join('');
  // 收进街里的去处：列在地图下面，点了照样赶路
  const hubs = lay.nodes.filter(n => n.leaves.length).map(n => `<section class="mhub"><h3>${n.name}一带</h3><div class="mleaves">${n.leaves.map(id => {
    const at = S.loc === id;
    return `<button class="mleaf${at ? ' here' : ''}" data-act="travel:${id}"${at ? ' aria-current="location"' : ''}>${q === id && !at ? '<span class="qdot"></span>' : ''}${room(id).name}</button>`;
  }).join('')}</div></section>`).join('');
  const tabs = regionsWithRooms();
  const info = REGIONS[region];
  return `${tabs.length > 1 ? `<nav class="mtabs" aria-label="地区">${tabs.map(t => `<button class="${t === region ? 'on' : ''}" data-act="mapRegion:${t}" aria-pressed="${t === region}">${REGIONS[t].name}${t === here ? '<i></i>' : ''}</button>`).join('')}</nav>` : ''}
    <section class="map" style="height:${lay.h}px" aria-label="${info?.name || ''}地图">
      <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
      ${nodes}</section>
    ${hubs}
    ${out.length ? `<div class="mout">${out.map(o => `<button data-act="travel:${o.to}"><small>${room(o.from).name}</small><b>往${REGIONS[room(o.to).region]?.name ?? ''} · ${room(o.to).name}</b></button>`).join('')}</div>` : ''}
    <div class="legend"><span><i style="background:var(--accent)"></i>你在这里</span><span><i style="background:var(--info)"></i>记挂着的事</span><span>点地名即可自动赶路</span></div>
    ${info ? `<section class="card"><p class="muted">${info.note}</p></section>` : ''}`;
}

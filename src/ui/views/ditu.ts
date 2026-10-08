import { S } from '../../core/state';
import { REGIONS, ROOMS, room } from '../../content';
import { curQuest } from '../../engine/world';

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
  const q = curQuest()?.to;
  const seen = new Set<string>();
  const lines: string[] = [];
  const out: { from: string; to: string }[] = [];
  for (const r of rooms) {
    for (const [, to] of r.exits) {
      const other = rooms.find(x => x.id === to);
      if (!other) { out.push({ from: r.id, to }); continue; }
      const key = [r.id, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`<line x1="${r.map[0]}" y1="${r.map[1]}" x2="${other.map[0]}" y2="${other.map[1]}"/>`);
    }
  }
  const nodes = rooms.map(r => {
    const at = S.loc === r.id;
    return `<button class="node${at ? ' here' : ''}" style="left:${r.map[0]}%;top:${r.map[1]}%" data-act="travel:${r.id}"${at ? ' aria-current="location"' : ''}>${q === r.id && !at ? '<span class="qdot"></span>' : ''}${r.name}</button>`;
  }).join('');
  const tabs = regionsWithRooms();
  const info = REGIONS[region];
  return `${tabs.length > 1 ? `<nav class="mtabs" aria-label="地区">${tabs.map(t => `<button class="${t === region ? 'on' : ''}" data-act="mapRegion:${t}" aria-pressed="${t === region}">${REGIONS[t].name}${t === here ? '<i></i>' : ''}</button>`).join('')}</nav>` : ''}
    <section class="map" aria-label="${info?.name || ''}地图">
      <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
      ${nodes}</section>
    ${out.length ? `<div class="mout">${out.map(o => `<button data-act="travel:${o.to}"><small>${room(o.from).name}</small><b>往${REGIONS[room(o.to).region]?.name ?? ''} · ${room(o.to).name}</b></button>`).join('')}</div>` : ''}
    <div class="legend"><span><i style="background:var(--accent)"></i>你在这里</span><span><i style="background:var(--info)"></i>记挂着的事</span><span>点地名即可自动赶路</span></div>
    ${info ? `<section class="card"><p class="muted">${info.note}</p></section>` : ''}`;
}

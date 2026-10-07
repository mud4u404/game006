import { S } from '../../core/state';
import { REGIONS, ROOMS, room } from '../../content';
import { curQuest } from '../../engine/world';

/** 地图只显示当前所在区域；连线按出口自动画出 */
export function viewDitu(): string {
  const region = room(S.loc).region;
  const rooms = ROOMS.filter(r => r.region === region);
  const q = curQuest()?.to;
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rooms) {
    for (const [, to] of r.exits) {
      const key = [r.id, to].sort().join('|');
      const other = rooms.find(x => x.id === to);
      if (!other || seen.has(key)) continue;
      seen.add(key);
      lines.push(`<line x1="${r.map[0]}" y1="${r.map[1]}" x2="${other.map[0]}" y2="${other.map[1]}"/>`);
    }
  }
  const nodes = rooms.map(r => {
    const here = S.loc === r.id;
    return `<button class="node${here ? ' here' : ''}" style="left:${r.map[0]}%;top:${r.map[1]}%" data-act="travel:${r.id}"${here ? ' aria-current="location"' : ''}>${q === r.id && !here ? '<span class="qdot"></span>' : ''}${r.name}</button>`;
  }).join('');
  const info = REGIONS[region];
  return `<section class="map" aria-label="${info?.name || ''}地图">
      <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
      ${nodes}</section>
    <div class="legend"><span><i style="background:var(--accent)"></i>你在这里</span><span><i style="background:var(--info)"></i>当前目标</span><span>点地名即可自动赶路</span></div>
    ${info ? `<section class="card"><p class="muted">${info.note}</p></section>` : ''}`;
}

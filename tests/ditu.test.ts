/**
 * 地图不乱（负责人 10-08：「现在增加的地点有点多，导致地图上看着很乱，且互相遮挡」）。
 * 每个地区在最窄的手机（宽三百二十，地图宽二百八十八）到最宽（地图宽四百零八）都摆得开：
 * 地名不互相压着、不出框；一条街挂着好几处去处的，收进那条街（ui/maplayout.ts）。
 * 协作者加地点时这条变红：挪一挪 RoomDef.map，或者让新去处挂在一条街上。
 */
import { describe, expect, it } from 'vitest';
import { REGIONS, ROOMS } from '../src/content';
import { HUB_MIN, MAP_H_MAX, hubsOf, layoutRegion, overlaps } from '../src/ui/maplayout';

const WIDTHS = [288, 358, 408];
const regions = Object.keys(REGIONS).filter(r => ROOMS.some(x => x.region === r));

describe('地图不乱', () => {
  it('每个地区、每种屏幕宽度：地名不互相压着、不出框', () => {
    const errs: string[] = [];
    for (const r of regions) for (const w of WIDTHS) {
      const lay = layoutRegion(ROOMS.filter(x => x.region === r), w);
      for (const [a, b] of overlaps(lay.nodes)) errs.push(`${REGIONS[r].name}（地图宽 ${w}）：「${a}」和「${b}」压在一起`);
      for (const n of lay.nodes) {
        if (n.x - n.w / 2 < -0.5 || n.x + n.w / 2 > w + 0.5 || n.y - n.h / 2 < -0.5 || n.y + n.h / 2 > lay.h + 0.5) errs.push(`${REGIONS[r].name}（地图宽 ${w}）：「${n.name}」出了框`);
      }
      if (lay.h > MAP_H_MAX) errs.push(`${REGIONS[r].name}：地图高到 ${lay.h}`);
    }
    expect(errs, '\n' + errs.join('\n') + '\n挪一挪这些地点的 map 坐标，或者让新去处挂在一条街上（只通那条街，四处以上会收进那条街）').toEqual([]);
  });

  it('一条街挂着好几处去处的，收进那条街；收进去的仍点得到', () => {
    const yz = ROOMS.filter(x => x.region === 'yz');
    const hubs = hubsOf(yz);
    expect(hubs.get('cheng')?.length ?? 0).toBeGreaterThanOrEqual(HUB_MIN);
    const lay = layoutRegion(yz, 358);
    const shown = new Set(lay.nodes.map(n => n.id));
    const inHub = new Set(lay.nodes.flatMap(n => n.leaves));
    for (const r of yz) expect(shown.has(r.id) || inHub.has(r.id), r.id).toBe(true);
  });

  it('摆法是确定的：同样的内容、同样的宽，摆出来一样', () => {
    const yz = ROOMS.filter(x => x.region === 'yz');
    expect(JSON.stringify(layoutRegion(yz, 358))).toBe(JSON.stringify(layoutRegion(yz, 358)));
  });
});

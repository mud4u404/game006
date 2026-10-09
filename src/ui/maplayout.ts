/**
 * 地图的摆法（负责人 10-08：「现在增加的地点有点多，导致地图上看着很乱，且互相遮挡」）。纯函数，不碰页面，测试直接调。
 * 1. 一条街上挂着好几处去处的（东关街的武馆、镖局、望江楼、府衙……），地图上只画那条街，去处列在地图下面；
 * 2. 剩下的地名从内容里写的位置（RoomDef.map，百分比）出发，压在一起的互相推开，不出框；挤不下就把地图加高。
 */
import type { RoomDef } from '../content/types';

/** 一处地方挂着几处只通它的去处，就收进它里面 */
export const HUB_MIN = 4;
/** 地名按钮：高、左右内边距、一个字宽（和 styles/app.css 的 .node 对得上）、两个按钮之间至少留的缝 */
const NODE_H = 44, NODE_PAD = 28, CHAR_W = 14, BADGE_W = 24, DOT_W = 14, GAP = 4;
/** 地图的高：默认、最高 */
export const MAP_H = 330, MAP_H_MAX = 600;

export interface MapNode {
  id: string;
  name: string;
  /** 中心点，像素 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 收进来的去处（只通这里的小地方） */
  leaves: string[];
}

export interface MapLayout { nodes: MapNode[]; w: number; h: number }

/** 只通一处的小地方：出口只有一个，而且通往同一地区的那一处 */
function leafOf(r: RoomDef, ids: Set<string>): string | null {
  return r.exits.length === 1 && ids.has(r.exits[0][1]) ? r.exits[0][1] : null;
}

/** 每处地方收进了哪些去处 */
export function hubsOf(rooms: RoomDef[]): Map<string, string[]> {
  const ids = new Set(rooms.map(r => r.id));
  const by = new Map<string, string[]>();
  for (const r of rooms) {
    const to = leafOf(r, ids);
    if (to) by.set(to, [...(by.get(to) ?? []), r.id]);
  }
  for (const [hub, list] of [...by]) if (list.length < HUB_MIN) by.delete(hub);
  // 收进别处的地方自己不能再当收纳处（不嵌套）
  for (const list of [...by.values()]) for (const id of list) by.delete(id);
  return by;
}

/** 地名按钮的宽：任务小点（.qdot 八像素加间距）也要算进去，不然带点的地名比算的宽，压住旁边的 */
const nodeW = (name: string, badge: boolean, dot: boolean): number => NODE_PAD + CHAR_W * [...name].length + (badge ? BADGE_W : 0) + (dot ? DOT_W : 0);

/** 摆一个地区的地图：w 是地图的宽（像素）；mark 是挂任务小点的地点（收进街里的，点挂在那条街上） */
export function layoutRegion(rooms: RoomDef[], w: number, mark?: string): MapLayout {
  const hubs = hubsOf(rooms);
  const hidden = new Set([...hubs.values()].flat());
  const markAt = mark && hidden.has(mark) ? [...hubs].find(([, l]) => l.includes(mark))?.[0] : mark;
  const shown = rooms.filter(r => !hidden.has(r.id));
  for (let h = MAP_H; ; h = Math.min(MAP_H_MAX, h + 40)) {
    const nodes = shown.map(r => {
      const leaves = hubs.get(r.id) ?? [];
      const nw = Math.min(w, nodeW(r.name, leaves.length > 0, r.id === markAt));
      return { id: r.id, name: r.name, x: (r.map[0] / 100) * w, y: (r.map[1] / 100) * h, w: nw, h: NODE_H, leaves };
    });
    const ok = relax(nodes, w, h);
    if (ok || h >= MAP_H_MAX) return { nodes, w, h };
  }
}

/** 压在一起的推开、出框的拉回来；返回是不是已经谁也不压谁 */
function relax(nodes: MapNode[], w: number, h: number): boolean {
  const home = nodes.map(n => [n.x, n.y]);
  const clamp = (n: MapNode): void => {
    n.x = Math.max(n.w / 2, Math.min(w - n.w / 2, n.x));
    n.y = Math.max(n.h / 2, Math.min(h - n.h / 2, n.y));
  };
  nodes.forEach(clamp);
  // 一对地名横着推了好多回还压着（一排摆不下，被框挡住了），就改成上下错开
  const tries = new Map<string, number>();
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const ox = (a.w + b.w) / 2 + GAP - Math.abs(a.x - b.x);
      const oy = (a.h + b.h) / 2 + GAP - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      const key = `${i}|${j}`, n = (tries.get(key) ?? 0) + 1;
      tries.set(key, n);
      // 顺着重叠少的那个方向推开，各让一半；同一个点上的，按先后错开
      if (n <= 20 && ox / (a.w + b.w) < oy / (a.h + b.h)) {
        const s = a.x < b.x || (a.x === b.x && i < j) ? -1 : 1;
        a.x += (s * ox) / 2; b.x -= (s * ox) / 2;
      } else {
        const s = a.y < b.y || (a.y === b.y && i < j) ? -1 : 1;
        a.y += (s * oy) / 2; b.y -= (s * oy) / 2;
      }
    }
    // 轻轻往原来的位置拉一点，地图的样子不走形
    if (it < 200) nodes.forEach((n, k) => { n.x += (home[k][0] - n.x) * 0.02; n.y += (home[k][1] - n.y) * 0.02; });
    nodes.forEach(clamp);
    if (!moved && it >= 200) return true;
  }
  return !overlaps(nodes).length;
}

/** 互相压着的地名（测试、诊断用） */
export function overlaps(nodes: MapNode[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) out.push([a.name, b.name]);
  }
  return out;
}

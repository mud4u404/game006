/**
 * 地图的摆法（负责人 10-08：「现在增加的地点有点多，导致地图上看着很乱，且互相遮挡」）。纯函数，不碰页面，测试直接调。
 * 1. 一条街上挂着好几处去处的（东关街的武馆、镖局、望江楼、府衙……），地图上只画那条街，去处列在地图下面；
 * 2. 剩下的地点按格子对齐排（一格一处，不互相压），方位照内容里写的位置（RoomDef.map，百分比）。
 */
import type { RoomDef } from '../content/types';

/** 一处地方挂着几处只通它的去处，就收进它里面 */
export const HUB_MIN = 4;
/** 地图的高：最高（十七处地点、两列也排得下） */
export const MAP_H_MAX = 720;

export interface MapNode {
  id: string;
  name: string;
  /** 所在格子的中心，像素 */
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

/** 格子：一行的高、地图四周的留白、圆点中心离格子顶的距离（和 styles/app.css 的 .node 对得上） */
export const ROW_H = 64, PAD = 12, DOT_Y = 20;
/** 一行放几处：窄屏三列也放得下（地名超宽就折成两行，仍在自己的格子里） */
const colsOf = (w: number): number => (w >= 260 ? 3 : 2);

/**
 * 摆一个地区的地图（#600 整齐疏朗）：地点按格子对齐排，一格一处，格子彼此不相交，所以地名不可能互相压；
 * 每处取离内容里写的位置（RoomDef.map）最近的空格，位置的大致方位（北在上、东在右）保留。
 * w 是地图的宽（像素）。mark 旧时是挂任务小点的地点，标记不占宽了，留着参数是为了调用处不用改。
 * 返回的 x、y 是格子中心，w、h 是格子大小（点击区）；圆点在格子顶往下 DOT_Y 处。
 */
export function layoutRegion(rooms: RoomDef[], w: number, _mark?: string): MapLayout {
  const hubs = hubsOf(rooms);
  const hidden = new Set([...hubs.values()].flat());
  const shown = rooms.filter(r => !hidden.has(r.id));
  const cols = colsOf(w), n = shown.length;
  const rowsN = Math.max(3, Math.ceil(n / cols) + (n > cols ? 1 : 0));
  const cw = (w - PAD * 2) / cols;
  const taken = new Set<string>();
  const nodes: MapNode[] = [];
  const order = [...shown].sort((a, b) => a.map[1] - b.map[1] || a.map[0] - b.map[0] || (a.id < b.id ? -1 : 1));
  for (const r of order) {
    const tc = (r.map[0] / 100) * (cols - 1), tr = (r.map[1] / 100) * (rowsN - 1);
    let best = [0, 0], bd = Infinity;
    for (let row = 0; row < rowsN; row++) for (let col = 0; col < cols; col++) {
      if (taken.has(`${row}|${col}`)) continue;
      const d = (col - tc) ** 2 * 1.2 + (row - tr) ** 2;
      if (d < bd - 1e-9) { bd = d; best = [row, col]; }
    }
    taken.add(`${best[0]}|${best[1]}`);
    nodes.push({ id: r.id, name: r.name, x: PAD + cw * (best[1] + 0.5), y: PAD + ROW_H * (best[0] + 0.5), w: cw, h: ROW_H, leaves: hubs.get(r.id) ?? [] });
  }
  // 去掉上下空着的行，不留大块空白
  const rows = nodes.map(n => Math.round((n.y - PAD) / ROW_H - 0.5));
  const top = Math.min(...rows), bot = Math.max(...rows);
  nodes.forEach(n => { n.y -= top * ROW_H; });
  return { nodes, w, h: (bot - top + 1) * ROW_H + PAD * 2 };
}

/** 互相压着的地名（测试、诊断用） */
export function overlaps(nodes: MapNode[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5) out.push([a.name, b.name]);
  }
  return out;
}

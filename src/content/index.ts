/**
 * 内容总表：自动收录 src/content/packs/ 下所有内容包，并做三件合并工作：
 * 1. 出口写了回程方位的，给对面地点补上回来的出口；
 * 2. 人物写了 at 的，放进对应地点；
 * 3. 内容包写了 roomLife 的，给对应地点挂上活气（RoomDef.life，engine/shijie.ts）。
 * 新增内容只需要在 packs/ 下新建文件，这里不用改。
 */
import type { ContentPack, EncounterDef, EyeDef, FactionDef, FoeDef, ItemDef, JobDef, NewsDef, NpcDef, QuestDef, RegionDef, RoomDef, ShiDef, SkillDef, StoryDef } from './types';

export { REALMS, REALM_NEED, GRADES, GRADE_COEF, SLOT_CATS, SLOT_NAME } from './skills';

const modules = import.meta.glob<{ default: ContentPack }>('./packs/*.ts', { eager: true });
const packs = Object.keys(modules).sort().map(k => modules[k].default);

export interface Registry {
  REGIONS: Record<string, RegionDef>;
  ROOMS: RoomDef[];
  NPCS: NpcDef[];
  FOES: FoeDef[];
  QUESTS: QuestDef[];
  STORIES: StoryDef[];
  ITEMS: ItemDef[];
  NEWS: NewsDef[];
  SKILLS: SkillDef[];
  ENCOUNTERS: EncounterDef[];
  JOBS: JobDef[];
  EYES: EyeDef[];
  SHI: ShiDef[];
  FACTIONS: FactionDef[];
}

/** 合并内容包：补回程出口、按 at 放人物 */
export function mergePacks(list: ContentPack[]): Registry {
  const reg: Registry = {
    REGIONS: Object.assign({}, ...list.map(p => p.regions || {})),
    ROOMS: list.flatMap(p => p.rooms || []),
    NPCS: list.flatMap(p => p.npcs || []),
    FOES: list.flatMap(p => p.foes || []),
    QUESTS: list.flatMap(p => p.quests || []),
    STORIES: list.flatMap(p => p.stories || []),
    ITEMS: list.flatMap(p => p.items || []),
    NEWS: list.flatMap(p => p.news || []),
    SKILLS: list.flatMap(p => p.skills || []),
    ENCOUNTERS: list.flatMap(p => p.encounters || []),
    JOBS: list.flatMap(p => p.jobs || []),
    EYES: list.flatMap(p => p.eyes || []),
    SHI: list.flatMap(p => p.shi || []),
    FACTIONS: list.flatMap(p => p.factions || [])
  };
  const byId = new Map(reg.ROOMS.map(r => [r.id, r]));
  for (const r of reg.ROOMS) {
    for (const ex of r.exits) {
      const back = ex[2];
      const target = byId.get(ex[1]);
      if (back && target && !target.exits.some(e => e[1] === r.id)) target.exits.push([back, r.id]);
    }
  }
  // 作息：写了几处的，每一处各放一条，带着时辰条件（engine/world.ts 的 roomNpcs 按条件挑）
  for (const n of reg.NPCS) {
    for (const at of [n.at ?? []].flat()) {
      const target = byId.get(at.room);
      if (!target) continue;
      const list2 = n.obj ? (target.objs ||= []) : target.npcs;
      if (list2.includes(n.id)) continue;
      list2.push(at.if ? { id: n.id, if: at.if } : n.id);
    }
  }
  // 地方的活气：给别的内容包里的地点补上（地点自己写了 life 的，以地点自己的为准）
  for (const p of list) {
    for (const [id, life] of Object.entries(p.roomLife ?? {})) {
      const target = byId.get(id);
      if (target && !target.life) target.life = life;
    }
  }
  return reg;
}

export const { REGIONS, ROOMS, NPCS, FOES, QUESTS, STORIES, ITEMS, NEWS, SKILLS, ENCOUNTERS, JOBS, EYES, SHI, FACTIONS } = mergePacks(packs);

const roomMap = new Map(ROOMS.map(r => [r.id, r]));
const npcMap = new Map(NPCS.map(n => [n.id, n]));
const storyMap = new Map(STORIES.map(s => [s.id, s]));
const foeMap = new Map(FOES.map(f => [f.id, f]));
const questMap = new Map(QUESTS.map(q => [q.id, q]));
const itemMap = new Map(ITEMS.map(i => [i.id, i]));
const skillMap = new Map(SKILLS.map(k => [k.id, k]));
const jobMap = new Map(JOBS.map(j => [j.id, j]));
const shiMap = new Map(SHI.map(d => [d.id, d]));
const facMap = new Map(FACTIONS.map(f => [f.id, f]));

export function room(id: string): RoomDef {
  const r = roomMap.get(id);
  if (!r) throw new Error(`未知地点：${id}`);
  return r;
}
export const npc = (id: string): NpcDef | undefined => npcMap.get(id);
export const storyById = (id: string): StoryDef | undefined => storyMap.get(id);
export const foeById = (id: string): FoeDef | undefined => foeMap.get(id);
export const questById = (id: string): QuestDef | undefined => questMap.get(id);
export const itemById = (id: string): ItemDef | undefined => itemMap.get(id);
export const skillById = (id: string): SkillDef | undefined => skillMap.get(id);
export const jobById = (id: string): JobDef | undefined => jobMap.get(id);
export const shiById = (id: string): ShiDef | undefined => shiMap.get(id);
export const facById = (id: string): FactionDef | undefined => facMap.get(id);

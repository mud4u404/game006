/**
 * 具名 NPC（Boss、剧情角色、通用路人）的战场外观
 * 颜色与 src/data/portraits.ts 中的立绘保持一致。
 */
import type { UnitModelSpec } from '@/render/contracts';
import type { UnitPlacement } from './types';

export interface NpcDef {
  name: string;
  classId: string;
  model: Partial<UnitModelSpec>;
}

export const NPCS: Record<string, NpcDef> = {
  mordis: {
    name: '摩尔迪斯',
    classId: 'high_priest',
    model: { hair: '#e8e4e0', hairStyle: 'long', eyes: '#ff8a3a', face: { glow: true, old: true }, primary: '#4a4448', secondary: '#d86a2a', glow: '#ff8a3a', skin: '#d8c8bc' },
  },
  vesper: {
    name: '薇丝珀',
    classId: 'witch',
    model: { hair: '#2a1e3a', hairStyle: 'long', eyes: '#b070ff', primary: '#2a2238', secondary: '#a070ff', gender: 'f', glow: '#b070ff', helmet: 'none', skin: '#f0dcd4' },
  },
  gregor: {
    name: '格雷戈',
    classId: 'general',
    model: { hair: '#7a7a80', beard: true, primary: '#6a1c22', secondary: '#c8a050', metal: '#5a5d66', face: { old: true, scar: 'left' }, skin: '#d8a888' },
  },
  edmund: {
    name: '埃德蒙',
    classId: 'knight_captain',
    model: { hair: '#e0c070', hairStyle: 'slick', primary: '#3a5a4a', secondary: '#d8b860', mount: 'none', helmet: 'none', eyes: '#4a7a6a' },
  },
  otto: {
    name: '奥托',
    classId: 'fighter',
    model: { hair: '#8a5a3a', primary: '#8a6a2a', secondary: '#e8d8b0', weapon: 'none', build: 'heavy', beard: true, skin: '#eac0a0' },
  },
  alberic: {
    name: '阿尔贝里克',
    classId: 'knight_captain',
    model: { hair: '#d8d8dc', beard: true, primary: '#8e1f23', secondary: '#d4a64a', face: { old: true }, helmet: 'none', metal: '#c9ccd4' },
  },
  elder: {
    name: '村长',
    classId: 'cleric',
    model: { helmet: 'none', hair: '#d8d4cc', hairStyle: 'bald', beard: true, primary: '#7a6a4a', secondary: '#c8b890', gender: 'm', face: { old: true }, weapon: 'staff' },
  },
  villager: {
    name: '村民',
    classId: 'cleric',
    model: { helmet: 'none', hair: '#8a5a34', hairStyle: 'braid', primary: '#6a7a4a', secondary: '#d8c8a0', gender: 'f', weapon: 'none' },
  },
  knight: { name: '骑士团骑士', classId: 'cavalier', model: { primary: '#a8262c', secondary: '#e8dcc0', metal: '#c9ccd4' } },
  noble: { name: '贵族', classId: 'armor_knight', model: { hair: '#6a4a2a', hairStyle: 'bob', primary: '#6a2a4a', secondary: '#d8b860', helmet: 'none', beard: true } },
  child: { name: '孤儿', classId: 'cleric', model: { helmet: 'none', hair: '#c88a4a', hairStyle: 'twin', primary: '#8a6a4a', secondary: '#e8dcc0', gender: 'f', weapon: 'none', scale: 0.85 } },
  soldier: { name: '帝国士兵', classId: 'soldier', model: {} },
  cultist: { name: '教团信徒', classId: 'dark_mage', model: {} },
  bandit: { name: '山贼', classId: 'brigand', model: {} },
};

/** 具名 NPC 的战斗单位：自动填入职业、名字、头像与外观 */
export function npcUnit(npc: string, p: Omit<UnitPlacement, 'classId'> & { classId?: string }): UnitPlacement {
  const d = NPCS[npc];
  return {
    classId: d.classId,
    name: d.name,
    portrait: npc,
    ...p,
    model: { ...d.model, ...p.model },
  };
}

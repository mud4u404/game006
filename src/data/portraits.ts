/**
 * 立绘外观：我方角色由其战场模型 + 职业推导（保证精灵与立绘一致），
 * 并可逐角色补充细节；具名 NPC 单独定义。
 */
import type { Accessory, Headwear, Outfit, PortraitLook } from '@/art/portrait';
import { CHARACTERS } from './characters';
import type { CharacterDef } from './types';

const CLASS_OUTFIT: Record<string, Outfit> = {
  squire: 'knight',
  crimson_knight: 'knight',
  oath_knight: 'knight',
  cavalier: 'knight',
  paladin: 'knight',
  knight_captain: 'knight',
  dragon_knight: 'knight',
  wyvern_rider: 'dark',
  wyvern_lord: 'dark',
  armor_knight: 'heavy',
  general: 'heavy',
  dark_knight: 'dark',
  cleric: 'nun',
  bishop: 'priest',
  saint: 'priest',
  mage: 'mage',
  archmage: 'mage',
  dark_mage: 'cultist',
  sorcerer: 'cultist',
  witch: 'sorceress',
  cult_priest: 'cultist',
  high_priest: 'cultist',
  fighter: 'leather',
  warrior: 'leather',
  berserker: 'leather',
  brigand: 'leather',
  archer: 'hunter',
  sniper: 'hunter',
  ranger: 'hunter',
  thief: 'thief',
  assassin: 'thief',
  rogue: 'thief',
  myrmidon: 'coat',
  swordmaster: 'coat',
  pegasus_knight: 'sky',
  falcon_knight: 'sky',
  dragon_maiden: 'dragon',
  soldier: 'soldier',
};

/** 逐角色补充 */
const EXTRA: Record<string, Partial<PortraitLook>> = {
  rein: { accessories: ['dragon_mark'], glow: '#ff7a3a' },
  alicia: { headwear: 'veil', eyeShape: 'round' },
  balder: { beard: 'full', age: 'old', eyeShape: 'sharp' },
  loy: { eyeShape: 'gentle', accessories: ['bandage'] },
  gren: { beard: 'stubble', eyeShape: 'narrow' },
  fina: { accessories: ['freckles', 'feather'] },
  lucas: { accessories: ['glasses'], eyeShape: 'gentle' },
  kia: { accessories: ['earring', 'bandage'], headwear: 'bandana' },
  sera: { headwear: 'circlet', eyeShape: 'gentle' },
  hagen: { beard: 'full', age: 'old' },
  raven: { eyeShape: 'narrow' },
  sieg: { eyeShape: 'narrow' },
  igna: { accessories: ['horns', 'dragon_mark'], glow: '#ffb030', eyeShape: 'round' },
};

export function lookFromCharacter(c: CharacterDef, classId = c.classId): PortraitLook {
  const m = c.model;
  const f = m.face ?? {};
  const look: PortraitLook = {
    gender: m.gender ?? 'm',
    age: f.old ? 'old' : 'young',
    skin: m.skin ?? '#f3d2b4',
    hair: m.hair ?? '#4a3020',
    eyes: m.eyes ?? '#3a2a22',
    hairStyle: m.hairStyle ?? 'short',
    eyeShape: f.shape === 'round' ? 'round' : f.shape === 'sharp' ? 'sharp' : f.shape === 'gentle' ? 'gentle' : undefined,
    slit: f.slit,
    glowEyes: f.glow ? m.glow ?? '#ffb030' : undefined,
    scar: f.scar,
    eyepatch: f.eyepatch,
    blush: f.blush,
    ahoge: m.ahoge,
    beard: m.beard ? 'beard' : 'none',
    primary: m.primary ?? '#2f5fa8',
    secondary: m.secondary ?? '#d8c9a0',
    metal: m.metal,
    outfit: CLASS_OUTFIT[classId] ?? 'leather',
    ...EXTRA[c.id],
  };
  return look;
}

const npc = (
  gender: 'm' | 'f',
  skin: string,
  hair: string,
  eyes: string,
  hairStyle: PortraitLook['hairStyle'],
  outfit: Outfit,
  primary: string,
  secondary: string,
  extra: Partial<PortraitLook> = {},
): PortraitLook => ({ gender, skin, hair, eyes, hairStyle, outfit, primary, secondary, ...extra });

/** 具名 NPC 与通用路人的立绘 */
export const NPC_LOOKS: Record<string, PortraitLook> = {
  // 灰烬教团大主教：枯瘦、白发、余烬色的眼
  mordis: npc('m', '#d8c8bc', '#e8e4e0', '#ff8a3a', 'long', 'cultist', '#4a4448', '#d86a2a', {
    age: 'old',
    eyeShape: 'narrow',
    glowEyes: '#ff8a3a',
    headwear: 'mitre',
    beard: 'none',
  }),
  // 教团魔女：黑紫长发、紫瞳
  vesper: npc('f', '#f0dcd4', '#2a1e3a', '#b070ff', 'long', 'sorceress', '#2a2238', '#a070ff', {
    eyeShape: 'narrow',
    glow: '#b070ff',
    accessories: ['earring', 'mole'],
  }),
  // 帝国将军：灰发、满脸络腮胡、刀疤
  gregor: npc('m', '#d8a888', '#7a7a80', '#5a4a3a', 'short', 'heavy', '#6a1c22', '#c8a050', {
    age: 'old',
    beard: 'full',
    scar: 'left',
    eyeShape: 'narrow',
    metal: '#5a5d66',
  }),
  // 摄政公爵：金色背头、细长眼
  edmund: npc('m', '#f2dcc8', '#e0c070', '#4a7a6a', 'slick', 'noble', '#3a5a4a', '#d8b860', { eyeShape: 'narrow', beard: 'mustache' }),
  // 港城商会的胖老板
  otto: npc('m', '#eac0a0', '#8a5a3a', '#4a3a2a', 'short', 'coat', '#8a6a2a', '#e8d8b0', { beard: 'mustache', eyeShape: 'gentle', age: 'adult' }),
  // 赤鳞骑士团团长
  alberic: npc('m', '#e8c0a0', '#d8d8dc', '#4a6a9a', 'short', 'knight', '#8e1f23', '#d4a64a', { age: 'old', beard: 'full', eyeShape: 'sharp' }),
  elder: npc('m', '#e0b896', '#d8d4cc', '#5a4a3a', 'bald', 'villager', '#7a6a4a', '#c8b890', { age: 'old', beard: 'full', eyeShape: 'gentle' }),
  villager: npc('f', '#f2d2b8', '#8a5a34', '#4a6a3a', 'braid', 'villager', '#6a7a4a', '#d8c8a0', { blush: true }),
  soldier: npc('m', '#e8c4a4', '#3a3030', '#4a3a3a', 'short', 'soldier', '#6a1c22', '#24242a', { headwear: 'helm', metal: '#5a5d66', eyeShape: 'narrow' }),
  cultist: npc('m', '#d8c4b8', '#3a3438', '#ff8a3a', 'short', 'cultist', '#4a4448', '#d86a2a', { headwear: 'cowl', glowEyes: '#ff8a3a' }),
  bandit: npc('m', '#c8946a', '#3a2418', '#3a2a22', 'spiky', 'leather', '#6a4a2e', '#8a3a2a', { headwear: 'bandana', beard: 'stubble', eyeShape: 'narrow', scar: 'right' }),
  knight: npc('m', '#f0cfb0', '#5a3a28', '#4a5a7a', 'short', 'knight', '#a8262c', '#e8dcc0', { metal: '#c9ccd4' }),
};

export function portraitLook(id: string): PortraitLook | null {
  const c = CHARACTERS[id];
  if (c) return lookFromCharacter(c);
  return NPC_LOOKS[id] ?? null;
}

export type { Accessory, Headwear };

import type { SkillDef } from './types';

export const REALMS = ['初窥门径', '略有小成', '融会贯通', '炉火纯青', '登堂入室', '出神入化', '一代宗师', '返璞归真', '大乘'];
/** 每一重升到下一重所需的熟练度 */
export const REALM_NEED = [200, 600, 1200, 2000, 3200, 4800, 7000, 10000, 99999];
export const GRADES: [SkillDef['grade'], string][] = [['凡品', 'fan'], ['良品', 'liang'], ['上品', 'shang'], ['绝品', 'jue'], ['神品', 'shen'], ['禁品', 'jin']];

export const SKILLS: SkillDef[] = [
  { id: 'hanjiang', name: '寒江剑法', grade: '良品', type: '外功 · 剑法', resp: 'parry',
    desc: '寒江一脉的入门剑法。剑势如江上寒风，轻灵迅疾，练到深处，一剑可断流水。',
    moves: ['孤帆远影', '江枫渔火', '寒潭映月', '烟波钓叟', '寒江孤影'], use: '普通攻击 · 主动招式「寒江孤影」' },
  { id: 'jinghong', name: '惊鸿剑', grade: '上品', type: '外功 · 剑法', resp: 'rush',
    desc: '三剑连环，剑影如惊鸿掠水。起点高，修炼也慢。', moves: ['惊鸿照影'], use: '主动招式 · 三连击 · 调息三合' },
  { id: 'taxue', name: '踏雪无痕', grade: '良品', type: '轻功', resp: 'dodge',
    desc: '身轻如燕，踏雪无痕。境界越高，越容易闪开对手的攻击。', use: '被动 · 闪避' },
  { id: 'xinfa', name: '寒江心法', grade: '良品', type: '内功', resp: 'block',
    desc: '寒江一脉的内功根基，内力绵长，运功蓄力时尤见功效。', use: '被动 · 内力 · 运功' },
  { id: 'duanshui', name: '断水', grade: '绝品', type: '绝技',
    desc: '寒江剑法的终极一式。传说练至化境，一剑横江，流水为之一断。', use: '绝招 · 怒气满时可用' }
];

export const skillById = (id: string): SkillDef | undefined => SKILLS.find(s => s.id === id);

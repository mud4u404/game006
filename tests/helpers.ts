import type { ChapterDef, UnitPlacement } from '@/data/types';

export function testChapter(rows: string[], units: UnitPlacement[], extra: Partial<ChapterDef> = {}): ChapterDef {
  return {
    id: 'test',
    index: 99,
    label: '测试',
    title: '测试',
    quote: '',
    map: { theme: 'meadow', rows },
    victory: { type: 'rout' },
    objectiveText: '击败所有敌人',
    deploy: { max: 4, slots: [] },
    units,
    events: [],
    intro: [],
    outro: [],
    music: { player: 'battle_player', enemy: 'battle_enemy' },
    reward: { gold: 0 },
    shop: [],
    ...extra,
  };
}

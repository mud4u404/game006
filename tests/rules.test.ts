import { describe, expect, it } from 'vitest';
import { Battle } from '@/game/battle/battle';
import { forecast } from '@/game/battle/combat';
import { decide } from '@/game/battle/ai';
import { newSaveFromCharacter, derived, maxHp } from '@/game/unit';
import { gainExp, promoteOptions, promoteSave } from '@/game/progression';
import { Rng } from '@/core/rng';
import { testChapter } from './helpers';

const open = ['........', '........', '........', '........', '........'];

describe('移动与阻挡', () => {
  it('不能穿越敌人，可以穿越友军', () => {
    const rows = ['.....', '#####', '..#..'];
    // 走廊：(0,0)-(4,0)
    const ch = testChapter(['.....'], [
      { id: 'e1', classId: 'soldier', level: 1, team: 'enemy', x: 2, y: 0 },
    ]);
    void rows;
    const rein = newSaveFromCharacter('rein');
    const b = new Battle(ch, [{ save: rein, x: 0, y: 0 }], [rein], {}, 1);
    const u = b.unit('rein')!;
    const reach = b.reach(u);
    expect(reach.has(b.map.key(1, 0))).toBe(true);
    expect(reach.has(b.map.key(3, 0))).toBe(false); // 被敌人挡住
  });

  it('森林消耗 2，骑兵消耗 3', () => {
    const ch = testChapter(['.TTTT'], []);
    const loy = newSaveFromCharacter('loy');
    const b = new Battle(ch, [{ save: loy, x: 0, y: 0 }], [loy], {}, 1);
    const u = b.unit('loy')!;
    const reach = b.reach(u);
    // MOV 7：1→3→6
    expect(reach.has(b.map.key(2, 0))).toBe(true);
    expect(reach.has(b.map.key(3, 0))).toBe(false);
  });
});

describe('战斗公式', () => {
  it('地形提升防御，伤害可为 0（无效）', () => {
    const ch = testChapter(['.T', '..'], [
      { id: 'e1', classId: 'armor_knight', level: 10, team: 'enemy', x: 1, y: 0 },
    ]);
    const kia = newSaveFromCharacter('kia');
    const b = new Battle(ch, [{ save: kia, x: 0, y: 0 }], [kia], {}, 1);
    const f = forecast(b.map, b.unit('kia')!, b.unit('e1')!);
    expect(f.atk.dmg).toBe(0);
    expect(f.counter).not.toBeNull();
  });

  it('弓箭不能反击相邻的敌人，法术不会被反击', () => {
    const ch = testChapter(open, [
      { id: 'a1', classId: 'archer', level: 3, team: 'enemy', x: 1, y: 0 },
    ]);
    const rein = newSaveFromCharacter('rein');
    const lucas = newSaveFromCharacter('lucas');
    const b = new Battle(ch, [{ save: rein, x: 0, y: 0 }, { save: lucas, x: 3, y: 0 }], [rein, lucas], {}, 1);
    expect(forecast(b.map, b.unit('rein')!, b.unit('a1')!).counter).toBeNull();
    const fire = b.skillsOf(b.unit('lucas')!).find((s) => s.id === 'fire')!;
    expect(forecast(b.map, b.unit('lucas')!, b.unit('a1')!, fire).counter).toBeNull();
  });

  it('攻击后经验增加，击杀拿到满额经验', () => {
    const ch = testChapter(open, [{ id: 'e1', classId: 'brigand', level: 1, team: 'enemy', x: 1, y: 0, statMod: { hp: -21 } }]);
    const rein = newSaveFromCharacter('rein');
    const b = new Battle(ch, [{ save: rein, x: 0, y: 0 }], [rein], {}, 7);
    const u = b.unit('rein')!;
    // 必定命中：设置一个确定的随机数
    b.rng = new Rng(3);
    const r = b.attack(u, b.unit('e1')!);
    const hit = r.strikes[0].hit;
    if (hit) {
      expect(r.deaths).toContain('e1');
      expect(r.exp[0].amount).toBeGreaterThanOrEqual(30);
      expect(b.outcome).toBe('win');
    } else {
      expect(r.exp[0].amount).toBe(1);
    }
  });
});

describe('成长与转职', () => {
  it('升级至少提升 2 项属性', () => {
    const ch = testChapter(open, []);
    const save = newSaveFromCharacter('alicia');
    const b = new Battle(ch, [{ save, x: 0, y: 0 }], [save], {}, 1);
    const u = b.unit('alicia')!;
    for (let i = 0; i < 9; i++) {
      const r = gainExp(u, 100, new Rng(i + 1))!;
      expect(Object.keys(r.gains).length).toBeGreaterThanOrEqual(2);
    }
    expect(u.level).toBe(10);
  });

  it('Lv10 起可转职；隐藏职业需要道具', () => {
    const save = newSaveFromCharacter('lucas');
    expect(promoteOptions(save, []).every((o) => !o.available)).toBe(true);
    save.level = 10;
    const opts = promoteOptions(save, []);
    expect(opts.find((o) => o.to === 'archmage')!.available).toBe(true);
    expect(opts.find((o) => o.to === 'saint')!.available).toBe(false);
    expect(promoteOptions(save, ['saint_ring']).find((o) => o.to === 'saint')!.available).toBe(true);
    const hp = save.base.hp;
    promoteSave(save, 'archmage');
    expect(save.level).toBe(1);
    expect(save.base.hp).toBeGreaterThan(hp);
    expect(save.skills).toContain('inferno');
  });
});

describe('AI', () => {
  it('打不动就不打：伤害为 0 时不发动物理攻击', () => {
    const ch = testChapter(open, [{ id: 'e1', classId: 'thief', level: 1, team: 'enemy', x: 2, y: 0 }]);
    const hagen = newSaveFromCharacter('hagen');
    const b = new Battle(ch, [{ save: hagen, x: 0, y: 0 }], [hagen], {}, 1);
    b.startPhase('enemy');
    const d = decide(b, b.unit('e1')!);
    expect(d.action.type).not.toBe('attack');
  });

  it('主动型敌人会攻击可击杀的目标', () => {
    const ch = testChapter(open, [{ id: 'e1', classId: 'brigand', level: 5, team: 'enemy', x: 4, y: 0 }]);
    const alicia = newSaveFromCharacter('alicia');
    const b = new Battle(ch, [{ save: alicia, x: 0, y: 0 }], [alicia], {}, 1);
    b.startPhase('enemy');
    const d = decide(b, b.unit('e1')!);
    expect(d.action.type).toBe('attack');
  });

  it('待命型敌人在我方进入范围前不行动', () => {
    const ch = testChapter(['............'], [{ id: 'e1', classId: 'soldier', level: 1, team: 'enemy', x: 11, y: 0, ai: { type: 'hold' } }]);
    const rein = newSaveFromCharacter('rein');
    const b = new Battle(ch, [{ save: rein, x: 0, y: 0 }], [rein], {}, 1);
    b.startPhase('enemy');
    const d = decide(b, b.unit('e1')!);
    expect(d.moveTo).toEqual([11, 0]);
  });
});

describe('以逸待劳', () => {
  it('未移动也未行动的单位在下个阶段回复 HP', () => {
    const ch = testChapter(open, [{ id: 'e1', classId: 'soldier', level: 1, team: 'enemy', x: 7, y: 4 }]);
    const rein = newSaveFromCharacter('rein');
    const b = new Battle(ch, [{ save: rein, x: 0, y: 0 }], [rein], {}, 1);
    const u = b.unit('rein')!;
    b.startPhase('player');
    u.hp = 5;
    b.nextPhase();
    b.startPhase('enemy');
    b.nextPhase();
    const fx = b.startPhase('player');
    expect(fx.some((f) => f.kind === 'rest' && f.uid === 'rein')).toBe(true);
    expect(u.hp).toBeGreaterThan(5);
    expect(u.hp).toBeLessThanOrEqual(maxHp(u));
    void derived;
  });
});

describe('胜利条件变更', () => {
  it('Boss 击破事件改变胜利条件时不会提前胜利', async () => {
    const { Battle } = await import('@/game/battle/battle');
    const { testChapter } = await import('./helpers');
    const ch = testChapter(['.....', '.....', '.....'], [
      { id: 'rein', character: 'rein', team: 'player', x: 0, y: 0 },
      { id: 'boss', classId: 'soldier', level: 1, team: 'enemy', x: 4, y: 2 },
    ], {
      victory: { type: 'boss', unit: 'boss' },
      events: [
        {
          id: 'phase2',
          when: { on: 'defeat', unit: 'boss' },
          do: [
            { do: 'spawn', units: [{ id: 'boss2', classId: 'soldier', level: 1, team: 'enemy', x: 4, y: 0 }] },
            { do: 'objective', text: '击败第二形态', victory: { type: 'boss', unit: 'boss2' } },
          ],
        },
      ],
    });
    const b = new Battle(ch, [], [], {}, 1);
    const boss = b.unit('boss')!;
    boss.hp = 0;
    const priv = b as unknown as { onDeath(u: unknown, out: unknown): void; emptyOutcome(k: string, u: unknown): unknown };
    priv.onDeath(boss, priv.emptyOutcome('attack', b.unit('rein')));
    expect(b.outcome).toBeNull();
    expect(b.victory).toEqual({ type: 'boss', unit: 'boss2' });
  });
});

describe('战斗中换装', () => {
  it('背包中的武器可以与当前武器交换', async () => {
    const { Battle } = await import('@/game/battle/battle');
    const { testChapter } = await import('./helpers');
    const ch = testChapter(['.....'], [{ id: 'gren', character: 'gren', team: 'player', x: 0, y: 0, items: ['steel_axe', 'herb'] }]);
    const b = new Battle(ch, [], [], {}, 1);
    const g = b.unit('gren')!;
    const before = g.equipment.weapon;
    expect(b.equipFromBag(g, 0)).toBe(true);
    expect(g.equipment.weapon).toBe('steel_axe');
    expect(g.items).toContain(before);
    // 不能装备的道具
    expect(b.equipFromBag(g, g.items.indexOf('herb'))).toBe(false);
  });
});

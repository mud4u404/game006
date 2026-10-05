/**
 * 道具数据：武器、防具、饰品、消耗品、转职道具、宝物
 * 武器的会心率、附加状态等「隐藏属性」在本作中全部明示。
 */
import type { ItemDef, WeaponData } from './types';

const W = (
  id: string,
  name: string,
  price: number,
  w: WeaponData,
  desc: string,
  extra: Partial<ItemDef> = {},
): ItemDef => ({ id, name, kind: 'weapon', price, weapon: w, desc, ...extra });

const list: ItemDef[] = [
  /* ================= 剑 ================= */
  W('iron_sword', '铁剑', 400, { type: 'sword', atk: 8, hit: 90, crit: 0, range: [1, 1] }, '朴实耐用的铁剑。'),
  W('steel_sword', '钢剑', 900, { type: 'sword', atk: 11, hit: 85, crit: 0, range: [1, 1] }, '锻造精良的钢剑。'),
  W('silver_sword', '银剑', 2200, { type: 'sword', atk: 15, hit: 85, crit: 0, range: [1, 1] }, '以秘银镀刃的名剑。', { rarity: 2 }),
  W('killing_edge', '断魂剑', 1800, { type: 'sword', atk: 10, hit: 80, crit: 30, range: [1, 1] }, '专攻要害的利刃，会心率极高。', { rarity: 2 }),
  W('armorslayer', '斩铁剑', 1200, { type: 'sword', atk: 9, hit: 80, crit: 0, range: [1, 1], effective: ['armored'] }, '能劈开重铠的厚刃剑，对重装单位有特效。'),
  W('wind_sword', '风刃剑', 2000, { type: 'sword', atk: 9, hit: 85, crit: 5, range: [1, 2], magic: false }, '挥出的剑气可以伤及两格之外。', { rarity: 2 }),
  W('crimson_blade', '赤鳞剑', 0, { type: 'sword', atk: 12, hit: 90, crit: 10, range: [1, 1], element: 'fire', effective: ['dragon'] }, '赤鳞骑士团代代相传的佩剑，剑身镌刻着古龙之鳞。对龙族有特效。', { rarity: 3, personal: 'rein' }),
  W('oath_sword', '誓约圣剑', 0, { type: 'sword', atk: 20, hit: 95, crit: 15, range: [1, 1], element: 'fire', effective: ['dragon', 'undead'], bonus: { def: 3, res: 3 } }, '与赤龙重缔誓约后觉醒的圣剑。对龙族与不死系有特效。', { rarity: 4, personal: 'rein' }),
  W('black_flame_sword', '黑炎剑', 0, { type: 'sword', atk: 16, hit: 85, crit: 10, range: [1, 1], element: 'dark', drain: true }, '西格的佩剑，黑色的火焰会吞噬敌人的生命。', { rarity: 3, personal: 'sieg' }),
  W('moon_blade', '月影刀', 0, { type: 'sword', atk: 13, hit: 95, crit: 25, range: [1, 1] }, '一柄刀身细长的异国刀，据说能斩断月光。', { rarity: 3, personal: 'raven' }),
  W('demon_sword', '噬魂魔剑', 0, { type: 'sword', atk: 17, hit: 75, crit: 5, range: [1, 1], element: 'dark', drain: true }, '被诅咒的魔剑，以敌人的生命为食。', { rarity: 3 }),

  /* ================= 枪 ================= */
  W('iron_lance', '铁枪', 450, { type: 'lance', atk: 9, hit: 80, crit: 0, range: [1, 1] }, '标准的铁枪。'),
  W('steel_lance', '钢枪', 1000, { type: 'lance', atk: 12, hit: 75, crit: 0, range: [1, 1] }, '沉重的钢枪。'),
  W('silver_lance', '银枪', 2400, { type: 'lance', atk: 16, hit: 75, crit: 0, range: [1, 1] }, '银光闪耀的骑枪。', { rarity: 2 }),
  W('javelin', '标枪', 700, { type: 'lance', atk: 7, hit: 70, crit: 0, range: [1, 2] }, '可以投掷的短枪，射程 1~2。'),
  W('horseslayer', '破骑枪', 1300, { type: 'lance', atk: 10, hit: 70, crit: 0, range: [1, 1], effective: ['cavalry'] }, '带钩的长枪，对骑兵有特效。'),
  W('spear', '投矛', 2000, { type: 'lance', atk: 12, hit: 70, crit: 5, range: [1, 2] }, '精钢投矛，射程 1~2。', { rarity: 2 }),
  W('sky_lance', '天马之枪', 0, { type: 'lance', atk: 13, hit: 85, crit: 5, range: [1, 1], bonus: { res: 3 } }, '北境天马骑士团的传承之枪。', { rarity: 3, personal: 'sera' }),

  /* ================= 斧 ================= */
  W('iron_axe', '铁斧', 400, { type: 'axe', atk: 10, hit: 70, crit: 0, range: [1, 1] }, '沉重的铁斧，命中较低。'),
  W('steel_axe', '钢斧', 950, { type: 'axe', atk: 13, hit: 65, crit: 0, range: [1, 1] }, '锋利的钢斧。'),
  W('silver_axe', '银斧', 2300, { type: 'axe', atk: 17, hit: 65, crit: 0, range: [1, 1] }, '银光凛凛的战斧。', { rarity: 2 }),
  W('hand_axe', '手斧', 650, { type: 'axe', atk: 8, hit: 60, crit: 0, range: [1, 2] }, '可以投掷的手斧，射程 1~2。'),
  W('boomerang_axe', '回旋斧', 1700, { type: 'axe', atk: 11, hit: 65, crit: 5, range: [1, 2] }, '掷出后会飞回手中的弯刃斧，射程 1~2。', { rarity: 2 }),
  W('hammer', '战锤', 1100, { type: 'axe', atk: 11, hit: 60, crit: 0, range: [1, 1], effective: ['armored'] }, '能砸碎铠甲的重锤，对重装单位有特效。'),
  W('killer_axe', '断首斧', 1800, { type: 'axe', atk: 12, hit: 60, crit: 30, range: [1, 1] }, '刽子手的大斧，会心率极高。', { rarity: 2 }),
  W('mountain_cleaver', '山岳之斧', 0, { type: 'axe', atk: 18, hit: 70, crit: 10, range: [1, 1], bonus: { def: 2 } }, '山地氏族的族长之斧。', { rarity: 3 }),

  /* ================= 弓（对飞行单位有特效） ================= */
  W('short_bow', '短弓', 350, { type: 'bow', atk: 6, hit: 90, crit: 0, range: [2, 2], effective: ['flying'] }, '轻巧的短弓。对飞行单位有特效。'),
  W('iron_bow', '铁弓', 550, { type: 'bow', atk: 8, hit: 85, crit: 0, range: [2, 2], effective: ['flying'] }, '标准的铁弓。对飞行单位有特效。'),
  W('steel_bow', '钢弓', 1100, { type: 'bow', atk: 11, hit: 80, crit: 0, range: [2, 2], effective: ['flying'] }, '强劲的钢弓。对飞行单位有特效。'),
  W('silver_bow', '银弓', 2500, { type: 'bow', atk: 14, hit: 80, crit: 0, range: [2, 2], effective: ['flying'] }, '以秘银为弦的名弓。对飞行单位有特效。', { rarity: 2 }),
  W('longbow', '长弓', 1500, { type: 'bow', atk: 9, hit: 70, crit: 0, range: [2, 3], effective: ['flying'] }, '射程 2~3 的长弓。对飞行单位有特效。'),
  W('killer_bow', '鹰隼弓', 1900, { type: 'bow', atk: 10, hit: 80, crit: 30, range: [2, 2], effective: ['flying'] }, '专射要害的猎弓，会心率极高。', { rarity: 2 }),
  W('forest_bow', '林语之弓', 0, { type: 'bow', atk: 12, hit: 90, crit: 10, range: [2, 3], effective: ['flying'], bonus: { agi: 2 } }, '菲娜父亲留下的猎弓，射程 2~3。', { rarity: 3, personal: 'fina' }),

  /* ================= 匕首 ================= */
  W('knife', '小刀', 300, { type: 'dagger', atk: 5, hit: 95, crit: 5, range: [1, 1] }, '轻便的小刀。'),
  W('dagger', '匕首', 800, { type: 'dagger', atk: 8, hit: 90, crit: 10, range: [1, 1] }, '锋利的匕首。'),
  W('poison_dagger', '毒刃', 900, { type: 'dagger', atk: 6, hit: 85, crit: 5, range: [1, 1], status: { id: 'poison', chance: 40, turns: 3 } }, '淬毒的匕首，有几率使敌人中毒。'),
  W('stiletto', '影刺', 2000, { type: 'dagger', atk: 11, hit: 90, crit: 25, range: [1, 1] }, '刺客惯用的细刃。', { rarity: 2 }),
  W('throwing_knives', '飞刀', 1200, { type: 'dagger', atk: 6, hit: 85, crit: 10, range: [1, 2] }, '一套飞刀，射程 1~2。'),

  /* ================= 杖（近身用，带魔力加成） ================= */
  W('wood_staff', '木杖', 200, { type: 'staff', atk: 2, hit: 80, crit: 0, range: [1, 1], bonus: { mag: 1 } }, '朴素的木杖，魔力 +1。'),
  W('holy_staff', '圣杖', 1500, { type: 'staff', atk: 4, hit: 85, crit: 0, range: [1, 1], bonus: { mag: 3 } }, '镶嵌圣石的法杖，魔力 +3。', { rarity: 2 }),
  W('healing_staff', '慈愈之杖', 2400, { type: 'staff', atk: 3, hit: 85, crit: 0, range: [1, 1], bonus: { mag: 2 }, castSkill: 'mend' }, '杖中蕴藏治愈之力，可不消耗魔力施放「回复」。', { rarity: 3 }),
  W('ember_staff', '圣焰之杖', 0, { type: 'staff', atk: 5, hit: 90, crit: 0, range: [1, 1], bonus: { mag: 4, res: 3 } }, '炎之神殿供奉的法杖，魔力 +4。', { rarity: 3 }),

  /* ================= 魔导书（魔法攻击，射程 1~2） ================= */
  W('fire_tome', '火焰之书', 500, { type: 'tome', atk: 4, hit: 90, crit: 0, range: [1, 2], magic: true, element: 'fire' }, '记载火焰魔法的入门魔导书。'),
  W('thunder_tome', '雷霆之书', 900, { type: 'tome', atk: 6, hit: 80, crit: 5, range: [1, 2], magic: true, element: 'thunder' }, '记载雷霆魔法的魔导书。'),
  W('frost_tome', '寒冰之书', 1200, { type: 'tome', atk: 6, hit: 85, crit: 0, range: [1, 2], magic: true, element: 'ice', status: { id: 'slow', chance: 20, turns: 2 } }, '记载冰霜魔法的魔导书，有几率使敌人迟缓。'),
  W('flame_tome', '烈焰之书', 2200, { type: 'tome', atk: 10, hit: 80, crit: 0, range: [1, 2], magic: true, element: 'fire' }, '记载高阶火焰魔法的魔导书。', { rarity: 2 }),
  W('light_tome', '圣光之书', 1400, { type: 'tome', atk: 6, hit: 90, crit: 5, range: [1, 2], magic: true, element: 'holy', effective: ['undead'] }, '记载圣光魔法的经卷，对不死系有特效。'),
  W('shadow_tome', '暗影之书', 0, { type: 'tome', atk: 6, hit: 85, crit: 0, range: [1, 2], magic: true, element: 'dark' }, '灰烬教团的暗魔法书。'),
  W('ash_tome', '灰烬禁书', 0, { type: 'tome', atk: 12, hit: 85, crit: 5, range: [1, 2], magic: true, element: 'dark' }, '记载灰烬禁咒的古老魔导书。', { rarity: 3 }),
  W('star_tome', '星辉之书', 0, { type: 'tome', atk: 13, hit: 90, crit: 10, range: [1, 3], magic: true, element: 'holy', effective: ['dragon'] }, '卢卡斯恩师留下的星辉魔导书，射程 1~3。', { rarity: 4, personal: 'lucas' }),

  /* ================= 魔物天生武器（不可交易） ================= */
  W('fang', '獠牙', 0, { type: 'fang', atk: 6, hit: 85, crit: 5, range: [1, 1] }, '魔物的獠牙与利爪。'),
  W('stone_fist', '岩拳', 0, { type: 'fang', atk: 10, hit: 70, crit: 0, range: [1, 1] }, '魔像的岩石巨拳。'),
  W('fire_breath', '火息', 0, { type: 'breath', atk: 5, hit: 85, crit: 0, range: [1, 2], magic: true, element: 'fire' }, '喷吐的火焰。'),
  W('dragon_breath', '龙息', 0, { type: 'breath', atk: 9, hit: 90, crit: 5, range: [1, 2], magic: true, element: 'fire' }, '赤龙的火焰吐息。', { rarity: 4, personal: 'igna' }),
  W('ash_dragon_breath', '灰烬吐息', 0, { type: 'breath', atk: 14, hit: 90, crit: 5, range: [1, 3], magic: true, element: 'dark' }, '黑龙的灰烬之焰。'),

  /* ================= 防具 ================= */
  { id: 'travel_cloak', name: '旅行斗篷', kind: 'armor', price: 150, desc: '厚实的布斗篷。', armor: { type: 'cloth', def: 1, res: 2 } },
  { id: 'mage_robe', name: '法袍', kind: 'armor', price: 500, desc: '织入护咒的法袍。', armor: { type: 'cloth', def: 2, res: 4 } },
  { id: 'nun_habit', name: '修女服', kind: 'armor', price: 450, desc: '受过祝福的修女服。', armor: { type: 'cloth', def: 2, res: 5 } },
  { id: 'sage_robe', name: '贤者长袍', kind: 'armor', price: 1800, desc: '贤者所穿的长袍，魔防出众。', armor: { type: 'cloth', def: 4, res: 8, bonus: { mag: 1 } }, rarity: 2 },
  { id: 'holy_vestment', name: '圣衣', kind: 'armor', price: 0, desc: '以圣火之丝织成的法衣。', armor: { type: 'cloth', def: 6, res: 11, bonus: { mag: 2 } }, rarity: 3 },
  { id: 'leather_armor', name: '皮甲', kind: 'armor', price: 300, desc: '轻便的皮甲。', armor: { type: 'light', def: 3, res: 1 } },
  { id: 'studded_leather', name: '镶钉皮甲', kind: 'armor', price: 650, desc: '镶有铁钉的皮甲。', armor: { type: 'light', def: 5, res: 1 } },
  { id: 'chain_mail', name: '锁子甲', kind: 'armor', price: 1100, desc: '以铁环编成的锁甲，稍重。', armor: { type: 'light', def: 7, res: 1, ev: -2 } },
  { id: 'steel_cuirass', name: '精钢胸甲', kind: 'armor', price: 1900, desc: '精钢打造的胸甲。', armor: { type: 'light', def: 9, res: 2, ev: -2 }, rarity: 2 },
  { id: 'mithril_mail', name: '秘银轻甲', kind: 'armor', price: 3200, desc: '轻若无物的秘银铠甲。', armor: { type: 'light', def: 11, res: 5, ev: 2 }, rarity: 3 },
  { id: 'iron_plate', name: '铁铠', kind: 'armor', price: 900, desc: '厚重的铁制全身铠。', armor: { type: 'heavy', def: 8, res: 0, ev: -5 } },
  { id: 'steel_plate', name: '钢铠', kind: 'armor', price: 1800, desc: '坚固的钢制全身铠。', armor: { type: 'heavy', def: 11, res: 1, ev: -6 } },
  { id: 'knight_plate', name: '骑士铠', kind: 'armor', price: 2800, desc: '骑士团的制式重铠，兼顾魔防。', armor: { type: 'heavy', def: 13, res: 3, ev: -5 }, rarity: 2 },
  { id: 'dragonscale_plate', name: '龙鳞铠', kind: 'armor', price: 0, desc: '以古龙蜕下的鳞片锻成的铠甲。', armor: { type: 'heavy', def: 16, res: 7, ev: -3 }, rarity: 4 },

  /* ================= 饰品 ================= */
  { id: 'power_charm', name: '力量护符', kind: 'accessory', price: 1200, desc: '力量 +2。', accessory: { bonus: { atk: 2 } } },
  { id: 'guard_ring', name: '守护戒指', kind: 'accessory', price: 1200, desc: '体质 +2。', accessory: { bonus: { def: 2 } } },
  { id: 'swift_boots', name: '疾风之靴', kind: 'accessory', price: 2500, desc: '移动 +1。', accessory: { bonus: { mov: 1 } }, rarity: 2 },
  { id: 'wisdom_earring', name: '智慧耳环', kind: 'accessory', price: 1200, desc: '魔力 +2。', accessory: { bonus: { mag: 2 } } },
  { id: 'spirit_amulet', name: '圣灵护符', kind: 'accessory', price: 1000, desc: '魔防 +3。', accessory: { bonus: { res: 3 } } },
  { id: 'feather_charm', name: '轻羽坠饰', kind: 'accessory', price: 1000, desc: '敏捷 +2。', accessory: { bonus: { agi: 2 } } },
  { id: 'life_ring', name: '生命指环', kind: 'accessory', price: 2200, desc: '每回合开始回复 10% 生命。', accessory: { bonus: {}, special: 'regen' }, rarity: 2 },
  { id: 'mana_orb', name: '魔力宝珠', kind: 'accessory', price: 2000, desc: '每回合开始回复 3 点魔力值。', accessory: { bonus: { mp: 5 }, special: 'mp_regen' }, rarity: 2 },
  { id: 'scholar_badge', name: '求知徽章', kind: 'accessory', price: 0, desc: '获得的经验值 +50%。', accessory: { bonus: {}, special: 'exp_up' }, rarity: 3 },
  { id: 'hawk_eye', name: '鹰之眼', kind: 'accessory', price: 0, desc: '会心率 +15。', accessory: { bonus: {}, special: 'crit_up' }, rarity: 3 },
  { id: 'pure_charm', name: '净化护符', kind: 'accessory', price: 1600, desc: '免疫中毒、沉睡、沉默、迟缓。', accessory: { bonus: {}, special: 'immune' }, rarity: 2 },
  { id: 'knight_crest', name: '骑士纹章', kind: 'accessory', price: 0, desc: '赤鳞骑士团的纹章。力量 +1，体质 +1，魔防 +1。', accessory: { bonus: { atk: 1, def: 1, res: 1 } }, rarity: 2 },

  /* ================= 消耗品 ================= */
  { id: 'herb', name: '伤药', kind: 'consumable', price: 100, desc: '回复 15 点生命。可给相邻同伴使用。', consumable: { effect: 'heal', amount: 15, range: 1 } },
  { id: 'potion', name: '高级伤药', kind: 'consumable', price: 350, desc: '回复 35 点生命。可给相邻同伴使用。', consumable: { effect: 'heal', amount: 35, range: 1 } },
  { id: 'elixir', name: '万灵药', kind: 'consumable', price: 1500, desc: '完全回复生命与魔力值。', consumable: { effect: 'elixir', range: 1 }, rarity: 2 },
  { id: 'ether', name: '魔力水', kind: 'consumable', price: 300, desc: '回复 15 点魔力值。', consumable: { effect: 'mp', amount: 15, range: 0 } },
  { id: 'antidote', name: '解毒草', kind: 'consumable', price: 80, desc: '解除中毒等异常状态。', consumable: { effect: 'cure', range: 1 } },
  { id: 'chest_key', name: '宝箱钥匙', kind: 'key', price: 200, desc: '可以打开一个宝箱。', consumable: { effect: 'key', range: 0 } },
  { id: 'power_tonic', name: '力量药水', kind: 'consumable', price: 0, desc: '永久提升力量 2 点。', consumable: { effect: 'stat_up', stat: 'atk', amount: 2, range: 0 }, rarity: 3 },
  { id: 'guard_tonic', name: '体质药水', kind: 'consumable', price: 0, desc: '永久提升体质 2 点。', consumable: { effect: 'stat_up', stat: 'def', amount: 2, range: 0 }, rarity: 3 },
  { id: 'speed_tonic', name: '疾风药水', kind: 'consumable', price: 0, desc: '永久提升敏捷 2 点。', consumable: { effect: 'stat_up', stat: 'agi', amount: 2, range: 0 }, rarity: 3 },
  { id: 'wisdom_tonic', name: '智慧药水', kind: 'consumable', price: 0, desc: '永久提升魔力 2 点。', consumable: { effect: 'stat_up', stat: 'mag', amount: 2, range: 0 }, rarity: 3 },
  { id: 'spirit_tonic', name: '圣灵药水', kind: 'consumable', price: 0, desc: '永久提升魔防 2 点。', consumable: { effect: 'stat_up', stat: 'res', amount: 2, range: 0 }, rarity: 3 },
  { id: 'life_fruit', name: '生命之实', kind: 'consumable', price: 0, desc: '永久提升生命上限 7 点。', consumable: { effect: 'stat_up', stat: 'hp', amount: 7, range: 0 }, rarity: 3 },
  { id: 'mana_crystal', name: '魔力水晶', kind: 'consumable', price: 0, desc: '永久提升魔力值上限 7 点。', consumable: { effect: 'stat_up', stat: 'mp', amount: 7, range: 0 }, rarity: 3 },
  { id: 'wind_feather', name: '疾风之羽', kind: 'consumable', price: 0, desc: '永久提升移动 1 点。', consumable: { effect: 'stat_up', stat: 'mov', amount: 1, range: 0 }, rarity: 4 },

  /* ================= 转职道具（隐藏职业） ================= */
  { id: 'saint_ring', name: '圣誓指环', kind: 'promotion', price: 0, desc: '修女或魔法师持有此物在教会转职时，可成为「圣者」。', promotion: ['cleric', 'mage'], rarity: 4 },
  { id: 'berserk_seal', name: '血誓徽记', kind: 'promotion', price: 0, desc: '战士持有此物在教会转职时，可成为「狂战士」。', promotion: ['fighter'], rarity: 4 },
  { id: 'ranger_cloak', name: '游侠披风', kind: 'promotion', price: 0, desc: '弓手持有此物在教会转职时，可成为「游侠」。', promotion: ['archer'], rarity: 4 },
  { id: 'wyrm_egg', name: '幼龙之卵', kind: 'promotion', price: 0, desc: '骑士持有此物在教会转职时，可成为「龙骑士」。', promotion: ['cavalier'], rarity: 4 },
  { id: 'shadow_cloak', name: '影之斗篷', kind: 'promotion', price: 0, desc: '盗贼持有此物在教会转职时，可成为「侠盗」。', promotion: ['thief'], rarity: 4 },

  /* ================= 宝物 ================= */
  { id: 'dragon_scale', name: '龙鳞残片', kind: 'treasure', price: 0, desc: '散落各地的赤龙之鳞，微微发烫。据说集齐六片，便能唤回古龙真正的力量。', rarity: 4 },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const it = ITEMS[id];
  if (!it) throw new Error(`未知道具: ${id}`);
  return it;
}

export const RARITY_COLORS = ['#e8e2d0', '#e8e2d0', '#7fd4ff', '#d49bff', '#ffc44d'];

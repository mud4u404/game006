/**
 * 第三章 白鸥港
 * 港城领主法尔克男爵勾结教团，封锁港口、强征贫民为帝国造船。
 * 魔导学院的卢卡斯与港城小偷琪雅在此加入。
 */
import type { ChapterDef } from '../types';
import { npcUnit } from '../npcs';

export const ch03: ChapterDef = {
  id: 'ch03',
  index: 3,
  label: '第三章',
  title: '白鸥港',
  quote: '「贵族的金库里，装的都是穷人的面包。」',
  map: {
    theme: 'port_town',
    seed: 43,
    rows: [
      'hh....##########....hh',
      'h.....#__I_K_I_#.....h',
      '......#________#......',
      '..hh..#I______I#..hh..',
      '..hh..####GG####..hh..',
      '......=...==...=......',
      '=======..====..=======',
      '..h...=...==...=...h..',
      '..hh..=..hhhh..=..hh..',
      '......=..hhhh..=......',
      '======================',
      '..h..h..........h..h..',
      'dddddddd....dddddddddd',
      '~~~~~~dd~~~~dd~~~~~~~~',
      '~~~~~~dd~~~~dd~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~',
    ],
  },
  chests: [
    { x: 7, y: 1, item: 'dragon_scale' },
    { x: 14, y: 2, gold: 1500 },
    { x: 7, y: 3, item: 'chest_key' },
  ],
  victory: { type: 'seize', x: 11, y: 1 },
  objectiveText: '雷恩压制领主宅邸的主座',
  deploy: {
    max: 6,
    slots: [
      [9, 12],
      [10, 12],
      [11, 12],
      [8, 12],
      [9, 11],
      [10, 11],
      [11, 11],
    ],
    forced: ['rein'],
  },
  units: [
    { id: 'lucas', character: 'lucas', team: 'ally', x: 4, y: 9, ai: { type: 'hold' }, face: 'n' },
    { id: 'kia', character: 'kia', team: 'ally', x: 17, y: 2, ai: { type: 'hold' }, face: 'w' },
    { id: 'g1', classId: 'soldier', level: 4, team: 'enemy', x: 6, y: 6, ai: { type: 'aggressive' } },
    { id: 'g2', classId: 'soldier', level: 4, team: 'enemy', x: 15, y: 6, ai: { type: 'aggressive' } },
    { id: 'g3', classId: 'soldier', level: 5, team: 'enemy', x: 10, y: 5, ai: { type: 'hold' } },
    { id: 'g4', classId: 'soldier', level: 5, team: 'enemy', x: 11, y: 5, ai: { type: 'hold' } },
    { id: 'a1', classId: 'archer', level: 4, team: 'enemy', x: 3, y: 5, ai: { type: 'hold' } },
    { id: 'a2', classId: 'archer', level: 4, team: 'enemy', x: 18, y: 5, ai: { type: 'hold' } },
    { id: 'c1', classId: 'cavalier', level: 4, team: 'enemy', x: 2, y: 10, ai: { type: 'aggressive' } },
    { id: 'c2', classId: 'cavalier', level: 4, team: 'enemy', x: 19, y: 10, ai: { type: 'aggressive' } },
    { id: 'm1', classId: 'dark_mage', level: 4, team: 'enemy', x: 8, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 'm2', classId: 'dark_mage', level: 5, team: 'enemy', x: 13, y: 2, ai: { type: 'hold' }, portrait: 'cultist' },
    { id: 't1', classId: 'thief', level: 4, team: 'enemy', x: 20, y: 11, ai: { type: 'thief', exit: [21, 6] }, name: '盗贼', drop: 'herb' },
    npcUnit('noble', {
      id: 'faulk',
      name: '法尔克男爵',
      team: 'enemy',
      x: 11,
      y: 1,
      level: 8,
      boss: true,
      ai: { type: 'stationary' },
      statMod: { hp: 8, def: 2 },
      drop: 'guard_ring',
    }),
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        { do: 'camera', x: 4, y: 9 },
        {
          do: 'say',
          lines: [
            { s: 'lucas', t: '我、我说过了！我只是魔导学院的学生，不是什么帝国间谍！', e: 'surprised' },
            { s: 'soldier', t: '少啰嗦！男爵大人有令，可疑的外乡人一律抓起来！', e: 'angry', n: '男爵的卫兵' },
            { s: 'lucas', t: '……好吧。根据《魔导法典》第七条，正当防卫时使用攻击魔法是被允许的。', e: 'determined' },
          ],
        },
        { do: 'camera', x: 17, y: 2 },
        {
          do: 'say',
          lines: [
            { s: 'kia', t: '（嘿嘿，卫兵都被那个书呆子吸引过去了。趁现在，把孩子们的卖身契偷出来——）', e: 'smile' },
            { s: 'rein', t: '卢卡斯……还有那个女孩，都在和男爵的人作对。我们去帮忙！', e: 'determined' },
            { s: 'gren', t: '宅邸里的那个主座，就是男爵的老窝。端掉它，港口就是我们的了。', e: 'normal' },
            { s: '', t: '【提示】敌方盗贼会抢走宝箱并逃走。宅邸里的宝箱要尽快打开。' },
          ],
        },
      ],
    },
    {
      id: 'talk_lucas',
      when: { on: 'talk', a: 'rein', b: 'lucas' },
      if: '!lucas_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'lucas', t: '啊，你们不是卫兵吧？太好了。我是王立魔导学院三年级的卢卡斯。', e: 'smile' },
            { s: 'lucas', t: '我在找我的恩师——学院院长，大魔导师摩尔迪斯。他半年前失踪了，最后的线索就在这座港口。', e: 'thinking' },
            { s: 'rein', t: '我们也在和男爵背后的人作对。一起来吧。', e: 'normal' },
            { s: 'lucas', t: '求之不得！以我的推算，有骑士在前方挡着，我的生存率能提高百分之六十三。', e: 'smile' },
          ],
        },
        { do: 'join', unit: 'lucas' },
        { do: 'flag', flag: 'lucas_joined' },
      ],
    },
    {
      id: 'talk_lucas_alicia',
      when: { on: 'talk', a: 'alicia', b: 'lucas' },
      if: '!lucas_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'alicia', t: '你受伤了！请别动，我来帮你治疗。', e: 'normal' },
            { s: 'lucas', t: '修、修女？……谢谢。我是卢卡斯，魔导学院的学生。我在找失踪的恩师，大魔导师摩尔迪斯。', e: 'surprised' },
            { s: 'alicia', t: '那么，在找到他之前，请和我们同行吧。', e: 'smile' },
          ],
        },
        { do: 'heal', unit: 'lucas' },
        { do: 'join', unit: 'lucas' },
        { do: 'flag', flag: 'lucas_joined' },
      ],
    },
    {
      id: 'talk_kia',
      when: { on: 'talk', a: 'rein', b: 'kia' },
      if: '!kia_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'kia', t: '干嘛！你也是来抓我的？穿得那么体面，一看就是贵族家的少爷。', e: 'angry' },
            { s: 'rein', t: '我是孤儿，被骑士团收养长大的。我们是来打倒男爵的。', e: 'normal' },
            { s: 'kia', t: '……孤儿？你？', e: 'surprised' },
            { s: 'kia', t: '那个混蛋男爵把我们院里的孩子抓去码头做苦工。我要偷出他们的卖身契，烧个精光！', e: 'determined' },
            { s: 'rein', t: '那就一起。你开锁，我们开路。', e: 'determined' },
            { s: 'kia', t: '……哼，随你。我叫琪雅。先说好，宝箱里的东西我要分一半！', e: 'smile' },
          ],
        },
        { do: 'join', unit: 'kia' },
        { do: 'flag', flag: 'kia_joined' },
      ],
    },
    {
      id: 'talk_kia_gren',
      when: { on: 'talk', a: 'gren', b: 'kia' },
      if: '!kia_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'gren', t: '喂，小猫。刚才在码头摸走洛伊钱袋的，是你吧。', e: 'smile' },
            { s: 'kia', t: '……是又怎样。你要抢回去？', e: 'angry' },
            { s: 'gren', t: '不。我要雇你。男爵的金库，你比我们熟。分成三七。', e: 'normal' },
            { s: 'kia', t: '我七？……成交！大叔你人还不错嘛。', e: 'smile' },
          ],
        },
        { do: 'join', unit: 'kia' },
        { do: 'flag', flag: 'kia_joined' },
      ],
    },
    {
      id: 'reinforce',
      when: { on: 'turn', turn: 4, phase: 'enemy' },
      do: [
        { do: 'camera', x: 21, y: 6 },
        {
          do: 'spawn',
          units: [
            { id: 'rg1', classId: 'soldier', level: 5, team: 'enemy', x: 21, y: 6, ai: { type: 'aggressive' } },
            { id: 'rg2', classId: 'cavalier', level: 5, team: 'enemy', x: 21, y: 10, ai: { type: 'aggressive' } },
            { id: 'rg3', classId: 'archer', level: 4, team: 'enemy', x: 0, y: 6, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'noble', t: '还愣着干什么！把那群乡巴佬全部扔进海里！', e: 'angry', n: '法尔克男爵' }] },
      ],
    },
    {
      id: 'near_faulk',
      when: { on: 'enter', area: [7, 1, 14, 3], team: 'player' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'noble', t: '放肆！这里是法尔克男爵的宅邸！埃德蒙公爵大人会让你们——', e: 'angry', n: '法尔克男爵' },
            { s: 'balder', t: '埃德蒙公爵？……摄政大人的名字，可不是你这种人能随便挂在嘴上的。', e: 'thinking' },
            { s: 'noble', t: '哼！等王都的大人物们和教团谈妥了，你们这些赤鳞骑士团的余孽，统统都要上绞架！', e: 'smile', n: '法尔克男爵' },
          ],
        },
      ],
    },
    {
      id: 'faulk_down',
      when: { on: 'defeat', unit: 'faulk' },
      do: [{ do: 'say', lines: [{ s: 'noble', t: '我的……金币……我的船……', e: 'hurt', n: '法尔克男爵' }] }],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [10, 11], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 10, y: 11, face: 'n' },
        { id: 'loy', look: 'loy', x: 11, y: 11, face: 'n' },
        { id: 'gren', look: 'gren', x: 9, y: 11, face: 'n' },
        { id: 'balder', look: 'balder', x: 10, y: 12, face: 'n' },
        { id: 'alicia', look: 'alicia', x: 11, y: 12, face: 'n' },
        { id: 'fina', look: 'fina', x: 9, y: 12, face: 'n' },
        { id: 'otto', look: 'otto', x: 12, y: 11, face: 'w' },
      ],
      lines: [
        { cmd: 'caption', text: '王国西南 · 白鸥港', sub: '大陆南岸最大的港口' },
        { s: 'balder', t: '帝国的「铁壁」格雷戈已经堵住了通往王都的大道。我们改走海路，沿海岸北上，再翻过霜脊山。', e: 'normal' },
        { s: 'gren', t: '所以要找船。正好，这里有我的老熟人。', e: 'smile' },
        { s: 'otto', t: '格伦！你这独眼龙居然还活着！……这几位是？', e: 'smile' },
        { s: 'gren', t: '雇主。奥托，我们要一条往北的船。', e: 'normal' },
        { s: 'otto', t: '往北？哎哟，你们来得真不巧。港口被法尔克男爵封了，所有的船都被扣下来给帝国造军舰。', e: 'sad' },
        { s: 'otto', t: '男爵还从贫民窟抓人去码头做苦工——连孤儿院的孩子都没放过。听说宅邸里还住着几个穿灰袍的客人……', e: 'thinking' },
        { s: 'fina', t: '灰袍——是教团！', e: 'angry' },
        { s: 'loy', t: '咦……？我的钱袋呢！？刚才还在腰上的！', e: 'surprised' },
        { s: 'otto', t: '啊，八成是「港城的野猫」。那丫头手快得很……不过她偷来的钱，听说都拿去养孤儿了。', e: 'smile' },
        { s: 'rein', t: '……副团长。', e: 'determined' },
        { s: 'balder', t: '知道了知道了。反正要船，就得先把男爵从他的椅子上请下来。', e: 'smile' },
        { s: 'otto', t: '要是你们真能办到，我奥托的商船随时为你们起锚！这些物资你们先拿去用！', e: 'smile' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [11, 3], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'rein', look: 'rein', x: 11, y: 2, face: 's' },
        { id: 'kia', look: 'kia', x: 10, y: 3, face: 'e' },
        { id: 'lucas', look: 'lucas', x: 12, y: 3, face: 'w' },
        { id: 'child', look: 'child', x: 9, y: 3, face: 'e' },
        { id: 'otto', look: 'otto', x: 11, y: 5, face: 'n' },
      ],
      lines: [
        { s: 'child', t: '琪雅姐姐！', e: 'smile' },
        { s: 'kia', t: '笨蛋，哭什么。卖身契我已经烧了，你们自由了。……回院里去，等我买面包回来。', e: 'smile' },
        { s: 'rein', t: '琪雅。接下来你打算怎么办？', e: 'normal' },
        { s: 'kia', t: '……男爵背后还有个什么公爵，还有那些灰袍子。只要他们还在，孩子们就还会被抓走。', e: 'thinking' },
        { s: 'kia', t: '我跟你们走。……别误会，我只是看在分赃的份上！', e: 'angry' },
        { s: 'lucas', t: '宅邸的书房里有教团的信件。他们在找一个叫「守印巫女」的人……还提到了「大主教」的名字。', e: 'thinking' },
        { s: 'lucas', t: '……可惜签名被烧掉了。不过信纸上的魔力痕迹，我好像在哪里见过。', e: 'thinking' },
        { s: 'otto', t: '船准备好了！北上的航线我熟——只是最近海上不太平，听说有飞龙在海岸出没。', e: 'normal' },
        { s: 'balder', t: '飞龙……帝国的龙骑兵。出发吧，在他们堵住海路之前。', e: 'determined' },
      ],
    },
  ],
  recruitAfter: ['lucas', 'kia'],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 800, items: ['potion', 'antidote'] },
  shop: ['iron_sword', 'steel_sword', 'iron_lance', 'iron_axe', 'iron_bow', 'fire_tome', 'herb', 'potion', 'antidote', 'leather_armor', 'chain_mail', 'chest_key'],
  camp: 'full',
};

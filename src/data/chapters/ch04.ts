/**
 * 第四章 怒涛海岸
 * 北上的商船遭帝国飞龙骑兵袭击，在北方海岸搁浅。
 * 天马骑士赛拉坠落于此；教团雇来的剑客雷文，竟是琪雅失散多年的哥哥。
 */
import type { ChapterDef } from '../types';

export const ch04: ChapterDef = {
  id: 'ch04',
  index: 4,
  label: '第四章',
  title: '怒涛海岸',
  quote: '「风暴会过去。重要的是，风暴过去时你站在谁的身边。」',
  map: {
    theme: 'coast',
    seed: 54,
    rows: [
      '~~~~~~sss..nnMMMnn..TT',
      '~~~~~sss....nMMn....TT',
      '~~~~sss...........n.TT',
      '~~~~ss....rr.....nn..T',
      '~~~dddss.........n....',
      '~~~ddddss...F.........',
      '~~~~dddss......nn.....',
      '~~~~~sss......nnn..TT.',
      '~~~~~ss..........TTTT.',
      '~~~~sss....rr.....TT..',
      '~~~~ss..............nn',
      '~~~sss.....CC.......nM',
      '~~~ss......CCC.....nMM',
      '~~sss.......C.....nMMM',
      '~~ss..............nMMM',
      '~~ss.............nnMMM',
    ],
  },
  hidden: [{ x: 3, y: 4, item: 'dragon_scale' }],
  victory: { type: 'survive', turns: 8 },
  objectiveText: '坚守 8 回合（或击败龙骑兵长 赫尔加）',
  deploy: {
    max: 8,
    slots: [
      [5, 5],
      [6, 5],
      [4, 5],
      [5, 4],
      [5, 6],
      [6, 6],
      [7, 5],
      [4, 4],
      [7, 4],
    ],
    forced: ['rein'],
  },
  units: [
    { id: 'sera', character: 'sera', team: 'ally', x: 12, y: 5, ai: { type: 'hold' }, face: 'w', statMod: { hp: -8 } },
    { id: 'raven', character: 'raven', team: 'enemy', x: 16, y: 9, ai: { type: 'hold' }, face: 'w' },
    { id: 'w1', classId: 'wyvern_rider', level: 5, team: 'enemy', x: 14, y: 2, ai: { type: 'aggressive' } },
    { id: 'w2', classId: 'wyvern_rider', level: 5, team: 'enemy', x: 10, y: 8, ai: { type: 'aggressive' } },
    { id: 's1', classId: 'soldier', level: 5, team: 'enemy', x: 18, y: 4, ai: { type: 'aggressive' } },
    { id: 's2', classId: 'soldier', level: 5, team: 'enemy', x: 19, y: 10, ai: { type: 'aggressive' } },
    { id: 'a1', classId: 'archer', level: 5, team: 'enemy', x: 17, y: 3, ai: { type: 'hold' } },
    { id: 'm1', classId: 'dark_mage', level: 5, team: 'enemy', x: 12, y: 9, ai: { type: 'aggressive' }, portrait: 'cultist' },
    {
      id: 'helga',
      classId: 'wyvern_lord',
      level: 6,
      team: 'enemy',
      x: 19,
      y: 1,
      name: '龙骑兵长 赫尔加',
      portrait: 'soldier',
      boss: true,
      ai: { type: 'wait', turn: 4 },
      statMod: { hp: 6 },
      drop: 'wyrm_egg',
      model: { gender: 'f' },
    },
  ],
  events: [
    {
      id: 'start',
      when: { on: 'start' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'balder', t: '船底被撞穿了。所有人下船，背靠海岸布阵！', e: 'determined' },
            { s: 'lucas', t: '飞龙的数量……至少一个中队。帝国是认真的。', e: 'surprised' },
            { s: 'fina', t: '飞在天上的交给我！弓箭对飞龙最有效了！', e: 'determined' },
          ],
        },
        { do: 'camera', x: 12, y: 5 },
        {
          do: 'say',
          lines: [
            { s: 'sera', t: '……咳。北境天马骑士团，赛拉……还能战斗。', e: 'hurt' },
            { s: 'alicia', t: '那个骑士受伤了！我们得去帮她！', e: 'surprised' },
          ],
        },
        { do: 'camera', x: 16, y: 9 },
        {
          do: 'say',
          lines: [
            { s: 'raven', t: '……目标是那个修女。其余的人，挡路就斩。', e: 'normal' },
            { s: 'kia', t: '（那把刀……那个背影……不会吧……）', e: 'surprised' },
            { s: '', t: '【提示】坚守 8 回合即可胜利。伙伴靠近某些敌人时，或许可以「交谈」。' },
          ],
        },
      ],
    },
    {
      id: 'talk_sera',
      when: { on: 'talk', a: 'rein', b: 'sera' },
      if: '!sera_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'rein', t: '你没事吧？我们是洛斯坦的赤鳞骑士团！', e: 'normal' },
            { s: 'sera', t: '赤鳞……！太好了，我正是要去洛斯坦报信的。', e: 'surprised' },
            { s: 'sera', t: '诺斯加德已经陷落了。帝国的龙骑兵追了我三天三夜……我的同伴们，全都……', e: 'sad' },
            { s: 'sera', t: '……现在不是哭的时候。请让我与你们并肩作战。', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'sera' },
        { do: 'flag', flag: 'sera_joined' },
      ],
    },
    {
      id: 'talk_sera_alicia',
      when: { on: 'talk', a: 'alicia', b: 'sera' },
      if: '!sera_joined',
      do: [
        {
          do: 'say',
          lines: [
            { s: 'alicia', t: '请不要动，伤口还在流血……圣火啊，请治愈她。', e: 'determined' },
            { s: 'sera', t: '……谢谢你，修女。我是诺斯加德天马骑士团的赛拉。我会用这杆枪，报答你的恩情。', e: 'smile' },
          ],
        },
        { do: 'heal', unit: 'sera' },
        { do: 'join', unit: 'sera' },
        { do: 'flag', flag: 'sera_joined' },
      ],
    },
    {
      id: 'talk_raven_kia',
      when: { on: 'talk', a: 'kia', b: 'raven' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'kia', t: '……哥。是你吧，雷文哥哥。', e: 'sad' },
            { s: 'raven', t: '……琪雅？', e: 'surprised' },
            { s: 'kia', t: '八年了。你说要去东边赚大钱，回来就带我们住大房子。……结果你就在这里，帮那些灰袍子抓人？', e: 'angry' },
            { s: 'raven', t: '……我寄回去的钱，你们收到了吗。', e: 'sad' },
            { s: 'kia', t: '收到了！每一枚都收到了！可我想要的不是钱，是你回来啊，笨蛋！！', e: 'angry' },
            { s: 'raven', t: '……', e: 'sad' },
            { s: 'raven', t: '教团的佣金，我不要了。……从今天起，我的刀只为你挥。', e: 'determined' },
          ],
        },
        { do: 'join', unit: 'raven' },
        { do: 'flag', flag: 'raven_joined' },
      ],
    },
    {
      id: 'talk_raven_rein',
      when: { on: 'talk', a: 'rein', b: 'raven' },
      do: [
        {
          do: 'say',
          lines: [
            { s: 'raven', t: '赤鳞的骑士。我对你们没有私怨，但收了钱，就得办事。', e: 'normal' },
            { s: 'rein', t: '那你知道你要抓的是什么人吗？教团想用她的血解开黑龙的封印！', e: 'angry' },
            { s: 'raven', t: '……与我无关。我只在乎能寄回家的钱。', e: 'normal' },
            { s: 'rein', t: '（家……？这个人，也有想守护的人吗……）', e: 'thinking' },
          ],
        },
      ],
    },
    {
      id: 'r2',
      when: { on: 'turn', turn: 2, phase: 'enemy' },
      do: [
        { do: 'spawn', units: [{ id: 'rw1', classId: 'wyvern_rider', level: 5, team: 'enemy', x: 1, y: 9, ai: { type: 'aggressive' } }] },
        { do: 'say', lines: [{ s: 'fina', t: '海面上还有一只！从背后过来了！', e: 'surprised' }] },
      ],
    },
    {
      id: 'r3',
      when: { on: 'turn', turn: 3, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rs1', classId: 'soldier', level: 5, team: 'enemy', x: 21, y: 4, ai: { type: 'aggressive' } },
            { id: 'rs2', classId: 'soldier', level: 6, team: 'enemy', x: 21, y: 5, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'helga_go',
      when: { on: 'turn', turn: 4, phase: 'enemy' },
      do: [
        { do: 'camera', x: 19, y: 1 },
        {
          do: 'say',
          lines: [
            { s: 'soldier', t: '一群落水狗，竟然让我的龙骑兵吃了亏？我亲自来收拾你们！', e: 'angry', n: '赫尔加' },
            { s: 'sera', t: '那个女人……就是她，烧毁了诺斯加德的天马厩舍！', e: 'angry' },
          ],
        },
      ],
    },
    {
      id: 'r5',
      when: { on: 'turn', turn: 5, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rw2', classId: 'wyvern_rider', level: 6, team: 'enemy', x: 21, y: 0, ai: { type: 'aggressive' } },
            { id: 'rc1', classId: 'cavalier', level: 6, team: 'enemy', x: 21, y: 6, ai: { type: 'aggressive' } },
          ],
        },
      ],
    },
    {
      id: 'r6',
      when: { on: 'turn', turn: 6, phase: 'enemy' },
      do: [
        {
          do: 'spawn',
          units: [
            { id: 'rm1', classId: 'dark_mage', level: 6, team: 'enemy', x: 21, y: 9, ai: { type: 'aggressive' }, portrait: 'cultist' },
            { id: 'rs3', classId: 'soldier', level: 6, team: 'enemy', x: 21, y: 8, ai: { type: 'aggressive' } },
            { id: 'ww1', classId: 'wild_wyvern', level: 5, team: 'enemy', x: 0, y: 2, ai: { type: 'aggressive' } },
          ],
        },
        { do: 'say', lines: [{ s: 'lucas', t: '野生飞龙也被血腥味引来了……再撑两个回合！', e: 'determined' }] },
      ],
    },
    {
      id: 'helga_down',
      when: { on: 'defeat', unit: 'helga' },
      do: [
        { do: 'say', lines: [{ s: 'soldier', t: '不可能……帝国的龙骑兵……竟然败给……', e: 'hurt', n: '赫尔加' }] },
        { do: 'win' },
      ],
    },
    {
      id: 'wreck',
      when: { on: 'enter', area: [3, 4, 4, 4], team: 'player' },
      do: [{ do: 'say', lines: [{ s: 'kia', t: '船头的木板底下好像卡着什么亮晶晶的东西……在这里待一会儿就能撬出来。', e: 'thinking' }] }],
    },
  ],
  intro: [
    {
      backdrop: { type: 'map', focus: [6, 5], zoom: 1.3 },
      music: 'story_tense',
      actors: [
        { id: 'rein', look: 'rein', x: 5, y: 5, face: 'e' },
        { id: 'otto', look: 'otto', x: 4, y: 5, face: 'e' },
        { id: 'balder', look: 'balder', x: 6, y: 5, face: 'e' },
        { id: 'kia', look: 'kia', x: 5, y: 4, face: 'e' },
        { id: 'lucas', look: 'lucas', x: 5, y: 6, face: 'e' },
      ],
      lines: [
        { cmd: 'caption', text: '北方海岸 · 怒涛湾', sub: '启航后的第四天' },
        { s: 'otto', t: '抓稳了！这风浪我跑船二十年都没见过！', e: 'surprised' },
        { cmd: 'sfx', id: 'wing' },
        { s: 'kia', t: '天上！那是什么——鸟？不对，太大了！', e: 'surprised' },
        { s: 'balder', t: '帝国的龙骑兵。……他们在等我们。', e: 'determined' },
        { cmd: 'spawn', actor: { id: 'pg', look: 'sera', x: 12, y: 3, face: 'w' } },
        { cmd: 'spawn', actor: { id: 'wy', look: 'wyvern_rider', team: 'enemy', x: 14, y: 3, face: 'w' } },
        { cmd: 'anim', actor: 'wy', anim: 'attack' },
        { cmd: 'anim', actor: 'pg', anim: 'hit' },
        { cmd: 'move', actor: 'pg', to: [12, 5] },
        { s: 'lucas', t: '有一位天马骑士被击落了！在那边的山丘上！', e: 'surprised' },
        { cmd: 'shake', strength: 0.8 },
        { cmd: 'sfx', id: 'explosion' },
        { s: 'otto', t: '船底撞上礁石了——要沉了！大家快上岸！', e: 'surprised' },
      ],
    },
  ],
  outro: [
    {
      backdrop: { type: 'map', focus: [12, 5], zoom: 1.2 },
      music: 'story_calm',
      actors: [
        { id: 'sera', look: 'sera', x: 12, y: 5, face: 's' },
        { id: 'rein', look: 'rein', x: 11, y: 6, face: 'e' },
        { id: 'balder', look: 'balder', x: 13, y: 6, face: 'w' },
        { id: 'alicia', look: 'alicia', x: 12, y: 7, face: 'n' },
      ],
      lines: [
        { s: 'sera', t: '帝国在一个月前攻陷了诺斯加德的王都。率军的，是灰烬教团的大主教……还有一个穿黑铠的骑士。', e: 'sad' },
        { s: 'sera', t: '他们在王城的地下挖出了什么东西——三百年前誓约骑士留下的「封印之钥」。', e: 'thinking' },
        { s: 'balder', t: '黑铠的骑士……', e: 'thinking' },
        { s: 'sera', t: '女王陛下命我飞往洛斯坦报信：教团的目标，是烬火山下的黑龙。', e: 'determined' },
        { s: 'alicia', t: '烬火山……那不就是赤鳞要塞背后的那座山吗？', e: 'surprised' },
        { s: 'balder', t: '……原来如此。骑士团守了三百年的，从来不只是国境。', e: 'thinking' },
        { s: 'rein', t: '副团长，你早就知道？', e: 'surprised' },
        { s: 'balder', t: '团长知道。我只是听过一些醉话。翻过霜脊山，就是龙骸神殿——答案应该在那里。', e: 'normal' },
      ],
    },
    {
      if: 'raven_joined',
      backdrop: { type: 'black' },
      music: 'story_sad',
      lines: [
        { s: 'kia', t: '……你走的那天，我追着马车跑了三条街。', e: 'sad' },
        { s: 'raven', t: '我知道。我在车上，一直看着你。', e: 'sad' },
        { s: 'kia', t: '那你为什么不停下！', e: 'angry' },
        { s: 'raven', t: '……因为停下的话，我就走不了了。院里的孩子们需要钱。', e: 'sad' },
        { s: 'kia', t: '笨蛋哥哥。……这次不许再走了。', e: 'sad' },
        { s: 'raven', t: '嗯。不走了。', e: 'smile' },
      ],
    },
  ],
  recruitAfter: ['sera'],
  music: { player: 'battle_player', enemy: 'battle_enemy' },
  reward: { gold: 900, items: ['potion', 'potion'] },
  shop: ['steel_sword', 'steel_lance', 'steel_axe', 'steel_bow', 'javelin', 'hand_axe', 'fire_tome', 'thunder_tome', 'healing_staff', 'potion', 'antidote', 'chain_mail', 'chest_key'],
  camp: 'full',
};

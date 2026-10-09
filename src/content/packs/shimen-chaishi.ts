import type { ContentPack, FoeDef, JobDef, NewsDef, NpcDef } from '../types';

/**
 * 师门差事（docs/menpai.md 第七节第八条）：替师门出力，攒门派贡献。升地位、学外门以上的武功拿它去换。
 * 负责人 10-08：「这个世界大多是有条件有代价的，极少存在唾手可得的东西。」
 * 师门差事不给钱，给贡献；误了扣贡献。发差事的动作「讨差事」写在师父身上（packs/baishi.ts）。
 * - 丐帮：往瓜洲送信（瓜洲的老叫化是分舵的眼睛）；夜里护着龙王庙的粥棚（盐号的打手来砸）。
 * - 军伍：夜里巡营（官道的哨兵交令）；押粮车去瓜洲码头。
 */

const JOBS: JobDef[] = [
  { id: 'smcs_gb_xin', sect: '丐帮', tier: 1, title: '替分舵往瓜洲送一封信', npc: 'smcs_gz_laohua', at: 'gz_town', days: 3, again: 3 },
  { id: 'smcs_gb_zhou', sect: '丐帮', tier: 1, k: 1.5, title: '夜里护着龙王庙的粥棚', npc: 'bs2_bao', at: 'bs2_longwang', days: 2, again: 4 },
  { id: 'smcs_jw_xun', sect: '军伍', tier: 1, title: '夜里在官道上巡营', npc: 'bs2_han', at: 'yz_mubing', days: 2, again: 2 },
  { id: 'smcs_jw_liang', sect: '军伍', tier: 1, k: 1.5, title: '押一车军粮去瓜洲码头', npc: 'smcs_liangguan', at: 'gz_pier', days: 3, again: 4 }
];

const NIGHT = { from: 19, to: 5 };

const NPCS: NpcDef[] = [
  /* ---------- 丐帮 ---------- */
  { id: 'smcs_gz_laohua', name: '老叫化', ini: '化', tone: 'gray', brief: '蹲在墙根晒太阳',
    look: '六十来岁，眼皮耷拉着，像是睡着了。可街上谁家来了生客、谁家的船几时靠岸，他比谁都清楚。腰上系着一根打了三个结的麻绳。',
    at: { room: 'gz_town', if: { job: 'smcs_gb_xin' } },
    verbs: ['交谈', '观察', '交信'],
    actions: {
      交谈: [{ text: '老叫化眼皮都不抬：「扬州分舵来的？信呢？」' }],
      交信: [{ text: '老叫化接过信，看也不看就塞进怀里，从破碗底下摸出一根打了结的草绳递给你：「带回去给鲍四，他认得。」他又耷拉下眼皮，「瓜洲这几天来了几条生船，不打鱼，专打听人。你让他小心。」',
        do: [{ type: 'jobDone', id: 'smcs_gb_xin' }, { type: 'time', add: 20 }] }]
    } },
  { id: 'smcs_dashou', name: '盐号打手', count: 4, ini: '打', tone: 'red', brief: '提着棍子往庙里闯',
    look: '四个短打汉子，提着枣木棍，腰上挂着汪家盐号的木牌。领头的那个一脚踢翻了门口的粥桶。',
    at: { room: 'bs2_longwang', if: { job: 'smcs_gb_zhou', hour: NIGHT } },
    verbs: ['交谈', '观察', '动手'],
    actions: {
      交谈: [{ text: '领头的拿棍子指着你：「叫化子堆里出了个练家子？汪老爷说了，龙王庙门口不许支粥棚，挡着盐车的道。」' }],
      动手: [{ do: [{ type: 'fight', foe: 'smcs_dashou' }] }]
    } },
  /* ---------- 军伍 ---------- */
  { id: 'smcs_shaobing', name: '哨兵', ini: '哨', tone: 'red', brief: '缩在驿亭里跺脚',
    look: '十七八岁的新兵，冻得直跺脚，手里的长枪比他还高。见了你，赶紧把枪立正了。',
    at: { room: 'yz_guandao', if: { job: 'smcs_jw_xun', hour: NIGHT } },
    verbs: ['交谈', '观察', '交令'],
    actions: {
      交谈: [{ text: '哨兵搓着手：「巡营的？韩什长说今夜有人来查哨。」他压低声音，「刚才有个影子从官道那头过去，我喊了一声，他就跑了。」' }],
      交令: [{ text: '你沿着官道巡了一个时辰，回到驿亭，和哨兵对了口令，在他的木牌上划了一道。天快亮时，韩什长披着衣裳出来，看了看木牌，点点头，没说话。',
        do: [{ type: 'time', add: 60 }, { type: 'jobDone', id: 'smcs_jw_xun' }] }]
    } },
  { id: 'smcs_liangguan', name: '粮官', ini: '粮', tone: 'amber', brief: '在码头上点粮袋',
    look: '一个胖胖的书吏，穿着官服，袖子里揣着一本账，点一袋粮划一道。',
    at: { room: 'gz_pier', if: { job: 'smcs_jw_liang' } },
    verbs: ['交谈', '观察', '交粮'],
    actions: {
      交谈: [{ text: '粮官翻着账：「扬州营的粮车？一共二十袋，少一袋，你自己赔。」' }],
      交粮: [{ text: '粮官一袋一袋点过去，二十袋，一袋不少。他在账上划了一道，盖了个印：「回去跟韩什长说，这趟干净。上回那个押粮的，路上卖了三袋，脑袋现在还挂在营门上。」',
        do: [{ type: 'time', add: 30 }, { type: 'jobDone', id: 'smcs_jw_liang' }] }]
    } }
];

const FOES: FoeDef[] = [
  {
    id: 'smcs_dashou', name: '盐号打手', title: '汪家盐号', ini: '打', tone: 'red', weapon: '枣木棍', ws: '棍', tag: '护粥棚',
    nature: '刚', reach: '长', rank: 0.6, build: 'outer', weak: 0.8, firstTell: 3,
    moves: ['当头一棍', '横扫', '捅腰', '一拥而上'],
    flourish: ['枣木棍呼的一声砸下来', '两根棍子一左一右夹过来', '有人从背后摸上来', '一脚踢翻了粥桶'],
    tells: [
      { name: '四棍齐下', text: '四个打手互相使了个眼色，把你围在当中，棍子都举了起来……', dom: 'li', after: '四根棍子一齐砸下来！' },
      { name: '扫堂棍', text: '领头的身子一矮，棍子贴着地面往后一撤……', dom: 'su', after: '一棍扫向你的脚踝。' }
    ],
    asides: ['小叫化们缩在龙王爷的泥胎后头。', '鲍四拄着竹杖站在庙门口，没动。', '粥锅翻在地上，冒着热气。'],
    opening: ['一棍砸空，棍头戳进了地里', '一伙人挤成一团，互相碍着', '领头的回头看了一眼同伴'],
    intro: '领头的打手把棍子往肩上一扛：「一个叫化子，还想护粥棚？」',
    win: '你夺下领头的棍子，一棍扫倒两个。剩下的那个拖着同伴就跑，盐号的木牌掉了一地。',
    lose: '一棍子砸在你背上，你扑倒在粥锅边。打手们把粥棚拆了个干净，扬长而去。',
    results: {
      win: { tag: '护粥棚 · 胜', title: '粥棚保住了', button: '回庙里',
        story: '小叫化们从泥胎后头钻出来，七手八脚把粥锅扶正。鲍四拄着竹杖走过来，看了看地上的木牌，捡起一块揣进怀里：「汪家记下了，丐帮也记下了。」',
        do: [{ type: 'jobDone', id: 'smcs_gb_zhou' }, { type: 'flag', flag: 'smcs_zhou_bao' }] },
      lose: { tag: '护粥棚', title: '粥棚叫人砸了', button: '爬起来',
        story: '鲍四把你扶起来，没说什么，自己弯腰去捡地上的碎碗。小叫化们一直哭到半夜。',
        do: [{ type: 'jobFail', id: 'smcs_gb_zhou' }, { type: 'heal', hpAtLeast: 0.5 }] },
      flee: { tag: '护粥棚', title: '你走开了', button: '离开',
        story: '你退出了龙王庙。身后，粥棚倒下的声音很响。',
        do: [{ type: 'jobFail', id: 'smcs_gb_zhou' }] }
    }
  }
];

const NEWS: NewsDef[] = [
  { if: { flag: 'smcs_zhou_bao' }, text: '汪家盐号的打手夜里去砸龙王庙的粥棚，叫一个叫化子打了回来。汪老爷气得摔了茶碗。', who: ['叫化', 'gai', '脚夫', 'wang'], about: 'you' }
];

const pack: ContentPack = { jobs: JOBS, npcs: NPCS, foes: FOES, news: NEWS };
export default pack;

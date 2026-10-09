import type { ContentPack, ItemDef, NewsDef } from '../types';

/** 通用内容：物品、江湖传闻 */

/**
 * 道具的类决定能做什么（docs/zhuangbei.md 第四节）：药服用、酒食饮用、装备穿戴、信物细看、杂物赠人。
 * price 是买价（文），当铺按四成收；信物不写 price，不卖不送。说明里写了能做什么，就要真能做到。
 */
const ITEMS: ItemDef[] = [
  { id: 'qingfeng', name: '青锋剑', kind: '装备', price: 1500, desc: '寻常青钢长剑，剑脊上刻着一个「沈」字。',
    equip: { slot: '兵器', weapon: '剑', reach: '短', grade: '凡品' } },
  { id: 'jcy', name: '金疮药', kind: '药', price: 20, desc: '止血生肌，回复三成气血。战斗中也能服用；伤筋动骨的伤，还得静养。',
    use: [{ type: 'heal', hpFrac: 0.3 }] },
  // 治重伤的药（负责人 10-09：「重伤需要找人医治或者服药」，engine/shang.ts）：一服轻一级，比请郎中看伤便宜，但要自己带着
  { id: 'dieda', name: '跌打酒', kind: '药', price: 60, desc: '活血化瘀的药酒，揉在伤处，又热又辣。手、足的伤，一服轻一级；轻伤不揉，过一日也会好。',
    use: [{ type: 'cure', levels: 1, zones: ['hand', 'foot'] }] },
  { id: 'neishang', name: '内伤药', kind: '药', price: 80, desc: '调理内息的丸药，温水送服。内息的伤，一服轻一级；轻伤不吃，过一日也会好。',
    use: [{ type: 'cure', levels: 1, zones: ['inner'] }] },
  { id: 'fhs', name: '飞蝗石', kind: '杂物', price: 3, desc: '暗器。战斗中随手打出，伤敌不重，聊胜于无。' },
  { id: 'flower', name: '杏花', kind: '杂物', price: 3, desc: '新折的杏花，可以送人。' },
  { id: 'med', name: '药', kind: '信物', desc: '回春堂的两副药，用油纸包着，还带着余温。' },
  // 信物类的佩饰：可以挂在腰间，没有数值，只有剧情作用
  { id: 'jade', name: '半块玉佩', kind: '信物', desc: '刻着一个「沈」字和半个「寒」字，断口参差。另一半在哪里？',
    equip: { slot: '佩' },
    look: [{ if: { flag: 'bei' }, text: '你摩挲着玉佩上的「沈」字，想起湖畔石碑落款下的那一个。天下姓沈的人多了，可你总觉得，两个字有些相像。' }] },
  // 断水要自己参悟（负责人 10-09：开局不给绝技）：寒江剑法练到略有小成，再拿历练去换（绝品六百，content/skills.ts 的 LEARN_LILIAN）
  { id: 'scroll', name: '断水残页', kind: '信物', desc: '油布包着的一页剑谱，墨迹被水洇开了一半。',
    look: [
      { if: { realm: { skill: 'duanshui', atLeast: 1 } }, text: '残页上那一剑，你如今使得出几分了。洇开的那一半，倒像是故意留白，等人自己去补。' },
      { if: { learned: 'duanshui' }, text: '残页上那一剑的起手，你已烂熟于心。往下的路，墨迹洇了，只能靠你自己一剑一剑去试。' },
      { if: { canLearn: 'duanshui' },
        text: '你把残页摊在膝上，就着灯火看那一式起手。看到第三遍，手里的剑忽然自己动了——不是残页上画的那一剑，是江伯那晚在江边使过、你只看过一眼的那一剑。墨迹洇开的地方，原来不用看。一剑横出，桌上的灯火齐齐矮了一矮。',
        do: [{ type: 'learn', skill: 'duanshui' }, { type: 'time', add: 120 },
          { type: 'feed', tag: '江湖', text: '你对着江伯留下的残页，参出了「断水」的起手。' }] },
      { if: { realm: { skill: 'hanjiang', atLeast: 1 } },
        text: '你对着残页比划了半夜，起手那一剑总是差一口气，后面的路一片模糊。江伯当年说过：剑是练出来的，也是见出来的。江湖上多走走，见识够了再来。（参悟「断水」要历练六百）' },
      { text: '墨迹洇开了一半，只认得出「断水」二字和一式起手。以你眼下的剑法，连这起手都使不圆。（寒江剑法练到略有小成，才看得懂）' }
    ] },
  { id: 'badge', name: '「厂」字铜牌', kind: '信物', desc: '黑衣首领逃走时掉落的。铜牌上铸着一个「厂」字。' },
  { id: 'huadiao', name: '花雕', kind: '酒食', price: 30, desc: '望江楼的花雕，泥封上还沾着酒渍。自己喝也好，请人喝也好，江湖上一壶酒能换来不少话。',
    use: [{ type: 'heal', mpFrac: 0.1 }, { type: 'feed', tag: '江湖', text: '你拍开泥封，仰头灌了几口。酒是陈酒，一路暖到心口。' }] },
  { id: 'blade', name: '黑风断首刀', kind: '装备', price: 3000, desc: '屠千山的鬼头刀，刀背九个铁环。剑客用不顺手，倒能卖个好价钱。',
    equip: { slot: '兵器', weapon: '刀', reach: '短', grade: '良品', stats: { chushou: 3 } } }
];

/** 闭关出关、打赏说书人时抽取的江湖传闻 */
const NEWS: NewsDef[] = [
  { text: '华山派掌门闭关不出，两位长老为争掌门之位反目。', who: ['说书', '道士', '镖师'], far: true },
  { text: '扬州米价涨了三成，城外的流民渐渐多了。', who: ['掌柜', '小二', '脚夫', '货郎'] },
  { text: '有人在小金山见到一位白衣女子，一剑削断了风亭前的石柱。', who: ['说书', '船夫', '渔家', '小二'] },
  { text: '六扇门的捕快在府衙照壁上贴出榜文，缉拿江洋大盗「草上飞」。', who: ['捕快', '衙役', 'guan', '书吏'] },
  { text: '北边传来消息，边关又起战事，朝廷正在各州招兵。', who: ['说书', '军汉', '镖师'], far: true },
  { text: '城南的威远镖局接了一趟往云南的红货，正四处招募镖师。', who: ['镖师', '掌柜', '小二'] },
  { text: '漕帮新任舵主到了扬州，据说是个使双刀的女子。', who: ['船夫', '脚夫', 'dong', 'xi'] },
  { if: { notFlag: 'boss' }, text: '黑风寨又劫了两条漕船，漕帮吃了哑巴亏，帮主一声不吭。', who: ['船夫', '脚夫', 'dong', 'hei'] },
  { if: { flag: 'boss' }, text: '屠千山被押进扬州府大牢，黑风寨群龙无首，喽啰四散。', who: ['捕快', '衙役', 'guan', '说书'] }
];

const pack: ContentPack = { items: ITEMS, news: NEWS };
export default pack;

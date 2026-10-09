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
  { id: 'scroll', name: '断水残页', kind: '信物', desc: '油布包着的一页剑谱，墨迹被水洇开了一半。',
    look: [{ if: { realm: { skill: 'duanshui', atLeast: 1 } }, text: '残页上那一剑，你如今使得出几分了。洇开的那一半，倒像是故意留白，等人自己去补。' }] },
  { id: 'badge', name: '「厂」字铜牌', kind: '信物', desc: '黑衣首领逃走时掉落的。铜牌上铸着一个「厂」字。' },
  { id: 'huadiao', name: '花雕', kind: '酒食', price: 30, desc: '望江楼的花雕，泥封上还沾着酒渍。自己喝也好，请人喝也好，江湖上一壶酒能换来不少话。',
    use: [{ type: 'heal', mpFrac: 0.1 }, { type: 'feed', tag: '江湖', text: '你拍开泥封，仰头灌了几口。酒是陈酒，一路暖到心口。' }] },
  { id: 'blade', name: '黑风断首刀', kind: '装备', price: 3000, desc: '屠千山的鬼头刀，刀背九个铁环。剑客用不顺手，倒能卖个好价钱。',
    equip: { slot: '兵器', weapon: '刀', reach: '短', grade: '良品', stats: { chushou: 3 } } }
];

/** 闭关出关、打赏说书人时抽取的江湖传闻 */
const NEWS: NewsDef[] = [
  { text: '华山派掌门闭关不出，两位长老为争掌门之位反目。' },
  { text: '扬州米价涨了三成，城外的流民渐渐多了。' },
  { text: '有人在小金山见到一位白衣女子，一剑削断了风亭前的石柱。' },
  { text: '六扇门的捕快在东关街贴出告示，缉拿江洋大盗「草上飞」。' },
  { text: '北边传来消息，边关又起战事，朝廷正在各州招兵。' },
  { text: '城南的威远镖局接了一趟往云南的红货，正四处招募镖师。' },
  { text: '漕帮新任舵主到了扬州，据说是个使双刀的女子。' },
  { if: { notFlag: 'boss' }, text: '黑风寨又劫了两条漕船，漕帮的悬赏涨到了一百两。' },
  { if: { flag: 'boss' }, text: '屠千山被押进扬州府大牢，黑风寨群龙无首，喽啰四散。' }
];

const pack: ContentPack = { items: ITEMS, news: NEWS };
export default pack;

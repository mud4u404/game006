import type { ContentPack, ItemDef, NewsDef } from '../types';

/** 通用内容：物品、江湖传闻 */

const ITEMS: ItemDef[] = [
  { id: 'jcy', name: '金疮药', desc: '止血生肌，回复气血 260。战斗中也能服用。', usable: true },
  { id: 'fhs', name: '飞蝗石', desc: '暗器。战斗中随手打出，伤敌不重，聊胜于无。' },
  { id: 'flower', name: '杏花', desc: '新折的杏花，可以送人。' },
  { id: 'med', name: '药', desc: '回春堂的两副药，用油纸包着，还带着余温。' },
  { id: 'jade', name: '半块玉佩', desc: '刻着一个「沈」字和半个「寒」字，断口参差。另一半在哪里？' },
  { id: 'scroll', name: '断水残页', desc: '油布包着的一页剑谱，墨迹被水洇开了一半。' },
  { id: 'badge', name: '「厂」字铜牌', desc: '黑衣首领逃走时掉落的。铜牌上铸着一个「厂」字。' },
  { id: 'huadiao', name: '花雕', desc: '望江楼的花雕，泥封上还沾着酒渍。自己喝也好，请人喝也好，江湖上一壶酒能换来不少话。' },
  { id: 'blade', name: '黑风断首刀', desc: '屠千山的鬼头刀，刀背九个铁环。剑客用不顺手，倒能卖个好价钱。' }
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

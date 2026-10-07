import type { ContentPack, NpcDef, RoomDef } from '../types';

/**
 * 路上的地点：把扬州、瓜洲、镇江连起来（维护者）。
 * 长途要花长时间，所以两地之间放一个真正的地点：它本身也是路遇的舞台（docs/audit.md 的四问）。
 * - 运河客船：扬州运河渡口 ⇄ 瓜洲码头，单程约两个时辰；
 * - 瓜洲渡船：瓜洲码头 ⇄ 镇江西津渡，「京口瓜洲一水间」；
 * - 西津渡：镇江的门户。这里只搭个架子，渡口上的人由协作者用 at 放进来。
 */

const NIGHT = { hour: { from: 18, to: 6 } };

const ROOMS: RoomDef[] = [
  { id: 'gz_kechuan', name: '运河客船', area: '运河 · 扬州至瓜洲', region: 'gz', t: 60, map: [84, 56],
    desc: [
      { if: NIGHT, text: '客船在运河上缓缓走着，舱里点着一盏油灯，几个客人和衣躺着。船头的船家望着两岸黑沉沉的芦苇，不时咳嗽一声。' },
      { text: '客船在运河上不紧不慢地走，两岸芦苇连天，漕船一条接一条擦肩而过。舱里挤着行商、脚夫和几个赶考的书生。' }
    ],
    npcs: ['gz_kc_chuanjia'],
    exits: [['北', 'dukou', '舟'], ['南', 'gz_pier', '舟']],
    road: '你上了客船，船家一篙点开，船顺着运河走了……' },
  { id: 'gz_duchuan', name: '瓜洲渡船', area: '大江 · 瓜洲渡口', region: 'gz', t: 40, map: [30, 88],
    desc: [
      { if: NIGHT, text: '渡船泊在江边，桅杆上一盏风灯晃来晃去。江面漆黑，对岸京口的灯火星星点点，近得像伸手就能够着。' },
      { text: '渡船泊在江边，船家正往船上搬缆绳。江面宽阔，对岸京口的城楼隐在雾里。「京口瓜洲一水间」，说的就是这一程。' }
    ],
    npcs: ['gz_dc_chuanjia'],
    exits: [['北岸', 'gz_pier', '渡'], ['南岸', 'zj_xijin', '渡']],
    road: '你踏上跳板，渡船晃了一晃……' },
  { id: 'zj_xijin', name: '西津渡', area: '镇江 · 京口', region: 'zj', t: 10, map: [50, 16],
    desc: '西津渡的青石阶被挑夫的脚磨得发亮，一级一级通上岸去。回头望，瓜洲的帆影隔着一江烟水，若有若无。',
    npcs: [], objs: ['zj_daiduting'],
    exits: [],
    road: '渡船靠了岸，你跳上西津渡的石阶……' }
];

const NPCS: NpcDef[] = [
  { id: 'gz_kc_chuanjia', name: '客船船家', ini: '船', tone: 'blue', brief: '赤脚撑篙',
    look: '五十来岁，赤着脚，脚背被太阳晒得黑红。撑篙的手稳得很，篙子入水，一点声响都没有。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: { quest: { id: 'main1', is: 1 }, notFlag: 'boss' }, text: '「扬州渡口那边，黑风寨的船霸着呢。咱们的客船只敢在外头靠，客官上下船，脚底下当心。」' },
      { if: NIGHT, text: '「夜里行船，客官莫往船头站。」船家压低声音，「这一段芦苇深，前两年有人在里头藏过私盐船。」' },
      { text: '「客官坐稳。这条运河，从扬州到瓜洲，一天跑两趟。」他朝河心努努嘴：「漕帮的船走中间，咱们走边上，井水不犯河水。」' }
    ] } },
  { id: 'gz_dc_chuanjia', name: '渡船船家', ini: '渡', tone: 'blue', brief: '往船上搬缆绳',
    look: '一个精瘦的汉子，腰里别着一把短刀，刀鞘上缠着麻绳。江上讨生活的人，眼睛都毒。',
    verbs: ['交谈', '观察'],
    actions: { 交谈: [
      { if: NIGHT, text: '「夜里也渡。」船家看了看江心，「只是江心那片荒洲，夜里有人见过灯火。咱们撑船的，都绕着走。」' },
      { text: '「京口瓜洲一水间，客官要过江，坐稳了就走。」他把缆绳往桩上一甩，「船钱靠了岸再给，江上讲的是个信字。」' }
    ] } },
  { id: 'zj_daiduting', name: '待渡亭', obj: true, icon: 'stele', brief: '亭柱上刻满了字',
    look: '亭柱上刻满了过客留的字，诗也有，骂人的话也有。有一行刻得极深，像是用剑划的：「一水之隔，二十年。」',
    verbs: ['观察'], actions: {} }
];

const pack: ContentPack = {
  regions: { zj: { name: '镇江', order: 3, note: '镇江古称京口，和瓜洲隔江相望。从西津渡上岸，往里是城中，金山、北固山、焦山都在江边。' } },
  rooms: ROOMS,
  npcs: NPCS
};
export default pack;

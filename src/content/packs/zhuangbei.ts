import type { ContentPack, ItemDef } from '../types';

/**
 * 衣饰：纸娃娃上冠、衣、靴、佩、饰五个位置的凡品、良品（docs/zhuangbei.md 第三节）。
 * 以后由兵器铺、成衣铺、首饰摊来卖，铺子另外写；这里只写东西本身。
 *
 * 数值小，锦上添花：每件的「点数」按装备位和品级封顶（engine/zhuangbei.ts 的 GEAR_POINTS，tests/daoju.test.ts 校验）。
 * 出手、护体、闪避一个百分点算一点，根基一点算一点，内力二十点算一点。凡品的冠、靴、佩、饰一点，良品两点。
 * 说明里写了它管什么，数值就给什么：写「挡得住一刀」的给护体，写「落地轻」的给闪避。
 */
const ITEMS: ItemDef[] = [
  /* ---------- 冠：少量护体或身法 ---------- */
  { id: 'zb_douli', name: '竹斗笠', kind: '装备', price: 40,
    desc: '竹篾编的斗笠，压得低些，雨打不湿眉眼。走江湖的人，十个里有八个戴它。',
    equip: { slot: '冠', grade: '凡品', stats: { huti: 1 } } },
  { id: 'zb_toujin', name: '青布头巾', kind: '装备', price: 25,
    desc: '一方青布裹住发髻。跑起来头发不散，不遮眼。',
    equip: { slot: '冠', grade: '凡品', stats: { attr: { 身法: 1 } } } },
  { id: 'zb_tieyanli', name: '铁檐笠', kind: '装备', price: 900,
    desc: '竹笠的檐口包了一圈薄铁，挡得住雨，也挡得住斜里劈来的一刀。',
    equip: { slot: '冠', grade: '良品', stats: { huti: 2 } } },

  /* ---------- 衣：护体 ---------- */
  { id: 'zb_duanda', name: '粗布短打', kind: '装备', price: 120,
    desc: '粗布缝的短衣，袖口、裤脚都扎得紧紧的，动起手来不碍事。',
    equip: { slot: '衣', grade: '凡品', stats: { huti: 1 } } },
  { id: 'zb_mianpao', name: '厚棉袍', kind: '装备', price: 180,
    desc: '絮了新棉的袍子，冬天穿着暖和，挨上一拳也不那么疼。',
    equip: { slot: '衣', grade: '凡品', stats: { huti: 1 } } },
  { id: 'zb_pijia', name: '牛皮软甲', kind: '装备', price: 2500,
    desc: '熟牛皮压了三层，贴身穿在外衣底下。刀砍上来，先得过它这一关。',
    equip: { slot: '衣', grade: '良品', stats: { huti: 2 } } },

  /* ---------- 靴：闪避、身法 ---------- */
  { id: 'zb_buxie', name: '千层底布鞋', kind: '装备', price: 30,
    desc: '纳了千层的鞋底，走山路不硌脚，落地也轻。',
    equip: { slot: '靴', grade: '凡品', stats: { shanbi: 1 } } },
  { id: 'zb_kuaixue', name: '薄底快靴', kind: '装备', price: 1800,
    desc: '鹿皮靴面，鞋底薄得觉得出地上的石子。捕快、飞贼都爱穿它，闪身躲人，快人一步。',
    equip: { slot: '靴', grade: '良品', stats: { shanbi: 2 } } },
  { id: 'zb_yunxue', name: '云头软靴', kind: '装备', price: 2200,
    desc: '靴尖缀着云头，底下衬了一层麂皮。踏在瓦上悄无声息，翻墙越脊身子也轻。',
    equip: { slot: '靴', grade: '良品', stats: { shanbi: 1, attr: { 身法: 1 } } } },

  /* ---------- 佩：内力、根基 ---------- */
  { id: 'zb_xiangnang', name: '艾草香囊', kind: '装备', price: 30,
    desc: '绣着并蒂莲的香囊，塞满晒干的艾草。闻着心定，运气也顺些。',
    equip: { slot: '佩', grade: '凡品', stats: { neili: 20 } } },
  { id: 'zb_taofu', name: '桃木符', kind: '装备', price: 40,
    desc: '道观里求来的桃木符，刻着几道看不懂的符文。挂在腰间，夜路也敢走了。',
    equip: { slot: '佩', grade: '凡品', stats: { attr: { 胆魄: 1 } } } },
  { id: 'zb_yangzhi', name: '羊脂玉鲤', kind: '装备', price: 4000,
    desc: '温润的羊脂玉雕成一尾鲤鱼。老人说玉养人，贴身戴久了，气息绵长，筋骨也结实。',
    equip: { slot: '佩', grade: '良品', stats: { neili: 20, attr: { 根骨: 1 } } } },

  /* ---------- 饰：根基 ---------- */
  { id: 'zb_huwan', name: '熟铁护腕', kind: '装备', price: 60,
    desc: '一对熟铁打的护腕，内衬麻布。硬接一招的时候，腕子不至于折了。',
    equip: { slot: '饰', grade: '凡品', stats: { attr: { 根骨: 1 } } } },
  { id: 'zb_tongjie', name: '旧铜指环', kind: '装备', price: 50,
    desc: '一枚旧铜指环，内圈磨得发亮。戴上它，拆招时手上多一分准头。',
    equip: { slot: '饰', grade: '凡品', stats: { attr: { 悟性: 1 } } } },
  { id: 'zb_yinzhuo', name: '银丝手镯', kind: '装备', price: 2500,
    desc: '细银丝绞成的手镯，轻得像没戴。出手时腕子稳，硬接时也吃得住劲。',
    equip: { slot: '饰', grade: '良品', stats: { attr: { 悟性: 1, 根骨: 1 } } } }
];

const pack: ContentPack = { items: ITEMS };
export default pack;

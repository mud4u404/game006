import type { Cond, ContentPack, EyeDef } from '../types';

/**
 * 根基之眼的示范（engine/yan.ts，写法见 docs/content-guide.md「根基之眼」）。
 * 开篇几个关键场面：同一个人、同一处地方，五种根基各看出不同的一层。
 * 门槛：二十五是初到扬州就可能看得出的（童年选择偏了这一项），二十九要练上几重，三十三是出类拔萃。
 * 有的看出来就是一条路：体魄好的人看得出屠千山左臂有旧伤，不必去问船夫。
 */

const BOSS_HERE: Cond = { quest: { id: 'main1', is: 1 }, notFlag: 'boss' };
const HUNTING: Cond = { quest: { id: 'side_caoshangfei', is: 1 } };

const EYES: EyeDef[] = [
  /* ---------- 运河渡口 · 屠千山 ---------- */
  { npc: 'tu', attr: '体魄', atLeast: 25, if: BOSS_HERE,
    text: '那伤伤在筋上：他每回抡圆了刀，左肩都先往下一沉，刀才跟着出去。专往他左边走，他回刀得慢上一拍。',
    do: [{ type: 'flag', flag: 'tu_scar' }] },
  { npc: 'tu', attr: '根骨', atLeast: 25, if: BOSS_HERE,
    text: '他吆喝两句就要换一口气，胸口起伏得厉害——内力平平，全凭一身蛮力。刀势一老，就得喘。' },
  { npc: 'tu', attr: '胆魄', atLeast: 25, if: BOSS_HERE,
    text: '他嗓门越吼越大，眼睛却一直往漕帮那几十条汉子身上瞟。人多的地方，他心里也虚。' },
  { room: 'dukou', attr: '身法', atLeast: 25, if: BOSS_HERE,
    text: '码头一侧的盐包堆得高低错落，正好借力腾挪。跟那口鬼头刀缠斗，别站在平地上硬拼。' },
  { room: 'dukou', attr: '悟性', atLeast: 29, if: BOSS_HERE,
    text: '喽啰们个个站在盐包之间的空当里，进可抢、退可跑。屠千山一倒，这些人没有一个肯替他拼命。' },

  /* ---------- 瘦西湖畔 ---------- */
  { npc: 'liu', attr: '根骨', atLeast: 25,
    text: '细雨落在他伞沿，被一股极柔的暗劲轻轻震开，肩头一滴也没沾上。他的内功，不在你之下。' },
  { npc: 'liu', attr: '身法', atLeast: 25,
    text: '石桥湿滑，他却站得像钉住了一样，重心始终落在后脚。随时能退，也随时能进。' },
  { npc: 'liu', attr: '悟性', atLeast: 29,
    text: '伞柄近手处有一道细缝，缝口磨得发亮——里头藏着一口剑，而且常常拔出来。' },
  { npc: 'caobang', attr: '体魄', atLeast: 25,
    text: '三人里有一个右手缠着布条，血渗了出来，还没干。他们前几日刚跟人动过刀，吃了亏。' },
  { npc: 'caobang', attr: '胆魄', atLeast: 25,
    text: '他们说得慷慨激昂，手却一直按在刀柄上没松开过。那是怕，不是狠。' },
  { npc: 'bei', attr: '悟性', atLeast: 25,
    text: '「寒江」两个字收笔处都往回一挑，跟江伯教你的剑法起手一模一样。刻碑的人，剑使得比你好得多。' },
  { npc: 'bei', attr: '根骨', atLeast: 29,
    text: '笔画深浅如一，一口气刻完，中间没有换过气。以剑代笔刻进青石，刻碑人的内力深得吓人。' },

  /* ---------- 大明寺 · 了尘大师 ---------- */
  { npc: 'liaochen', attr: '根骨', atLeast: 25,
    text: '他扫地的步子不疾不徐，落叶却自己往簸箕里飘。那不是风，是他袖底带出的内劲，绵绵不绝。' },
  { npc: 'liaochen', attr: '身法', atLeast: 29,
    text: '石阶上长满青苔，他走过的地方，青苔一根也没倒。' },
  { npc: 'liaochen', attr: '胆魄', atLeast: 29,
    text: '他说起屠千山时语气平和，扫帚却在青石上顿了一顿。出家人不便动手，不是不想动手。' },

  /* ---------- 望江楼 · 赵铁衣 ---------- */
  { npc: 'zhao_tieyi', attr: '体魄', atLeast: 25,
    text: '三坛下肚，他面皮通红，脖子上的青筋一跳一跳。酒量是真的，可也快到头了。' },
  { npc: 'zhao_tieyi', attr: '根骨', atLeast: 25,
    text: '那口窄刃长刀的刀柄磨得发亮，他握坛的虎口全是老茧。是使刀的好手，不是空有个少镖头的名头。' },

  /* ---------- 扬州府衙 · 周捕头 ---------- */
  { npc: 'fuya_zhou', attr: '体魄', atLeast: 25,
    text: '他手背那道旧刀伤是从虎口斜着划上去的。刀是朝心口来的，他拿手接住了。' },
  { npc: 'fuya_zhou', attr: '胆魄', atLeast: 25,
    text: '他嘴上不客气，眼睛却一直往你腰间的兵刃上瞟。他缺人手，缺得厉害。' },

  /* ---------- 汪家盐号 · 毕掌柜 ---------- */
  { npc: 'yh_bizhang', attr: '悟性', atLeast: 25,
    text: '他算盘拨得飞快，可每回有人提到「漕上」两个字，手指就停一下。账上有块地方，他自己也心虚。' },
  { npc: 'yh_bizhang', attr: '胆魄', atLeast: 25,
    text: '腰上那串钥匙收得一丝声响都没有。这样怕事的人，最经不起吓。' },

  /* ---------- 茱萸湾 ---------- */
  { npc: 'zy_yuweng', attr: '悟性', atLeast: 25, if: HUNTING,
    text: '他补网的梭子停了好几回，每回停下来，眼睛都往芦苇深处那条破船瞟。' },
  { npc: 'zy_yuweng', attr: '体魄', atLeast: 25,
    text: '屋里那孩子的咳嗽是寒咳，拖得久了伤肺。一碗热鱼汤，比什么药都管用。' },
  { npc: 'zy_csf', attr: '身法', atLeast: 25,
    text: '他坐着也是脚尖着地，脚跟始终悬着。一有动静，他头一个念头就是往芦苇里窜。' },
  { npc: 'zy_csf', attr: '根骨', atLeast: 29,
    text: '左手断指的伤早长好了，可他右肩一沉一沉的，像是这几夜扛过沉东西，还不止一趟。' },

  /* ---------- 威远镖局 · 赵老镖头 ---------- */
  { npc: 'bj_zhao', attr: '根骨', atLeast: 29,
    text: '两颗铁胆贴着他掌心转，一点声响都没有。内家功夫到了收发由心的地步，才转得这样静。' },
  { npc: 'bj_zhao', attr: '胆魄', atLeast: 25,
    text: '他说话的时候不看你的脸，看你的手。他在掂量你是个能扛事的，还是个会惹祸的。' }
];

const pack: ContentPack = { eyes: EYES };
export default pack;

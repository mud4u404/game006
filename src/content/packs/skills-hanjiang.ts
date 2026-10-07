import type { ContentPack, SkillDef } from '../types';

/** 主角出身的寒江一脉，以及小金山悟出的惊鸿剑 */
const SKILLS: SkillDef[] = [
  {
    id: 'hanjiang', name: '寒江剑法', grade: '良品', category: '剑法', school: '寒江', nature: '柔', reach: '短',
    desc: '寒江一脉的入门剑法。剑势如江上寒风，轻灵迅疾，练到深处，一剑可断流水。',
    learn: '江伯自幼传授', teach: '奇遇',
    moves: [
      { name: '孤帆远影', text: '剑尖斜挑，一点寒光直奔{foe}{part}，去势悠远，如孤帆没入天际。' },
      { name: '江枫渔火', text: '剑锋连点三点星芒，忽明忽暗，罩住{foe}{part}。' },
      { name: '寒潭映月', text: '长剑回圈，剑身映出一弯冷光，自下而上撩向{foe}{part}。' },
      { name: '烟波钓叟', text: '剑势忽缓，似垂钓江上，待{foe}一动，剑尖已递到{part}。' },
      { name: '风雪归舟', text: '剑随身转，带起一片冷风，横削{foe}{part}。' },
      { name: '寒江孤影', text: '剑走偏锋，人剑合一，一道孤影疾刺{foe}{part}。' }
    ],
    performs: [
      { name: '寒江孤影', text: '你一招「寒江孤影」，人随剑走，一道孤影疾刺{foe}{part}，身形已飘出三步之外！',
        mp: 65, cd: 2, hits: 1, dmg: [115, 145], acc: 0.82, fx: [{ kind: 'haste', value: 15, rounds: 2 }] },
      { name: '江枫渔火', realm: 1, text: '你剑锋连颤，「江枫渔火」三点星芒忽明忽暗，先后落向{foe}{part}！',
        mp: 80, cd: 2, hits: 3, dmg: [65, 85], acc: 0.78 },
      { name: '独钓寒江', realm: 3, text: '你剑尖一颤，「独钓寒江」两道冷光先后刺中{foe}{part}，寒气顺着剑尖透入经脉，{foe}半身一僵，竟动弹不得。',
        mp: 65, cd: 3, hits: 2, dmg: [85, 110], acc: 0.8, fx: [{ kind: 'busy', rounds: 1 }] }
    ]
  },
  {
    id: 'jinghong', name: '惊鸿剑', grade: '上品', category: '剑法', school: '江湖', nature: '柔', reach: '短',
    desc: '三剑连环，剑影如惊鸿掠水。起点高，修炼也慢。',
    learn: '从小金山棋痴的「雁回」残局中悟出',
    moves: [
      { name: '翩若惊鸿', text: '剑随身起，轻飘飘一剑点向{foe}{part}，快得不留影子。' },
      { name: '轻云蔽月', text: '剑光一晃，遮住{foe}眼前，剑尖却已到了{part}。' },
      { name: '流风回雪', text: '剑势回旋，如风卷雪，绕到{foe}身侧刺其{part}。' },
      { name: '皎若朝霞', text: '一剑自下而上挑起，剑光明亮如霞，直奔{foe}{part}。' },
      { name: '灼若芙蕖', text: '剑尖连颤，抖出一朵剑花，罩住{foe}{part}。' },
      { name: '惊鸿照影', text: '身形一晃，三道剑影如惊鸿掠水，分刺{foe}{part}。' }
    ],
    performs: [
      { name: '惊鸿照影', text: '你身形一晃，「惊鸿照影」连出三剑，剑影如惊鸿掠水，分刺{foe}{part}！', mp: 65, cd: 3, hits: 3, dmg: [70, 95], acc: 0.78 }
    ]
  },
  {
    id: 'xinfa', name: '寒江心法', grade: '良品', category: '内功', school: '寒江', nature: '阴',
    desc: '寒江一脉的内功根基，内力绵长，运功蓄力时尤见功效。',
    learn: '江伯自幼传授', teach: '奇遇'
  },
  {
    id: 'taxue', name: '踏雪无痕', grade: '良品', category: '轻功', school: '寒江', nature: '中正',
    desc: '身轻如燕，踏雪无痕。境界越高，越容易闪开对手的攻击。',
    learn: '江伯自幼传授', teach: '奇遇'
  },
  {
    id: 'duanshui', name: '断水', grade: '绝品', category: '绝技', school: '寒江', nature: '刚',
    desc: '寒江剑法的终极一式。传说练至化境，一剑横江，流水为之一断。',
    learn: '江伯临终所传',
    teach: '奇遇', requires: [{ skill: 'hanjiang', realm: 0 }],
    ult: { title: '寒江剑法 · 绝招', text: '你长剑一收，凝气于锋，一剑横斩而出——剑气如匹练横江，竟将眼前的雨幕生生斩断！', dmg: [520, 600] }
  }
];

const pack: ContentPack = { skills: SKILLS };
export default pack;

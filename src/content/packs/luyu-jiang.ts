import type { ContentPack, EncounterDef, StoryDef } from '../types';

/**
 * 路遇 · 运河与江上（Issue #86）：运河客船、瓜洲渡船、镇江西津渡的六件事。
 * 江上的事要有江上的味道：风浪、水性、漕规、船家的规矩。
 */

const NIGHT = { hour: { from: 19, to: 5 } };

const ENCOUNTERS: EncounterDef[] = [
  { id: 'luyu_jiang_chabang', region: ['gz'], to: ['gz_pier'], once: true, if: NIGHT, weight: 0.8, story: 'ly_jiang_chabang' },
  { id: 'luyu_jiang_feng', region: ['gz'], to: ['gz_duchuan'], story: 'ly_jiang_feng' },
  { id: 'luyu_jiang_duju', region: ['gz'], to: ['gz_duchuan'], once: true, weight: 0.6, story: 'ly_jiang_duju' },
  { id: 'luyu_jiang_luoshui', region: ['gz'], to: ['gz_duchuan'], once: true, story: 'ly_jiang_luoshui' },
  { id: 'luyu_jiang_yanye', region: ['gz'], to: ['gz_duchuan'], once: true, if: NIGHT, weight: 0.5, story: 'ly_jiang_yanye' },
  { id: 'luyu_jiang_jiangtun', region: ['zj'], to: ['zj_xijin'], weight: 0.7, story: 'ly_jiang_jiangtun' }
];

const STORIES: StoryDef[] = [
  { id: 'ly_jiang_chabang', cards: [
    { tag: '路遇', title: '漕帮查船',
      paras: [
        '夜里瓜洲码头，一艘插着漕帮旗号的巡船忽然横过来，铁钩搭住客船的船帮：「漕帮例行查船——都别动！」',
        '船家的脸一下子白了，客舱里一阵窸窣。巡船上的头目提着灯笼跳上船来，目光扫过每一张脸。'
      ],
      choices: [
        { label: '安静站在船边，任他查', sub: '身正不怕影子斜',
          result: '灯笼在你面前停了停。你神色如常。头目盯着你看了一阵，挥挥手放了行——夜里赶路的客人，见得多了。',
          do: [{ type: 'flag', flag: 'ly_jiang_cha' }], next: -1 },
        { if: { silver: 20 }, label: '替船家垫上查船的规矩钱', sub: '银两 −20',
          result: '你把二十文塞给船家。船家会意，双手奉上。头目掂了掂钱袋：「船单齐全，走罢。」船家连声道谢，一路再没敢大声出气。',
          do: [
            { type: 'silver', delta: -20 }, { type: 'flag', flag: 'ly_jiang_cha_qian' },
            { type: 'feed', tag: '江湖', text: '运河夜里的查船规矩钱，你替船家垫上了。' }
          ], next: -1 },
        { label: '站到船头，与头目对视', sub: '胆魄',
          result: '你站到船头，迎着灯笼的光与头目对视。他盯了你半晌，忽然咧嘴一笑：「好胆色——夜航的，都当自己是跑江湖的。」铁钩收了，巡船让开水道。',
          do: [
            { type: 'flag', flag: 'ly_jiang_cha_kan' }, { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '漕帮查船，你迎着灯笼与头目对视半晌，巡船竟让了道。' }
          ], next: -1 }
      ] }
  ] },

  { id: 'ly_jiang_feng', cards: [
    { tag: '路遇', title: '江心起风',
      paras: [
        '渡船行到江心，天色骤然阴下来，江面起了大浪。船身颠得厉害，桅索呜呜作响，船家一个人忙不过来，扯着嗓子喊搭手。',
        '一个浪头打上船舷，甲板上全是水。'
      ],
      choices: [
        { label: '攀上船头帮着稳桅索', sub: '身法', if: { attr: { key: '身法', atLeast: 20 } },
          result: '你攀着湿滑的帆索上去，风浪里腾挪走位，替船家把歪了的桅索重新绑正。风头过去，船家抹着脸上的水直道谢。',
          do: [
            { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '渡江遇上大风浪，你帮船家稳住了帆索。' }
          ], next: -1 },
        { label: '抓牢缆绳蹲下避浪',
          result: '你抓牢缆绳蹲在船板上，任浪头从头顶打过去。船家一个人手忙脚乱，总算把船稳住了，回头看了你一眼，欲言又止。', next: -1 }
      ] }
  ] },

  { id: 'ly_jiang_duju', cards: [
    { tag: '路遇', title: '船上的赌局',
      paras: [
        '渡船过江半个时辰，船舱里支起了一副牌九。庄家是个满面红光的中年人，手法利落，几圈下来，满船的客人输多赢少。',
        '你坐在角落里看了几巡，看出了一点不对——庄家起牌的手法，是练过的千术。'
      ],
      choices: [
        { label: '拆穿他的千术', sub: '悟性',
          result: '你冷冷开口：「这位庄家起牌的手法，是练过的。」满舱寂然。庄家脸上一阵红一阵白，把赢来的钱往桌上一推，到岸便下了船。',
          do: [
            { type: 'flag', flag: 'ly_jiang_duju_chai' }, { type: 'lilian', amount: 20 },
            { type: 'feed', tag: '江湖', text: '渡船上的赌局出了千，被你一句拆穿。庄家连夜下了船。' }
          ], next: -1 },
        { label: '不揭穿，少押为妙',
          result: '你押了两文小钱，输便输了，赢便收了。下船时，你那两文变成了五文——庄家懒得理会小虾米。',
          do: [{ type: 'silver', delta: 3 }], next: -1 },
        { label: '跟着庄家押', sub: '押的是他手法稳',
          result: '你反着满船人押，专押庄家赢。几圈下来倒是小赚——赌桌上的钱，终究不是这么挣的。你收手了。',
          do: [{ type: 'silver', delta: 5 }, { type: 'flag', flag: 'ly_jiang_duju_gen' }], next: -1 }
      ] }
  ] },

  { id: 'ly_jiang_luoshui', cards: [
    { tag: '路遇', title: '渡船上有人落水',
      paras: [
        '渡船行到江心，一个货郎探身去捞被风吹落的货担，脚下一滑，「扑通」栽进了江里。江流湍急，人已经冲出去几丈远。',
        '船上乱作一团，艄公急着调头，货郎的妻子抱着孩子哭喊救命。'
      ],
      choices: [
        { label: '扎进江里救人', sub: '体魄', if: { attr: { key: '体魄', atLeast: 22 } },
          result: '你扎进江里，几个划水追上货郎，拽着他的领子游回船边。众人七手八脚拉上来，货郎吐了几口水，缓过气来，抱着妻小放声大哭。',
          do: [
            { type: 'flag', flag: 'ly_jiang_jiu' }, { type: 'xia', delta: 3 },
            { type: 'lilian', amount: 40 },
            { type: 'feed', tag: '江湖', text: '渡船上有个货郎落水，你跳进江里把他拖了回来。' }
          ], next: -1 },
        { label: '把长篙递过去', sub: '水急，硬救不如智救',
          result: '你抄起长篙探出去，喊他抓稳。货郎扑腾了几下抓住篙头，众人合力把他拖了上来，趴在船板上吐水，捡回一条命。',
          do: [{ type: 'xia', delta: 1 },
            { type: 'feed', tag: '江湖', text: '渡船上有个货郎落水，你递过长篙把他拉了回来。' }], next: -1 },
        { label: '帮着喊人',
          result: '你朝着两岸大喊救命。好在下游有渔船闻声赶来，把人捞了上去。货郎一家千恩万谢地去了。', next: -1 }
      ] }
  ] },

  { id: 'ly_jiang_yanye', cards: [
    { tag: '路遇', title: '夜里没灯的船',
      paras: [
        '夜渡大江，你靠在舷边，忽然听见极轻的橹声。借着月色望去：一条没有灯的大船贴着江心的暗影，与渡船擦肩而过。',
        '船上的人都压着斗笠，没人出声。船家也看见了，朝你做了个「噤声」的手势，屏着呼吸，直到那条船走远。'
      ],
      choices: [
        { label: '默记船形', sub: '记下它有多长、吃水多深',
          result: '你借着月光默记：船身长约七丈，吃水极深——装的是重货。船尾两人摇橹，没人点灯。这个记号，你记下了。',
          do: [
            { type: 'flag', flag: 'ly_jiang_yanye_kan' }, { type: 'lilian', amount: 30 },
            { type: 'feed', tag: '江湖', text: '夜里与你擦肩而过的那条没灯的船，你记下了船形与吃水。' }
          ], next: -1 },
        { label: '只当没看见',
          result: '你缩回舱里，替船家把帘子掩严实了。船家朝你感激地点点头——夜行船的人，多一事不如少一事。', next: -1 },
        { label: '出声喝问',
          result: '你刚要开口，船家一把死死捂住你的嘴，浑身发抖。那条船上一道火光晃了晃，橹声骤然急了，头也不回地去了。船家瘫坐下来：「公子，你不要命，我们一家还要……」',
          do: [{ type: 'flag', flag: 'ly_jiang_yanye_he' }], next: -1 }
      ] }
  ] },

  { id: 'ly_jiang_jiangtun', cards: [
    { tag: '路遇', title: '江豚拜风',
      paras: [
        '渡船将到西津渡，江面上忽然有成群的江豚跃出水面，一起一伏，朝着渡口的方向「拜」过去。',
        '满船的客人都趴到舷边看稀奇。船家却变了脸色，念念有词地从舱里请出一炉香：「江豚拜风，大风就要来了——客官们，抓稳了！」'
      ],
      choices: [
        { label: '帮船家抢收帆布', sub: '体魄', if: { attr: { key: '体魄', atLeast: 20 } },
          result: '你抢在风头前帮船家把帆布收拢捆紧。风果然来了，船晃得像片叶子，却因帆收得及时，稳稳当当靠了岸。船家非说这炉香灵验。',
          do: [
            { type: 'lilian', amount: 20 },
            { type: 'feed', tag: '江湖', text: '西津渡外江豚拜风，有位公子帮船家抢收了帆，一船人平安靠岸。' }
          ], next: -1 },
        { if: { silver: 5 }, label: '入乡随俗，帮着添一炷香', sub: '银两 −5',
          result: '你依着船家的规矩添了香。风到来时船虽颠簸，总算有惊无险。船家直说这满船的客人都托了江神的福。',
          do: [
            { type: 'silver', delta: -5 }, { type: 'flag', flag: 'ly_jiang_tun_xiang' }
          ], next: -1 },
        { label: '笑而不信，扶栏看江',
          result: '你扶着船栏看江豚起起伏伏，看风从江面上卷过来。大自然的事，敬它，不必怕它。', next: -1 }
      ] }
  ] }
];

const pack: ContentPack = {
  encounters: ENCOUNTERS,
  stories: STORIES,
  news: [
    { if: { flag: 'ly_jiang_cha' }, text: '运河夜里漕帮的巡船查得紧，客船船家都说，今年的规矩钱，比往年重。' },
    { if: { flag: 'ly_jiang_jiu' }, text: '瓜洲渡船上有个货郎落了水，叫一位会水的公子救了上来。货郎挑着担子逢人就讲。' },
    { if: { flag: 'ly_jiang_yanye_kan' }, text: '夜里运河上常有没灯的大船悄悄过。船家都说别问，问就是鱼汛。' }
  ]
};
export default pack;

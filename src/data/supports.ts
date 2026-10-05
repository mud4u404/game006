/**
 * 羁绊对话：两名角色在战斗中相邻作战、互相治疗积累羁绊点数，达到阈值后可在营地观看
 * 点数来源：回合结束时相邻 +1；治疗/辅助对方 +2
 */
import type { SupportDef, StoryLine } from './types';

const R = (c: StoryLine[], b: StoryLine[], a: StoryLine[], titles: [string, string, string]): SupportDef['ranks'] => [
  { rank: 'C', points: 8, title: titles[0], lines: c },
  { rank: 'B', points: 20, title: titles[1], lines: b },
  { rank: 'A', points: 36, title: titles[2], lines: a },
];

export const SUPPORTS: SupportDef[] = [
  {
    a: 'rein',
    b: 'alicia',
    ranks: R(
      [
        { s: 'alicia', t: '雷恩，手伸出来。又受伤了吧，别藏。', e: 'normal' },
        { s: 'rein', t: '只是擦伤。', e: 'normal' },
        { s: 'alicia', t: '你从小就这样。摔破了膝盖也说是擦伤，结果半夜疼得睡不着。', e: 'smile' },
        { s: 'rein', t: '……那是七岁的事了吧。', e: 'surprised' },
      ],
      [
        { s: 'alicia', t: '雷恩，你还记得我们第一次见面吗？', e: 'smile' },
        { s: 'rein', t: '礼拜堂的台阶上。你抱着一只受伤的鸽子，哭得比鸽子还惨。', e: 'smile' },
        { s: 'alicia', t: '然后你说：「我是骑士，我来救它」。明明那时候你连木剑都拿不稳。', e: 'smile' },
        { s: 'rein', t: '……鸽子后来飞走了。', e: 'normal' },
        { s: 'alicia', t: '嗯。从那天起，我就知道你一定会成为真正的骑士。', e: 'smile' },
      ],
      [
        { s: 'alicia', t: '雷恩。如果有一天，我的血必须用来加固封印……', e: 'sad' },
        { s: 'rein', t: '不会有那一天。', e: 'determined' },
        { s: 'alicia', t: '……你怎么知道？', e: 'sad' },
        { s: 'rein', t: '因为我不会让那一天来。不是作为骑士，是作为雷恩。', e: 'determined' },
        { s: 'alicia', t: '……傻瓜。', e: 'smile' },
        { s: 'alicia', t: '那，我也不会让你一个人去扛。不是作为巫女，是作为艾莉西亚。', e: 'smile' },
      ],
      ['礼拜堂的台阶', '受伤的鸽子', '不是作为骑士'],
    ),
  },
  {
    a: 'rein',
    b: 'loy',
    ranks: R(
      [
        { s: 'loy', t: '雷恩，比一场！看谁先打倒三个敌人！', e: 'smile' },
        { s: 'rein', t: '战场上不是比赛的地方。', e: 'normal' },
        { s: 'loy', t: '你这句话跟副团长一模一样。……所以你是怕输吧？', e: 'smile' },
        { s: 'rein', t: '……输的人请吃饭。', e: 'determined' },
      ],
      [
        { s: 'loy', t: '雷恩，我一直很羡慕你。团长把赤鳞剑给了你，不是我。', e: 'sad' },
        { s: 'rein', t: '洛伊……', e: 'surprised' },
        { s: 'loy', t: '别误会，不是嫉妒。只是我想，我得变得更强，强到能站在你旁边。', e: 'determined' },
        { s: 'rein', t: '你一直都站在我旁边啊。', e: 'smile' },
      ],
      [
        { s: 'loy', t: '雷恩。等重建骑士团的时候，我要当副团长。', e: 'determined' },
        { s: 'rein', t: '……副团长？', e: 'surprised' },
        { s: 'loy', t: '对。要有人在你犹豫的时候骂你，在你逞强的时候拉住你。', e: 'determined' },
        { s: 'loy', t: '那个位置空着，我不放心交给别人。', e: 'sad' },
        { s: 'rein', t: '……嗯。拜托你了，副团长。', e: 'smile' },
      ],
      ['比赛', '赤鳞剑', '副团长'],
    ),
  },
  {
    a: 'kia',
    b: 'raven',
    ranks: R(
      [
        { s: 'kia', t: '哥，你的刀能借我看看吗？', e: 'thinking' },
        { s: 'raven', t: '……别碰刀刃。', e: 'normal' },
        { s: 'kia', t: '我又不是小孩子了！', e: 'angry' },
        { s: 'raven', t: '……在我眼里，你一直是。', e: 'smile' },
      ],
      [
        { s: 'raven', t: '琪雅，院里的孩子们……都好吗。', e: 'normal' },
        { s: 'kia', t: '小汤姆学会写字了，花花会做饭了，阿瑞嘴巴越来越毒——像你。', e: 'smile' },
        { s: 'raven', t: '……像我？', e: 'surprised' },
        { s: 'kia', t: '对。我每天都跟他们讲你的事。所以他们都知道，有个哥哥在很远的地方。', e: 'sad' },
        { s: 'raven', t: '……', e: 'sad' },
      ],
      [
        { s: 'raven', t: '琪雅。打完这一仗，我想回孤儿院。', e: 'normal' },
        { s: 'kia', t: '……真的？', e: 'surprised' },
        { s: 'raven', t: '我会教孩子们剑术。不是为了打仗，是为了保护自己。', e: 'normal' },
        { s: 'kia', t: '那你得先学会做饭。院里的规矩，每个人轮流做。', e: 'smile' },
        { s: 'raven', t: '……这比剑术难多了。', e: 'smile' },
      ],
      ['刀', '孤儿院的孩子们', '回家'],
    ),
  },
  {
    a: 'fina',
    b: 'loy',
    ranks: R(
      [
        { s: 'fina', t: '喂，笨蛋骑士。你刚才差点被射中。', e: 'angry' },
        { s: 'loy', t: '那支箭是你射偏的吧！？', e: 'surprised' },
        { s: 'fina', t: '我是在帮你挡另一支箭！……算了，你不懂。', e: 'angry' },
      ],
      [
        { s: 'loy', t: '菲娜，你在哭吗？', e: 'surprised' },
        { s: 'fina', t: '……没有。是风太大。', e: 'sad' },
        { s: 'loy', t: '今天是你爸爸的……？', e: 'sad' },
        { s: 'fina', t: '……生日。', e: 'sad' },
        { s: 'loy', t: '……那我陪你坐一会儿。我不说话，你也不用说话。', e: 'normal' },
        { s: 'fina', t: '……笨蛋。', e: 'sad' },
      ],
      [
        { s: 'fina', t: '洛伊，这个给你。', e: 'normal' },
        { s: 'loy', t: '这是……箭羽？', e: 'surprised' },
        { s: 'fina', t: '爸爸做的最后一支箭的羽毛。我们村的习俗，送给……重要的人。', e: 'sad' },
        { s: 'loy', t: '重要的人……', e: 'surprised' },
        { s: 'fina', t: '别、别想太多！只是战友！战友而已！', e: 'angry' },
        { s: 'loy', t: '……嗯，我会好好收着的。一辈子。', e: 'smile' },
      ],
      ['射偏的箭', '风', '箭羽'],
    ),
  },
  {
    a: 'lucas',
    b: 'alicia',
    ranks: R(
      [
        { s: 'lucas', t: '艾莉西亚，你的治疗魔法很特别。魔力的流动方式，和学院教的完全不同。', e: 'thinking' },
        { s: 'alicia', t: '是吗？我只是在心里祈祷而已。', e: 'surprised' },
        { s: 'lucas', t: '祈祷……也许巫女的魔法，本来就不需要公式。', e: 'thinking' },
      ],
      [
        { s: 'alicia', t: '卢卡斯，你在写什么？', e: 'normal' },
        { s: 'lucas', t: '给老师的信。……虽然不知道寄到哪里。', e: 'sad' },
        { s: 'alicia', t: '……写了什么？', e: 'normal' },
        { s: 'lucas', t: '「老师，我交到了朋友。他们不懂魔导公式，但都很厉害」。', e: 'smile' },
        { s: 'alicia', t: '……这封信，一定能寄到的。', e: 'smile' },
      ],
      [
        { s: 'lucas', t: '艾莉西亚。我研究了巫女的血脉——你的血不只是钥匙。', e: 'determined' },
        { s: 'alicia', t: '诶？', e: 'surprised' },
        { s: 'lucas', t: '它能「共鸣」。和龙鳞、和誓约骑士的血脉共鸣。只要条件齐全，锁就不必只靠一个人。', e: 'determined' },
        { s: 'alicia', t: '不必只靠一个人……', e: 'thinking' },
        { s: 'lucas', t: '这是我的作业。总有一天，我要交给老师看。', e: 'smile' },
      ],
      ['不需要公式的魔法', '寄不出的信', '共鸣'],
    ),
  },
  {
    a: 'sera',
    b: 'hagen',
    ranks: R(
      [
        { s: 'hagen', t: '天马骑士。你的天马，似乎不怕我。', e: 'normal' },
        { s: 'sera', t: '它叫白霜。它只亲近心地善良的人。', e: 'smile' },
        { s: 'hagen', t: '……「马知人心」。古谚没骗人。', e: 'smile' },
      ],
      [
        { s: 'sera', t: '哈根阁下，您守了二十年的桥。不寂寞吗？', e: 'normal' },
        { s: 'hagen', t: '寂寞。但桥那头每个平安走过去的人，都是我的伙伴。', e: 'normal' },
        { s: 'sera', t: '……我的中队也是这样。每一次巡逻，都是为了别人能平安回家。', e: 'sad' },
        { s: 'hagen', t: '那你的中队，一直都在。在每一个平安回家的人身上。', e: 'smile' },
      ],
      [
        { s: 'sera', t: '哈根阁下。战争结束后，我想在诺斯加德重建天马骑士团。', e: 'determined' },
        { s: 'hagen', t: '我会让氏族的年轻人去帮忙。雪山离北境不远。', e: 'normal' },
        { s: 'sera', t: '……您也会来吗？', e: 'thinking' },
        { s: 'hagen', t: '「老桥也会想看新的风景」。……我会去的。', e: 'smile' },
      ],
      ['白霜', '守桥人', '新的风景'],
    ),
  },
  {
    a: 'sieg',
    b: 'rein',
    ranks: R(
      [
        { s: 'sieg', t: '你挥剑的时候，右肩先动。', e: 'normal' },
        { s: 'rein', t: '……副团长也总这么说。', e: 'sad' },
        { s: 'sieg', t: '我知道。他也这么说过我。', e: 'normal' },
      ],
      [
        { s: 'rein', t: '西格，你小时候的副团长……是什么样的人？', e: 'thinking' },
        { s: 'sieg', t: '冷笑话很多，一个都不好笑。', e: 'normal' },
        { s: 'rein', t: '……现在也是。', e: 'smile' },
        { s: 'sieg', t: '他会在我睡着以后，偷偷来给我盖被子。以为我不知道。', e: 'sad' },
        { s: 'rein', t: '……', e: 'sad' },
      ],
      [
        { s: 'sieg', t: '雷恩。那封信的最后一句，我一直没说。', e: 'normal' },
        { s: 'rein', t: '……最后一句？', e: 'surprised' },
        { s: 'sieg', t: '「替我照顾雷恩。那孩子，是你的弟弟」。', e: 'sad' },
        { s: 'rein', t: '……！', e: 'surprised' },
        { s: 'sieg', t: '……所以，以后右肩先动的时候，我会骂你的。', e: 'smile' },
        { s: 'rein', t: '……嗯。哥。', e: 'smile' },
      ],
      ['右肩', '冷笑话', '信的最后一句'],
    ),
  },
  {
    a: 'gren',
    b: 'kia',
    ranks: R(
      [
        { s: 'kia', t: '大叔，你的眼罩下面是什么样子？', e: 'thinking' },
        { s: 'gren', t: '想看？收费。', e: 'smile' },
        { s: 'kia', t: '小气！', e: 'angry' },
      ],
      [
        { s: 'gren', t: '小猫，你偷东西的时候，从来不怕被抓？', e: 'thinking' },
        { s: 'kia', t: '怕啊。可孩子们饿肚子更可怕。', e: 'normal' },
        { s: 'gren', t: '……我小时候，也有人为了让我吃上饭去偷东西。后来他被抓了，再也没回来。', e: 'sad' },
        { s: 'kia', t: '……大叔。', e: 'sad' },
        { s: 'gren', t: '所以别被抓。听见没。', e: 'determined' },
      ],
      [
        { s: 'gren', t: '小猫，打完仗以后，我打算在港城开家酒馆。', e: 'normal' },
        { s: 'kia', t: '大叔会做菜？', e: 'surprised' },
        { s: 'gren', t: '不会。所以要雇人。孤儿院里大一点的孩子，可以来帮工。工钱照付。', e: 'smile' },
        { s: 'kia', t: '……大叔，你真的是个好人耶。', e: 'smile' },
        { s: 'gren', t: '佣兵只认金币。这是投资。', e: 'smile' },
      ],
      ['眼罩', '被抓走的人', '酒馆'],
    ),
  },
  {
    a: 'igna',
    b: 'rein',
    ranks: R(
      [
        { s: 'igna', t: '小骑士，你的鼻子和三百年前那个人一模一样。', e: 'smile' },
        { s: 'rein', t: '……鼻子？', e: 'surprised' },
        { s: 'igna', t: '对。生气的时候会皱起来。', e: 'smile' },
      ],
      [
        { s: 'rein', t: '伊格娜，三百年前的那位骑士……是什么样的人？', e: 'thinking' },
        { s: 'igna', t: '笨。固执。明明怕得发抖，还要挡在我前面。', e: 'smile' },
        { s: 'igna', t: '他说：「龙也是需要被守护的」。……三百年来，我一直记得这句话。', e: 'sad' },
        { s: 'rein', t: '……他是个好骑士。', e: 'smile' },
      ],
      [
        { s: 'igna', t: '小骑士。如果我又要回去当锁……你会难过吗？', e: 'sad' },
        { s: 'rein', t: '会。所以我不会让你回去。', e: 'determined' },
        { s: 'igna', t: '……你果然和他一样笨。', e: 'smile' },
        { s: 'rein', t: '龙也是需要被守护的。……这次，换我们来。', e: 'determined' },
        { s: 'igna', t: '……嗯。', e: 'smile' },
      ],
      ['鼻子', '三百年前的骑士', '换我们来'],
    ),
  },
];

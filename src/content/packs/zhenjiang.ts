import type { ContentPack, NpcDef, RoomDef } from '../types';

/**
 * 镇江 · 西津渡的人与大市口（Issue #84）。
 * 江南道第三个地区的入口与中心：渡口有人，市口有市，京口的兵、镇江的醋，还有江心荒洲的一句远景。
 */

const ROOMS: RoomDef[] = [
  {
    id: 'zj_shi', name: '大市口', area: '镇江 · 城中', region: 'zj', t: 15, map: [50, 56],
    desc: '大市口是镇江最热闹的去处，南北货堆到街沿，醋坊的酸香、面摊的热气混作一团。京口驻军的兵丁挎着刀巡街，行人见了好些都往边上让。',
    npcs: ['zj_bing', 'zj_you', 'zj_shushu'],
    exits: [['北', 'zj_xijin', '南']],
    road: '你从西津渡上岸，顺着南门大街往城中走，人声渐渐稠了……'
  }
];

const NPCS: NpcDef[] = [
  {
    id: 'zj_shuli', name: '何税吏', ini: '税', tone: 'gray', brief: '数着渡钱',
    look: '吏员的青衫浆洗得发硬，袖口磨出了毛边。他数钱不用眼看，手指头蘸着唾沫一张张捻，比算盘还快。',
    at: { room: 'zj_xijin' },
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「渡钱三文，人物牲口另计，江湖上的规矩也是官家的规矩。」何税吏把钱串子收进腰包，「不过嘛——常过江的脸熟客，小的也眼熟。布行的马掌柜一日三过江，小的都记着呢。您问这个做什么？」' }
      ]
    }
  },
  {
    id: 'zj_xusao', name: '许嫂', ini: '面', tone: 'amber', brief: '煮着锅盖面',
    look: '面摊支在渡口背风处，一口大锅上漂着只小锅盖，面香混着醋香，半条街都闻得见。',
    at: { room: 'zj_xijin' },
    verbs: ['交谈', '观察', '购买'],
    actions: {
      交谈: [
        { text: '「香醋摆不坏，肴肉不当菜，面锅里面煮锅盖——镇江三怪，公子样样得尝。」许嫂手起面落，「过江的人，吃一碗再走，才不枉渡这一趟。」' }
      ],
      购买: [
        { if: { silver: 10 }, text: '许嫂甩面下锅，浇一勺高汤，端上桌来。（银两 −10 文）',
          do: [{ type: 'silver', delta: -10 }, { type: 'heal', hp: 30 }, { type: 'toast', text: '银两 −10 文' }] },
        { text: '许嫂把抹布一搭：「面钱十文，公子。渡口不赊账。」' }
      ]
    }
  },
  {
    id: 'zj_bing', name: '驻军兵丁', ini: '兵', tone: 'red', brief: '白拿老醋',
    look: '京口驻军的皂衣外罩着皮坎肩，腰刀是真家伙。一坛老醋夹在腋下，坛口的泥封都抠开了一半。',
    verbs: ['交谈', '观察', '出头', '帮腔', '掏钱'],
    actions: {
      观察: [{ text: '腰刀是真家伙，靴底沾着江泥——是沿江巡哨的兵。他夹醋的手法熟极了，不是头一回白拿。' }],
      交谈: [
        { if: { flag: 'zj_chutou' },
          text: '兵丁见了你就啐了一口：「多管闲事的……」周围摊贩都低下头去，只当没听见。' },
        { if: { flag: 'zj_bangqiang' },
          text: '「哟，敲边鼓的来了。」兵丁斜着眼笑，「这公子懂规矩——比有的人强。」' },
        { if: { flag: 'zj_taokuang' },
          text: '兵丁夹着醋坛斜了你一眼，没说话。掏钱消灾的事，他见得多了。' },
        { text: '兵丁把一坛老醋往腋下一夹：「军爷征醋犒营，还想要钱？给爷这张脸！」掌柜的在摊子后头脸都白了。' }
      ],
      出头: [
        { if: { notFlag: 'zj_shi_done' },
          text: '你上前把兵丁的手从醋坛上拿开：「京口的军纪，连一碗醋都要抢？」兵丁涨红了脸，手按上刀柄——四下的看客却都站了出来，他哼了一声，空着手走了。',
          do: [
            { type: 'flag', flag: 'zj_chutou' }, { type: 'flag', flag: 'zj_shi_done' },
            { type: 'xia', delta: 3 },
            { type: 'flag', flag: 'zj_garrison_grudge' },
            { type: 'feed', tag: '江湖', text: '大市口有个年轻人替醋坊出头，顶了京口驻军的兵丁。看客叫好，也有人替他捏汗。' }
          ] },
        { text: '「这事了了，别再招我。」兵丁别过脸去。' }
      ],
      帮腔: [
        { if: { notFlag: 'zj_shi_done' },
          text: '你敲着边鼓：「军爷看上的醋，那是尤家的福分。」尤掌柜的脸白得像纸，兵丁夹起醋坛，得意洋洋地走了。',
          do: [
            { type: 'flag', flag: 'zj_bangqiang' }, { type: 'flag', flag: 'zj_shi_done' },
            { type: 'eming', delta: 3 },
            { type: 'feed', tag: '江湖', text: '京口的兵丁在大市口白拿了一坛老醋，还有个闲人在旁边帮腔。' }
          ] },
        { text: '「公子懂行。」兵丁拍了拍你的肩膀，力道不轻。' }
      ],
      掏钱: [
        { if: { notFlag: 'zj_shi_done', silver: 30 },
          text: '你把三十文拍在案上：「这坛醋算我的，军爷拿好。」兵丁掂掂钱袋走了。尤掌柜朝你深深一揖，眼圈有点红。',
          do: [
            { type: 'silver', delta: -30 },
            { type: 'flag', flag: 'zj_taokuang' }, { type: 'flag', flag: 'zj_shi_done' },
            { type: 'feed', tag: '江湖', text: '大市口的醋坊受了兵气，多亏一位公子掏钱解围。' }
          ] },
        { text: '你摸了摸钱袋，三十文还凑不齐。兵丁的唾沫星子已经喷到尤掌柜脸上了。' }
      ]
    }
  },
  {
    id: 'zj_you', name: '尤掌柜', ini: '醋', tone: 'jade', brief: '守着醋坛',
    look: '围裙上全是醋渍，指甲缝里也是。一双手泡得发白发皱——常年跟醋坛子打交道的人，才有这样一双手。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { if: { flag: 'zj_chutou' },
          text: '「多谢公子仗义……只是往后，军爷的醋，小店还得月月送。」尤掌柜苦笑，「得罪了兵，这醋香里，往后都得掺着憋屈。前几日我去军营送醋，守门的说是有人吩咐了，要刁难我。」' },
        { if: { flag: 'zj_bangqiang' },
          text: '尤掌柜别过脸去，没搭理你。柜台底下的抹布，被他拧得变了形。' },
        { if: { flag: 'zj_taokuang' },
          text: '「多谢客官解围。」尤掌柜捧出碟肴肉，「自家糟的，公子尝尝。这坛醋的方子，是尤家三代的香火——三代人，就守着这么一口老窖。」' },
        { text: '「小店的醋，糟了三年才出坛。」尤掌柜掀开坛口，酸香扑鼻，「镇江人说香醋摆不坏——摆的不是醋，是人心。」' }
      ]
    }
  },
  {
    id: 'zj_shushu', name: '说书先生', ini: '书', tone: 'purple', brief: '拍着醒木',
    look: '长衫旧而整洁，醒木一拍满座皆惊。说到关子处，扇子一收，满堂的茶客伸长了脖子。',
    verbs: ['交谈', '观察'],
    actions: {
      交谈: [
        { text: '「要说镇江，北固山是『天下第一江山』，金山寺夜里江心放光。」说书先生把扇子一收，忽然压低声音，「至于江心那座荒洲——夜里有灯火，渔家都绕着走。书上没写的，老朽也不敢说。」' }
      ]
    }
  }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: NPCS,
  news: [
    { if: { flag: 'zj_chutou' },
      text: '大市口有个年轻人替醋坊出头，顶撞了京口驻军的兵爷。围观的都说痛快，也有人替他捏一把汗。' },
    { if: { flag: 'zj_bangqiang' },
      text: '京口驻军的兵爷在大市口白得一坛老醋，听说还有个闲人在旁边帮着敲边鼓。' },
    { if: { flag: 'zj_taokuang' },
      text: '大市口的醋坊受了兵气，多亏一位公子掏钱解围。尤家的老醋，往后怕是要给这位公子留着一坛。' },
    { if: { flag: 'zj_garrison_grudge' },
      text: '京口驻军的兵爷在大市口丢了脸面，这几日寻人问一个佩剑年轻人的名字，说要给他「长长记性」。' }
  ]
};

export default pack;

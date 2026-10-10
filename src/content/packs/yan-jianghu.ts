import type { Cond, ContentPack, EyeDef } from '../types';

/**
 * 根基之眼 · 江湖补遗（Issue #113）：画舫、藏经阁、虹桥船坞、蜀冈官道、汪家盐号、
 * 镇江、瓜洲，以及扬州城里打得着的对手、官道上请帮手的差事。
 * 写法见 docs/content-guide.md「根基之眼」，示范见 genji-yan.ts。
 * 门槛：二十五是初到扬州就可能看得出的，二十九要练上几重，三十三是出类拔萃。
 * 带旗标的眼（看出来就是一条路），旗标都由本文件末尾的传闻来读。
 */

const AFTER_GZ: Cond = { quest: { id: 'prologue', atLeast: 3 } };
const ZHENXIANG: Cond = { flag: 'cw_zhenxiang' };
const TAKEN: Cond = { flag: 'huafang_taken' };

const EYES: EyeDef[] = [
  /* ---------- 瘦西湖 · 画舫 ---------- */
  { npc: 'yunnian', attr: '体魄', atLeast: 25,
    text: '她左手中指裹着一圈蓝布，布底下是按弦按出来的厚茧；虎口和腕子上另有一层硬茧，唱曲的手，在冷水里泡过，也在硬东西上磨过。' },
  { npc: 'yunnian', attr: '悟性', atLeast: 33,
    text: '她跟你说身世的时候，眼睛总往船头瞟；护院换班的脚步声一响，她就收了声，脸上换成笑。' },
  { npc: 'wangshao', attr: '根骨', atLeast: 25,
    text: '他折扇转得花哨，腕子却是软的；站着的时候重心吊在胯上，没站一会儿就要换腿。' },
  { npc: 'wangshao', attr: '胆魄', atLeast: 29,
    text: '他话说得横，折扇磕得一声比一声响；你往前走一步，他的眼睛就躲开你腰间的兵刃。' },
  { room: 'huafang', attr: '身法', atLeast: 25,
    text: '跳板又窄又滑，踩上去就打晃；湖面的风一阵阵压过来，船身一倾，人就站不稳。' },
  { room: 'huafang', attr: '悟性', atLeast: 29,
    text: '篷里的琵琶声停了又起，每回起头总差着半个调，弹的人手上没准头。' },

  /* ---------- 大明寺 · 藏经阁 ---------- */
  { npc: 'cangjing_mingxin', attr: '体魄', atLeast: 25,
    text: '他里头的袍子打着补丁，袈裟遮不住那两截细得像柴的手腕；眼下挂着两团青，人瘦得脱了形。' },
  { npc: 'cangjing_mingxin', attr: '胆魄', atLeast: 29,
    text: '你盯着他的时候他不敢抬头，手里的扫帚却一下也没停。' },
  { npc: 'cangjing_fakong', attr: '体魄', atLeast: 25,
    text: '他那右手抖起来，先从肘上发紧，跟老人手抖两样。袖口那点新鲜泥还是潮的。',
    do: [{ type: 'flag', flag: 'yjh_fakong_bi' }] },
  { npc: 'cangjing_fakong', attr: '根骨', atLeast: 29,
    text: '他在柜旁立了半晌，六十多岁的人，呼吸细得听不见，胸口几乎不起伏。' },

  /* ---------- 虹桥船坞 ---------- */
  { npc: 'cw_laotou', attr: '体魄', atLeast: 25,
    text: '火盆烤着他半边脸，另半边脸青得发暗，两条腿在棉袄底下抖。' },
  { npc: 'cw_laotou', attr: '胆魄', atLeast: 25,
    text: '他讲水鬼讲得唾沫横飞，火盆却一个劲往自己脚边挪，背死死抵着桥墩。' },
  { npc: 'cw_laotou', attr: '悟性', atLeast: 29,
    text: '他说「官府都不敢管」的时候，眼睛没有看你，往湖面上溜。' },
  { npc: 'cw_shuigui', attr: '根骨', atLeast: 29,
    text: '他从水里探出半个身子，肩背上的筋一条条绷着，水珠子顺着脊梁沟往下滚。' },
  { npc: 'cw_shuigui', attr: '体魄', atLeast: 25, if: ZHENXIANG,
    text: '他手腕上的勒痕旧得发白，肩头压出两道深沟，右边那道比左边深。',
    do: [{ type: 'flag', flag: 'yjh_mo_liu_ya' }] },
  { room: 'yz_chuanwu', attr: '身法', atLeast: 25,
    text: '船坞深处的破桅杆斜在水面上，桅杆和桥墩之间搭着几块朽板，板面泡得发虚。' },
  { room: 'yz_chuanwu', attr: '悟性', atLeast: 33,
    text: '桥底第三根桩子的水线上头，青苔磨出一圈白茬，桩身上另有几道抓痕。' },

  /* ---------- 蜀冈官道 · 募兵 ---------- */
  { npc: 'gd_feng', attr: '体魄', atLeast: 25,
    text: '他点名册的手指粗大，虎口一层茧压着一层，捏笔的姿势像握缰绳。' },
  { npc: 'gd_feng', attr: '悟性', atLeast: 29,
    text: '名册前头的名字密密麻麻，他翻到末尾，又折回去数了一遍；数完合上册子，半天没言语。',
    do: [{ type: 'flag', flag: 'yjh_feng_bu' }] },
  { npc: 'gd_zhou', attr: '体魄', atLeast: 25,
    text: '鞍袋把他的肩压得一边高一边低，嘴唇干得起了皮。' },
  { npc: 'gd_zhou', attr: '身法', atLeast: 29,
    text: '他上马不扶鞍，脚尖一点就翻上去了，落地的步子还是马背上的步子。' },
  { npc: 'gd_tao', attr: '胆魄', atLeast: 25,
    text: '他攥着毡帽站在募兵帐前，指节都攥白了，就是不挪窝。' },
  { npc: 'gd_tao', attr: '根骨', atLeast: 29,
    text: '他虎口的茧是锄头柄磨出来的，肩上一边一块硬肉，是扁担压出来的。' },

  /* ---------- 蜀冈官道 · 请帮手的差事 ---------- */
  { npc: 'bs_zhao', attr: '胆魄', atLeast: 25,
    text: '他端茶的手很稳，官道上车马声一响，眼神就往两头飞。' },
  { npc: 'bs_zhao', attr: '悟性', atLeast: 29,
    text: '茶摊支在官道的弯口上，坐在棚下，两头的动静都收在眼里。' },
  { npc: 'bs_wu', attr: '根骨', atLeast: 25,
    text: '他坐着也是行伍的坐相，铁尺横在膝上，手搭的位置一伸手就够得着。' },
  { npc: 'bs_wu', attr: '体魄', atLeast: 29,
    text: '他鬓角花白，虎口的茧没有退；铁尺在手里翻来覆去，指头始终搭着尺身。',
    do: [{ type: 'flag', flag: 'yjh_wu_li' }] },
  { npc: 'bs_zheng', attr: '体魄', atLeast: 25,
    text: '他手背上的旧伤一道叠着一道，最深那道从虎口斜到腕上，疤肉都钝了。' },
  { npc: 'bs_zheng', attr: '根骨', atLeast: 29,
    text: '他把猎弓拉成满月，停了半晌，气息不乱半分，弦也不颤。' },
  { npc: 'bs_qi', attr: '胆魄', atLeast: 25,
    text: '他咧嘴笑的时候，眼睛先往你身后扫一圈，才回到你脸上。' },
  { npc: 'bs_qi', attr: '根骨', atLeast: 33,
    text: '他的刀不走花招，每一刀都落在你守势最别扭的那个角上。' },

  /* ---------- 汪家盐号（示范写过毕掌柜，这里补其余的人） ---------- */
  { npc: 'yh_wanglaoye', attr: '胆魄', atLeast: 25,
    text: '他笑的时候看着你的眼睛，手里的佛珠却捻得飞快，珠子一颗碰着一颗。',
    do: [{ type: 'flag', flag: 'yjh_wang_zhu' }] },
  { npc: 'yh_wanglaoye', attr: '体魄', atLeast: 29,
    text: '他起身送客起得太急，手在柜台沿上按了一下才站稳，跟着又喘了两口气。' },
  { npc: 'yh_xinger', attr: '悟性', atLeast: 25,
    text: '她擦壶擦得极认真，眼睛却把前堂扫了一遍又一遍；谁进门、谁给钱、谁凑到柜台前，一样没落下。' },
  { npc: 'yh_xinger', attr: '胆魄', atLeast: 29, if: TAKEN,
    text: '她敢压着嗓子把后院的事说给你听，说一句，回头看一眼门口。' },
  { npc: 'yh_menfang', attr: '根骨', atLeast: 25,
    text: '他倚着门框嗑瓜子，一副懒散相，两只脚却不丁不八，重心落在前掌上。' },
  { npc: 'yh_menfang', attr: '胆魄', atLeast: 29,
    text: '他从你进门起，眼睛就没离开过你的手；你抬手，他的眼皮跟着抬。' },

  /* ---------- 镇江 · 西津渡与大市口 ---------- */
  { npc: 'zj_shuli', attr: '体魄', atLeast: 25,
    text: '他袖口磨出了毛边，手指关节却红肿着，是入秋凉水蘸多了冻出来的疮。' },
  { npc: 'zj_shuli', attr: '悟性', atLeast: 29,
    text: '他嘴上说着规矩，眼睛早把你的兵刃、衣裳、靴底各扫了一遍。' },
  { npc: 'zj_bing', attr: '根骨', atLeast: 25,
    text: '腰刀是真家伙，按刀的手位却不对，五指摊着，虎口朝前，是挑担背刀的手势。' },
  { npc: 'zj_bing', attr: '胆魄', atLeast: 25,
    text: '他白拿摊上的东西，专挑不敢吱声的那几家。方才有个挑夫多看了他两眼，他的手就先按上了刀柄。' },
  { npc: 'zj_you', attr: '体魄', atLeast: 25,
    text: '他指甲缝里的醋渍浸进了肉里，发乌，十个指头都是这个颜色。' },
  { npc: 'zj_you', attr: '胆魄', atLeast: 29,
    text: '他守着坛口的那双手满是醋渍咬出来的裂口，人却站得笔直。' },
  { npc: 'zj_shushu', attr: '身法', atLeast: 25,
    text: '醒木一拍，满座都静了；那一拍用的是巧劲，腕子一抖，声音又脆又传得远。' },
  { npc: 'zj_shushu', attr: '悟性', atLeast: 29,
    text: '说到「江心荒洲」，他把扇子收了，话头一转，说起旁的事来。' },

  /* ---------- 瓜洲 ---------- */
  { npc: 'shaogong', attr: '身法', atLeast: 25,
    text: '他蹲在船头补网，船身随浪一起一伏，人蹲在上头，晃也不晃。' },
  { npc: 'shaogong', attr: '根骨', atLeast: 29,
    text: '他蹲了大半晌，起身时活动两下就利索，腿不麻，腰不酸。' },
  { npc: 'shengchuan', attr: '体魄', atLeast: 25,
    text: '船头两个汉子站了半晌，脚不换位，身子不晃，脚下随船吃着力。' },
  { npc: 'shengchuan', attr: '悟性', atLeast: 29,
    text: '他们说是打听人，问来问去只有同一句话，问完了也不走，一天一天泊在码头。' },
  { npc: 'huichun', attr: '胆魄', atLeast: 25, if: AFTER_GZ,
    text: '外乡人在镇上打听人的那几日，满街铺子都早早上了门板，他的药铺照旧开着，碾药的声音从早响到傍晚。' },
  { npc: 'huichun', attr: '悟性', atLeast: 29,
    text: '你报药名的时候，他的手比嘴先动，屉子用不着看，手指先一步伸进去。' },
  { room: 'gz_fen', attr: '悟性', atLeast: 33, if: { ...AFTER_GZ, flag: 'kp_xin' },
    text: '树根的边上有一排细细的刻痕，是拿刀尖划的，一年一道，已经刻满了半圈。你数了数，数目和你的岁数对得上。' },
  { room: 'gz_fen', attr: '悟性', atLeast: 33, if: { ...AFTER_GZ, notFlag: 'kp_xin' },
    text: '木牌上「江伯之墓」四个字是你拿刀刻的；起笔收笔的走势，跟江伯那张药方上的字一模一样。' },
  // 祭拜过才说「跪过多少回」：下葬后头一回来上坟，不该这么说（审查 A31）
  { room: 'gz_fen', attr: '胆魄', atLeast: 25, if: { ...AFTER_GZ, flag: 'gz_fen_bai' },
    text: '你在这里跪过多少回，膝盖自己记得；你常跪的那两块石板，比别处干净。' },

  /* ---------- 扬州城 · 打得着的对手 ---------- */
  { npc: 'jy_sunbiao', attr: '体魄', atLeast: 25,
    text: '他右肩比左肩沉，抬臂的时候先耸一下；肩头一道掀开的旧疤，收口潦草，天一冷就发亮。你往他右边一抢，他抬臂就慢半分。',
    do: [{ type: 'flag', flag: 'yjh_sun_jian' }] },
  { npc: 'jy_sunbiao', attr: '根骨', atLeast: 29,
    text: '拳上的老茧一层压着一层，虎口那道白疤却结得潦草，疤口还泛着红。' },
  { npc: 'jy_sunbiao', attr: '胆魄', atLeast: 25,
    text: '他收份子钱，先在自己腿上拍两下，才伸手去拍人家的柜台，拍得不重。' },
  { npc: 'jy_limazi', attr: '体魄', atLeast: 25,
    text: '他把大刀往背上一拍，腰眼先缩了一下，背上垫的那层「肉」底下，压着旧伤。' },
  { npc: 'jy_limazi', attr: '悟性', atLeast: 29,
    text: '「南七北六十三省」，这句开场白他在哪个码头都说，一个字不差，连停顿的地方都一样。' },
  { npc: 'jy_limazi', attr: '胆魄', atLeast: 25,
    text: '铜锣是他的胆；锣声一停，他的眼神就散一下，人也跟着顿一顿。' },
  { room: 'cheng', attr: '体魄', atLeast: 25,
    text: '东关街扛包的伙计，肩上压出两道深沟，走起路来倒轻快，脚步的劲全在腰腿上。' },
  { room: 'cheng', attr: '身法', atLeast: 29,
    text: '东关街窄，人流都从街心过；盐号门前有几级台阶，高出平地一脚，站在上头，两头的来路都看得见。' }
];

const pack: ContentPack = {
  eyes: EYES,
  news: [
    { if: { flag: 'yjh_sun_jian' },
      text: '东关街收份子的打手，右肩的旧疤叫人看了出来。再收钱的时候，他换了左手拍柜台。', who: ['货郎', '脚夫', '小二'], about: 'you' },
    { if: { flag: 'yjh_fakong_bi' },
      text: '大明寺守阁的老僧，右臂的筋伤叫人看了出来。第二天，守阁的小沙弥在他臂上缠了一条护臂，师徒俩谁也没提这回事。', who: ['和尚', '小二', '货郎'], about: 'you' },
    { if: { flag: 'yjh_mo_liu_ya' },
      text: '虹桥下那个黑瘦的盐丁，肩上的压痕叫人看了出来——不是贼，是苦力。第二天，桥头石阶上多了一双没人认领的旧棉鞋。', who: ['渔家', '船夫', '脚夫'], about: 'you' },
    { if: { flag: 'yjh_feng_bu' },
      text: '募兵的名册，校尉看得比往常勤。看得懂名册的人私下都在传：这一仗，短不了。', who: ['军汉', '书吏', '脚夫'] },
    { if: { flag: 'yjh_wang_zhu' },
      text: '汪老爷数佛珠的心事叫人看了出来。第二日，他腕上换了串小些的珠子——捻起来，不响了。', who: ['wang', '小二', '掌柜'], about: 'you' },
    { if: { flag: 'yjh_wu_li' },
      text: '蜀冈官道茶棚边擦铁尺的老汉，虎口没退的茧叫人看了出来。老汉把那根铁尺，擦得比往常更亮了些。', who: ['脚夫', '小二', '捕快'], about: 'you' }
  ]
};
export default pack;

/**
 * 立绘（头像）模块契约
 * ------------------------------------------------------------------
 * 用 SVG 程序化绘制原创角色的半身立绘（日式动画/经典 SRPG 头像风格），
 * 矢量输出，在 4K 下依然锐利。
 */

export type Emotion =
  | 'normal'
  | 'smile'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'determined'
  | 'hurt'
  | 'thinking';

export type PortraitHair =
  | 'short_messy'   // 凌乱短发
  | 'short_neat'    // 整齐短发
  | 'spiky'         // 刺猬头
  | 'long_straight' // 长直发
  | 'long_wavy'     // 长卷发
  | 'ponytail'      // 马尾
  | 'twin_tails'    // 双马尾
  | 'bob'           // 波波头
  | 'braid'         // 单侧长辫
  | 'slicked'       // 背头
  | 'bald'          // 光头
  | 'flowing';      // 飘逸及腰长发（龙姬）

export type PortraitOutfit =
  | 'knight'       // 轻甲骑士（肩甲+胸甲+围巾）
  | 'heavy_armor'  // 重甲
  | 'dark_armor'   // 黑骑士铠甲（尖锐、暗色）
  | 'nun'          // 修女服
  | 'robe'         // 法袍
  | 'mage_coat'    // 学院法师外套（高领、纽扣）
  | 'priest'       // 祭司/大司祭长袍（层叠、华丽）
  | 'leather'      // 皮甲（佣兵）
  | 'hunter'       // 猎装
  | 'thief'        // 兜帽斗篷（盗贼）
  | 'noble'        // 贵族礼服
  | 'royal'        // 王族礼服/斗篷
  | 'sky_knight'   // 天马骑士（白色轻甲、羽翼纹饰）
  | 'dragon_robe'  // 龙姬华服（红金、鳞片纹）
  | 'soldier'      // 普通士兵
  | 'villager';    // 平民

export type PortraitAccessory =
  | 'circlet'
  | 'headband'
  | 'eyepatch'
  | 'scar_face'    // 脸上的伤疤
  | 'scar_chin'
  | 'glasses'
  | 'earrings'
  | 'horns'        // 小龙角
  | 'crown'
  | 'veil'
  | 'hood'
  | 'helmet'
  | 'feather'      // 发间羽毛
  | 'freckles'
  | 'bandage'      // 脸颊创可贴/绷带
  | 'dragon_mark'  // 颈侧/脸颊的龙鳞印记（可发光）
  | 'mitre';       // 高冠

export interface PortraitSpec {
  gender: 'm' | 'f';
  age: 'child' | 'young' | 'adult' | 'old';
  /** CSS 颜色 */
  skin: string;
  hair: string;
  eyes: string;
  hairStyle: PortraitHair;
  facialHair?: 'none' | 'stubble' | 'mustache' | 'beard' | 'full_beard';
  outfit: PortraitOutfit;
  outfitColor: string;
  trimColor: string;
  accessories?: PortraitAccessory[];
  /** 眼睛形状：温和 / 锐利 / 圆润 / 狭长（反派） / 竖瞳（龙） */
  eyeShape?: 'gentle' | 'sharp' | 'round' | 'narrow' | 'slit';
  /** 是否带发光效果（龙印/魔力），颜色 */
  glow?: string;
}

/**
 * 返回完整的 <svg ...>...</svg> 字符串。
 * viewBox 固定为 "0 0 512 640"（半身像：头部在上 2/3，肩部到胸口在下方，底边被裁切）。
 * 背景透明。mirrored=true 时水平翻转（对话框右侧角色面向左）。
 */
export type RenderPortrait = (
  spec: PortraitSpec,
  emotion?: Emotion,
  opts?: { mirrored?: boolean },
) => string;

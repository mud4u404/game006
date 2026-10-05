/**
 * 渲染层模块契约（Render contracts）
 * ------------------------------------------------------------------
 * 这个文件定义了各个渲染子模块之间共享的类型与函数签名。
 * 每个子模块（战场 battlefield、单位模型 units、特效 vfx）各自实现自己的文件，
 * 只通过这里的类型交互。不要在实现文件之间互相 import 私有内容。
 *
 * 坐标约定（重要）：
 *  - Three.js 使用 Y 轴向上。
 *  - 地图格子 (x, y)：x 为列（0..width-1，向右），y 为行（0..height-1，向下/向镜头）。
 *  - 格子 (x, y) 的中心在世界坐标 (x + 0.5, h, y + 0.5)，h 为该格可站立表面高度。
 *  - 1 格 = 1 个世界单位。人形单位总高约 0.95；骑乘单位约 1.3。
 *  - 地图原点在 (0,0,0) 角落，整张地图覆盖 [0,width] × [0,height] 的 XZ 区域。
 *
 * 画面风格（所有模块统一遵守）：
 *  「精致微缩沙盘」——像一张被暖光照亮的桌面战棋模型：
 *  PBR 材质（MeshStandardMaterial / MeshPhysicalMaterial）、柔和投影、
 *  饱和但自然的色彩、圆润的造型（倒角/低多边形但平滑着色）、ACES 色调映射 + Bloom。
 *  人物为原创的日系三头身造型：动画风格的大眼睛（脸部贴图）、发束式头发、
 *  冷紫阴影的赛璐璐着色与细描边。
 */
import type * as THREE from 'three';

/* ================================================================== */
/*  通用                                                               */
/* ================================================================== */

/** 画质档位。ultra 用于 4K（3840×2160）输出。 */
export type Quality = 'low' | 'medium' | 'high' | 'ultra';

/* ================================================================== */
/*  地形 / 战场                                                         */
/* ================================================================== */

/**
 * 地形类型（玩法语义）。视觉表现还会受主题 ThemeId 影响，
 * 例如 snow 主题下的 plain 应渲染为积雪平地、forest 为雪松林。
 */
export type TerrainId =
  | 'plain'    // 平原
  | 'road'     // 道路（土路/石板路，视主题）
  | 'forest'   // 森林（格内有 2~4 棵树）
  | 'hill'     // 丘陵（略微隆起，草坡/岩坡）
  | 'mountain' // 山地（明显隆起的岩石山体，步兵可通过）
  | 'peak'     // 高山（陡峭险峰，仅飞行可过）
  | 'water'    // 深水（河/海，仅飞行可过）
  | 'shallow'  // 浅滩（浅水，可涉水）
  | 'bridge'   // 桥（架在水上，木桥或石桥）
  | 'sand'     // 沙地/沙滩
  | 'snow'     // 深雪（比平地更厚的积雪堆）
  | 'lava'     // 熔岩（发光流动的岩浆）
  | 'ash'      // 灰烬地（火山灰、焦土）
  | 'floor'    // 石砖地面（城堡/神殿内部、广场）
  | 'wall'     // 城墙/墙壁（不可通行，有高度）
  | 'pillar'   // 石柱（不可通行）
  | 'gate'     // 城门（可通行的门洞，两侧通常是墙）
  | 'throne'   // 王座/祭坛（Boss 常驻格）
  | 'village'  // 村庄（可拜访的民居，有门、亮灯的窗）
  | 'house'    // 民房/建筑（不可通行的装饰建筑）
  | 'fort'     // 堡垒/营寨（可驻守，回复 HP）
  | 'ruins'    // 废墟（倒塌的石块）
  | 'stairs'   // 台阶
  | 'cliff'    // 悬崖（不可通行的高耸岩壁）
  | 'deck';    // 船甲板/码头木板

/** 地图字符图例（章节数据用 ASCII 描述地图，每个字符 1 格） */
export const TERRAIN_CHARS: Record<string, TerrainId> = {
  '.': 'plain',
  '=': 'road',
  T: 'forest',
  n: 'hill',
  M: 'mountain',
  A: 'peak',
  '~': 'water',
  '-': 'shallow',
  B: 'bridge',
  s: 'sand',
  '*': 'snow',
  L: 'lava',
  a: 'ash',
  _: 'floor',
  '#': 'wall',
  I: 'pillar',
  G: 'gate',
  K: 'throne',
  V: 'village',
  h: 'house',
  F: 'fort',
  r: 'ruins',
  S: 'stairs',
  C: 'cliff',
  d: 'deck',
};

/**
 * 场景主题：决定天空、光照、雾、调色、环境粒子，以及地形的视觉变体。
 *  - night_fort  夜晚的边境要塞：深蓝夜色、城墙火盆、燃烧的余烬飘散、月光冷光 + 火光暖光
 *  - dusk_road   秋日黄昏的乡间道路：橙紫色天空、长影子、远处烟柱、落叶
 *  - forest      白昼的深林：绿意浓郁、斑驳的光束（god rays 感）、萤火/花粉
 *  - port_town   阴天傍晚的港口城镇：石板路、码头、灰蓝调、海鸥/细雨可选
 *  - coast       晴朗的海岸悬崖：明亮蓝天、海浪、白色沙滩
 *  - snow        暴风雪中的雪山隘口：冷白蓝、飘雪、低能见度雾
 *  - temple      古老的炎之神殿：昏暗石殿、熔岩沟渠照明、暖红色、漂浮火星
 *  - meadow      金色午后的开阔草原：风吹草浪、暖阳、远山
 *  - castle      雨夜的王都城堡：深蓝 + 火光、雨丝、湿润反光的石板
 *  - volcano     火山祭坛：血红天空、火山灰飘落、熔岩光
 *  - eclipse     日蚀下的终焉祭坛：黑日金环、暗紫与金色、漂浮的碎石与灰烬
 */
export type ThemeId =
  | 'night_fort'
  | 'dusk_road'
  | 'forest'
  | 'port_town'
  | 'coast'
  | 'snow'
  | 'temple'
  | 'meadow'
  | 'castle'
  | 'volcano'
  | 'eclipse';

export interface ChestSpec {
  x: number;
  y: number;
  opened: boolean;
}

export interface MapData {
  width: number;
  height: number;
  /** tiles[y][x] */
  tiles: TerrainId[][];
  theme: ThemeId;
  /** 宝箱（放置在可通行格上，作为道具模型显示） */
  chests?: ChestSpec[];
  /** 随机种子：用于装饰物的确定性随机摆放（同一张图每次看起来一样） */
  seed?: number;
}

export interface Battlefield {
  /** 地形、水面、装饰物、建筑、宝箱等全部挂在这个 group 下 */
  group: THREE.Group;
  /** 格子 (x,y) 中心的可站立表面高度（桥面、水面、地面等） */
  heightAt(x: number, y: number): number;
  /** 任意世界坐标 (wx, wz) 处的可站立表面高度（用于平滑插值移动） */
  heightAtWorld(wx: number, wz: number): number;
  /** 格子中心的世界坐标（站立点） */
  tileToWorld(x: number, y: number, out?: THREE.Vector3): THREE.Vector3;
  /**
   * 覆盖层几何体：一张覆盖整个地图的细分网格，顶点贴合「可站立表面」+ 0.02 的高度，
   * 带 uv 属性：uv = (wx / width, wz / height)，即 uv * (width,height) = 世界 XZ = 格子坐标。
   * 由引擎用来绘制移动范围、攻击范围、网格线等高亮（引擎自己提供材质）。
   * 每格至少 4×4 细分。
   */
  overlayGeometry: THREE.BufferGeometry;
  /** 每帧调用：水面波动、树木摇曳、火焰闪烁等 */
  update(dt: number, time: number): void;
  /** 动态改变地形（例如桥被摧毁、城门打开），可以内部整体重建 */
  setTile(x: number, y: number, t: TerrainId): void;
  /** 打开宝箱（播放开箱动画/换成打开模型） */
  openChest(x: number, y: number): void;
  dispose(): void;
}

/** 由战场模块导出 */
export type BuildBattlefield = (map: MapData, quality: Quality) => Battlefield;

/** 环境（天空、灯光、雾、环境粒子）与调色参数 */
export interface EnvironmentMood {
  /** renderer.toneMappingExposure */
  exposure: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  /** 0..1，暗角强度 */
  vignette: number;
  /** 调色：在后期中与画面相乘的颜色（接近白色，轻微偏色） */
  tint: string;
  /** 饱和度倍率（1 = 不变） */
  saturation: number;
  /** 对比度倍率（1 = 不变） */
  contrast: number;
}

export interface Environment {
  /** 主光源（投射阴影），引擎可能需要调整其 shadow camera 覆盖地图 */
  sun: THREE.DirectionalLight;
  mood: EnvironmentMood;
  update(dt: number, time: number, camera: THREE.Camera): void;
  dispose(): void;
}

/**
 * 创建环境：向 scene 添加天空、灯光、雾、环境贴图(scene.environment)、环境粒子。
 * mapSize 用于确定阴影相机范围与粒子分布范围（地图中心为 (width/2, 0, height/2)）。
 */
export type CreateEnvironment = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  theme: ThemeId,
  mapSize: { width: number; height: number },
  quality: Quality,
) => Environment;

/* ================================================================== */
/*  单位模型                                                           */
/* ================================================================== */

export type WeaponModel =
  | 'sword'
  | 'greatsword'
  | 'lance'
  | 'axe'
  | 'bow'
  | 'dagger'
  | 'staff'
  | 'tome'
  | 'claws'
  | 'none';

export type UnitBody =
  | 'humanoid'  // 人形（绝大多数职业）
  | 'wolf'      // 魔狼
  | 'skeleton'  // 骷髅兵（人形骨架，可持武器）
  | 'golem'     // 灰烬魔像（岩石+熔岩裂纹）
  | 'salamander'// 火蜥蜴
  | 'wyvern'    // 飞龙（无骑手的野生飞龙）
  | 'dragon'    // 巨龙（友方红龙 / 终局黑龙，scale 放大，可占视觉上 2×2 格）
  | 'wraith';   // 灰烬亡灵（漂浮的半透明斗篷幽灵）

export type MountModel = 'none' | 'horse' | 'pegasus' | 'wyvern';

export type HelmetModel =
  | 'none'
  | 'circlet'  // 头环
  | 'hood'     // 兜帽
  | 'open'     // 开面盔
  | 'full'     // 全覆盔
  | 'horned'   // 角盔（黑骑士/敌将）
  | 'mitre'    // 主教冠
  | 'wizard'   // 尖顶法师帽
  | 'veil'     // 修女头巾
  | 'crown';   // 王冠

export type HairModel =
  | 'short'
  | 'spiky'
  | 'long'
  | 'ponytail'
  | 'bob'
  | 'braid'
  | 'twin'
  | 'slick'
  | 'bald';

export interface UnitModelSpec {
  body: UnitBody;
  mount?: MountModel;
  /** 体格：影响躯干/铠甲的厚重程度 */
  build?: 'slim' | 'normal' | 'heavy';
  gender?: 'm' | 'f';
  /** CSS 颜色字符串，如 '#f2d3b5' */
  skin?: string;
  hair?: string;
  /** 瞳色 */
  eyes?: string;
  /** 脸部细节（日系脸部贴图） */
  face?: {
    shape?: 'gentle' | 'sharp' | 'round';
    slit?: boolean;
    glow?: boolean;
    scar?: 'left' | 'right';
    eyepatch?: 'left' | 'right';
    old?: boolean;
    blush?: boolean;
  };
  /** 头顶呆毛 */
  ahoge?: boolean;
  hairStyle?: HairModel;
  beard?: boolean;
  /** 主色（衣服/罩袍） */
  primary: string;
  /** 次色（饰边/内衬） */
  secondary: string;
  /** 金属色（铠甲/武器），默认银色 */
  metal?: string;
  helmet?: HelmetModel;
  cape?: boolean;
  shield?: 'none' | 'round' | 'kite' | 'tower';
  weapon: WeaponModel;
  /** 阵营：在脚下绘制阵营色光环（player 蓝金 / enemy 赤红 / ally 翠绿 / neutral 灰白） */
  team: 'player' | 'enemy' | 'ally' | 'neutral';
  /** 整体缩放（Boss 1.15~1.3，巨龙 2.5~3） */
  scale?: number;
  /** 光环/魔力辉光颜色（Boss、龙、亡灵） */
  glow?: string;
  /**
   * 比例：anime = 日系三头身（默认）；mini = 修长人偶（约 1:4.5）；real = 写实比例（约 1:6.5）。
   */
  proportion?: 'anime' | 'mini' | 'real';
}

export type UnitAnim =
  | 'attack'  // 近战挥砍/突刺（根据武器类型自动选择动作）
  | 'shoot'   // 拉弓射箭
  | 'cast'    // 施法（举杖/展开魔导书）
  | 'heal'    // 治疗施法（更柔和）
  | 'hit'     // 受击（后仰 + 闪白/闪红）
  | 'dodge'   // 闪避（侧移）
  | 'death'   // 倒下并淡出（不自动 dispose）
  | 'victory' // 胜利姿势
  | 'levelup';// 升级（跳跃 + 光芒，模型部分即可，特效由 vfx 负责）

export interface PlayOptions {
  /** 动作的「命中瞬间」回调（挥砍到位、箭离弦、法术释放） */
  onImpact?: () => void;
  /** 播放速度倍率，默认 1 */
  speed?: number;
}

export interface UnitModel {
  /** 根节点；引擎设置其 position（站立点）。模型面向 +Z 为默认朝向 */
  object: THREE.Object3D;
  /** 模型视觉高度（世界单位，已含 scale），用于放置血条/伤害数字 */
  height: number;
  /** 播放一次性动画，Promise 在动画结束时 resolve */
  play(anim: UnitAnim, opts?: PlayOptions): Promise<void>;
  /** 是否处于移动中（循环播放行走/奔跑/飞行动作） */
  setMoving(moving: boolean): void;
  /** 平滑转向世界方向 (dx, dz)；immediate=true 时立即转向 */
  faceTowards(dx: number, dz: number, immediate?: boolean): void;
  /** 本回合已行动：整体去饱和变灰（经典战棋的「已行动」表现） */
  setActed(acted: boolean): void;
  /** 闪烁（受伤、选中提示等），color 为 CSS 颜色 */
  flash(color: string, duration?: number): void;
  /** 选中高亮（轮廓/光晕） */
  setHighlighted(on: boolean): void;
  /** 显示/隐藏脚下的阵营光环（剧情演出时隐藏） */
  setRing?(on: boolean): void;
  /** 淡化（特写时让旁观单位退到背景）：1 = 正常 */
  setFade?(alpha: number): void;
  /** 每帧调用：待机呼吸、披风摆动、坐骑动作、行走循环等 */
  update(dt: number, time: number): void;
  dispose(): void;
}

export type CreateUnitModel = (spec: UnitModelSpec, quality: Quality) => UnitModel;

/* ================================================================== */
/*  特效 VFX                                                            */
/* ================================================================== */

export type VfxId =
  | 'slash'        // 剑光弧线
  | 'heavy_slash'  // 重击（斧/大剑），带冲击波尘土
  | 'pierce'       // 枪尖突刺光线
  | 'arrow'        // 箭矢飞行（from → to 抛物线）+ 命中火花
  | 'claw'         // 爪击（三道红色爪痕）
  | 'impact'       // 通用命中火花
  | 'critical'     // 会心一击：强烈闪光 + 放射线 + 屏幕冲击感
  | 'fire'         // 火球：from 飞向 to 后爆炸
  | 'inferno'      // 大范围烈焰：目标点火柱与爆燃（范围半径约 1.5 格）
  | 'ice'          // 冰枪：冰晶飞行并碎裂
  | 'blizzard'     // 暴风雪：范围冰晶旋风
  | 'thunder'      // 落雷：从天而降的闪电
  | 'storm'        // 雷暴：范围多道闪电
  | 'holy'         // 圣光：光柱 + 光环
  | 'dark'         // 暗之魔法：黑紫色漩涡
  | 'heal'         // 治疗：绿色/金色上升光粒 + 光环
  | 'heal_all'     // 范围治疗：大型光环
  | 'buff'         // 增益：金色上升光环
  | 'debuff'       // 减益：紫色下沉锁链/烟雾
  | 'levelup'      // 升级：金色光柱 + 星屑
  | 'promote'      // 转职：华丽的龙形火焰螺旋 + 光柱
  | 'death'        // 阵亡：灰烬粒子飘散
  | 'dragon_breath'// 龙息：from 向 to 的巨大火焰吐息
  | 'ash_breath'   // 黑龙灰烬吐息：黑紫色火焰
  | 'meteor'       // 陨石：天降燃烧巨石
  | 'spawn'        // 援军出现：烟雾 + 符文圈
  | 'warp'         // 传送：光柱
  | 'chest'        // 开宝箱：金光 + 星星
  | 'steal';       // 偷窃：快速的影子闪烁

export interface VfxPlayOptions {
  /** 命中瞬间回调（弹道到达、闪电落下的那一刻） */
  onImpact?: () => void;
  /** 特效整体缩放 */
  scale?: number;
}

export interface VfxSystem {
  /**
   * 在 from → to 之间播放特效。对于非弹道类特效（heal、levelup、death 等），
   * 只使用 to 作为位置。Promise 在特效完全结束时 resolve。
   */
  play(id: VfxId, from: THREE.Vector3, to: THREE.Vector3, opts?: VfxPlayOptions): Promise<void>;
  /** 每帧调用 */
  update(dt: number, time: number): void;
  dispose(): void;
}

export type CreateVfxSystem = (scene: THREE.Scene, quality: Quality) => VfxSystem;

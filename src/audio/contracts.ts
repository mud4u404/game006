/**
 * 音频模块契约
 * ------------------------------------------------------------------
 * 全部音乐与音效均在运行时用 WebAudio 程序化合成（不使用外部音频文件），
 * 旋律、和声、编配全部为本作原创。
 */

/** 背景音乐曲目 */
export type MusicId =
  | 'title'         // 标题画面：庄严、悠远、带有龙与誓言的史诗感（主旋律 Leitmotif 首次出现）
  | 'camp'          // 营地/城镇备战：温暖、轻快、民谣风
  | 'story_calm'    // 剧情·平静：抒情、日常
  | 'story_tense'   // 剧情·紧张：阴谋、不安
  | 'story_sad'     // 剧情·悲伤：离别、牺牲（主旋律的小调变奏）
  | 'story_hope'    // 剧情·希望：重新振作、誓言（主旋律的大调辉煌变奏）
  | 'battle_player' // 我方回合：勇敢、推进感
  | 'battle_enemy'  // 敌方回合：压迫、低音脉冲
  | 'boss'          // Boss 战：激烈、快速
  | 'final'         // 终局之战：宏大、管风琴/合唱感 + 主旋律
  | 'victory'       // 胜利短曲（不循环，约 6~10 秒）
  | 'defeat'        // 失败短曲（不循环）
  | 'ending';       // 结局/职员表：温柔而辉煌

/** 音效 */
export type SfxId =
  | 'cursor'      // 光标移动（很轻）
  | 'select'      // 确认
  | 'cancel'      // 取消
  | 'error'       // 不可操作
  | 'step'        // 单位移动的脚步（轻）
  | 'gallop'      // 马蹄
  | 'wing'        // 振翅
  | 'slash'       // 剑砍
  | 'heavy'       // 斧/大剑重击
  | 'pierce'      // 枪刺
  | 'bow'         // 拉弓放箭
  | 'hit'         // 命中肉体
  | 'armor_hit'   // 命中铠甲（金属）
  | 'crit'        // 会心一击
  | 'miss'        // 闪避（风声）
  | 'fire'        // 火焰魔法
  | 'ice'         // 冰魔法
  | 'thunder'     // 雷
  | 'holy'        // 圣光
  | 'dark'        // 暗魔法
  | 'heal'        // 治疗
  | 'buff'        // 增益
  | 'death'       // 单位阵亡
  | 'levelup'     // 升级小号角
  | 'promote'     // 转职（更华丽）
  | 'chest'       // 开宝箱
  | 'gold'        // 获得金币
  | 'item'        // 获得物品
  | 'buy'         // 购买
  | 'phase'       // 回合切换的鼓声/号角
  | 'text'        // 对话打字的轻微音（极轻，可频繁触发）
  | 'roar'        // 龙吼
  | 'explosion'   // 爆炸
  | 'door'        // 开门/城门
  | 'recruit';    // 伙伴加入

export interface AudioEngine {
  /** 在用户首次交互（点击/按键）时调用，创建/恢复 AudioContext。可重复调用。 */
  unlock(): void;
  /** 切换背景音乐（交叉淡入淡出）。重复播放同一曲目时不打断。 */
  playMusic(id: MusicId, fadeSeconds?: number): void;
  stopMusic(fadeSeconds?: number): void;
  /** 当前曲目 */
  readonly currentMusic: MusicId | null;
  /** 播放音效。pan: -1..1 立体声位置；pitch: 音高倍率（默认 1） */
  sfx(id: SfxId, opts?: { volume?: number; pan?: number; pitch?: number }): void;
  /** 音量 0..1 */
  setVolume(channel: 'master' | 'music' | 'sfx', value: number): void;
  getVolume(channel: 'master' | 'music' | 'sfx'): number;
}

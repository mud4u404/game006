# 任务 05：战场单位精灵（替换现在程序生成的小人）

**用途**：地图上走动、战斗的角色。游戏会把它们立在 3D 地图上（HD-2D 风格），并自动做呼吸、走路颠簸、攻击前冲、受击闪白、死亡溶解等动作。
**每个单位一张图**：正面 3 个姿势 + 背面 3 个姿势。朝左的方向由游戏镜像，不用画。

> **先只做雷恩一张测试**。我接进游戏、截图确认效果后，再批量做其他单位。

## 格式
- 横版 1536×1024，**3 列 × 2 行**，每格 512×512。
- 第 1 行**正面**（3/4 侧身，面朝镜头、朝画面右下方）：待机 / 迈步 / 攻击。
- 第 2 行**背面**（3/4 背影，背对镜头、朝画面右上方）：待机 / 迈步 / 攻击。
- 全身像，脚底站在每格底部附近的同一高度上，六格人物大小一致。
- 透明背景（或纯白），无文字、无边框、无地面阴影。

## 附件
该角色已通过的表情表 A（保证脸、发型、服装一致）。

## 提示词模板
```text
Battle sprite sheet for {名字}, for an HD-2D style tactics RPG (pixel-art characters standing on a 3D diorama map).
Follow the project style guide for character design, but render this sheet as high-quality HD-2D pixel art:
crisp chunky pixels (each pixel block about 5x5 image pixels), limited palette, clean dark outline, soft pixel shading, no anti-aliasing blur.

Canvas 1536x1024 (landscape), 3 columns x 2 rows, transparent background, no ground shadow, no text, no borders.
Full body, about 6.5 heads tall (not chibi). Same size in all six cells, feet on the same baseline near the bottom of each cell.
Row 1, front three-quarter view facing toward the viewer and to the RIGHT: idle stance | mid-stride walking | attack pose ({攻击动作}).
Row 2, back three-quarter view facing away from the viewer and to the RIGHT: idle stance | mid-stride walking | attack pose.

{角色描述}
Weapon: {武器}.
The attachment is this character's approved portrait: match the face, hair, colors and outfit exactly.
```

## 雷恩（测试用）
- `{名字}` → `Rein`
- `{攻击动作}` → `sword swung forward in a diagonal slash`
- `{武器}` → `a simple longsword`
- `{角色描述}` → 用 `01-party-portraits.md` 里雷恩的描述（和任务 00 的那段相同）
- 文件名：`sprite_rein.png`

## 审图标准
- 六格是同一个人、同样大小，脚底对齐
- 正面行朝右下、背面行朝右上；没有画成正侧面
- 像素颗粒清晰、统一（不能一部分像素一部分平滑）
- 不是 Q 版；武器完整，没有被格子边缘切掉

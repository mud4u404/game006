# 与 ChatGPT 共创美术：工作流程

## 分工
| 谁 | 做什么 |
| --- | --- |
| **Claude** | 出需求和提示词（`briefs/`）；**审核**每张图，给出「通过」或可以直接复制给 ChatGPT 的修改句；把通过的图处理成游戏格式（抠图、切表情、统一尺寸、压缩），接入游戏，截图验收 |
| **ChatGPT** | 按风格规范和提示词生成图片 |
| **你** | 在 Claude 和 ChatGPT 之间传话传图；把通过的原图上传到仓库 |

```
Claude 的提示词 ──你复制──▶ ChatGPT 生成 ──你把图发给 Claude──▶ Claude 审核
                               ▲                                 │
                               └──── 不通过：Claude 给的修改句 ◀───┤
                                                                 │ 通过
                         游戏里 ◀── Claude 处理入库 ◀── 你上传原图到 art/incoming/
```

所有角色**只按文字设定**设计，不参考游戏里现在程序生成的像素图。ChatGPT 画出、经审核通过的形象就是官方形象，游戏里的配色反过来跟着它调整。

## 目录说明
| 路径 | 内容 |
| --- | --- |
| `art/STYLE.md` | 风格规范：粘贴进 ChatGPT 项目指令 |
| `art/briefs/` | 每批图的任务单：直接复制里面的英文给 ChatGPT |
| `art/incoming/` | **你上传图片的地方** |
| `art/processed/` | 处理过的原图存档（我自动维护） |
| `art/STATUS.md` | 进度清单 |
| `public/art/` | 游戏实际加载的图片（自动生成，不要手动改） |

---

## 第 0 步：准备 ChatGPT 项目（只做一次）
1. 打开 ChatGPT → 左侧栏 **项目（Projects）** → **新项目**，命名为 `烬龙誓约美术`。
2. 打开项目设置里的 **指令（Instructions）**，把 `art/STYLE.md` 中灰框里的整段英文粘贴进去，保存。

> 没有「项目」功能的话：每次新开对话时，先把 STYLE.md 那段英文发过去，再发任务单。

## 第 1 步：生成
1. 在项目里新开对话（一个角色一个对话）。
2. 如果任务单要求附件（已通过的图），先附上；粘贴任务单里的英文提示词，发送。

## 第 2 步：交给 Claude 审核
1. 把 ChatGPT 生成的图直接发到和 Claude 的对话里（截图或保存后发送都可以）。
2. Claude 回复「通过」，或者给一句英文修改意见。
3. 不通过：把修改句原样发回 ChatGPT 的**同一个对话**，生成后再发给 Claude 审核，直到通过。

## 第 3 步：上传通过的原图
1. 在 ChatGPT 里点图片 → **下载**原图（不要用截图，分辨率不够）。
2. **按任务单要求改文件名**，例如 `portrait_rein_a.png`。不改也可以，上传后告诉 Claude 是哪张，由 Claude 改名。
2. 打开 GitHub 仓库网页 → 左上角分支下拉框选择 **`claude/great-davinci-3t209d`**。
3. 进入 `art/incoming/` 文件夹 → 右上角 **Add file → Upload files**。
4. 把图片拖进去 → 底部选择 **Commit directly to the `claude/great-davinci-3t209d` branch** → **Commit changes**。

> 一次可以上传多张。PNG、JPG、WebP 都可以。请不要把图片贴在 Issue 或评论里，那样我拿不到原图。

然后告诉 Claude「传好了」。Claude 会运行 `npm run art:ingest` 处理入库，在游戏里截图给你看效果，提交并更新 `STATUS.md`。

## 第 4 步：批量推进
按 `STATUS.md` 的顺序继续。之后每张图都附上**已通过的雷恩 A 表**作为风格参考，保证整套美术统一。

---

## 文件命名规则
| 文件名 | 内容 |
| --- | --- |
| `portrait_<角色id>_a.png` | 竖版 2×2 表情表：平静、微笑、愤怒、悲伤 |
| `portrait_<角色id>_b.png` | 竖版 2×2 表情表：惊讶、坚毅、受伤、思索 |
| `portrait_<角色id>_<表情>.png` | 单个表情（覆盖表情表里的同名表情），表情可选：`normal` `smile` `angry` `sad` `surprised` `determined` `hurt` `thinking` |
| `keyart_title.png` | 标题主视觉 |
| `cg_ch00.png` … `cg_ch10.png` | 章节插画 |
| `sprite_<角色id>.png` | 战场单位精灵（3 列 × 2 行，见任务 05） |

角色 id：rein、alicia、balder、loy、gren、fina、lucas、kia、sera、hagen、raven、sieg、igna；NPC：mordis、vesper、gregor、edmund、alberic、otto。

## 常见问题
- **ChatGPT 画了灰白棋盘格当透明背景**：没关系，脚本能识别并抠掉；如果边缘不干净，就让它改成纯白背景重出。
- **某个表情不满意**：只重画那一个，命名为单个表情（如 `portrait_rein_angry.png`）上传即可，会覆盖表情表里的那一格。
- **想换回像素立绘**：游戏里 设置 → 立绘风格 → 像素。
- **安全提醒**：任何 API 密钥、令牌都**不要**发到聊天里或提交进仓库。以后如果要做全自动生图，密钥只能放在 GitHub 仓库的 Settings → Secrets and variables → Actions 里。

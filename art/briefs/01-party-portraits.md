# 任务 01：我方角色表情表

每个角色**两张**：先 A（平静 / 微笑 / 愤怒 / 悲伤），再 B（惊讶 / 坚毅 / 受伤 / 思索）。

## 每次的固定做法
1. 在 ChatGPT 项目里**新开一个对话**（一个角色一个对话，避免串角色）。
2. 附上两张图：
   - **风格参考**：已通过的雷恩表情表 A（`art/processed/portrait_rein_a.webp`，上传入库后会自动出现在这里）
   - **角色参考**：`art/refs/<角色id>.png`
3. 发送下面的「A 表模板」，把 `{角色描述}` 换成该角色的英文描述。
4. A 表满意后，在**同一个对话**里发「B 表模板」。
5. 文件名分别改成 `portrait_<角色id>_a.png`、`portrait_<角色id>_b.png` 上传。

### A 表模板
```text
Expression sheet A for {名字}. Follow the project style guide exactly.
Canvas 1024x1536 (portrait), 2x2 grid, transparent background.
Panels (left to right, top to bottom): neutral, gentle smile, angry, sad.

{角色描述}

First attachment: an approved illustration of another character. Match its art style, line quality, shading, rendering and level of detail exactly (do not copy that character).
Second attachment: this character's in-game pixel sprite. Match the hair, eye and outfit colors.
```

### B 表模板（同一个对话里发）
```text
Now expression sheet B for the same character, identical style, outfit, framing and size as sheet A.
Canvas 1024x1536 (portrait), 2x2 grid, transparent background.
Panels (left to right, top to bottom): surprised, determined, hurt (wincing, one eye shut), thinking (glancing aside).
```

## 角色描述（复制到模板里的 `{角色描述}`）

### rein：雷恩（A 表见任务 00，这里只需要 B 表）

### alicia：艾莉西亚
中文：17 岁修女，金发白头巾（蓝边），天蓝眼睛，白修女服 + 蓝色罩袍金色火焰纹，右手腕有火焰印记。
```text
Alicia: 17-year-old nun and healer, gentle but brave. Long pale-gold hair under a white veil with royal-blue trim.
Round sky-blue eyes. White habit with a blue tabard embroidered with a gold flame symbol.
A faint glowing ember-shaped mark on her right wrist.
```

### balder：巴尔德
中文：52 岁老骑士，灰短发灰胡子，右脸伤疤，棕眼，红色板甲金边 + 红披风，招牌是似笑非笑。
```text
Balder: 52-year-old veteran knight, vice-captain, fatherly and dryly humorous. Short ash-grey hair, full grey beard,
a scar across his right cheek, brown eyes with crow's feet. Crimson plate armor with gold trim and a crimson cape. Wry half-smile as his neutral look.
```

### loy：洛伊
中文：18 岁见习骑兵，乱糟糟的金发，绿眼睛，自信的笑，脸上贴创可贴，红色轻甲 + 绿围巾。
```text
Loy: 18-year-old cavalry squire, cheerful and cocky. Messy golden-blond hair, green eyes, confident grin,
a small bandage on his cheek. Crimson light armor with a green scarf.
```

### gren：格伦
中文：30 岁独眼佣兵，黑色刺头，左眼戴眼罩，小麦色皮肤和胡茬，棕色皮甲 + 斜挎带 + 单肩钢护肩。
```text
Gren: 30-year-old one-eyed mercenary, gruff but loyal. Spiky black hair, an eyepatch over his left eye, tanned skin, stubble.
Worn brown leather armor with a diagonal chest strap and a single steel pauldron on one shoulder.
```

### fina：菲娜
中文：16 岁林间猎手，红棕色马尾绑白羽毛，绿眼睛，雀斑，绿色猎装（兜帽放下），箭袋背带。
```text
Fina: 16-year-old forest huntress, shy but sharp-eyed. Auburn hair in a ponytail with a small white feather tied in,
green eyes, freckles. Green hunter's tunic with the hood down, a quiver strap across the chest.
```

### lucas：卢卡斯
中文：19 岁学院法师，藏青短发，紫眼睛，圆框眼镜，紫色立领学院外套 + 金边金扣。
```text
Lucas: 19-year-old academy mage, earnest and bookish. Neat navy-blue hair, violet eyes, round glasses.
High-collared purple academy coat with gold trim and gold buttons.
```

### kia：琪雅
中文：15 岁港城小偷，银灰短发 + 青色头巾，金色猫眼，耳环，脸上创可贴，深青色连帽背心 + 围巾。
```text
Kia: 15-year-old street thief from a harbor town, mischievous. Silver-grey bob haircut with a teal bandana,
golden cat-like eyes, small earrings, a bandage on her cheek. Dark teal hooded vest and a scarf.
```

### sera：赛拉
中文：22 岁北境天马骑士，藏青长发单麻花辫搭在肩前，灰蓝眼睛，金色额环镶蓝宝石，白甲天蓝边 + 羽翼纹饰。
```text
Sera: 22-year-old pegasus knight from the north, proud and composed. Long navy-blue hair in a single braid over her shoulder,
grey-blue eyes, a thin gold circlet with a blue gem. White armor with sky-blue trim and small wing motifs.
```

### hagen：哈根
中文：40 岁重甲骑士，光头，浓密红胡子，蓝眼睛，宽脸，厚重钢板甲 + 毛领。
```text
Hagen: 40-year-old armored knight, a calm immovable giant. Bald head, thick red beard, blue eyes, broad face.
Heavy steel plate armor with a fur collar.
```

### raven：雷文
中文：27 岁流浪剑客，黑色长发高马尾，深灰眼睛，右脸细伤疤，炭灰色长外套 + 紫色内衬。
```text
Raven: 27-year-old wandering swordmaster, quiet and aloof. Long black hair in a high ponytail, dark grey eyes,
a thin scar on his right cheek. Charcoal long coat with violet lining.
```

### sieg：西格
中文：26 岁帝国黑骑士（悲剧宿敌），银白背头，紫眼睛，左脸伤疤，黑色尖刺铠甲 + 暗红镶边。
```text
Sieg: 26-year-old imperial dark knight, the tragic rival, cold but honorable. Slicked-back silver-white hair, violet eyes,
a scar on his left cheek. Black spiked armor with crimson trim.
```

### igna：伊格娜
中文：外表约 16 岁的远古赤龙少女，红色长发，金色竖瞳，米白小角，颈部发光火焰印记，米白与赤红的长裙 + 金边鳞纹。
```text
Igna: an ancient red dragon in the form of a girl who looks about 16; proud, curious, slightly otherworldly.
Long crimson hair, gold eyes with slit pupils, small cream-colored horns, a glowing ember-orange mark on her neck.
Cream-and-crimson dress with gold trim and subtle scale patterns.
```

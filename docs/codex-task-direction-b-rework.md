# Codex 任务书：方向 B（5 色硬核街机大像素）全量重设与战斗表现升级

## 0. 已就绪的美术资产（请直接使用，不要删减或替换）
1. **9 架主角战机（全部保留，已与方向 B 敌机统一为同维度大像素 + 各自独立识别色）**
   - 已按**方向 B 扁平高对比大颗粒像素风格**重绘并切片至 `public/assets/fighters/01_chifeng.png` ~ `09_fengqun.png`（朝上，单机约 `97–112 × 87–107 px`），与敌机/Boss 完全处于同一像素颗粒与上色维度。
   - **禁止剔除任何战机，禁止把 9 架战机合并或去色**。9 架战机的弹道、尾焰与超载特效必须保持各自的识别色区分：
     - `01_chifeng` 赤锋（炽红 `#ff3355`）
     - `02_jifeng` 疾风（天蓝 `#38bdf8`）
     - `03_leiting` 雷霆（电光金 `#ffd13b`）
     - `04_fusu` 复苏（翠绿 `#22ee88`）
     - `05_lieyang` 烈阳（烈焰橙 `#ff7a22`）
     - `06_xukong` 虚空（虚空紫 `#b85cff`）
     - `07_hanxing` 寒星（冰晶青 `#33ddcc`）
     - `08_tiandun` 天盾（圣白金 `#ffd13b` / `#e7f2ff`）
     - `09_fengqun` 蜂群（霓虹粉 `#ff55b8`）
2. **15 架敌机 + 3 大 Boss（方向 B · 5 色硬核街机大像素）**
   - 已切片至 `public/assets/enemies/*.png` 与 `public/assets/bosses/*.png`，**全部已朝下**（无需旋转）。
   - 全部精灵尺寸已写入 `public/assets/manifest.json`（预览见 `docs/v2-assets-preview.png`）。

---

## 1. 像素渲染与精灵比例校准
- `src/main.js`：确保 Phaser 配置开启 `pixelArt: true, roundPixels: true, antialias: false`。
- `src/presentation/v2-actor-renderer.js` & `src/core/stage-director.js`：
  - 结合 `manifest.json` 的新像素尺寸校准显示缩放：玩家战机约 `76–86px` 高（新图约 `87–107px` 高，缩放约 `0.74–0.82`），普通敌机约 `46–54px`，精英约 `66–76px`，中型战舰约 `88–102px`，Boss 约 `220–250px` 宽。
  - `src/core/fighter-catalog.js`：同步核对每架战机的 `color` 与 `engine` 喷口偏移坐标，使尾焰贴合新像素战机尾部喷口。

---

## 2. 敌机弹道固定配色规范（杜绝画面混乱）
在 `src/core/solo-combat.js` 与 `src/presentation/v2-actor-renderer.js` 中强制统一敌弹视觉语言：
- **所有普通/精英/中型敌机的常规子弹**（`aimed / twin / slant / burst / fan / broadside / fortress / jam`）：
  - **固定统一配色**：**炽红 `#ff3355` 发光外环 + 纯白 `#ffffff` 锐利像素内核**（禁止再出现粉色、紫色、蓝色、绿色等杂色普通敌弹，确保玩家一眼分清「敌方危险弹幕」与「我方弹道」）。
  - 弹体绘制为清晰的分层像素弹丸（外层 `Additive` 炽红光晕 + 中层 `#ff3355` 像素轮廓 + 中心 `#ffffff` 亮核）。
- **敌方追踪导弹 & 自爆机预警**：
  - **固定警示配色**：**红金警示（`#ff3355` 弹体 + `#ffd13b` 闪烁预警圈/尖端 + 短节像素尾烟）**。

---

## 3. Boss 不同攻击拥有独立专属效果与机制
在 `src/core/solo-combat.js`、`src/presentation/v2-actor-renderer.js`、`src/presentation/combat-vfx.js` 中重构 `boss_marshal` 攻击循环，使其在以下 3 种可辨识攻击模式间切换，并在半血转阶段后强化：
1. **模式 A — 螺旋脉冲弹幕（Spiral Pulse Ring）**
   - 发射大颗旋转**炽红脉冲球弹**（带周期缩放的 `#ff3355` 外框 + `#ffffff` 十字核心），发射瞬间在 Boss 核心处触发红色像素扩散环 VFX。
2. **模式 B — 预警蓄力激光束（Telegraphed Laser Beam）**
   - 先进入 `650ms` 蓄力预警：Boss 核心聚拢 `#ffd13b` 明黄像素粒子，并向锁定方位投射一条 `2px` 闪烁明黄 `#ffd13b` 瞄准警戒线；
   - 预警结束后正式释放持续 `480ms` 的粗壮**炽红外焰 + 纯白内核像素光柱**（带分段像素光斑动画、微震屏与真实激光矩形/线段碰撞判定，受击后正常触发无敌帧保护）。
3. **模式 C — 交叉菱形刃弹 / 双翼齐射（Diamond Blade Volley）**
   - 左/右翼炮完好时同步发射**明黄 `#ffd13b` 镶边 + `#ff3355` 内核的菱形旋转像素刃弹**（带 2 节渐隐像素残影）；翼炮被击破后火力降级，且被击破部位持续冒橙红像素火花与黑烟块。
4. **二阶段转阶段爆发（`<50% HP`）**
   - 清空场上旧敌弹，触发全屏红金像素冲击波环，Boss 核心开启持续金色脉动光环；之后模式 A 升级为**炽红环与明黄环交替螺旋弹幕**。

---

## 4. 玩家 9 架战机攻击特效精细化升级
在 `src/presentation/v2-actor-renderer.js` 与 `src/presentation/combat-vfx.js` 中新增独立 `Additive` 混合模式发光图层（`setBlendMode(Phaser.BlendModes.ADD)`），核心像素层保持锐利对齐，让每架战机的攻击都更有层次感与专属质感：
1. **`01_chifeng`（赤锋 · 赤红）**：多层赤白穿甲光矛（尖锐三角白芯 + 炽红加长发光尾迹 + 弹尾两侧像素小翼 + 穿透敌机时十字斩击火花）。
2. **`02_jifeng`（疾风 · 天蓝）**：青蓝高速脉冲双/四联针弹（3 节渐隐像素残影拖尾 + 叠满射速时金色枪口环闪光）。
3. **`03_leiting`（雷霆 · 电光金）**：金外晕 + 亮黄中层 + 纯白细芯的折线电弧弹 + 命中跳跃的多段锯齿像素闪电链与电火花簇。
4. **`04_fusu`（复苏 · 翠绿）**：翠绿菱形能量核 + 双侧微小环绕光点；满血狂战激活时主角周围旋转翠白像素光刃与尾迹。
5. **`05_lieyang`（烈阳 · 烈焰橙）**：橙红-明黄像素火箭弹（带跳动尾焰像素块）+ 命中多层扩散像素冲击波环 + 炽热碎片粒子。
6. **`06_xukong`（虚空 · 虚空紫）**：深紫黑核 + 亮紫/纯白亮边的坍缩脉冲球 + 引力黑洞场内旋转吸入的像素光点流 + 坍缩白金内爆闪光。
7. **`07_hanxing`（寒星 · 冰晶青）**：白青棱形冰晶刃扇面 + 飘落雪花像素尾点 + 冻结敌机时清晰的像素冰框与碎冰四散。
8. **`08_tiandun`（天盾 · 圣白金）**：宽幅双层白金弧形护盾光波（前沿高亮像素齿）+ 格挡清弹时向外扩散的青白像素保护环。
9. **`09_fengqun`（蜂群 · 霓虹粉）**：精绘大像素伴飞无人机（粉白机身 + 尾喷像素点）+ 细密追踪光束针 + 目标身上的明黄像素锁定准星。

---

## 5. 极简深靛蓝背景、5 色硬核像素街机 UI 与难度节奏
- **极简深空背景**（`src/presentation/environment-view.js`、`src/presentation/mode7-ground.js`）：
  - 全屏底色 `#0d1024`，移除旧版杂乱暗灰小行星块，改用干净的**分层像素星点** + **低对比度 `#161d40` 透视像素扫描网格**，跃迁加速时拉出青白像素光丝。
- **5 色硬核像素街机 UI**（`src/ui/styles.css`、`src/scenes/MenuScene.js`、`src/ui/solo-hud.js`）：
  - 彻底替换平庸的暗色圆角毛玻璃表单：统一使用 `#0d1024` 实心底框 + 锐利 `2px` 阶梯像素边框（`#ffffff / #33ddcc / #ffd13b / #ff3355`）+ 高对比像素风排版；
  - 所有战机缩略图与预览图强制 `image-rendering: pixelated;`；
  - 3 选 1 升级卡、战中 HUD 血条/经验条/Boss 部位条/超载按钮全部重做为紧凑锐利的街机像素风格。
- **敌机难度与节奏微调**（`src/core/stage-director.js`、`src/core/solo-combat.js`）：
  - 适度缩短敌机开火冷却（约提升 15–20% 射击频率），让中后期波次弹幕更紧凑、更有躲避乐趣。

---

## 6. 验收命令
所有改动完成后必须运行并全部通过：
```bash
node --test tests/solo-combat.test.mjs tests/balance-sim.test.mjs
npm run build
```

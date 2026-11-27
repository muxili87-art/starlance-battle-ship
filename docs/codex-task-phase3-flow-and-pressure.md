# Codex 任务书（Phase 3）：街机压力曲线 × 心流引擎 × 风险收益 × 三大 Boss 史诗重塑

> **设计目标**：让《星穹矢刃 · STARLANCE》从“匀速打靶”进化为真正令人肾上腺素飙升的 **32-bit 街机弹幕动作体验**——有蓄压与爆发的呼吸感、有“敢贴脸擦弹就滚雪球”的高风险高回报博弈、有部位破坏真实减压的三阶段 Boss 战、有稳定成型的超武共振与高危超频契约，以及越打越疯狂的无尽轮回词缀。
>
> **职责边界**：方向 1 全套美术、3 张高精滚动背景、9 位机师头像、金属街机 HUD/弹窗及程序化 BGM 均已完成。本任务书请**仅改动玩法/数值/关卡逻辑层**（`src/core/*`、`src/state/*`、`src/scenes/BattleScene.js` 模式传参、`src/scenes/BootScene.js` Boss 破坏贴图、`tests/*`），**不要覆盖或回退** `src/presentation/`、`src/ui/`、`src/audio/`、`src/scenes/MenuScene.js`、`public/assets/`。

---

## 0. 全局模式与难度接线（`BattleScene.js` → `SoloSession`）

`MenuScene.js` 已写入以下两个全局注册表键，请在 `BattleScene.js` 创建 `SoloSession` 时传入（默认回退 `"campaign"` / `"standard"`）：
```js
new SoloSession(this.registry.get("fighter-id"), Math.random, {
  mode: this.registry.get("game-mode") ?? "campaign",       // "campaign" | "endless"
  difficulty: this.registry.get("game-difficulty") ?? "standard", // "standard" | "hardcore"
});
```
`SoloSession` 需将 `this.mode` 与 `this.difficulty` 持久化到实例字段，供 `StageDirector`、`SoloCombat`、`SoloWeapons` 与 `upgrade-cards.js` 读取。

---

## 模块一：呼吸式动态波次导演（`src/core/stage-director.js` & `src/core/solo-combat.js`）

### 1.1 清屏加速（Kill-to-Accelerate）— 消灭强构筑“发呆真空期”
- 在 `SoloCombat.#step`（或 `StageDirector.update`）中检测：若当前场内**不存在 Boss**、当前波次尚未到波次结束时间，且场内**所有非召唤敌机均已清空**（`enemies.length === 0`）且距离下次刷怪 `director.next - now > 320`：
  - 立即将 `director.next` 提前至 `now + 320`（ms）。
  - 效果：火力越猛清屏越快，节奏紧凑不断档，经验与分数滚动如潮水。

### 1.2 单关 6 幕锯齿状心流时间轴（Pressure & Release Curve）
保留 `WAVE_COUNT = 5`、`WAVE_MS = 9000`、`BOSS_ARRIVAL_MS = 48750` 的单关基准框架，但赋予每一波明确的情绪与玩法职能：

| 幕次 | 时间窗 | 心流定位 | 具体规则与正反馈 |
| :--- | :--- | :--- | :--- |
| **W1** | `0 – 9s` | **立爽点 · 速升 LV.2** | 快速小队俯冲，确保玩家在 **7–9 秒内稳定升到 LV.2** 拿到第 1 张强化卡，立刻建立构筑期待。 |
| **W2** | `9 – 18s` | **建立横移与擦弹习惯** | `arc` / `flank` 交叉入场，诱导玩家左右横拉并蹭出第一次擦弹反馈。 |
| **W3** | `18 – 27s` | **中段小高潮 · 精英旗舰** | 1500ms 短跃迁冲刺后降临 `flagship`（精英旗舰）。**击破旗舰立刻触发**：全屏经验磁铁吸取（所有场内 `pickups` 强制飞向玩家）+ 额外 `+35` Overdrive 能量 + `{ type: "flagship-down" }` 事件。 |
| **W4** | `27 – 36s` | **限时黄金运输舰悬赏（Bounty Convoy）** | `medium_transport` 登场时附带 **8000ms 逃逸倒计时**（发射 `{ type: "bounty-start", durationMs: 8000 }`）。若在逃出屏幕/倒计时结束前击毁，爆出**战术空投**：回复 `25%` 最大生命、`+20` 护盾，并**立即触发 1 次免费三选一强化**（发射 `{ type: "bounty-clear" }`）；若逃脱则不掉落。 |
| **W5** | `36 – 45s` | **高压逼大招 · 火力倾泻** | 混编高密弹幕波次（多方位齐射 + 突进自爆机），刻意将压力拉满，诱导玩家交出 `OVERDRIVE` 清屏换取巨额星晶雨。 |
| **Boss** | `48.75s+` | **三阶段史诗决战** | 1500ms 跃迁冲刺清场后进入 Boss 战（见模块三）。 |

---

## 模块二：「前线压制 × 擦弹狂热 × 消弹变金雨」风险收益引擎（`src/state/solo-session.js` & `src/core/solo-combat.js`）

彻底解决“贴底安全划水”的问题——让**敢往前压、敢贴弹幕边缘走位**的玩家变成全场最强的收割机器：

### 2.1 前线压制区（FRONTLINE）
- 判定条件：`session.ship.y < 640`（战场前排半区，对应 `FIELD.height = 1280` 的上半区）。
- 在前线压制区内**击杀敌机或触发擦弹**：
  - 经验值收益 `×1.5`；
  - Overdrive 充能 `×1.8`；
  - 分数倍率 `×2.0`。
- **贴脸击杀奖励（Point-Blank）**：击杀敌机时若 `Math.hypot(enemy.x - ship.x, enemy.y - ship.y) < 220`，额外爆出 `1` 颗高纯度经验晶核。

### 2.2 擦弹狂热（GRAZE FEVER）
- 在 `SoloSession` 维护近期擦弹时间戳队列（或滑动计数）与 `this.feverUntil = 0`。
- 在 **3000ms 内累计触发 5 次擦弹**，立即激活 **4000ms「擦弹狂热」（`feverUntil = elapsedMs + 4000`）**：
  - 主炮射速提升 `+25%`（冷却间隔 `×0.80`）；
  - `comboUntil` 冻结不衰减；
  - 发射事件 `{ type: "fever", active: true, until: feverUntil }`（结束时发射 `{ type: "fever", active: false }`）。

### 2.3 消弹变星晶（Bullet Cancel → Gold Rain）
- 每当发生以下任一高光时刻时，清空当前场内所有 `enemyShots` 并将其**转化为自动追踪玩家的黄金星晶**：
  1. 玩家发动 `OVERDRIVE`（`startOverload`）；
  2. Boss 任意可破坏部位（左/右翼炮等）被击破（`part-break`）；
  3. 关底 Boss 被击杀；
  4. 觉醒「超武共振」（`evolution`）。
- 转化规则：每消除 1 颗敌弹（单次最多转化 60 颗防溢出，其余直接清除），生成一个高速飞向玩家的黄金星晶（每颗提供 `+0.35` 经验与 `+1.2` Overdrive 充能），并发射事件 `{ type: "bullet-cancel", count }`。

### 2.4 连击阶梯（Combo Tiers）与受击减半保护
- **阶梯增益**（在 `SoloWeapons` 与 `SoloSession.move` 中生效）：
  - `combo >= 15`（**A 阶超频**）：移速 `+8%`，主炮射速 `+8%`；
  - `combo >= 30`（**S 阶超频**）：主炮射速 `+15%`，副武器冷却 `-15%`；
  - `combo >= 60`（**SS 阶超频**）：主炮射速 `+22%`，获得 `18%` 暴击率（`1.5×` 伤害），每次击杀回复 `+1` 点护盾（上限 `40`）。
- **受击减半保护**：`takeDamage` 时不再直接将 `combo` 清零，改为 `this.combo = Math.floor(this.combo / 2)`（若护盾全额吸收伤害则保留 `combo` 不变），避免高连击玩家因一次擦伤心态崩盘。

---

## 模块三：三大星域 Boss 梯度与三阶段剧本（`src/core/stage-director.js` & `src/core/solo-combat.js`）

### 3.1 梯度血量与压迫感
拉开三关 Boss 规模差距，避免三关打起来像换皮：
- `boss_marshal`（S1 · 拦截统帅）：`hp: 1650`
- `boss_citadel`（S2 · 重装要塞）：`hp: 2400`
- `boss_overmind`（S3 · 核心主脑）：`hp: 3300`

### 3.2 部位破坏「真实战术减压」
- 玩家优先拆掉 Boss 左/右部位（`left` / `right`）必须带来**立竿见影的战术回报**：
  - 击破左部位：永久禁用 Boss 左侧对应特色弹幕（如左肩追踪导弹齐射 / 左孵化舱无人机），立刻触发一次 **消弹变星晶**，并掉落 `+18` 护盾补给；
  - 击破右部位：永久禁用 Boss 右侧对应特色弹幕，触发 **消弹变星晶**，并掉落 `+25` Overdrive 充能。

### 3.3 三阶段行为剧本（P1: `100%–65%` / P2: `65%–30%` / P3: `<30% 狂暴`）
每次跨阶段时发射 `{ type: "boss-phase", phase, id: boss.id }` 并触发短护盾保护（`shieldUntil`）：
1. **`boss_marshal`（拦截统帅）**：
   - P1：交替扇形自机狙 + 缓慢旋转螺旋弹；
   - P2：加入**预警蓄力激光**（提前 `900ms` 锁定红线预警，随后高伤光束扫射，逼迫横移）；
   - P3（狂暴）：双翼光刃交叉弹幕 + 射速提升 `25%`。
2. **`boss_citadel`（重装要塞）**：
   - P1：双肩重炮齐射**可被玩家子弹击毁的追踪重型导弹** + 扇形封锁弹；
   - P2：展开**可击破相位护盾**（吸收 `260` 点伤害）；在规定时间内打破护盾，Boss 进入 **3000ms 过热瘫痪期**（受到 `1.6×` 易伤），发射 `{ type: "boss-stagger" }`；
   - P3（狂暴）：左右交替交叉弹幕走廊，中间留出窄通道考验微操。
3. **`boss_overmind`（核心主脑）**：
   - P1：正反转双环螺旋弹幕；
   - P2：释放**中央引力牵引脉冲**（轻微将玩家吸向/推离中轴）同时发射自机狙，并从孵化舱召唤自爆无人机群；
   - P3（狂暴）：双通道预警激光交替封路 + 高密度脉冲齐射。

*（同步在 `BootScene.js` 为 `boss_citadel` 与 `boss_overmind` 补齐或适配部位破坏贴图逻辑，确保无报错。）*

---

## 模块四：构筑质变、超武共振保底与「高危超频契约卡」（`src/core/upgrade-cards.js` & `src/state/solo-session.js`）

### 4.1 9 战机超武共振全覆盖 + 觉醒保底
- 确认 `SYNERGIES` 包含全部 9 套（已有：赤锋 `lance+bomb`、疾风 `pulse+relay`、雷霆 `arc+relay`、复苏 `bio+blade`、烈阳 `rocket+missile`、虚空 `void+bomb`、寒星 `ice+gun`、天盾 `guard+blade`、蜂群 `needle+missile`）。
- **共振保底规则**：当 `build.main >= 3` 且 `!build.synergy` 时，若尚未拥有共振所需的副武器，则本次抽卡的「副武」槽位**必定刷新为该战机对应的共振副武器**（`resonance: synergy.name`），保证玩家在第 2 关中段稳定体验到超武觉醒爽感。
- **超武觉醒瞬间爆发**：`applyCard` 触发 `synergy` 觉醒时，立刻赋予玩家 `+30` 护盾并执行一次 **消弹变星晶**。

### 4.2 新增「高危超频契约卡」（OVERCLOCK）
每逢第 3 次升级（`session.level % 3 === 0`），有 `35%` 概率将第 3 张「通用」槽位替换为高风险高回报的 **超频契约卡**（`kind: "超频"`，可直接复用通用槽位逻辑并写入 `build.secondary[id]`）：
1. **「玻璃大炮协议」**（`id: "玻璃大炮协议"`）：全武器伤害 `+45%`，但最大生命上限 `-20%`（按比例同步调整当前 HP，最低保留 `1`）。
2. **「血怒转换器」**（`id: "血怒转换器"`）：每次扣减真实 HP 时，立刻将 Overdrive 能量补满至 `100%` 并获得 `2000ms` 狂暴射速加成。
3. **「弹幕吞噬者」**（`id: "弹幕吞噬者"`）：擦弹判定半径扩大 `+45%`；每累计 `10` 次擦弹自动释放一次半径 `260px` 的近身微型消弹波并回 `6` 点护盾。

### 4.3 平衡校准（修复 `06_xukong` 裸船均时）
- 当前 `tests/balance-sim.test.mjs` 中 `06_xukong`（虚空）第 1 关裸船均时 `73.1s` 偏离 `55–65s` 目标。请结合上述新机制微调 `06_xukong` 的基础黑洞伤害/射速或吸附伤害倍率，使全部 9 架战机在裸船与强化模拟测试中均稳定落在目标区间。

---

## 模块五：硬核模式（Hardcore）与无尽轮回模式（Endless Loop + 星域词缀）

### 5.1 硬核模式（`difficulty === "hardcore"`）— 压迫与回报并重
- **敌方压迫增强**：
  - 敌机与 Boss 射击冷却间隔 `×0.72`（射速提升约 39%）；
  - 敌弹飞行速度 `×1.18`；
  - 敌机与 Boss 基础血量 `×1.15`；
  - 精英怪与 Boss 额外增加 1 轮高密度扇面弹或自机狙。
- **玩家高风险补偿（爽感对称）**：
  - 擦弹充能倍率 `×1.4`；
  - 分数倍率 `×1.5`；
  - 升级所需经验阈值 `×0.90`（`Math.max(2, Math.ceil(needed * 0.9))`），让玩家在弹雨中更快成型反杀。

### 5.2 无尽轮回模式（`mode === "endless"`）— 永动词缀挑战
- **无限星域轮回**：击败第 3 关 `boss_overmind` 后**不触发 victory**，而是调用 `beginStageTransition()` 进入 `stage = 4, 5, 6...`（按 `(stage - 1) % 3` 循环复用第 1–3 星域背景、编队与 Boss）。
- **轮回数值递增**：记 `loop = Math.floor((stage - 1) / 3) + 1`：
  - 敌机血量倍率：`1 + (loop - 1) * 0.35 + ((stage - 1) % 3) * 0.12`；
  - Boss 血量倍率：`1 + (loop - 1) * 0.45`；
  - 敌弹速度倍率：`Math.min(1.85, 1 + (loop - 1) * 0.10)`；
  - Boss 战后回血提升至 `40%` 最大生命 + `+25` 护盾 + 赠送 1 次强化，直到战机坠毁进入结算。
- **星域轮回词缀（Mutator）**：从 `loop >= 2`（即 `stage >= 4`）起，每次跃迁轮换激活 1 个全局词缀，并发射 `{ type: "mutator", id, label }`：
  - `电磁风暴`：全员敌弹速度 `+12%`，但玩家擦弹充能 `+30%`；
  - `精英倾巢`：普通波次额外刷出 1 架随机精英怪，经验掉落 `+25%`；
  - `狂暴超载`：敌机射击间隔 `-15%`，玩家 Overdrive 持续时间 `+40%`。

---

## 6. 与表现层对接的标准事件契约（`combat.events`）

请确保以下关键状态变化均推入 `this.events`（供后续 HUD/VFX/音效层直接消费，无需改动 UI 本身即可向后兼容）：
- `{ type: "bullet-cancel", count }`：消弹变星晶触发时
- `{ type: "fever", active: true | false }`：擦弹狂热开启/结束时
- `{ type: "bounty-start", durationMs }` / `{ type: "bounty-clear" }`：限时黄金运输舰悬赏开始/成功击破时
- `{ type: "flagship-down" }`：中段精英旗舰击破时
- `{ type: "boss-phase", phase, id }` / `{ type: "boss-stagger" }`：Boss 换阶段或护盾击破瘫痪时
- `{ type: "mutator", id, label }`：无尽模式进入新轮回词缀时

---

## 7. 自动化测试与验收标准

1. 在 `tests/solo-combat.test.mjs` 中补充针对上述新系统的单元测试：
   - 清屏加速触发验证；
   - 前线压制区（`ship.y < 640`）经验/充能倍率、擦弹狂热（5 次擦弹触发）与消弹变星晶验证；
   - 硬核模式（`difficulty: "hardcore"`）与无尽模式（`mode: "endless"` 击败 S3 Boss 后继续推进至 S4 并激活词缀）验证；
   - 高危超频契约卡与超武共振保底验证。
2. 全部验收命令必须 **100% 通过（0 失败）**：
```bash
node --test tests/solo-combat.test.mjs tests/balance-sim.test.mjs
npm run build
```

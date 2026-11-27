# Codex 任务书（Phase 4）：敌方威胁重塑 × 漏怪防线惩罚 × 关卡强度追平主角成长

> **诊断结论（来自实机代码审查）**：
> 1. **敌人攻击毫无痛感**：普通敌弹基础伤害仅 `6–11` 点（对比战机 `105–115` HP），且敌机首次开火延迟高达 `2.05–2.83s`（很多怪未开火就被秒），叠加 SS 连击每次击杀回盾、护盾无硬上限，导致“挨打几乎不掉血”。
> 2. **漏怪零惩罚**：`SoloCombat.#moveEnemies` 中敌机越过底线 `FIELD.height + 105` 后被静默过滤，没有任何防线失守反馈或惩罚。
> 3. **关卡强度严重落后主角成长**：常规战役第 2/3 关敌机血量仅增 `+9% / +18%`（Boss 1650/2400/3300），而主角拿到主炮 + 副武 + 超武共振 + 连击暴击后 DPS 膨胀 `4×–8×`，导致中后期变成单方面割草。
>
> **职责边界**：本任务书请**仅改动玩法/数值/关卡逻辑层**（`src/core/*`、`src/state/*`、`tests/*`），**不要覆盖或回退** `src/presentation/`、`src/ui/`、`src/audio/`、`src/scenes/MenuScene.js`、`public/assets/`。

---

## 模块一：敌人攻击威胁重塑（`src/core/stage-director.js` & `src/core/solo-combat.js` & `src/state/solo-session.js`）

### 1.1 缩短首次开火延迟（让敌机进场后真正交火）
- 在 `SoloCombat.#spawn` 中，将非 Boss 敌机的 `nextFire` 从 `(2.05 + this.random() * 0.78) * s.enemyCadence` 调整为：
  - 普通敌机：`(0.65 + this.random() * 0.55) * s.enemyCadence`
  - 精英 / 中型敌机：`(0.45 + this.random() * 0.40) * s.enemyCadence`
- 在 `SoloCombat.#moveEnemies` 中，将敌机允许开火的 Y 坐标下限从 `enemy.y >= 115` 提前至 `enemy.y >= 85`。

### 1.2 上调敌方伤害与敌弹初速
- 在 `src/core/stage-director.js` 中上调 `ENEMY_PROFILES` 基础伤害：
  - `NORMAL.damage`: `6` → **`12`**
  - `ELITE.damage`: `9` → **`16`**
  - `MEDIUM.damage`: `11` → **`20`**
  - `boss_marshal.damage`: `12` → **`22`**
  - `boss_citadel.damage`: `12` → **`24`**
  - `boss_overmind.damage`: `13` → **`26`**
- 在 `SoloCombat.#bullet` 中：
  - 敌弹伤害乘以 `s.hardcore ? 1.25 : 1`；
  - 旗舰（`flagship`）伤害额外 `+4`；
  - 自爆机爆炸伤害上调至 `22`（召唤无人机 `24`）；Boss 激光伤害上调至 `(boss.damage + 10) * (s.hardcore ? 1.25 : 1)`。
- 在 `SoloCombat.#fireEnemy` 中提升基础敌弹速度：
  - `category === "normal"`：`270` → **`315`**
  - `elite / medium`：`294` → **`350`**
- 在 `SoloSession.takeDamage` 中将受击无敌帧 `invulnerableMs` 从 `650` 收紧为 **`520`**。

### 1.3 抑制护盾无限膨胀（防止站撸无敌）
- 在 `SoloSession` 新增统一的 `addShield(amount)`（或集中约束 `this.shield = Math.min(35, this.shield + amount)`），将全局护盾硬上限封顶为 **`35`**（含过载、零件、应急电容、超武觉醒等所有来源）。
- 将 SS 阶连击（`comboTier === 3`）的“每次击杀回 `+1` 护盾”改为 **每 `3` 次击杀回 `+1` 护盾**（`if (this.comboTier === 3 && this.kills % 3 === 0) this.addShield(1)`），避免割草期护盾永动不掉血。

---

## 模块二：漏怪惩罚与「防线警戒槽 · BREACH」机制（`src/state/solo-session.js` & `src/core/solo-combat.js`）

当敌机突破我方战机防线从屏幕底部逃逸时，不再静默消失，而是直接打击防线并累积警戒槽：

### 2.1 状态字段（`SoloSession`）
- 新增 `this.breaches = 0`（本局累计漏怪数）
- 新增 `this.breachMeter = 0`、`this.breachMax = 5`（防线警戒槽，满 `5` 点触发反扑）

### 2.2 漏怪判定与惩罚（`SoloCombat.#moveEnemies`）
- 当非 Boss、非召唤（`!enemy.summoned`）且非刚被超时清理的普通/精英/中型敌机越过防线底边 **`enemy.y >= FIELD.height + 24`** 时（且 `enemy.hp > 0`），不再简单过滤掉，而是调用 `this.#handleBreach(enemy)` 并移除该敌机：
  - **警戒权重 `cost`**：普通怪（`category === "normal"`）计 `1` 点；精英/中型/运输舰计 `2` 点；
  - **直接防线震荡伤害**：`s.breaches++`，`s.combo = Math.floor(s.combo * 0.5)`，并直接扣减 `cost * 6` 点防线伤害（若此时不在 `invulnerableMs` 内则调用 `s.takeDamage(cost * 6)`；若正处于受击无敌帧内则直接扣减 `s.hp = Math.max(1, s.hp - cost * 4)`，确保漏怪永远有真实代价）；
  - **警戒槽累积与事件**：`s.breachMeter += cost`，发射事件 `{ type: "breach", x: enemy.x, cost, meter: s.breachMeter, max: s.breachMax, enemyId: enemy.id }`；
  - **防线失守 · 追猎反扑（`s.breachMeter >= s.breachMax`）**：
    - 清零 `s.breachMeter = 0`；
    - 造成 **`18` 点穿甲防线反噬伤害**（直接扣 `s.hp = Math.max(0, s.hp - 18)`，若归零则判定 `s.phase = "defeat"`）；
    - 在屏幕顶部 `x = 180, 360, 540` 空降 **3 架自机狙精英拦截机**（`elite_fighter`，`summoned: true`）进行高压追猎；
    - 发射事件 `{ type: "breach-alarm", x: 360, y: 120 }`。
- **防线清零奖励**：击破中段精英旗舰（`flagship`）或关底 Boss 时，将 `s.breachMeter = 0` 作为清场奖励。

---

## 模块三：关卡强度紧追主角成长曲线（`src/core/solo-combat.js` & `src/core/stage-director.js`）

### 3.1 重写星域血量倍率（解决 S2/S3 太容易）
在 `SoloCombat.#spawn` 中，重写非 Boss 敌机与 Boss 的成长公式：
- **常规战役非 Boss 敌机基础倍率**：
  - `sector === 1`：`1.00×`
  - `sector === 2`：`1.85×`
  - `sector === 3`：`3.10×`
  - （无尽模式 `loop >= 2` 时，在此基础上再乘以 `1 + (s.loop - 1) * 0.55`）
- **同关波次递进**：乘以 `1 + (Math.max(1, s.wave) - 1) * 0.10`（W1 到 W5 递增 `+40%`）。
- **动态等级压制补偿（Soft Power Catch-up）**：
  - 记当前星域基准等级 `expectedLv = (s.stage - 1) * 3 + 3`；
  - 若 `s.level > expectedLv`，记 `extraLv = s.level - expectedLv`，新刷出的非 Boss 敌机获得额外血量加成 `* (1 + Math.min(0.60, extraLv * 0.12))` 与弹速加成 `* (1 + Math.min(0.20, extraLv * 0.04))`；
  - 效果：玩家前期胡牌等级飙升时，敌方强度会同步咬紧，不会“3 级以后一路平推到通关”。
- **硬核模式倍率**：`hpScale` 中的硬核加成从 `1.15` 提升至 **`1.30`**。

### 3.2 关底 Boss 血量阶梯同步拉升（`src/core/stage-director.js`）
- `boss_marshal`（S1 · 拦截统帅）：`1650` → **`2100`**
- `boss_citadel`（S2 · 重装要塞）：`2400` → **`3800`**
- `boss_overmind`（S3 · 核心主脑）：`3300` → **`5800`**
- Boss 左右可破坏部位血量同步按新基准等比上调（如 S1 `240`、S2 `340`、S3 `460`），避免秒破部位跳过阶段机制。

---

## 4. 验收测试与构建验证

1. 在 `tests/solo-combat.test.mjs` 补充验证：
   - 敌机首次开火提前且子弹伤害、激光伤害提升后能真实扣减玩家 HP（护盾封顶 `35`）；
   - 漏怪跨越底边触发 `breach` 事件与防线扣血，累积满 `5` 点触发 `breach-alarm` 并刷出 3 架追猎精英；
   - S2 / S3 血量曲线（`1.85×` / `3.10×`）与等级压制补偿生效。
2. 同步校准 `tests/balance-sim.test.mjs` 中的仿真断言（确保裸船不再轻松零压力通关、强化构筑在 3 星域高张力下仍能凭操作与 Build 通关），并运行以下命令确保 **100% 通过**：
```bash
node --test tests/solo-combat.test.mjs tests/balance-sim.test.mjs
npm run build
```

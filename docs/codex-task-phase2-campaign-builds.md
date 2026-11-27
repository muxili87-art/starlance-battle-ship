# Codex 任务书（Phase 2）：常规战役（9 机史诗剧情 + 3 大 Boss）+ 无尽模式 + 硬核弹幕难度

> **职责边界**：方向 1（日系硬派高精 32-bit 像素街机史诗）的全套美术、3 张高精滚动背景、9 位机师头像、金属街机 UI、模式/难度入口及 BGM/爆炸特效均已完成。本任务书请**仅改动玩法/数值/关卡逻辑层**（`src/core/*`、`src/state/solo-session.js`、`src/scenes/BootScene.js`、`src/scenes/BattleScene.js` 传入模式参数、`tests/*`），**不要覆盖或回退** `src/presentation/`、`src/ui/`、`src/audio/`、`src/scenes/MenuScene.js`、`public/assets/`。

---

## 1. 读取机库模式与难度参数
`MenuScene.js` 已写入以下两个全局注册表键，请在 `BattleScene.js` 初始化 `SoloSession` 时传入：
- `this.registry.get("game-mode")`: `"campaign"`（常规战役）或 `"endless"`（无尽模式）
- `this.registry.get("game-difficulty")`: `"standard"`（标准）或 `"hardcore"`（硬核）

---

## 2. 常规战役模式（`mode === "campaign"`）：3 星域全 Boss 史诗闯关
- 100% 用满 `public/assets/bosses/` 的 3 个高精 32-bit Boss：
  - **第 1 星域（轨道战舰群）**：`stage1_carrier` 背景，关底 Boss `boss_marshal`（拦截统帅）
  - **第 2 星域（赤红陨石炼狱）**：`stage2_asteroid` 背景，关底 Boss `boss_citadel`（重装要塞）— 双肩重炮齐射追踪导弹 + 交叉扇形弹幕 + 护盾阶段
  - **第 3 星域（主脑轨道核心）**：`stage3_overmind` 背景，关底 Boss `boss_overmind`（核心主脑）— 全屏交替双环螺旋弹 + 快速蓄力激光 + 召唤自爆无人机群
- 每关约 55–65 秒高密度编队 + 中段精英旗舰；击败第 1、2 关 Boss 后触发 `1500ms` 跃迁冲刺（`session.warpDashMs = 1500`）、回复 `30%` 生命并赠送 1 次三选一强化，推进 `session.stage++` 进入下一星域；击败第 3 关 `boss_overmind` 后才进入 `victory`。
- 在 `BootScene.js` 与 `stage-director.js` 中为 `boss_citadel` 和 `boss_overmind` 补齐对应的破坏贴图/部位坐标。

---

## 3. 无尽模式（`mode === "endless"`）
- 无波次上限，敌人血量、数量、弹速与发射频率随波次持续递增；
- 每 5 波降临 1 次强化版关底 Boss（`boss_marshal` → `boss_citadel` → `boss_overmind` 轮换车轮战）；
- 击败无尽 Boss 后不结束游戏，立即回复部分护盾/生命并进入更高倍率循环，直到战机坠毁进入结算。

---

## 4. 硬核难度（`difficulty === "hardcore"`）与爽快压迫感
- 玩家反馈此前游戏「太简单、难度不大」。请在 `hardcore` 模式下显著提升街机弹幕压迫感（并适度提高标准模式的紧凑度）：
  - 敌机射击冷却缩短 `28%`，敌弹速度提升 `18%`，精英与 Boss 额外增加密弹扇面与自机狙；
  - 新增左右包抄与弧线俯冲编队。

---

## 5. 补齐 9 架战机全套超武共振 + 战术模组卡池
- 在 `src/core/upgrade-cards.js` 补齐所缺的 3 架战机超武共振（共 9 套）：
  - `arc`（03 雷霆）+ `relay` → **「九霄天雷」**
  - `rocket`（05 烈阳）+ `missile` → **「日冕集束」**
  - `guard`（08 天盾）+ `blade` → **「圣盾审判域」**
- 把 `GENERAL` 白板卡重做为改变手感的战术模组（擦弹反击飞弹、棱镜分裂、连杀超频、受伤电磁清弹等）。

---

## 6. 验收命令
```bash
node --test tests/solo-combat.test.mjs tests/balance-sim.test.mjs
npm run build
```

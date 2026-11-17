# 逆界航线（battle-ship）重构架构说明

本目录是从 `legacy-ref`（`EX-2026-002-小游戏孵化实验/03-执行中/battle-ship-next`）抽离、去噪并重新分层后的干净工程底座。
目标：**规则、状态、场景、美术表现、界面五层解耦**，后续迭代美术或调整玩法时只需修改对应小模块。

## 目录结构

| 层级 | 目录 | 职责 | 后续开发改这里 |
| --- | --- | --- | --- |
| **1. 权威仿真与规则** | `src/core/` | 纯 JS（零 Phaser 依赖）：三区/索敌/导弹/过载规则、构筑卡池、战役/无尽导演、Boss 目录、战斗步进 `CombatLoop` | 改数值、武器机制、敌人波形、Boss 阶段、肉鸽卡池 |
| **2. 会话状态** | `src/state/` | `GameSession` 单一权威状态源，统一管理模式、阶段、飞船坐标、核心血量/能量与暂停/重启重置 | 新增全局状态字段、局外成长/体力接入 |
| **3. 轻量场景** | `src/scenes/` | `BootScene`（预载）、`MenuScene`（入口）、`BattleScene`（主循环编排）、`OverlayScene`（暂停/结算/选卡） | 改页面跳转流程、输入交互、弹窗时机 |
| **4. 统一美术表现** | `src/presentation/` | `asset-catalog.js`（资产契约）、`environment-view.js`（背景与航道）、`actor-renderer.js`（战机与敌舰）、`core-renderer.js`（核心四态与十段耐久弧）、`vfx-renderer.js`（弹道与过载 VFX） | **换美术资产、调画风、改过载四段光效、接入 Boss 新图** |
| **5. 界面与样式** | `src/ui/` | `battle-hud.js`（顶部状态与底部交互）、`styles.css` | 改 HUD 排版、字体、武器角标、航路/强化竖卡 |
| **静态资产** | `public/assets/f-battle-r1/` | F 系列统一插画资产（敌舰、核心、武器图标、Boss 部件、VFX） | 增删或替换 PNG / SVG 资产 |

## 与旧版 `core-mode.js`（14,891 行）的核心区别

1. **彻底消除历史版本叠加**：剥离 V4~V6.4、P2/P5/P10、QA 遥测与多套并存 UI，主工程只保留单一入口与单一渲染管线。
2. **表现不阻断流程**：`ActorRenderer` 对 `ship.visible === false` 做空投影安全处理，不会在航路/转场隐藏战机时抛异常卡死。
3. **规则与退场分离**：`CombatLoop` 仅负责权威伤害/死亡判定并产出事件，`VfxRenderer` 消费事件播放闪烁/击破动画，二者时钟互不污染。

## 常用命令

```bash
npm test      # 运行纯逻辑与状态机单元测试
npm run dev   # 启动本地开发服务
npm run build # 构建生产包
```

# Codex 任务书 01：V2 单人 2.5D 核心底座与素材接入

> **前置必读**：[v2-spec.md](./v2-spec.md) 与 [public/assets/manifest.json](../public/assets/manifest.json)。
> **建议操作**：从当前仓库拉取新分支 `v2-solo` 再施工。

## 任务目标
剥离旧版多人竞速/第一人称驾驶舱/繁琐按键，用全新的 27 张透明 PNG 像素精灵建立**丝滑的单指/鼠标 2.5D 竖版飞机射击核心底座**（跑通“起飞 → 打怪 → 吸经验升级 → 击破关底”基础闭环）。

## 具体改造清单
1. **剥离旧模块（仅保留可复用渲染与基础设施）**
   - 停用或移出主流程：`server/lan-server.mjs`、`src/net/lan-client.js`、`src/state/match-room.js`（4人竞速逻辑）、`src/presentation/cockpit-view.js`（第一视角）、`src/core/shared-prize-pool.js`、`src/core/comeback-system.js`。
   - 新建单人状态管理 `src/state/solo-session.js`（记录选中战机 ID、HP/护盾、经验与等级、波次/关卡进度、局内构筑、击杀与零件产出）。

2. **接入 `public/assets/manifest.json` 像素精灵**
   - 在 `BootScene.js` 预加载 `manifest.json` 中的全部 `fighters` / `enemies` / `bosses` 图片，统一设置 `Phaser.Textures.FilterMode.NEAREST`。
   - 新建或重构 `src/presentation/v2-actor-renderer.js`：
     - **主角 2.5D 表现**：显示选中战机 PNG（缩放约 `0.38`），根据横向速度 `vx` 做平滑小幅侧倾与横向微缩（模拟 2.5D 翻滚），并在战机右下方 `(x + 18, y + 26)` 绘制半透明地面阴影；在机身正中心绘制清晰的**发光小判定点**（半径 `10px` 逻辑判定，视觉 `5px` 亮芯，受击一目了然）。
     - **敌机与 Boss 表现**：按 `manifest.json` 加载对应敌机 PNG（已朝下），带受击白闪（`setTintFill(0xffffff)` 持续 `70ms`）、右下方偏移阴影与清晰血条（仅精英/中型/Boss 显示）。

3. **极简单人操控与 2.5D 卷轴背景**
   - 移除 `1/2/3/Q/E/V/Shift` 按键，改为：
     - **全屏拖拽 / 鼠标平滑跟随移动**（支持 PC 鼠标按住或直接跟随、手机单指拖拽，且允许键盘 `WASD/方向键` 辅助）。
     - **全自动主炮开火**。
     - **大招按钮 / `[Space]`**：能量满 100% 时触发当前战机专属清屏/爆发大招（短暂无敌 + 清弹）。
   - 优化 `EnvironmentView` / `Mode7Ground`：保留 2.5D 深空/高空云海分层滚动与波次跃迁加速感，压低背景饱和度确保敌弹（品红/亮橙带白芯）与绿色/金色经验晶体极度醒目。

4. **经验晶体磁铁拾取**
   - 击杀敌机掉落经验晶体（普通怪掉小绿晶，精英/运输机掉大金晶 + 概率掉回血包）。
   - 进入主角拾取半径（默认 `130px`）自动加速飞向战机，吃满经验条即暂停战斗并弹出「局内三选一」入口（本卡先做占位 3 选 1 弹窗即可，完整卡池由任务书 02 接管）。

## 验收标准
- `npm run build` 无报错，`npm test` 跑通新单人核心逻辑测试。
- 启动本地页面后，用鼠标或触屏拖拽战机手感跟手、无卡顿；敌机 PNG 朝下、主角 PNG 朝上且全部像素锐利（无模糊/黑边）；拾取经验晶体能正常升级弹窗；无任何控制台报错。

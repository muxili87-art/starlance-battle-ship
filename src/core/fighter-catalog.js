export const FIGHTERS = {
  "01_chifeng": {
    weapon: "lance", color: 0xff3355, audio: "heavy", hp: 112, interval: 310, damage: 67, speed: 1140,
    barrels: [[0, 0]], pierce: 2, engine: [17, 31],
    upgrade: ["赤刃分锋", "增加两道穿甲副锋，主弹穿透额外目标"],
    overload: { name: "赤刃穿云", color: 0xff3355, count: 3, spread: 0.12, damage: 130, piercing: true },
  },
  "02_jifeng": {
    weapon: "pulse", color: 0x38bdf8, audio: "pulse", hp: 105, move: 1.18, interval: 148, damage: 12.2, speed: 1170,
    barrels: [[-12, 0], [12, 0]], engine: [15, 32],
    upgrade: ["超音速阵列", "双联变四联，命中时更快叠满射速"],
    overload: { name: "疾风齐射", color: 0x38bdf8, count: 7, spread: 0.09, damage: 102 },
  },
  "03_leiting": {
    weapon: "arc", color: 0xffd13b, audio: "arc", hp: 106, interval: 265, damage: 39, speed: 985,
    barrels: [[0, 0]], engine: [13, 34],
    upgrade: ["暴雷分流", "追加斜向电弧弹，扩大闪电链覆盖范围"],
    overload: { name: "雷霆万钧", color: 0xffd13b, count: 5, spread: 0.15, damage: 115 },
  },
  "04_fusu": {
    weapon: "bio", color: 0x22ee88, audio: "laser", hp: 105, interval: 205, damage: 21.6, speed: 950,
    barrels: [[-15, 0], [15, 0]], engine: [20, 34],
    upgrade: ["生体莲华", "双发外侧分裂出能量芽，延长满血狂战"],
    overload: { name: "生机涌动", color: 0x22ee88, count: 5, spread: 0.13, damage: 94, heal: 28 },
  },
  "05_lieyang": {
    weapon: "rocket", color: 0xff7a22, audio: "heavy", hp: 112, interval: 310, damage: 60, speed: 835,
    barrels: [[0, 0]], engine: [32, 33],
    upgrade: ["子母烈阳", "火箭爆心炸出两枚斜向子弹，溅射范围扩大"],
    overload: { name: "烈阳新星", color: 0xff7a22, count: 9, spread: 0.13, damage: 141 },
  },
  "06_xukong": {
    weapon: "void", color: 0xb85cff, audio: "void", hp: 108, interval: 315, damage: 53, speed: 900,
    barrels: [[0, 0]], engine: [12, 31],
    upgrade: ["潮汐奇点", "黑洞半径显著扩大，坍缩伤害随聚怪数量提升"],
    overload: { name: "虚空坍缩", color: 0xb85cff, count: 3, spread: 0.2, damage: 138 },
  },
  "07_hanxing": {
    weapon: "ice", color: 0x33ddcc, audio: "ice", hp: 106, interval: 225, damage: 14.5, speed: 1030,
    barrels: [[-11, -0.064], [0, 0], [11, 0.064]], engine: [13, 35],
    upgrade: ["冰冠扇面", "三发变五发，碎冰后追加冰刺并扩大冻结覆盖"],
    overload: { name: "寒星碎雨", color: 0x33ddcc, count: 11, spread: 0.12, damage: 111 },
  },
  "08_tiandun": {
    weapon: "guard", color: 0xe7f2ff, audio: "shield", hp: 115, interval: 280, damage: 47, speed: 945,
    barrels: [[0, 0]], width: 22, engine: [21, 35],
    upgrade: ["圣盾扩列", "护盾炮变宽，缩短充盾时间并扩大反震范围"],
    overload: { name: "天盾反击", color: 0xffd13b, count: 5, spread: 0.2, damage: 110, shield: 20 },
  },
  "09_fengqun": {
    weapon: "needle", color: 0xff55b8, audio: "laser", hp: 106, interval: 178, damage: 23, speed: 1140,
    barrels: [[0, 0]], engine: [32, 31],
    upgrade: ["蜂巢扩编", "增派两架追踪无人机，最多六架，提升集火效率"],
    overload: { name: "蜂群出击", color: 0xff55b8, count: 13, spread: 0.075, damage: 101 },
  },
};

export const OVERLOADS = Object.fromEntries(Object.entries(FIGHTERS).map(([id, fighter]) => [id, fighter.overload]));

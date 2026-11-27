export const SECONDARIES = [
  { id: "missile", label: "追踪导弹", detail: "搜寻战场目标，命中炸开小范围火球", mark: "⌃" },
  { id: "blade", label: "环绕光刃", detail: "两道轨道光刃切割靠近战机的敌舰", mark: "◈" },
  { id: "relay", label: "连锁电弧", detail: "周期放电，闪电跳向附近敌舰", mark: "ϟ" },
  { id: "bomb", label: "爆破副炮", detail: "交错发射两枚有范围杀伤的高爆弹", mark: "✧" },
  { id: "gun", label: "辅助机枪", detail: "在主炮两侧补上一组高速子弹", mark: "≋" },
];

// The HUD reads the shared equipment map and displays unknown keys by their label.
export const MODULE = {
  counter: "擦弹反击飞弹",
  prism: "棱镜分裂",
  frenzy: "狂热连杀",
  emergency: "应急电容",
  magnet: "磁力超频",
};

export const CONTRACT = {
  glass: "玻璃大炮协议",
  blood: "血怒转换器",
  eater: "弹幕吞噬者",
};

const CONTRACT_CARDS = [
  { id: CONTRACT.glass, detail: "全武器伤害 +45%，最大生命与当前生命同比减少 20%", mark: "◆" },
  { id: CONTRACT.blood, detail: "实际损失生命时将超载充满，同时获得 2 秒狂暴射速", mark: "ϟ" },
  { id: CONTRACT.eater, detail: "擦弹半径 +45%，每擦弹 10 次清除近身弹幕并回复 6 点护盾", mark: "⌾" },
];

const TACTICAL_CARDS = [
  { id: MODULE.counter, detail: "每次擦弹额外发射一枚追踪微弹，再装提高飞弹伤害", mark: "⌃" },
  { id: MODULE.prism, detail: "每第四轮主炮增加左右各 12° 的副弹，再装提高副弹伤害", mark: "◇" },
  { id: MODULE.frenzy, detail: "十连杀时攻速 +20%，主炮穿透 +1 并周期暴击，再装提高暴击伤害", mark: "»" },
  { id: MODULE.emergency, detail: "受伤无敌结束时释放近身清弹波并恢复护盾，再装扩大范围和回复", mark: "ϟ" },
  { id: MODULE.magnet, detail: "拾取半径扩大 50 像素，过载充能 +22%，再装继续扩大拾取半径", mark: "⌾" },
];

export const SYNERGIES = {
  lance: { secondary: "bomb", name: "赤刃裂星炮" },
  pulse: { secondary: "relay", name: "高频雷暴矩阵" },
  arc: { secondary: "relay", name: "九霄天雷" },
  bio: { secondary: "blade", name: "永动圣盾脉冲" },
  rocket: { secondary: "missile", name: "日冕集束" },
  void: { secondary: "bomb", name: "重力核爆" },
  ice: { secondary: "gun", name: "碎冰穿甲巨枪" },
  guard: { secondary: "blade", name: "圣盾审判域" },
  needle: { secondary: "missile", name: "制导机海" },
};

export function drawCards(session, random) {
  const { fighter, build } = session;
  const [label, detail] = fighter.upgrade;
  const synergy = SYNERGIES[fighter.weapon];
  let secondary = SECONDARIES[Math.floor(random() * SECONDARIES.length)];
  if (synergy && !build.synergy && !build.secondary[synergy.secondary] && (build.main >= 3 || session.level % 3 === 0)) {
    secondary = SECONDARIES.find(({ id }) => id === synergy.secondary);
  }
  const unowned = TACTICAL_CARDS.filter(({ id }) => !build.secondary[id]);
  const tacticalPool = unowned.length ? unowned : TACTICAL_CARDS;
  const contracts = CONTRACT_CARDS.filter(({ id }) => !build.secondary[id]);
  const overclock = session.level % 3 === 0 && contracts.length > 0 && random() < 0.35;
  const pool = overclock ? contracts : tacticalPool;
  const tactical = pool[Math.floor(random() * pool.length)];
  return [
    { id: "main", label, detail: build.main >= 3 ? detail + "，继续强化主炮" : detail, mark: "◆", kind: "专属", level: build.main + 1 },
    { ...secondary, kind: "副武", level: (build.secondary[secondary.id] ?? 0) + 1, resonance: synergy?.secondary === secondary.id ? synergy.name : null },
    { ...tactical, label: tactical.id, kind: overclock ? "超频" : "通用", level: (build.secondary[tactical.id] ?? 0) + 1 },
  ];
}

export function applyCard(session, card) {
  const { build } = session;
  if (card.id === "main") build.main++;
  else if (card.kind === "超频") {
    if (!build.secondary[card.id]) {
      build.secondary[card.id] = 1;
      if (card.id === CONTRACT.glass) {
        const maxHp = Math.max(1, Math.floor(session.maxHp * 0.8));
        session.hp = Math.max(1, session.hp * maxHp / session.maxHp);
        session.maxHp = maxHp;
      }
    }
  } else build.secondary[card.id] = (build.secondary[card.id] ?? 0) + 1;

  const synergy = SYNERGIES[session.fighter.weapon];
  if (!build.synergy && synergy && build.main >= 3 && build.secondary[synergy.secondary]) {
    build.synergy = synergy;
    session.addShield(30);
    return synergy.name;
  }
  return null;
}

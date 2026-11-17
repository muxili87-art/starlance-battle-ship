/**
 * Real-time battlefield Hot-Swap Modules (zero modal interruption).
 * Players freely shape their build path by moving into dropped modules across the 3 sectors.
 */

export const HOT_SWAP_MODULES = Object.freeze([
  {
    id: "mod-pulse",
    label: "脉冲倍增",
    short: "脉",
    color: 0x43cff4,
    hex: "#43cff4",
    apply(session) {
      session.build.machinegunLevel = (session.build.machinegunLevel || 0) + 1;
      session.build.attackSpeedMultiplier = Number(((session.build.attackSpeedMultiplier || 1) + 0.14).toFixed(2));
      // Unlock multi-barrel / spread at Lv1 and Lv3
      if (session.build.machinegunLevel === 1) session.build.routes = { ...session.build.routes, crit: 1 };
      if (session.build.machinegunLevel >= 3) session.build.routes = { ...session.build.routes, crit: 2 };
    },
  },
  {
    id: "mod-missile",
    label: "导弹扩充",
    short: "导",
    color: 0xff8c3a,
    hex: "#ff8c3a",
    apply(session) {
      session.build.missileCount = Math.min(6, (session.build.missileCount || 2) + 1);
      session.build.damageMultiplier = Number(((session.build.damageMultiplier || 1) + 0.12).toFixed(2));
    },
  },
  {
    id: "mod-drone",
    label: "护航僚机",
    short: "僚",
    color: 0xb07cff,
    hex: "#b07cff",
    apply(session) {
      session.build.drones = Math.min(4, (session.build.drones || 0) + 1);
      session.build.droneDamageScale = Number(((session.build.droneDamageScale || 1) + 0.15).toFixed(2));
    },
  },
  {
    id: "mod-surge",
    label: "相位超频",
    short: "超",
    color: 0xffd166,
    hex: "#ffd166",
    apply(session) {
      session.core.energy = Math.min(session.core.maxEnergy, session.core.energy + 42);
      session.build.critChance = Math.min(0.65, Number(((session.build.critChance || 0.08) + 0.1).toFixed(2)));
    },
  },
]);

export function pickRandomModuleDrop(seed = Math.random()) {
  const idx = Math.floor(seed * HOT_SWAP_MODULES.length) % HOT_SWAP_MODULES.length;
  return HOT_SWAP_MODULES[idx];
}

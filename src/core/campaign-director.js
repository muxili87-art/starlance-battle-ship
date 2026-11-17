// 首章 18 个节点的遭遇配置。单位仍使用现有敌舰类型；这里明确的是
// 敌人角色、批次节奏和奖励标签，战斗数值继续由 CoreMode 的实际伤害链消费。

import {
  FIRST_SEGMENT_CATEGORY_ENCOUNTERS,
  firstSegmentCategoryProfileAdjustments,
  firstSegmentCategoryXpTableKey,
} from "./campaign-categories.js";

export const CAMPAIGN_ENCOUNTER_VERSION = "campaign-encounters-v5";

const UNIT = (type, sector, offset = 0, role = "pressure") => Object.freeze({ type, sector, offset, role });
const WAVE = (at, units) => Object.freeze({ at, units: Object.freeze(units) });
const PRESSURE_GROUP = (index, units) => Object.freeze({ index, units: Object.freeze(units) });

const FIRST_PRESSURE_FLAG = Object.freeze({
  flagIndex: 0,
  id: "endless-first-flag",
  maxActive: 15,
  overlapRatio: 0.4,
  healthScale: 0.94,
  damageScale: 0.72,
  speedScale: 0.98,
  groups: Object.freeze([
    PRESSURE_GROUP(0, [
      UNIT("scout", 0, -24), UNIT("scout", 0, 24),
      UNIT("scout", 1), UNIT("scout", 2, 24),
      UNIT("striker", 0), UNIT("striker", 2),
    ]),
    PRESSURE_GROUP(1, [
      UNIT("scout", 0, -24), UNIT("scout", 0, 24),
      UNIT("scout", 1, -24), UNIT("scout", 1, 24),
      UNIT("striker", 2, -24), UNIT("striker", 2, 24), UNIT("frigate", 0),
    ]),
    PRESSURE_GROUP(2, [
      UNIT("scout", 0, -42), UNIT("scout", 1, -24), UNIT("scout", 2, -24), UNIT("scout", 2, 24),
      UNIT("striker", 1, 24), UNIT("striker", 2), UNIT("frigate", 0),
      UNIT("shield", 0, 42), UNIT("relay", 2, 42),
    ]),
  ]),
});

const SECOND_PRESSURE_FLAG = Object.freeze({
  flagIndex: 1,
  id: "endless-second-flag",
  maxActive: 22,
  overlapRatio: 0.4,
  healthScale: 1.04,
  damageScale: 0.8,
  speedScale: 0.995,
  groups: Object.freeze([
    PRESSURE_GROUP(0, [
      UNIT("scout", 0, -42), UNIT("scout", 0, 42),
      UNIT("scout", 1, -24), UNIT("scout", 1, 0), UNIT("scout", 1, 24),
      UNIT("scout", 2, -42), UNIT("scout", 2, 42),
      UNIT("striker", 0, -24), UNIT("striker", 1, 42), UNIT("striker", 2, -24),
      UNIT("frigate", 2), UNIT("splitter", 1, -42),
    ]),
    PRESSURE_GROUP(1, [
      UNIT("scout", 0, -42), UNIT("scout", 0, 42),
      UNIT("scout", 1, -42), UNIT("scout", 1, 42),
      UNIT("scout", 2, -42), UNIT("scout", 2, 42),
      UNIT("striker", 0, 24), UNIT("striker", 1), UNIT("striker", 2, -24),
      UNIT("frigate", 2, 24), UNIT("shield", 0), UNIT("relay", 2),
    ]),
    PRESSURE_GROUP(2, [
      UNIT("scout", 0, -24), UNIT("scout", 2, 24),
      UNIT("striker", 0, 42), UNIT("striker", 1, -42),
      UNIT("relay", 1, 24), UNIT("splitter", 2, -42),
    ]),
  ]),
});

const FIRST_CAMPAIGN_PRESSURE_PROFILE = Object.freeze({
  id: "endless-first-two-flags",
  maxSpawnsPerFrame: 2,
  overlapRatio: 0.4,
  flagTransitionMs: 720,
  flags: Object.freeze([FIRST_PRESSURE_FLAG, SECOND_PRESSURE_FLAG]),
  // 保留既有读取方可见的首旗别名；导演始终按 flags 逐旗推进。
  maxActive: FIRST_PRESSURE_FLAG.maxActive,
  groups: FIRST_PRESSURE_FLAG.groups,
});

// Explicit endless keeps the pre-V3 first normal flag and risk relay waves.
// V3's two-flag opening is selected only by the campaign route entry.
const ENDLESS_FIRST_NORMAL_PRESSURE_PROFILE = Object.freeze({
  id: "endless-first-flag",
  maxActive: 15,
  maxSpawnsPerFrame: 2,
  overlapRatio: 0.4,
  groups: Object.freeze([
    PRESSURE_GROUP(0, [
      UNIT("scout", 0, -24), UNIT("scout", 0, 24),
      UNIT("scout", 1), UNIT("scout", 2),
      UNIT("striker", 0), UNIT("striker", 2),
    ]),
    PRESSURE_GROUP(1, [
      UNIT("scout", 0, -24), UNIT("scout", 0, 24),
      UNIT("scout", 1, -24), UNIT("scout", 1, 24),
      UNIT("striker", 2, -24), UNIT("striker", 2, 24), UNIT("frigate", 0),
    ]),
    PRESSURE_GROUP(2, [
      UNIT("scout", 0), UNIT("scout", 1), UNIT("scout", 2, -24), UNIT("scout", 2, 24),
      UNIT("striker", 1), UNIT("striker", 2), UNIT("frigate", 0),
      UNIT("shield", 0), UNIT("relay", 2),
    ]),
  ]),
});

const ENDLESS_FIRST_RISK_UNITS = Object.freeze([
  UNIT("relay", 1, 0, "relay"),
  UNIT("striker", 1, 78),
  UNIT("scout", 1, 146),
]);

const LATERAL_FORMATION_OFFSETS = Object.freeze([-60, -40, -20, 0, 20, 40, 60]);
const LATERAL_FORMATION_ENTRY_YS = Object.freeze([120, 155]);
const A_LANE_UNIT = (type, sector, offset, role, laneIndex) => Object.freeze({
  ...UNIT(type, sector, offset, role),
  entryY: LATERAL_FORMATION_ENTRY_YS[laneIndex % LATERAL_FORMATION_ENTRY_YS.length],
});

const lateralPressureGroup = (index, types) => {
  const laneCounts = { 0: 0, 2: 0 };
  return PRESSURE_GROUP(index, types.map((type, formationIndex) => {
    const sector = (formationIndex + index) % 2 === 0 ? 0 : 2;
    const laneIndex = laneCounts[sector]++;
    return A_LANE_UNIT(type, sector, LATERAL_FORMATION_OFFSETS[laneIndex], "pressure", laneIndex);
  }));
};

const relayEscortGroup = (index, types) => {
  const laneCounts = { 0: 0, 2: 0 };
  return PRESSURE_GROUP(index, types.map((type, formationIndex) => {
    if (type === "relay") return A_LANE_UNIT(type, 1, [-24, 0, 24][index], "relay", index);
    const sector = (formationIndex + index) % 2 === 0 ? 0 : 2;
    const laneIndex = laneCounts[sector]++;
    return A_LANE_UNIT(type, sector, LATERAL_FORMATION_OFFSETS[laneIndex], type === "striker" ? "escort" : "pressure", laneIndex);
  }));
};

const escortInterceptGroup = (index, [scoutCount, strikerCount, frigateCount, shieldCount]) => {
  const flankLaneCounts = { 0: 0, 2: 0 };
  const centerLaneOffsets = shieldCount > 0 ? [-24, 24] : [0, -24];
  let frigateIndex = 0;
  let flankIndex = 0;
  const centerLaneIndexFor = (offset) => offset < 0 ? 0 : offset > 0 ? 2 : 1;
  const types = [
    ...Array(scoutCount).fill("scout"),
    ...Array(strikerCount).fill("striker"),
    ...Array(frigateCount).fill("frigate"),
    ...Array(shieldCount).fill("shield"),
  ];
  return PRESSURE_GROUP(index, types.map((type) => {
    if (type === "shield") {
      return A_LANE_UNIT(type, 1, 0, "shield", centerLaneIndexFor(0));
    }
    if (type === "frigate") {
      const offset = centerLaneOffsets[frigateIndex++ % centerLaneOffsets.length];
      return A_LANE_UNIT(type, 1, offset, shieldCount > 0 ? "protected" : "pressure", centerLaneIndexFor(offset));
    }
    const sector = (flankIndex + index) % 2 === 0 ? 0 : 2;
    const laneIndex = flankLaneCounts[sector]++;
    flankIndex += 1;
    return A_LANE_UNIT(
      type,
      sector,
      LATERAL_FORMATION_OFFSETS[laneIndex],
      type === "striker" ? "escort" : "pressure",
      laneIndex,
    );
  }));
};

const CAMPAIGN_A_PRESSURE_PROFILES = Object.freeze({
  "1:normal:2": Object.freeze({
    id: "v4-normal-node-two",
    maxActive: 16,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      lateralPressureGroup(0, ["scout", "striker", "scout", "striker", "scout", "striker", "scout", "scout", "scout"]),
      lateralPressureGroup(1, ["scout", "striker", "scout", "frigate", "scout", "striker", "scout", "striker", "scout", "scout", "scout"]),
      lateralPressureGroup(2, ["scout", "striker", "scout", "frigate", "scout", "striker", "scout", "striker", "scout", "scout", "scout"]),
      lateralPressureGroup(3, ["scout", "striker", "scout", "striker", "frigate", "striker", "scout", "striker", "scout", "scout", "scout"]),
    ]),
  }),
  "1:risk:2": Object.freeze({
    id: "v4-risk-node-two",
    maxActive: 20,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      relayEscortGroup(0, ["scout", "striker", "relay", "striker", "scout", "scout", "scout", "scout", "scout", "scout"]),
      relayEscortGroup(1, ["scout", "striker", "relay", "striker", "scout", "striker", "scout", "scout", "scout", "scout", "scout", "scout"]),
      relayEscortGroup(2, ["scout", "striker", "relay", "striker", "scout", "striker", "scout", "striker", "scout", "scout", "scout", "scout", "scout", "scout"]),
      relayEscortGroup(3, ["scout", "striker", "scout", "striker", "scout", "striker", "scout", "striker", "scout", "striker", "scout", "scout", "scout", "scout"]),
    ]),
  }),
});

const CAMPAIGN_B1_PRESSURE_PROFILES = Object.freeze({
  "1:normal:3": Object.freeze({
    id: "v4-normal-node-three",
    maxActive: 17,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      escortInterceptGroup(0, [6, 2, 1, 1]),
      escortInterceptGroup(1, [7, 2, 1, 1]),
      escortInterceptGroup(2, [7, 3, 1, 0]),
      escortInterceptGroup(3, [7, 3, 1, 1]),
    ]),
  }),
  "1:risk:3": Object.freeze({
    id: "v4-risk-node-three",
    maxActive: 21,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      escortInterceptGroup(0, [7, 3, 1, 1]),
      escortInterceptGroup(1, [8, 3, 1, 1]),
      escortInterceptGroup(2, [8, 3, 1, 1]),
      escortInterceptGroup(3, [8, 4, 1, 1]),
    ]),
  }),
});

const frontlineInterceptGroup = (index, [scoutCount, strikerCount, frigateCount]) => {
  const laneCounts = { 0: 0, 2: 0 };
  const types = [
    ...Array(scoutCount).fill("scout"),
    ...Array(strikerCount).fill("striker"),
    ...Array(frigateCount).fill("frigate"),
  ];
  return PRESSURE_GROUP(index, types.map((type, formationIndex) => {
    const sector = (formationIndex + index) % 2 === 0 ? 0 : 2;
    const laneIndex = laneCounts[sector]++;
    return A_LANE_UNIT(type, sector, LATERAL_FORMATION_OFFSETS[laneIndex], "pressure", laneIndex);
  }));
};

const coreDefenseGroup = (index, [scoutCount, strikerCount, relayCount]) => {
  const laneCounts = { 0: 0, 2: 0 };
  const relayOffsets = relayCount === 2 ? [-24, 24] : [[-24, 0, 24, 0][index]];
  let relayIndex = 0;
  let flankIndex = 0;
  const types = [
    ...Array(scoutCount).fill("scout"),
    ...Array(strikerCount).fill("striker"),
    ...Array(relayCount).fill("relay"),
  ];
  return PRESSURE_GROUP(index, types.map((type) => {
    if (type === "relay") {
      const localIndex = relayIndex++;
      const offset = relayOffsets[localIndex];
      return A_LANE_UNIT(type, 1, offset, "relay", relayCount === 2 ? localIndex : index % 2);
    }
    const sector = (flankIndex + index) % 2 === 0 ? 0 : 2;
    const laneIndex = laneCounts[sector]++;
    flankIndex += 1;
    return A_LANE_UNIT(type, sector, LATERAL_FORMATION_OFFSETS[laneIndex], type === "striker" ? "escort" : "pressure", laneIndex);
  }));
};

const wingPressureGroup = (index, leftTypes, rightTypes, centerFrigateOffsets = []) => {
  const units = [];
  for (const [sector, types] of [[0, leftTypes], [2, rightTypes]]) {
    types.forEach((type, laneIndex) => units.push(A_LANE_UNIT(
      type,
      sector,
      LATERAL_FORMATION_OFFSETS[laneIndex],
      type === "striker" ? "escort" : "pressure",
      laneIndex,
    )));
  }
  for (const offset of centerFrigateOffsets) {
    const laneIndex = offset < 0 ? 0 : offset > 0 ? 2 : 1;
    units.push(A_LANE_UNIT("frigate", 1, offset, "pressure", laneIndex));
  }
  return PRESSURE_GROUP(index, units);
};

const wingShieldEscortGroup = (index, leftTypes, rightTypes, frigateOffsets) => {
  const centerLaneIndexFor = (offset) => offset < 0 ? 0 : offset > 0 ? 2 : 1;
  const centerUnits = [
    ...frigateOffsets.map((offset) => A_LANE_UNIT("frigate", 1, offset, "protected", centerLaneIndexFor(offset))),
    A_LANE_UNIT("shield", 1, 0, "shield", 1),
  ];
  const flankUnits = [];
  for (const [sector, types] of [[0, leftTypes], [2, rightTypes]]) {
    types.forEach((type, laneIndex) => flankUnits.push(A_LANE_UNIT(
      type,
      sector,
      LATERAL_FORMATION_OFFSETS[laneIndex],
      type === "striker" ? "escort" : "pressure",
      laneIndex,
    )));
  }
  return PRESSURE_GROUP(index, [...centerUnits, ...flankUnits]);
};

const dualWingRelayGroup = (index, leftTypes, rightTypes, relayOffsets) => {
  const relays = relayOffsets.map((offset) => {
    const laneIndex = offset < 0 ? 0 : offset > 0 ? 2 : 1;
    return A_LANE_UNIT("relay", 1, offset, "relay", laneIndex);
  });
  const flankUnits = [];
  for (const [sector, types] of [[0, leftTypes], [2, rightTypes]]) {
    types.forEach((type, laneIndex) => flankUnits.push(A_LANE_UNIT(
      type,
      sector,
      LATERAL_FORMATION_OFFSETS[laneIndex],
      type === "striker" ? "escort" : "pressure",
      laneIndex,
    )));
  }
  return PRESSURE_GROUP(index, [...relays, ...flankUnits]);
};

const mixedCorePressureGroup = (index, leftTypes, rightTypes, { frigateOffsets = [], relayOffsets = [] } = {}) => {
  const centerLaneIndexFor = (offset) => offset < 0 ? 0 : offset > 0 ? 2 : 1;
  const centerUnits = [
    ...frigateOffsets.map((offset) => A_LANE_UNIT("frigate", 1, offset, "pressure", centerLaneIndexFor(offset))),
    ...relayOffsets.map((offset) => A_LANE_UNIT("relay", 1, offset, "relay", centerLaneIndexFor(offset))),
  ];
  const flankUnits = [];
  for (const [sector, types] of [[0, leftTypes], [2, rightTypes]]) {
    types.forEach((type, laneIndex) => flankUnits.push(A_LANE_UNIT(
      type,
      sector,
      LATERAL_FORMATION_OFFSETS[laneIndex],
      type === "striker" ? "escort" : "pressure",
      laneIndex,
    )));
  }
  return PRESSURE_GROUP(index, [...centerUnits, ...flankUnits]);
};

const CAMPAIGN_B2A_PRESSURE_PROFILES = Object.freeze({
  "2:normal:1": Object.freeze({
    id: "v4-segment-two-normal-node-one",
    maxActive: 18,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      frontlineInterceptGroup(0, [7, 3, 0]),
      frontlineInterceptGroup(1, [8, 3, 1]),
      frontlineInterceptGroup(2, [8, 3, 1]),
      frontlineInterceptGroup(3, [9, 4, 1]),
    ]),
  }),
  "2:normal:2": Object.freeze({
    id: "v4-segment-two-normal-node-two",
    maxActive: 19,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      escortInterceptGroup(0, [7, 3, 1, 1]),
      escortInterceptGroup(1, [8, 2, 1, 1]),
      escortInterceptGroup(2, [7, 3, 1, 1]),
      escortInterceptGroup(3, [9, 2, 2, 1]),
    ]),
  }),
  "2:normal:3": Object.freeze({
    id: "v4-segment-two-normal-node-three",
    maxActive: 20,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      coreDefenseGroup(0, [8, 3, 1]),
      coreDefenseGroup(1, [8, 3, 1]),
      coreDefenseGroup(2, [9, 3, 2]),
      coreDefenseGroup(3, [9, 4, 1]),
    ]),
  }),
});

const CAMPAIGN_B2B_PRESSURE_PROFILES = Object.freeze({
  "2:risk:1": Object.freeze({
    id: "v4-segment-two-risk-node-one",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      wingPressureGroup(0,
        ["scout", "scout", "scout", "scout", "striker", "striker", "striker"],
        ["scout", "scout", "scout", "scout"], [0]),
      wingPressureGroup(1,
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "scout", "scout"], [-24]),
      wingPressureGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"], [24]),
      wingPressureGroup(3,
        ["scout", "scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"], [-24, 24]),
    ]),
  }),
  "2:risk:2": Object.freeze({
    id: "v4-segment-two-risk-node-two",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      wingShieldEscortGroup(0,
        ["scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker", "striker"], [-24]),
      wingShieldEscortGroup(1,
        ["scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker", "striker"], [24]),
      wingShieldEscortGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "striker", "striker"], [-24]),
      wingShieldEscortGroup(3,
        ["scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "scout", "striker", "striker", "striker"], [-24, 24]),
    ]),
  }),
  "2:risk:3": Object.freeze({
    id: "v4-segment-two-risk-node-three",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      dualWingRelayGroup(0,
        ["scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"], [-24]),
      dualWingRelayGroup(1,
        ["scout", "scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"], [24]),
      dualWingRelayGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "striker", "striker", "striker", "striker", "striker"], [-24, 24]),
      dualWingRelayGroup(3,
        ["scout", "scout", "scout", "scout", "scout", "scout"],
        ["scout", "scout", "scout", "striker", "striker", "striker", "striker"], [-24, 24]),
    ]),
  }),
});

const CAMPAIGN_B3A_PRESSURE_PROFILES = Object.freeze({
  "3:normal:1": Object.freeze({
    id: "v4-segment-three-normal-node-one",
    maxActive: 21,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      wingShieldEscortGroup(0,
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "striker"], [-24]),
      wingShieldEscortGroup(1,
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"], [24]),
      wingShieldEscortGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"], [-24]),
      wingShieldEscortGroup(3,
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"], [-24, 24]),
    ]),
  }),
  "3:normal:2": Object.freeze({
    id: "v4-segment-three-normal-node-two",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      mixedCorePressureGroup(0,
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        { frigateOffsets: [0], relayOffsets: [-24] }),
      mixedCorePressureGroup(1,
        ["scout", "scout", "scout", "scout", "striker", "splitter"],
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        { frigateOffsets: [0], relayOffsets: [24] }),
      mixedCorePressureGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        { frigateOffsets: [0], relayOffsets: [-24, 24] }),
      mixedCorePressureGroup(3,
        ["scout", "scout", "scout", "scout", "striker", "striker", "splitter"],
        ["scout", "scout", "scout", "scout", "striker", "striker"],
        { frigateOffsets: [0], relayOffsets: [-24] }),
    ]),
  }),
  "3:normal:3": Object.freeze({
    id: "v4-segment-three-normal-node-three",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      wingShieldEscortGroup(0,
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"], [-24]),
      wingShieldEscortGroup(1,
        ["scout", "scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "scout", "striker"], [24]),
      mixedCorePressureGroup(2,
        ["scout", "scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "scout", "striker"],
        { frigateOffsets: [0], relayOffsets: [-24] }),
      wingShieldEscortGroup(3,
        ["scout", "scout", "scout", "scout", "scout", "striker", "striker"],
        ["scout", "scout", "scout", "scout", "striker", "striker"], [-24, 24]),
    ]),
  }),
});

const riskWingShieldSplitterGroup = (index, counts, centerUnits) => {
  const remaining = { ...counts };
  for (const center of centerUnits) remaining[center.type] = (remaining[center.type] ?? 0) - 1;
  const leftTypes = [];
  const rightTypes = [];
  const sideCounts = { 0: 0, 2: 0 };
  let flankIndex = 0;
  for (const type of ["scout", "striker"]) {
    for (let unitIndex = 0; unitIndex < (remaining[type] ?? 0); unitIndex += 1) {
      let sector;
      if (sideCounts[0] < sideCounts[2]) sector = 0;
      else if (sideCounts[2] < sideCounts[0]) sector = 2;
      else sector = (index + flankIndex) % 2 === 0 ? 0 : 2;
      const laneIndex = sideCounts[sector]++;
      const unit = A_LANE_UNIT(
        type,
        sector,
        LATERAL_FORMATION_OFFSETS[laneIndex],
        type === "striker" ? "escort" : "pressure",
        laneIndex,
      );
      (sector === 0 ? leftTypes : rightTypes).push(unit);
      flankIndex += 1;
    }
  }
  const center = centerUnits.map(({ type, offset, laneIndex, role }) =>
    A_LANE_UNIT(type, 1, offset, role, laneIndex));
  return PRESSURE_GROUP(index, [...center, ...leftTypes, ...rightTypes]);
};

const CAMPAIGN_B3B_PRESSURE_PROFILES = Object.freeze({
  "3:risk:1": Object.freeze({
    id: "v4-segment-three-risk-node-one",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      riskWingShieldSplitterGroup(0, { scout: 7, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(1, { scout: 8, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(2, { scout: 8, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(3, { scout: 8, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(4, { scout: 9, striker: 2, frigate: 1, relay: 1 }, [
        { type: "relay", offset: 60, laneIndex: 2, role: "relay" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "pressure" },
      ]),
    ]),
  }),
  "3:risk:2": Object.freeze({
    id: "v4-segment-three-risk-node-two",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      riskWingShieldSplitterGroup(0, { scout: 8, striker: 3, frigate: 1 }, [
        { type: "frigate", offset: -60, laneIndex: 0, role: "pressure" },
      ]),
      riskWingShieldSplitterGroup(1, { scout: 8, striker: 3, frigate: 1, relay: 1 }, [
        { type: "frigate", offset: -60, laneIndex: 0, role: "pressure" },
        { type: "relay", offset: 60, laneIndex: 2, role: "relay" },
      ]),
      riskWingShieldSplitterGroup(2, { scout: 8, striker: 3, frigate: 1, relay: 1 }, [
        { type: "frigate", offset: -60, laneIndex: 0, role: "pressure" },
        { type: "relay", offset: 60, laneIndex: 2, role: "relay" },
      ]),
      riskWingShieldSplitterGroup(3, { scout: 9, striker: 3, frigate: 1, relay: 1 }, [
        { type: "frigate", offset: -60, laneIndex: 0, role: "pressure" },
        { type: "relay", offset: 60, laneIndex: 2, role: "relay" },
      ]),
      riskWingShieldSplitterGroup(4, { scout: 10, striker: 3, relay: 1 }, [
        { type: "relay", offset: -60, laneIndex: 0, role: "relay" },
        { type: "striker", offset: 60, laneIndex: 2, role: "escort" },
      ]),
    ]),
  }),
  "3:risk:3": Object.freeze({
    id: "v4-segment-three-risk-node-three",
    maxActive: 22,
    maxSpawnsPerFrame: 2,
    overlapRatio: 0.45,
    preserveConfiguredOffsets: true,
    groups: Object.freeze([
      riskWingShieldSplitterGroup(0, { scout: 7, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(1, { scout: 9, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(2, { scout: 9, striker: 3, frigate: 1, shield: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(3, { scout: 9, striker: 2, frigate: 1, shield: 1, splitter: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
        { type: "splitter", offset: 60, laneIndex: 2, role: "protected" },
      ]),
      riskWingShieldSplitterGroup(4, { scout: 9, striker: 2, frigate: 1, shield: 1, splitter: 1 }, [
        { type: "shield", offset: 0, laneIndex: 1, role: "shield" },
        { type: "frigate", offset: -60, laneIndex: 0, role: "protected" },
        { type: "splitter", offset: 60, laneIndex: 2, role: "protected" },
      ]),
    ]),
  }),
});

const CAMPAIGN_XP_BY_ENCOUNTER = Object.freeze({
  "1:normal:1": Object.freeze({ scout: 1, striker: 2, frigate: 3, shield: 2, relay: 2, splitter: 1 }),
  "1:risk:1": Object.freeze({ scout: 1, striker: 2, frigate: 3, shield: 2, relay: 2, splitter: 1 }),
  "1:normal:2": Object.freeze({ scout: 1, striker: 2, frigate: 3 }),
  "1:risk:2": Object.freeze({ scout: 1, striker: 2, relay: 2 }),
  "1:normal:3": Object.freeze({ scout: 1, striker: 2, frigate: 3, shield: 3 }),
  "1:risk:3": Object.freeze({ scout: 1, striker: 2, frigate: 3, shield: 3 }),
  "2:normal:1": Object.freeze({ scout: 1, striker: 3, frigate: 3 }),
  "2:normal:2": Object.freeze({ scout: 1, striker: 2, frigate: 5, shield: 4 }),
  "2:normal:3": Object.freeze({ scout: 1, striker: 4, relay: 4 }),
  "2:risk:1": Object.freeze({ scout: 1, striker: 3, frigate: 4 }),
  "2:risk:2": Object.freeze({ scout: 1, striker: 2, frigate: 5, shield: 4 }),
  "2:risk:3": Object.freeze({ scout: 1, striker: 4, relay: 4 }),
  "3:normal:1": Object.freeze({ scout: 1, striker: 3, frigate: 4, shield: 4 }),
  "3:normal:2": Object.freeze({ scout: 1, striker: 3, frigate: 4, relay: 3, splitter: 6 }),
  "3:normal:3": Object.freeze({ scout: 1, striker: 4, frigate: 4, shield: 4, relay: 3 }),
  "3:risk:1": Object.freeze({ scout: 1, striker: 3, frigate: 4, shield: 4, relay: 3 }),
  "3:risk:2": Object.freeze({ scout: 1, striker: 4, frigate: 4, relay: 3 }),
  "3:risk:3": Object.freeze({ scout: 1, striker: 3, frigate: 4, shield: 4, splitter: 6 }),
});

const ENCOUNTERS = {
  "1:normal:1": { title: "单区压制", pressureProfile: FIRST_CAMPAIGN_PRESSURE_PROFILE, rewardTag: "focus" },
  "1:normal:2": { title: "左右错峰", waves: [
    WAVE(0, [UNIT("scout", 0, 0), UNIT("scout", 0, 24)]),
    WAVE(2800, [UNIT("striker", 2, 48), UNIT("scout", 2, 72)]),
    WAVE(5600, [UNIT("frigate", 0, 96), UNIT("scout", 0, 120), UNIT("scout", 0, 144)]),
  ], rewardTag: "escort" },
  "1:normal:3": { title: "护航收尾", waves: [
    WAVE(0, [UNIT("shield", 1, 0, "shield")]),
    WAVE(3500, [UNIT("frigate", 1, 48), UNIT("scout", 1, 72)]),
    WAVE(7000, [UNIT("scout", 2, 96), UNIT("scout", 2, 120), UNIT("scout", 2, 144)]),
  ], rewardTag: "energy" },
  "1:risk:1": { title: "中继护送", pressureProfile: FIRST_CAMPAIGN_PRESSURE_PROFILE, rewardTag: "energy", risk: "relay" },
  "1:risk:2": { title: "增援阻断", units: [UNIT("scout", 0, 0), UNIT("relay", 2, 70, "relay"), UNIT("striker", 2, 142)], rewardTag: "escort", risk: "reinforcement" },
  "1:risk:3": { title: "重舰截击", units: [UNIT("shield", 1, 0, "shield"), UNIT("frigate", 1, 76), UNIT("striker", 0, 120)], rewardTag: "focus", risk: "heavy" },
  "2:normal:1": { title: "前锋截击", units: [UNIT("striker", 0, 0), UNIT("scout", 0, 72), UNIT("scout", 1, 120)], rewardTag: "escort" },
  "2:normal:2": { title: "装甲队", units: [UNIT("frigate", 1, 0), UNIT("shield", 1, 82, "shield"), UNIT("scout", 2, 140)], rewardTag: "focus" },
  "2:normal:3": { title: "核心防守", units: [UNIT("striker", 2, 0), UNIT("relay", 2, 78, "relay"), UNIT("scout", 1, 150)], rewardTag: "energy" },
  "2:risk:1": { title: "左翼来袭", units: [UNIT("striker", 0, 0), UNIT("frigate", 0, 84), UNIT("scout", 2, 134)], rewardTag: "escort", risk: "left-first" },
  "2:risk:2": { title: "右翼接应", units: [UNIT("striker", 2, 0), UNIT("shield", 2, 84, "shield"), UNIT("scout", 0, 134)], rewardTag: "escort", risk: "right-first" },
  "2:risk:3": { title: "双翼错峰", units: [UNIT("striker", 0, 0), UNIT("striker", 2, 76), UNIT("relay", 1, 146, "relay")], rewardTag: "focus", risk: "dual-wing" },
  "3:normal:1": { title: "护盾拆解", units: [UNIT("shield", 1, 0, "shield"), UNIT("scout", 1, 76), UNIT("striker", 1, 142)], rewardTag: "focus" },
  "3:normal:2": { title: "混合队", units: [UNIT("relay", 0, 0, "relay"), UNIT("splitter", 1, 76), UNIT("frigate", 2, 142)], rewardTag: "energy" },
  "3:normal:3": { title: "Boss 前哨", units: [UNIT("shield", 0, 0, "shield"), UNIT("relay", 2, 76, "relay"), UNIT("frigate", 1, 142)], rewardTag: "focus" },
  "3:risk:1": { title: "护盾护送", units: [UNIT("shield", 1, 0, "shield"), UNIT("frigate", 1, 78), UNIT("relay", 1, 144, "relay")], rewardTag: "focus", risk: "shield-escort" },
  "3:risk:2": { title: "重目标推进", units: [UNIT("frigate", 1, 0), UNIT("striker", 1, 82), UNIT("relay", 2, 144, "relay")], rewardTag: "energy", risk: "heavy-push" },
  "3:risk:3": { title: "拆盾终阵", units: [UNIT("shield", 0, 0, "shield"), UNIT("shield", 2, 72, "shield"), UNIT("splitter", 1, 144)], rewardTag: "escort", risk: "break-shield" },
};

export function campaignEncounterKey({ segment = 1, branch = "normal", position = 1 } = {}) {
  return `${Math.max(1, Math.floor(Number(segment) || 1))}:${branch === "risk" ? "risk" : "normal"}:${Math.max(1, Math.min(3, Math.floor(Number(position) || 1)))}`;
}

export function campaignXpValueForEncounter(options = {}) {
  const { key, type } = options ?? {};
  const xpTableKey = firstSegmentCategoryXpTableKey(key) ?? key;
  const values = CAMPAIGN_XP_BY_ENCOUNTER[xpTableKey];
  return values && Object.prototype.hasOwnProperty.call(values, type) ? values[type] : null;
}

function cloneCategoryPressureProfile(sourceProfile, actualKey, adjustments = {}) {
  if (!sourceProfile) return null;
  const applyGroupSectors = (groups, targets) => {
    if (!targets) return groups;
    if (!Array.isArray(groups) || groups.length !== targets.length) return null;
    return Object.freeze(groups.map((group, index) => Object.freeze({
      ...group,
      units: Object.freeze(group.units.map((unit) => Object.freeze({ ...unit, sector: targets[index] }))),
    })));
  };

  if (Array.isArray(sourceProfile.flags)) {
    const flagOverrides = adjustments.flagOverrides ?? {};
    const flags = sourceProfile.flags.map((flag) => {
      const override = flagOverrides[flag.flagIndex] ?? {};
      const groups = applyGroupSectors(flag.groups, override.groupSectorTargets);
      if (groups === null) return null;
      return Object.freeze({
        ...flag,
        ...(Number.isFinite(override.overlapRatio) ? { overlapRatio: override.overlapRatio } : {}),
        groups,
      });
    });
    if (flags.some((flag) => flag === null)) return null;
    const frozenFlags = Object.freeze(flags);
    return Object.freeze({
      ...sourceProfile,
      id: actualKey,
      ...(Number.isFinite(adjustments.maxActive) ? { maxActive: adjustments.maxActive } : {}),
      flags: frozenFlags,
      groups: frozenFlags[0]?.groups ?? Object.freeze([]),
    });
  }

  const groups = applyGroupSectors(sourceProfile.groups, adjustments.groupSectorTargets);
  if (groups === null) return null;
  return Object.freeze({
    ...sourceProfile,
    id: actualKey,
    ...(Number.isFinite(adjustments.maxActive) ? { maxActive: adjustments.maxActive } : {}),
    ...(Number.isFinite(adjustments.overlapRatio) ? { overlapRatio: adjustments.overlapRatio } : {}),
    groups,
  });
}

export function campaignEncounterForCategory({ categoryId, position, seed = 1 } = {}) {
  const numericPosition = Math.floor(Number(position));
  const row = FIRST_SEGMENT_CATEGORY_ENCOUNTERS
    .find((candidate) => candidate.categoryId === categoryId && candidate.position === numericPosition);
  if (!row) return null;
  const [segment, branch, sourcePosition] = row.sourceTemplateKey.split(":");
  if (segment !== "1" || !["normal", "risk"].includes(branch)) return null;
  const source = campaignEncounterFor({ segment: 1, branch, position: Number(sourcePosition), seed, mode: "campaign" });
  if (!source?.pressureProfile) return null;
  const pressureProfile = cloneCategoryPressureProfile(
    source.pressureProfile,
    row.key,
    firstSegmentCategoryProfileAdjustments(row.key) ?? {},
  );
  if (!pressureProfile) return null;
  return Object.freeze({
    version: CAMPAIGN_ENCOUNTER_VERSION,
    key: row.key,
    categoryId: row.categoryId,
    segment: 1,
    position: row.position,
    sourceTemplateKey: row.sourceTemplateKey,
    xpTableKey: firstSegmentCategoryXpTableKey(row.key),
    title: row.title,
    preview: row.preview,
    pressureProfile,
    spawnBatches: Object.freeze([]),
  });
}

export function campaignPressureNextGroupIndex({
  profile = null,
  currentGroupIndex = -1,
  pendingCount = 0,
  currentGroupAlive = 0,
  activeCount = 0,
  allowActiveOnFirstGroup = false,
} = {}) {
  const groups = profile?.groups ?? [];
  if (!groups.length || Math.max(0, Math.floor(Number(pendingCount) || 0)) > 0) return null;

  const currentIndex = Math.floor(Number(currentGroupIndex));
  const nextIndex = currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= groups.length) return null;
  if (currentIndex < 0) {
    const active = Math.max(0, Math.floor(Number(activeCount) || 0));
    const cap = Math.max(0, Math.floor(Number(profile.maxActive) || 0));
    const fits = cap > 0 && active + (groups[nextIndex].units?.length ?? 0) <= cap;
    return fits && (active === 0 || allowActiveOnFirstGroup) ? nextIndex : null;
  }

  const currentGroup = groups[currentIndex];
  const nextGroup = groups[nextIndex];
  if (!currentGroup || !nextGroup) return null;
  const currentGroupSize = currentGroup.units?.length ?? 0;
  const overlapRatio = Math.max(0, Math.min(1, Number(profile.overlapRatio) || 0));
  const remainingThreshold = Math.ceil(currentGroupSize * overlapRatio);
  if (Math.max(0, Math.floor(Number(currentGroupAlive) || 0)) > remainingThreshold) return null;

  const cap = Math.max(0, Math.floor(Number(profile.maxActive) || 0));
  const active = Math.max(0, Math.floor(Number(activeCount) || 0));
  return active + (nextGroup.units?.length ?? 0) <= cap ? nextIndex : null;
}

export function campaignEncounterFor({ segment = 1, branch = "normal", position = 1, seed = 1, mode = "campaign" } = {}) {
  const key = campaignEncounterKey({ segment, branch, position });
  const campaignEncounter = ENCOUNTERS[key] ?? ENCOUNTERS["1:normal:1"];
  const v4PressureProfile = CAMPAIGN_A_PRESSURE_PROFILES[key]
    ?? CAMPAIGN_B1_PRESSURE_PROFILES[key]
    ?? CAMPAIGN_B2A_PRESSURE_PROFILES[key]
    ?? CAMPAIGN_B2B_PRESSURE_PROFILES[key]
    ?? CAMPAIGN_B3A_PRESSURE_PROFILES[key]
    ?? CAMPAIGN_B3B_PRESSURE_PROFILES[key];
  const encounter = mode === "endless" && key === "1:normal:1"
    ? { ...campaignEncounter, pressureProfile: ENDLESS_FIRST_NORMAL_PRESSURE_PROFILE }
    : mode === "endless" && key === "1:risk:1"
      ? { ...campaignEncounter, pressureProfile: null, units: ENDLESS_FIRST_RISK_UNITS }
      : mode === "campaign" && v4PressureProfile
        ? { ...campaignEncounter, pressureProfile: v4PressureProfile }
        : campaignEncounter;
  const configuredWaves = encounter.waves ?? encounter.units?.map((unit, index) => ({ at: index * 6000, units: [unit] })) ?? [];
  let unitIndex = 0;
  const pressureFlags = encounter.pressureProfile?.flags?.map((flag) => Object.freeze({
    ...flag,
    groups: Object.freeze(flag.groups.map((group) => Object.freeze({
      index: group.index,
      units: Object.freeze(group.units.map((unit, formationIndex) => Object.freeze({
        ...unit,
        flagIndex: flag.flagIndex,
        groupIndex: group.index,
        formationIndex,
      }))),
    }))),
  })) ?? null;
  const pressureGroups = pressureFlags?.[0]?.groups ?? encounter.pressureProfile?.groups.map((group) => Object.freeze({
    index: group.index,
    units: Object.freeze(group.units.map((unit, formationIndex) => {
      const anchored = Object.freeze({
        ...unit,
        ...(encounter.pressureProfile?.preserveConfiguredOffsets ? { formationIndex: formationIndex % 3, flagIndex: 0 } : {}),
        offset: encounter.pressureProfile?.preserveConfiguredOffsets
          ? Number(unit.offset) || 0
          : ((Number(seed) + unitIndex * 31) % 3 - 1) * 24,
        groupIndex: group.index,
        ...(mode === "endless" && key === "1:normal:1" ? { flagIndex: 0 } : {}),
      });
      unitIndex += 1;
      return anchored;
    })),
  })) ?? null;
  const spawnBatches = encounter.pressureProfile
    ? Object.freeze([])
    : Object.freeze(configuredWaves.map((wave) => {
      const units = [];
      for (const unit of wave.units) {
        const anchor = { ...unit, offset: ((Number(seed) + unitIndex * 31) % 3 - 1) * 24 };
        unitIndex += 1;
        units.push(anchor);
        if (unit.role === "shield") units.push({ type: "frigate", sector: unit.sector, offset: -anchor.offset, role: "protected" });
        else if (unit.role === "relay") units.push({ type: "striker", sector: unit.sector, offset: -anchor.offset, role: "escort" });
        else if (branch === "risk") units.push({ type: "scout", sector: unit.sector, offset: -48, role: "escort" });
      }
      return Object.freeze({ at: wave.at, units: Object.freeze(units.map(Object.freeze)) });
    }));
  return Object.freeze({
    version: CAMPAIGN_ENCOUNTER_VERSION,
    key,
    segment: Math.max(1, Math.floor(Number(segment) || 1)),
    branch: branch === "risk" ? "risk" : "normal",
    position: Math.max(1, Math.min(3, Math.floor(Number(position) || 1))),
    title: encounter.title,
    rewardTag: encounter.rewardTag,
    risk: encounter.risk ?? null,
    ...(pressureGroups ? {
      pressureProfile: Object.freeze({
        ...encounter.pressureProfile,
        groups: Object.freeze(pressureGroups),
        ...(pressureFlags ? { flags: Object.freeze(pressureFlags) } : {}),
      }),
    } : {}),
    spawnBatches,
  });
}

export function campaignEncounterCatalog() {
  return Object.freeze(Object.entries(ENCOUNTERS).map(([key, value]) => Object.freeze({
    key,
    title: value.title,
    rewardTag: value.rewardTag,
    risk: value.risk ?? null,
    unitCount: (CAMPAIGN_A_PRESSURE_PROFILES[key] ?? CAMPAIGN_B1_PRESSURE_PROFILES[key] ?? CAMPAIGN_B2A_PRESSURE_PROFILES[key] ?? CAMPAIGN_B2B_PRESSURE_PROFILES[key] ?? CAMPAIGN_B3A_PRESSURE_PROFILES[key] ?? CAMPAIGN_B3B_PRESSURE_PROFILES[key])?.groups.reduce((total, group) => total + group.units.length, 0)
      ?? value.pressureProfile?.flags?.reduce((total, flag) => total + flag.groups.reduce((flagTotal, group) => flagTotal + group.units.length, 0), 0)
      ?? value.pressureProfile?.groups.reduce((total, group) => total + group.units.length, 0)
      ?? value.units?.length
      ?? value.waves?.reduce((total, wave) => total + wave.units.length, 0)
      ?? 0,
  })));
}

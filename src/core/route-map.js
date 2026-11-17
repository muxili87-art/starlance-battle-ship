import { campaignEncounterFor } from "./campaign-director.js";
import {
  createFirstSegmentCategoryOffer,
  firstSegmentCategoryEncounterForKey,
} from "./campaign-categories.js";
// V5 首章路径图纯数据层。它只负责“可见路线与一次性节点状态”，不处理
// Phaser 绘制或战斗数值，避免地图查看、暂停和战斗导演各自维护一份进度。

export const CAMPAIGN_ROUTE_VERSION = "campaign-route-v5";
export const CAMPAIGN_TOTAL_NODES = 9;
export const CAMPAIGN_SEGMENTS = Object.freeze([
  Object.freeze({ index: 1, startChoiceAt: 0, endChoiceAt: 3, label: "第一段 · 初识威胁" }),
  Object.freeze({ index: 2, startChoiceAt: 3, endChoiceAt: 6, label: "第二段 · 交叉防线" }),
  Object.freeze({ index: 3, startChoiceAt: 6, endChoiceAt: 9, label: "第三段 · 终局前哨" }),
]);

const NODE_THEMES = Object.freeze({
  normal: Object.freeze([
    Object.freeze({ theme: "single-pressure", title: "单区压制", rewardTag: "focus", preview: "一侧高威胁，学习锁定与持续命中" }),
    Object.freeze({ theme: "staggered-wings", title: "左右错峰", rewardTag: "escort", preview: "两翼错峰接敌，换区时机决定核心压力" }),
    Object.freeze({ theme: "escort-finish", title: "护航收尾", rewardTag: "energy", preview: "护航舰与高威胁目标同区推进" }),
  ]),
  risk: Object.freeze([
    Object.freeze({ theme: "relay-escort", title: "中继护送", rewardTag: "energy", preview: "中继舰存活会在第 10 秒召来增援" }),
    Object.freeze({ theme: "reinforcement-block", title: "增援阻断", rewardTag: "escort", preview: "先到一侧提前逼近，读懂预告再换区" }),
    Object.freeze({ theme: "heavy-intercept", title: "重舰截击", rewardTag: "focus", preview: "重舰护航下拆盾、标记、兑现" }),
  ]),
});

function safeSeed(seed = 1) {
  const value = Number(seed) >>> 0;
  return value || 1;
}

function xorshift(seed) {
  let value = safeSeed(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) || 1;
}

function branchFor(seed, segment) {
  // 首章风险顺序固定便于学习；左右只是呈现位置的种子差异。
  const value = xorshift(safeSeed(seed) + segment * 977);
  return Object.freeze({
    riskSide: value % 2 === 0 ? "left" : "right",
    riskVariant: value % 3,
  });
}

function nodeId(segment, branch, position) {
  return `campaign:segment-${segment}:${branch}:node-${position}`;
}

function categoryNodeId(categoryId, position) {
  return `campaign:segment-1:category-${categoryId}:node-${position}`;
}

function withRunId(baseId, runId) {
  return runId ? `${baseId}:run-${runId}` : baseId;
}

export function createCampaignRouteMap({ seed = 1, runId = null, zone = 1, firstSegmentCategoriesEnabled = false } = {}) {
  const safeRunId = runId === null || runId === undefined || runId === ""
    ? null
    : String(runId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const useFirstSegmentCategories = Boolean(firstSegmentCategoriesEnabled) && zone === 1;
  const firstSegmentOffer = useFirstSegmentCategories
    ? createFirstSegmentCategoryOffer({ seed, runId: safeRunId })
    : null;
  const nodes = [];
  const branches = [];
  for (const segment of CAMPAIGN_SEGMENTS.slice(0, zone > 1 ? 1 : 3)) {
    if (segment.index === 1 && useFirstSegmentCategories) {
      for (const option of firstSegmentOffer.options) {
        for (let position = 1; position <= 3; position += 1) {
          const encounterKey = option.encounterKeys[position - 1];
          const encounter = firstSegmentCategoryEncounterForKey(encounterKey);
          if (!encounter) continue;
          const baseId = categoryNodeId(option.categoryId, position);
          nodes.push(Object.freeze({
            id: withRunId(baseId, safeRunId),
            baseId,
            segment: 1,
            branch: null,
            categoryId: option.categoryId,
            choiceId: option.choiceId,
            position,
            index: position,
            title: encounter.title,
            theme: `category-${option.categoryId}`,
            encounterKey,
            sourceTemplateKey: encounter.sourceTemplateKey,
            xpTableKey: encounter.xpTableKey,
            preview: encounter.preview,
            state: "locked",
          }));
        }
      }
      continue;
    }
    const branchMeta = branchFor(seed, segment.index);
    branches.push(Object.freeze({ segment: segment.index, ...branchMeta }));
    for (const branch of ["normal", "risk"]) {
      const themes = NODE_THEMES[branch];
      for (let position = 1; position <= 3; position += 1) {
        const theme = { ...themes[position - 1], ...campaignEncounterFor({ segment: segment.index, branch, position, seed }) };
        const baseId = nodeId(segment.index, branch, position);
        nodes.push(Object.freeze({
          id: safeRunId ? `${baseId}:run-${safeRunId}` : baseId,
          baseId,
          segment: segment.index,
          branch,
          position,
          index: (segment.index - 1) * 3 + position,
          title: theme.title,
          theme: theme.theme,
          rewardTag: theme.rewardTag,
          preview: theme.preview,
          riskSide: branch === "risk" ? branchMeta.riskSide : null,
          state: "locked",
        }));
      }
    }
  }
  const routeMap = {
    version: CAMPAIGN_ROUTE_VERSION,
    zone,
    totalNodes: zone > 1 ? 3 : 9,
    seed: safeSeed(seed),
    runId: safeRunId,
    currentIndex: 0,
    selectedBranches: {},
    nodeStates: Object.fromEntries(nodes.map((node) => [node.id, node.state])),
    nodes,
    branches,
    boss: { id: safeRunId ? `campaign:boss:run-${safeRunId}` : "campaign:boss", title: "封锁巡洋舰", state: "locked" },
  };
  if (useFirstSegmentCategories) {
    routeMap.firstSegmentCategoriesEnabled = true;
    routeMap.firstSegmentOffer = firstSegmentOffer;
    routeMap.selectedCategories = {};
    routeMap.selectedCategorySequences = {};
  }
  return routeMap;
}

export function campaignRouteNodeFor(map, index = map?.currentIndex ?? 0) {
  if (!map) return null;
  const safeIndex = Math.max(0, Math.min(map.totalNodes ?? CAMPAIGN_TOTAL_NODES, Math.floor(Number(index) || 0)));
  if (safeIndex >= (map.totalNodes ?? CAMPAIGN_TOTAL_NODES)) return map.boss;
  const segment = Math.floor(safeIndex / 3) + 1;
  const position = safeIndex % 3 + 1;
  if (segment === 1 && map.firstSegmentCategoriesEnabled) {
    const encounterKey = map.selectedCategorySequences?.[segment]?.[position - 1];
    return encounterKey
      ? map.nodes.find((node) => node.segment === segment && node.position === position && node.encounterKey === encounterKey) ?? null
      : null;
  }
  const branch = map.selectedBranches[segment] ?? null;
  return branch ? map.nodes.find((node) => node.segment === segment && node.position === position && node.branch === branch) ?? null : null;
}

export function campaignRouteOptions(map) {
  if (!map || map.currentIndex >= (map.totalNodes ?? CAMPAIGN_TOTAL_NODES)) return Object.freeze([]);
  const position = map.currentIndex % 3;
  const segment = Math.floor(map.currentIndex / 3) + 1;
  if (segment === 1 && map.firstSegmentCategoriesEnabled) {
    if (position !== 0 || map.firstSegmentOffer?.selectedChoiceId) return Object.freeze([]);
    return map.firstSegmentOffer?.options ?? Object.freeze([]);
  }
  if (position !== 0 || map.selectedBranches[segment]) return Object.freeze([]);
  const candidates = map.nodes.filter((node) => node.segment === segment && node.position === 1);
  return Object.freeze(candidates.map((node) => Object.freeze({
    id: node.branch,
    segment,
    branch: node.branch,
    title: node.branch === "risk" ? `风险路线 · ${node.title}` : `常规路线 · ${node.title}`,
    preview: node.preview,
    rewardTag: node.rewardTag,
    riskSide: node.riskSide,
  })));
}

export function chooseCampaignRoute(map, branchOrChoiceId) {
  if (map?.firstSegmentCategoriesEnabled && Math.floor((map.currentIndex ?? 0) / 3) + 1 === 1) {
    if ((map.currentIndex ?? 0) !== 0 || map.firstSegmentOffer?.selectedChoiceId) return false;
    const choiceId = typeof branchOrChoiceId === "string"
      ? branchOrChoiceId
      : branchOrChoiceId?.choiceId;
    const option = map.firstSegmentOffer?.options.find((candidate) => candidate.choiceId === choiceId);
    if (!option) return false;
    const categoryNode = map.nodes.find((candidate) => candidate.categoryId === option.categoryId && candidate.position === 1);
    if (!categoryNode) return false;
    map.firstSegmentOffer.selectedChoiceId = option.choiceId;
    map.selectedCategories[1] = option.categoryId;
    map.selectedCategorySequences[1] = [...option.encounterKeys];
    map.nodeStates[categoryNode.id] = "ready";
    return true;
  }
  const branch = branchOrChoiceId;
  if (!map || !["normal", "risk"].includes(branch)) return false;
  const segment = Math.floor((map.currentIndex ?? 0) / 3) + 1;
  if ((map.currentIndex ?? 0) % 3 !== 0 || map.selectedBranches[segment]) return false;
  const node = map.nodes.find((candidate) => candidate.segment === segment && candidate.position === 1 && candidate.branch === branch);
  if (!node) return false;
  map.selectedBranches[segment] = branch;
  map.nodeStates[node.id] = "ready";
  return true;
}

export function startCampaignRouteNode(map) {
  const node = campaignRouteNodeFor(map);
  if (!node || map.nodeStates[node.id] !== "ready") return false;
  map.nodeStates[node.id] = "battle";
  return true;
}

export function completeCampaignRouteNode(map) {
  const node = campaignRouteNodeFor(map);
  if (!node || map.nodeStates[node.id] !== "battle") return false;
  map.nodeStates[node.id] = "complete";
  map.currentIndex += 1;
  const next = campaignRouteNodeFor(map);
  if (map.currentIndex < (map.totalNodes ?? CAMPAIGN_TOTAL_NODES) && map.currentIndex % 3 === 0) {
    // 段末汇合后，下一段必须再次选路；段内后续节点跟随已选分支。
    const nextSegment = Math.floor(map.currentIndex / 3) + 1;
    for (const candidate of map.nodes.filter((item) => item.segment === nextSegment && item.position === 1)) {
      map.nodeStates[candidate.id] = "locked";
    }
  } else if (map.currentIndex >= (map.totalNodes ?? CAMPAIGN_TOTAL_NODES)) {
    map.boss.state = "ready";
  } else if (next) {
    map.nodeStates[next.id] = "ready";
  }
  return true;
}

export function campaignRouteSnapshot(map) {
  if (!map) return null;
  return Object.freeze({
    version: map.version,
    totalNodes: map.totalNodes,
    seed: map.seed,
    runId: map.runId,
    currentIndex: map.currentIndex,
    selectedBranches: Object.freeze({ ...map.selectedBranches }),
    ...(map.firstSegmentCategoriesEnabled ? {
      firstSegmentCategoriesEnabled: true,
      firstSegmentOffer: map.firstSegmentOffer
      ? Object.freeze({
        ...map.firstSegmentOffer,
        options: Object.freeze(map.firstSegmentOffer.options.map((option) => Object.freeze({
          ...option,
          encounterKeys: Object.freeze([...option.encounterKeys]),
        }))),
      })
      : null,
      selectedCategories: Object.freeze({ ...(map.selectedCategories ?? {}) }),
      selectedCategorySequences: Object.freeze(Object.fromEntries(
      Object.entries(map.selectedCategorySequences ?? {}).map(([segment, keys]) => [segment, Object.freeze([...keys])]),
      )),
    } : {}),
    nodeStates: Object.freeze({ ...map.nodeStates }),
    nodes: Object.freeze(map.nodes.map((node) => Object.freeze({ ...node, state: map.nodeStates[node.id] ?? node.state }))),
    branches: Object.freeze(map.branches.map((branch) => Object.freeze({ ...branch }))),
    boss: Object.freeze({ ...map.boss }),
  });
}

// 无尽模式的地图只承诺玩家已经进入的战线：当前区显示两面旗帜的六个
// 子波节点，下一航区只显示“待探索”。它是可视化进度合同，不替代无尽导演
// 的旗帜、子波和卡牌规则。
export const ENDLESS_ROUTE_VERSION = "endless-route-v5";
export const ENDLESS_VISIBLE_NODES = 6;
const ENDLESS_NODE_THEMES = Object.freeze([
  Object.freeze({ title: "前锋接敌", detail: "读懂第一侧压力" }),
  Object.freeze({ title: "交叉火线", detail: "左右错峰换区" }),
  Object.freeze({ title: "压力收束", detail: "为下一旗留能量" }),
  Object.freeze({ title: "护航编队", detail: "先拆支援再追击" }),
  Object.freeze({ title: "双翼增援", detail: "接管近核目标" }),
  Object.freeze({ title: "战线终点", detail: "整备后进入下一线" }),
]);

function endlessRouteNodeId(zone, index, runId = null) {
  const base = `endless:zone-${zone}:node-${index}`;
  return runId ? `${base}:run-${runId}` : base;
}

export function createEndlessRouteMap({ seed = 1, runId = null, zone = 1 } = {}) {
  const safeZone = Math.max(1, Math.floor(Number(zone) || 1));
  const safeRunId = runId === null || runId === undefined || runId === ""
    ? null
    : String(runId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const nodes = ENDLESS_NODE_THEMES.map((theme, index) => {
    const position = index % 3 + 1;
    const flag = Math.floor(index / 3) + 1;
    return Object.freeze({
      id: endlessRouteNodeId(safeZone, index + 1, safeRunId),
      baseId: endlessRouteNodeId(safeZone, index + 1),
      zone: safeZone,
      index: index + 1,
      flag,
      subwave: position,
      title: theme.title,
      detail: theme.detail,
      state: index === 0 ? "ready" : "locked",
    });
  });
  return {
    version: ENDLESS_ROUTE_VERSION,
    seed: safeSeed(seed),
    runId: safeRunId,
    zone: safeZone,
    currentIndex: 0,
    currentFlag: 0,
    currentSubwave: -1,
    phase: "entering",
    nodeStates: Object.fromEntries(nodes.map((node) => [node.id, node.state])),
    nodes,
    zones: [
      Object.freeze({ index: safeZone, state: "current", label: `第 ${safeZone} 航区 · 当前区` }),
      Object.freeze({ index: safeZone + 1, state: "unknown", label: `第 ${safeZone + 1} 航区 · 待探索` }),
    ],
  };
}

export function syncEndlessRouteProgress(map, { flag = 0, subwave = -1, phase = "entering" } = {}) {
  if (!map) return false;
  const safeFlag = Math.max(0, Math.min(2, Math.floor(Number(flag) || 0)));
  const safeSubwave = Math.max(-1, Math.min(3, Math.floor(Number(subwave) || -1)));
  const normalizedPhase = String(phase || "entering");
  const completedCount = ["flag-transition", "cleared", "boss"].includes(normalizedPhase)
    ? Math.min(ENDLESS_VISIBLE_NODES, safeFlag * 3)
    : Math.min(ENDLESS_VISIBLE_NODES, Math.max(0, (safeFlag - 1) * 3 + Math.max(0, safeSubwave)));
  map.currentFlag = safeFlag;
  map.currentSubwave = safeSubwave;
  map.currentIndex = completedCount;
  map.phase = normalizedPhase;
  map.nodes.forEach((node, index) => {
    const state = index < completedCount ? "complete"
      : index === completedCount && safeFlag > 0 && normalizedPhase === "fighting" ? "battle"
        : index === completedCount ? "ready" : "locked";
    map.nodeStates[node.id] = state;
  });
  return true;
}

export function endlessRouteSnapshot(map) {
  if (!map) return null;
  return Object.freeze({
    version: map.version,
    seed: map.seed,
    runId: map.runId,
    zone: map.zone,
    currentIndex: map.currentIndex,
    currentFlag: map.currentFlag,
    currentSubwave: map.currentSubwave,
    phase: map.phase,
    nodeStates: Object.freeze({ ...map.nodeStates }),
    nodes: Object.freeze(map.nodes.map((node) => Object.freeze({ ...node, state: map.nodeStates[node.id] ?? node.state }))),
    zones: Object.freeze(map.zones.map((zone) => Object.freeze({ ...zone }))),
  });
}

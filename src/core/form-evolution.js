import { applyBuildCard, cardFor, createBuildState } from './build-system.js';

export const FORM_EVOLUTION_VERSION = 'form-evolution-v2';
export const FORM_EVOLUTION_STORAGE = 'battle-ship-form-evolution-v2-records';
export const FORM_EVOLUTION_ROUTES = Object.freeze(['crit', 'missile', 'swarm']);
export const FORM_EVOLUTION_MAX_CHOICES = 5;

const ROUTE_LABELS = Object.freeze({ crit: '机枪', missile: '导弹', swarm: '僚机' });
const ROUTE_ICONS = Object.freeze({ crit: 'machinegun', missile: 'missile', swarm: 'drones' });
const TRACKS = Object.freeze({
  crit: Object.freeze([
    ['双炮闩', '获得原机枪 L2 结构；双管交替持续压制', '机枪 L2 · 弱点压制可用'],
    ['裂甲处决', '获得原机枪 L3 结构；暴露目标进入处决线', '机枪 L3 · 处决与追射可用'],
    ['追击弹链', '每轮机枪射击追加 1 发追击弹', '追加追击弹 ×1 · 每发 25%'],
    ['疾速循环', '机枪基础射击频率提高 20%', '机枪循环 ×1.20'],
    ['双重追击', '每轮追加追击弹由 1 发提升至 2 发', '追加追击弹 ×2 · 每发 25%'],
  ]),
  missile: Object.freeze([
    ['高爆弹仓', '获得原导弹 L2 结构；保留有效多目标分配', '导弹 L2 · 高爆与分配可用'],
    ['集束终爆', '获得原导弹 L3 结构；主弹展开集束追击', '导弹 L3 · 集束追击可用'],
    ['扩容齐射', '每轮主导弹由 5 枚提升至 7 枚', '主导弹 ×7'],
    ['爆心扩张', '爆心半径提高 20%，原伤害与分配保留', '爆心范围 ×1.20'],
    ['饱和弹巢', '每轮主导弹由 7 枚提升至 9 枚', '主导弹 ×9'],
  ]),
  swarm: Object.freeze([
    ['护航分工', '获得原僚机 L2 结构；一架随舰、一架支援', '僚机 L2 · 护航与拦截可用'],
    ['蜂群汇聚', '获得原僚机 L3 结构；救场与过载汇聚可用', '僚机 L3 · 汇聚可用'],
    ['三机编队', '常驻僚机由 2 架提升至 3 架', '常驻僚机 ×3'],
    ['编队疾速', '僚机基础射击频率提高 20%', '僚机循环 ×1.20'],
    ['四机编队', '常驻僚机由 3 架提升至 4 架', '常驻僚机 ×4'],
  ]),
});

export function formEvolutionEnabled({ gameplay, profile, mode } = {}) {
  return gameplay === FORM_EVOLUTION_VERSION && profile === 'ui-v43' && mode === 'endless';
}

export function createFormEvolutionState({ runId, seed = 1, ship = 'standard', qa = false, wallNow = Date.now() } = {}) {
  return {
    version: FORM_EVOLUTION_VERSION,
    runId: runId ?? `${wallNow}-${seed >>> 0}`,
    seed: seed >>> 0,
    ship,
    choiceCount: 0,
    choiceRanks: { crit: 0, missile: 0, swarm: 0 },
    choiceHistory: [],
    form: 'standard',
    ultimateAt: null,
    transformStartedAt: null,
    events: [],
    qa: Boolean(qa),
    startedWall: wallNow,
    ended: false,
  };
}

export function formEvolutionStartBuild() {
  const build = createBuildState();
  for (const route of FORM_EVOLUTION_ROUTES) applyBuildCard(build, cardFor(route, 1));
  return build;
}

function routeRank(state, route) {
  return Math.max(0, Math.min(FORM_EVOLUTION_MAX_CHOICES, Math.round(Number(state?.choiceRanks?.[route]) || 0)));
}

export function formEvolutionOptions(state) {
  if (!state || state.form !== 'standard' || state.choiceCount >= FORM_EVOLUTION_MAX_CHOICES) return [];
  return FORM_EVOLUTION_ROUTES.map((route) => {
    const level = routeRank(state, route) + 1;
    const [name, detail, stat] = TRACKS[route][level - 1];
    return {
      id: `form-${route}-${level}`,
      formEvolution: true,
      route,
      evolutionLevel: level,
      tier: Math.min(3, level),
      name: `第 ${level}/5 · ${name}`,
      behavior: name,
      shortDetail: detail,
      detail,
      stat,
      icon: ROUTE_ICONS[route],
      category: `${ROUTE_LABELS[route]}强化`,
    };
  });
}

export function formEvolutionApplyChoice(state, id, now = 0) {
  const option = formEvolutionOptions(state).find((candidate) => candidate.id === id);
  if (!option || state.choiceHistory.some((choice) => choice.id === id)) return false;
  state.choiceRanks[option.route] += 1;
  state.choiceCount += 1;
  state.choiceHistory.push({ id: option.id, route: option.route, level: option.evolutionLevel, at: now });
  state.events.push({ type: 'choice', at: now, ...option });
  return true;
}

export function formEvolutionUnlockUltimate(state, now = 0) {
  if (!state || state.form !== 'standard' || state.choiceCount !== FORM_EVOLUTION_MAX_CHOICES) return false;
  state.form = 'ultimate';
  state.ultimateAt = now;
  state.transformStartedAt = now;
  state.events.push({ type: 'ultimate-unlock', at: now, form: 'ultimate' });
  return true;
}

export function formEvolutionBuild(state) {
  const build = formEvolutionStartBuild();
  const ultimate = state?.form === 'ultimate';
  for (const route of FORM_EVOLUTION_ROUTES) {
    const levels = ultimate ? 3 : Math.min(3, 1 + routeRank(state, route));
    for (let level = 2; level <= levels; level += 1) applyBuildCard(build, cardFor(route, level));
  }
  const ranks = state?.choiceRanks ?? {};
  const critRank = routeRank(state, 'crit');
  const missileRank = routeRank(state, 'missile');
  const swarmRank = routeRank(state, 'swarm');
  build.formEvolution = true;
  build.formEvolutionForm = state?.form ?? 'standard';
  build.formEvolutionChoiceCount = state?.choiceCount ?? 0;
  build.formCritExtraShots = critRank >= 5 ? 2 : critRank >= 3 ? 1 : 0;
  build.formCritAttackSpeedMultiplier = critRank >= 4 ? 1.2 : 1;
  build.missileCount = missileRank >= 5 ? 9 : missileRank >= 3 ? 7 : build.missileCount;
  build.blastRadiusMultiplier = missileRank >= 4 ? 1.2 : build.blastRadiusMultiplier;
  build.drones = swarmRank >= 5 ? 4 : swarmRank >= 3 ? 3 : build.drones;
  build.droneAttackSpeedMultiplier = swarmRank >= 4 ? 1.2 : build.droneAttackSpeedMultiplier;
  build.formUltimate = ultimate;
  build.formUltimateFullFleetInterval = ultimate ? 10000 : 13000;
  return build;
}

export function formEvolutionSnapshot(state) {
  return state ? {
    version: state.version,
    runId: state.runId,
    seed: state.seed,
    ship: state.ship,
    choiceCount: state.choiceCount,
    choiceRanks: { ...state.choiceRanks },
    choiceHistory: state.choiceHistory.map((choice) => ({ ...choice })),
    form: state.form,
    ultimateAt: state.ultimateAt,
    transformStartedAt: state.transformStartedAt,
    qa: state.qa,
  } : null;
}

export function formEvolutionRecordFrom(state, { combatMs = 0, wallMs = 0, reason = 'return', coreHealth = 100, kills = 0, assistMs = 0 } = {}) {
  return {
    ...formEvolutionSnapshot(state),
    combatMs,
    wallMs,
    reason,
    coreHealth,
    kills,
    assistMs,
    advertising: 'none',
    outsideStats: 'baseline',
    events: state?.events?.map((event) => ({ ...event })) ?? [],
  };
}

export { ROUTE_LABELS, TRACKS };

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SoloCombat } from "../src/core/solo-combat.js";
import { CAMPAIGN } from "../src/core/stage-director.js";
import { SoloSession } from "../src/state/solo-session.js";
import { chooseFlight, seededRandom } from "./helpers/solo-pilot.mjs";

const manifest = JSON.parse(readFileSync(new URL("../public/assets/manifest.json", import.meta.url), "utf8"));
const RUNS = 20;
const LIMIT = 0.15;
const BOSS_ORDER = CAMPAIGN.map(({ boss }) => boss);
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const round = (value) => Number(value.toFixed(2));

function simulate(fighterId, seed, { withBuild, stopSteeringAt = Infinity }) {
  const s = new SoloSession(fighterId, seededRandom(seed + 9));
  const combat = new SoloCombat(s, manifest, seededRandom(seed));
  const pick = seededRandom(seed + 178);
  const offset = seededRandom(seed + 312)() * 2.2;
  const clears = [];
  const sectors = CAMPAIGN.map(() => ({ minHullRatio: 1, hits: 0, alarms: 0 }));
  let frame = 0;
  let firstLevelAt;
  while (s.elapsedMs < 230000 && s.phase !== "defeat" && s.phase !== "victory") {
    if (s.phase === "upgrade") {
      if (s.level === 2) firstLevelAt ??= s.elapsedMs / 1000;
      if (withBuild) s.chooseUpgrade(s.cards[Math.floor(pick() * s.cards.length)].id);
      else s.finishUpgrade();
    }
    if (s.stage < stopSteeringAt && frame++ % 7 === 0) {
      const wingOrCore = combat.boss?.parts.find((part) => part.hp > 0)?.id ?? "core";
      const { x, y } = chooseFlight(combat, offset, wingOrCore);
      s.setTarget(x, y);
    }
    const sector = sectors[s.stage - 1];
    if (s.energy >= 100 && (!combat.boss || !combat.bossShielded)) combat.triggerOverload();
    combat.advance(1000 / 60);
    sector.minHullRatio = Math.min(sector.minHullRatio, s.hp / s.maxHp);
    for (const event of combat.events) {
      if (event.type === "sector-clear") clears.push(event);
      if (event.type === "hurt") sector.hits++;
      if (event.type === "breach-alarm") sector.alarms++;
    }
    combat.events.length = 0;
  }
  return { outcome: s.phase, firstLevelAt, clears, sectors, seconds: s.elapsedMs / 1000, breaches: s.breaches };
}

for (const [scenario, withBuild] of [["裸机", false], ["随机三选一", true]]) {
  test(`9 机三星域威胁回归 · ${scenario}，每架 ${RUNS} 局`, () => {
    const stats = manifest.fighters.map(({ id }) => {
      const runs = Array.from({ length: RUNS }, (_, i) => simulate(id, 42 + i * 92821, { withBuild }));
      const wins = runs.filter((run) => run.outcome === "victory");
      for (const { clears } of wins) {
        assert.deepEqual(clears.map(({ id }) => id), BOSS_ORDER, `${id} 三关 Boss 次序`);
      }
      const firstLevels = runs.flatMap(({ firstLevelAt }) => firstLevelAt === undefined ? [] : [firstLevelAt]);
      return {
        id, wins: wins.length, firstLevels,
        seconds: average(wins.map((run) => run.seconds)),
        survival: wins.length / RUNS,
        breaches: average(runs.map(({ breaches }) => breaches)),
        danger: runs.filter(({ sectors, outcome }) => outcome === "defeat" ||
          sectors.some(({ minHullRatio, alarms }) => minHullRatio <= 0.6 || alarms > 0)).length,
        lateHits: [1, 2].map((index) => wins.filter(({ sectors }) => sectors[index].hits > 0).length),
        sectorSeconds: BOSS_ORDER.map((_, i) => average(wins.map(({ clears }) => clears[i].durationMs / 1000))),
      };
    });
    const meanTime = average(stats.map(({ seconds }) => seconds));
    const meanSurvival = average(stats.map(({ survival }) => survival));
    const deviation = (value, mean) => (value - mean) / mean;
    console.table(stats.map((row) => ({
      战机: row.id,
      通关: `${row.wins}/${RUNS}`,
      首升最慢秒数: round(Math.max(...row.firstLevels)),
      三关各自均时: row.sectorSeconds.map(round).join(" / "),
      全程耗时偏差百分比: round(100 * deviation(row.seconds, meanTime)),
      场均漏怪: round(row.breaches),
      低血量或警报等险情局数: row.danger,
      后两关挨打的通关局数: row.lateHits.join(" / "),
    })));
    const [minTime, maxTime] = withBuild ? [55, 68] : [60, 80];
    for (const row of stats) {
      assert(row.survival >= (withBuild ? 0.85 : 0.25), `${row.id} 只通关 ${row.wins}/${RUNS}`);
      assert(row.firstLevels.length >= row.wins && row.firstLevels.every((seconds) => seconds >= 7 && seconds <= 9),
        `${row.id} 首升时间 ${row.firstLevels.map(round).join(" / ")}s 超出 7–9 秒`);
      for (const [index, seconds] of row.sectorSeconds.entries()) {
        assert(seconds >= minTime && seconds <= maxTime,
          `${row.id} 第 ${index + 1} 关均时 ${seconds.toFixed(1)}s 偏离 ${minTime}–${maxTime} 秒`);
      }
      assert(row.sectorSeconds[2] > row.sectorSeconds[1], `${row.id} 第三关均时应长于第二关`);
      assert(Math.abs(deviation(row.seconds, meanTime)) <= LIMIT, `${row.id} 通关耗时超出 ±15%`);
      if (withBuild) assert(Math.abs(deviation(row.survival, meanSurvival)) <= LIMIT, `${row.id} 强化组存活率超出 ±15%`);
    }

    const totalRuns = RUNS * stats.length;
    if (!withBuild) {
      const dangerRuns = stats.reduce((sum, row) => sum + row.danger, 0);
      assert(dangerRuns >= totalRuns / 3, `裸机低血线、反扑或坠毁的局数过少 ${dangerRuns}/${totalRuns}`);
      assert(meanSurvival < 1, "裸机组应出现实际坠毁");
    }
  });
}

test("相同种子与选卡策略下，走位能抵消三个星域的实际生存压力", () => {
  const fighter = "02_jifeng";
  const active = simulate(fighter, 42, { withBuild: true });
  assert.equal(active.outcome, "victory");
  assert.deepEqual(active.clears.map(({ id }) => id), BOSS_ORDER);

  const openingIdle = simulate(fighter, 42, { withBuild: true, stopSteeringAt: 1 });
  assert.equal(openingIdle.outcome, "defeat");
  assert(openingIdle.sectors[0].hits > 0 && openingIdle.sectors[0].alarms > 0);

  for (const stage of [2, 3]) {
    const idle = simulate(fighter, 42, { withBuild: true, stopSteeringAt: stage });
    assert.deepEqual(idle.clears.slice(0, stage - 1), active.clears.slice(0, stage - 1));
    const moving = active.sectors[stage - 1];
    const exposed = idle.sectors[stage - 1];
    assert(exposed.hits > moving.hits, `第 ${stage} 关停止走位应受到更多攻击`);
    assert(exposed.minHullRatio <= 0.6 && moving.minHullRatio - exposed.minHullRatio >= 0.3,
      `第 ${stage} 关走位应避免明显的舰体损失`);
    if (stage === 2) assert.equal(idle.outcome, "defeat");
  }
});

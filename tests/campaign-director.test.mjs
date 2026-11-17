import test from "node:test";
import assert from "node:assert/strict";
import { campaignEncounterCatalog, campaignEncounterFor } from "../src/core/campaign-director.js";

test("战役 18 节点目录完整且可生成节点遭遇", () => {
  const catalog = campaignEncounterCatalog();
  assert.equal(catalog.length, 18);

  const first = campaignEncounterFor({ segment: 1, branch: "normal", position: 1, seed: 12 });
  assert.ok(first.title);
  assert.ok(first.rewardTag);
  assert.ok(first.pressureProfile.groups.length > 0);
});

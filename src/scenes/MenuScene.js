import Phaser from "phaser";
import { bgm } from "../audio/bgm-synth.js";
import { sfx } from "../audio/sfx-synth.js";
import { EnvironmentView } from "../presentation/environment-view.js";
import { FIGHTERS, OVERLOADS } from "../core/fighter-catalog.js";
import { PILOT_LORE } from "../core/pilot-lore.js";
import { ACHIEVEMENTS, loadAchievements } from "../state/achievements.js";
import { loadRecords } from "../state/records.js";
import { getActionIconSvg } from "../ui/pixel-icons.js";

function fighterMetrics(fighterId) {
  const f = FIGHTERS[fighterId];
  const power = Math.min(100, Math.round((f.damage * f.barrels.length) / 0.72));
  const rof = Math.min(100, Math.round((390 - f.interval) / 2.6));
  const hp = Math.min(100, Math.round((f.hp - 85) * 3.1));
  return { power: Math.max(32, power), rof: Math.max(28, rof), hp: Math.max(36, hp) };
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    this.environment = new EnvironmentView(this);
    this.flight = { ship: { x: 360, y: 640, vx: 0 }, overload: false, warpDashMs: 0, stage: 1 };
    const { fighters } = this.registry.get("solo-assets");
    const records = loadRecords();
    const unlocked = loadAchievements();
    const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(unlocked[a.id])).length;
    const initialMode = this.registry.get("game-mode") ?? "campaign";
    const initialDiff = this.registry.get("game-difficulty") ?? "standard";
    const overlay = document.querySelector("#solo-ui");

    overlay.innerHTML = `
      <section class="solo-menu" aria-label="选择出击战机">
        <header class="solo-brand">
          <div class="solo-brand-top">
            <span class="solo-wordmark">STARLANCE // 32-BIT ARCADE</span>
            <div class="solo-brand-actions">
              <button class="solo-medals-btn" type="button">${getActionIconSvg("trophy")}<span>勋章 ${unlockedCount}/${ACHIEVEMENTS.length}</span></button>
              <button class="solo-sound solo-menu-sound" type="button"></button>
            </div>
          </div>
          <h1>星穹矢刃</h1>
          <div class="solo-mode-bar" role="group" aria-label="模式与难度">
            <div class="solo-seg">
              <button type="button" data-mode="campaign" aria-pressed="${initialMode === "campaign"}">常规战役</button>
              <button type="button" data-mode="endless" aria-pressed="${initialMode === "endless"}">无尽模式</button>
            </div>
            <div class="solo-seg">
              <button type="button" data-diff="standard" aria-pressed="${initialDiff === "standard"}">标准</button>
              <button type="button" data-diff="hardcore" aria-pressed="${initialDiff === "hardcore"}">硬核</button>
            </div>
          </div>
        </header>

        <div class="solo-preview" aria-hidden="true">
          <div class="solo-preview-stage">
            <span class="solo-preview-glow"></span>
            <span class="solo-ring solo-ring-outer"></span>
            <span class="solo-ring solo-ring-inner"></span>
            <span class="solo-reticle"></span>
            <img class="solo-preview-ship" alt="" draggable="false">
          </div>
        </div>

        <div class="solo-pilot-card">
          <div class="solo-pilot-frame">
            <img class="solo-pilot-img" alt="" draggable="false">
          </div>
          <div class="solo-pilot-info">
            <div class="solo-caption-top">
              <div>
                <span class="solo-callsign"></span>
                <strong></strong>
              </div>
              <span class="solo-overload-tag"></span>
            </div>
            <p class="solo-pilot-bio"></p>
            <div class="solo-stat-row">
              <label>火力 <i data-stat="pwr"></i></label>
              <label>射速 <i data-stat="rof"></i></label>
              <label>耐久 <i data-stat="hp"></i></label>
            </div>
          </div>
        </div>

        <div class="solo-fighter-grid" role="group" aria-label="战机">
          ${fighters.map((fighter) => {
            const hex = "#" + FIGHTERS[fighter.id].color.toString(16).padStart(6, "0");
            const rec = records[fighter.id];
            const badge = rec?.bestRank ? `<em class="solo-tile-rank rank-${rec.bestRank}">${rec.bestRank}</em>` : "";
            return `
            <button type="button" data-fighter="${fighter.id}" style="--tile-accent: ${hex}" aria-pressed="false">
              <img src="${import.meta.env.BASE_URL + fighter.path}" alt="" draggable="false">
              <span>${fighter.cnName}</span>
              ${badge}
            </button>`;
          }).join("")}
        </div>

        <button class="solo-primary solo-launch" type="button">
          <span>全军出击 · ENGAGE</span>
          <span class="solo-launch-arrow" aria-hidden="true">▶</span>
        </button>
      </section>
      <div class="solo-dialog-wrap" hidden></div>`;

    const menu = overlay.firstElementChild;
    const medalWrap = overlay.querySelector(".solo-dialog-wrap");
    const previewShip = menu.querySelector(".solo-preview-ship");
    const pilotImg = menu.querySelector(".solo-pilot-img");
    const callsign = menu.querySelector(".solo-callsign");
    const pilotName = menu.querySelector(".solo-pilot-info strong");
    const pilotBio = menu.querySelector(".solo-pilot-bio");
    const overloadTag = menu.querySelector(".solo-overload-tag");
    const statPwr = menu.querySelector('[data-stat="pwr"]');
    const statRof = menu.querySelector('[data-stat="rof"]');
    const statHp = menu.querySelector('[data-stat="hp"]');
    const buttons = [...menu.querySelectorAll("[data-fighter]")];

    const select = (fighter) => {
      const hex = "#" + FIGHTERS[fighter.id].color.toString(16).padStart(6, "0");
      const lore = PILOT_LORE[fighter.id];
      const rec = records[fighter.id];
      menu.style.setProperty("--accent", hex);
      this.registry.set("fighter-id", fighter.id);
      previewShip.classList.remove("switch-pop");
      void previewShip.offsetWidth;
      previewShip.src = import.meta.env.BASE_URL + fighter.path;
      previewShip.classList.add("switch-pop");
      pilotImg.src = import.meta.env.BASE_URL + `assets/pilots/${fighter.id}.png`;
      callsign.textContent = `${lore.callsign} · ${lore.pilot}（${lore.unit}）`;
      pilotName.textContent = `${fighter.cnName} · ${fighter.role}`;
      const endlessStr = rec?.bestEndlessStage ? ` · 无尽S${rec.bestEndlessStage}` : "";
      pilotBio.textContent = rec?.bestScore
        ? `${lore.bio} [最高 ${rec.bestScore.toLocaleString()} · ${rec.clears}胜${endlessStr}]`
        : lore.bio;
      overloadTag.textContent = "超载 · " + OVERLOADS[fighter.id].name;
      const metrics = fighterMetrics(fighter.id);
      statPwr.style.setProperty("--val", `${metrics.power}%`);
      statRof.style.setProperty("--val", `${metrics.rof}%`);
      statHp.style.setProperty("--val", `${metrics.hp}%`);
      for (const button of buttons) {
        button.setAttribute("aria-pressed", String(button.dataset.fighter === fighter.id));
      }
    };

    for (const [index, button] of buttons.entries()) {
      button.addEventListener("click", () => {
        sfx.unlock();
        bgm.setMode("hangar");
        select(fighters[index]);
      });
    }

    for (const btn of menu.querySelectorAll("[data-mode]")) {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        this.registry.set("game-mode", mode);
        for (const b of menu.querySelectorAll("[data-mode]")) {
          b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
        }
      });
    }

    for (const btn of menu.querySelectorAll("[data-diff]")) {
      btn.addEventListener("click", () => {
        const diff = btn.dataset.diff;
        this.registry.set("game-difficulty", diff);
        for (const b of menu.querySelectorAll("[data-diff]")) {
          b.setAttribute("aria-pressed", String(b.dataset.diff === diff));
        }
      });
    }

    const openMedals = () => {
      const latest = loadAchievements();
      const totalUnlocked = ACHIEVEMENTS.filter((a) => Boolean(latest[a.id])).length;
      const bestEndless = Math.max(0, ...Object.values(records).map((r) => r.bestEndlessStage ?? 0));
      const totalClears = Object.values(records).reduce((sum, r) => sum + (r.clears ?? 0), 0);
      medalWrap.hidden = false;
      medalWrap.innerHTML = `
        <section class="solo-dialog" data-kind="medals" role="dialog" aria-modal="true" aria-labelledby="solo-medal-title" tabindex="-1">
          <header class="solo-dialog-bar">
            <span class="solo-bar-code"><i class="solo-led on" aria-hidden="true"></i>HALL OF HONOR // ${totalUnlocked}/${ACHIEVEMENTS.length}</span>
            <span class="solo-bar-meta">${bestEndless ? `无尽最高 S${bestEndless}` : "无尽未出击"}</span>
          </header>
          <div class="solo-medal-summary">
            <h2 id="solo-medal-title">战功勋章殿堂</h2>
            <span>总计通关 ${totalClears} 次</span>
          </div>
          <div class="solo-medal-grid">
            ${ACHIEVEMENTS.map((ach) => {
              const ok = Boolean(latest[ach.id]);
              return `
              <div class="solo-medal-card" data-unlocked="${ok}" data-tier="${ach.tier}">
                <span class="solo-medal-icon">${getActionIconSvg(ok ? "trophy" : "lock")}</span>
                <div>
                  <strong>${ach.title}</strong>
                  <small>${ach.desc}</small>
                </div>
              </div>`;
            }).join("")}
          </div>
          <div class="solo-dialog-actions">
            <button class="solo-secondary solo-arcade-btn" type="button" data-close-medals>
              <span class="solo-btn-icon">${getActionIconSvg("hangar")}</span>
              <span class="solo-btn-label">返回机库整备</span>
            </button>
          </div>
        </section>`;
      medalWrap.querySelector("[data-close-medals]")?.addEventListener("click", () => {
        medalWrap.hidden = true;
        medalWrap.replaceChildren();
      });
    };
    menu.querySelector(".solo-medals-btn")?.addEventListener("click", openMedals);

    const sound = menu.querySelector(".solo-sound");
    const syncSound = () => {
      sound.textContent = sfx.muted ? "静音" : "音效";
      sound.setAttribute("aria-label", sfx.muted ? "开启音效" : "静音");
      sound.setAttribute("aria-pressed", String(sfx.muted));
    };
    syncSound();
    sound.addEventListener("click", () => {
      sfx.toggleMute();
      syncSound();
    });
    menu.querySelector(".solo-launch").addEventListener("click", () => {
      sfx.unlock();
      this.scene.start("BattleScene");
    });
    select(fighters.find((fighter) => fighter.id === this.registry.get("fighter-id")));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => overlay.replaceChildren());
  }

  update(_time, delta) {
    this.environment.render(this.flight, Math.min(delta, 50));
  }
}

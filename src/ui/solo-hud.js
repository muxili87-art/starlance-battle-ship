import { WAVE_COUNT } from "../core/stage-director.js";
import { PILOT_LORE } from "../core/pilot-lore.js";
import { SECONDARIES } from "../core/upgrade-cards.js";
import { computeRunRank, recordRunResult } from "../state/records.js";
import { getActionIconSvg, getUpgradeIconSvg } from "./pixel-icons.js";

const SEC_LABELS = Object.fromEntries(SECONDARIES.map((s) => [s.id, s.label.slice(0, 2)]));
const HP_SEGS = 12;

export class SoloHud {
  constructor({ onOverload, onPause, onUpgrade, onRetry, onMenu, onMute, isMuted }) {
    this.root = document.querySelector("#solo-ui");
    this.root.innerHTML = `
      <section class="solo-flight" aria-label="战斗状态">
        <header class="solo-telemetry">
          <div class="solo-meters-col">
            <div class="solo-hp-row">
              <span class="solo-tag">HP</span>
              <div class="solo-hp-segs" aria-hidden="true">${Array.from({ length: HP_SEGS }, () => "<i></i>").join("")}</div>
              <b class="solo-hp-num" data-hp-label></b>
            </div>
            <div class="solo-sub-bars">
              <div class="solo-meter solo-shield"><i></i></div>
              <div class="solo-meter solo-xp"><i></i></div>
              <span class="solo-lv-tag" data-xp-label></span>
            </div>
          </div>

          <div class="solo-stage">
            <span data-wave></span>
            <b data-time></b>
          </div>

          <div class="solo-right-col">
            <div class="solo-score-row">
              <span class="solo-score" data-score>00,000,000</span>
              <button type="button" class="solo-sound solo-battle-sound" aria-label="静音"></button>
              <button type="button" class="solo-pause" aria-label="暂停">Ⅱ</button>
            </div>
            <div class="solo-combo" data-combo hidden></div>
          </div>
        </header>

        <div class="solo-status-strip">
          <div class="solo-breach" hidden aria-label="防线警戒">
            <span>防线</span>
            <div class="solo-breach-pips" aria-hidden="true">${Array.from({ length: 5 }, () => "<i></i>").join("")}</div>
          </div>
          <span class="solo-mutator" hidden></span>
          <span class="solo-fever-tag" hidden>FEVER ×1.25</span>
        </div>

        <div class="solo-boss-status" hidden aria-label="首领部位状态">
          ${[["left", "左翼炮"], ["core", "中央核心"], ["right", "右翼炮"]].map(([id, label]) =>
            `<div data-part="${id}"><span>${label}</span><div><i></i></div></div>`).join("")}
        </div>

        <div class="solo-announcement" role="status"></div>
        <div class="solo-ach-toast" hidden role="status" aria-live="polite"></div>
        <div class="solo-boss-alert" role="status" hidden>护盾展开 · 狂暴系统启动</div>
        <div class="solo-beam-warning" role="status" hidden>高能激光锁定 · 横向闪避</div>

        <div class="solo-loadout" aria-label="当前构筑"></div>

        <div class="solo-bottom-dock">
          <button type="button" class="solo-overload" disabled>
            <span class="solo-od-ring"></span>
            <span class="solo-od-core">
              <strong>OVERDRIVE</strong>
              <b>0%</b>
            </span>
          </button>

          <aside class="solo-comms" hidden aria-live="polite">
            <img class="solo-comms-img" alt="" draggable="false">
            <div class="solo-comms-body">
              <em class="solo-comms-speaker"></em>
              <p class="solo-comms-line"></p>
            </div>
          </aside>
        </div>
      </section>
      <div class="solo-dialog-wrap" hidden></div>`;

    this.flight = this.root.querySelector(".solo-flight");
    this.dialog = this.root.querySelector(".solo-dialog-wrap");
    this.notice = this.root.querySelector(".solo-announcement");
    this.achToast = this.root.querySelector(".solo-ach-toast");
    this.breachBox = this.root.querySelector(".solo-breach");
    this.breachPips = [...this.root.querySelectorAll(".solo-breach-pips i")];
    this.mutatorTag = this.root.querySelector(".solo-mutator");
    this.feverTag = this.root.querySelector(".solo-fever-tag");
    this.bossRow = this.root.querySelector(".solo-boss-status");
    this.alert = this.root.querySelector(".solo-boss-alert");
    this.beamWarning = this.root.querySelector(".solo-beam-warning");
    this.combo = this.root.querySelector("[data-combo]");
    this.overload = this.root.querySelector(".solo-overload");
    this.loadout = this.root.querySelector(".solo-loadout");
    this.hpSegs = [...this.root.querySelectorAll(".solo-hp-segs i")];
    this.comms = this.root.querySelector(".solo-comms");
    this.commsImg = this.root.querySelector(".solo-comms-img");
    this.commsSpeaker = this.root.querySelector(".solo-comms-speaker");
    this.commsLine = this.root.querySelector(".solo-comms-line");
    this.pause = this.root.querySelector(".solo-pause");
    this.sound = this.root.querySelector(".solo-sound");
    this.overload.addEventListener("click", onOverload);
    this.pause.addEventListener("click", onPause);
    this.sound.addEventListener("click", () => this.#toggleMute());
    this.actions = { onPause, onUpgrade, onRetry, onMenu, onMute, isMuted };
    this.lastValues = {};
    this.commsShown = new Set();
    this.onKeyDown = (event) => {
      if (this.dialog.hidden) return;
      if (this.lastValues.phase === "upgrade" && ["1", "2", "3"].includes(event.key)) {
        const buttons = this.dialog.querySelectorAll("[data-upgrade]");
        const target = buttons[Number(event.key) - 1];
        if (target) {
          event.preventDefault();
          target.click();
        }
      } else if (this.lastValues.phase === "paused" && event.key === "Escape") {
        event.preventDefault();
        this.actions.onPause();
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
    this.#syncSound();
  }

  render(combat, revealResult = true) {
    const s = combat.session;
    const active = s.phase === "playing";
    const waveLabel = s.mode === "endless"
      ? (combat.boss ? `L${s.loop}·BOSS` : `L${s.loop}·S${s.stage}·W${s.wave}`)
      : (combat.boss ? "BOSS" : `S${s.stage}·W${s.wave}`);
    this.#text("[data-wave]", waveLabel);
    const seconds = Math.floor(s.elapsedMs / 1000);
    this.#text("[data-time]", `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`);
    this.#text("[data-hp-label]", `${Math.ceil(s.hp)}/${s.maxHp}`);
    this.#text("[data-xp-label]", `LV.${s.level}`);

    const hpRatio = s.maxHp > 0 ? s.hp / s.maxHp : 0;
    const lit = Math.ceil(hpRatio * HP_SEGS);
    if (this.lastValues.lit !== lit) {
      this.hpSegs.forEach((seg, idx) => seg.classList.toggle("on", idx < lit));
      this.lastValues.lit = lit;
    }

    this.#fill(".solo-shield i", s.guard ? 1 : Math.min(1, s.shield / 35));
    this.#fill(".solo-xp i", s.xp / s.xpNeeded);

    const breach = s.breachMeter ?? 0;
    this.breachBox.hidden = breach <= 0;
    if (this.lastValues.breach !== breach) {
      this.breachPips.forEach((pip, idx) => pip.classList.toggle("on", idx < breach));
      this.lastValues.breach = breach;
    }
    this.mutatorTag.hidden = !s.mutator;
    if (s.mutator) this.#text(".solo-mutator", `词缀 · ${s.mutator.label}`);
    this.feverTag.hidden = !(s.feverUntil > s.elapsedMs);

    const { score } = computeRunRank(s);
    this.#text("[data-score]", String(score).padStart(8, "0").replace(/(\d{2})(\d{3})(\d{3})/, "$1,$2,$3"));

    const comboText = `COMBO ×${s.combo}`;
    if (this.lastValues["[data-combo]"] !== comboText) {
      this.combo.textContent = comboText;
      this.lastValues["[data-combo]"] = comboText;
      if (s.combo >= 2) {
        this.combo.classList.remove("pop");
        void this.combo.offsetWidth;
        this.combo.classList.add("pop");
      }
    }
    this.combo.hidden = s.combo < 2;
    this.bossRow.hidden = !combat.boss;
    this.alert.hidden = !combat.boss || combat.boss.shieldUntil <= s.elapsedMs;
    this.beamWarning.hidden = combat.boss?.laser?.phase !== "charge";
    if (combat.boss) {
      for (const part of combat.boss.parts) {
        const selector = `[data-part="${part.id}"]`;
        this.#text(selector + " span", part.hp > 0 ? part.label : part.label + " · 已毁");
        this.#fill(selector + " i", part.hp / part.maxHp);
      }
    }

    const energy = Math.floor(s.energy);
    this.#text(".solo-od-core b", energy >= 100 ? "READY" : `${energy}%`);
    if (this.lastValues.energy !== energy) {
      this.overload.style.setProperty("--charge", `${energy}%`);
      this.lastValues.energy = energy;
    }
    this.overload.disabled = !active || s.energy < 100;
    this.pause.disabled = !active;
    this.flight.inert = !active;
    this.#syncLoadout(s);

    // Story Comms triggers
    if (!this.commsShown.has("sortie")) {
      this.commsShown.add("sortie");
      this.#showComms(s.fighterId, "sortie", 4200);
    }
    if (s.wave >= 4 && !this.commsShown.has("waveMid")) {
      this.commsShown.add("waveMid");
      this.#showComms(s.fighterId, "waveMid", 3800);
    }

    const newCards = s.phase === "upgrade" && s.cards !== this.lastValues.cards;
    if (revealResult && (s.phase !== this.lastValues.phase || newCards)) {
      this.lastValues.phase = s.phase;
      this.lastValues.cards = s.cards;
      this.#showDialog(s);
    }
    for (const event of combat.events) {
      if (event.type === "wave") this.announce(`STAGE ${s.stage} · WAVE ${s.wave} · ${event.label}`, 1350);
      if (event.type === "boss") {
        this.announce("WARNING · 敌方主力旗舰接近", 2200, "danger");
        this.#showComms(s.fighterId, "bossIntro", 4500);
      }
      if (event.type === "part-break") this.announce(`${event.label} 击破`, 1150, "danger");
      if (event.type === "evolution") this.announce(`超武觉醒 · ${event.label}`, 2150, "evolution");
      if (event.type === "bounty-start") this.announce("限时悬赏 · 黄金运输舰出现", 1800, "evolution");
      if (event.type === "bounty-clear") this.announce("悬赏达成 · 战术空投已发放", 1800, "evolution");
      if (event.type === "breach-alarm") this.announce("WARNING · 防线失守 · 追猎精英降临", 2000, "danger");
      if (event.type === "mutator") this.announce(`星域词缀 · ${event.label}`, 2000, "evolution");
      if (event.type === "achievement") this.#showAchievement(event);
      if (event.type === "overload") {
        this.announce(s.overload.name, 950);
        this.#showComms(s.fighterId, "overload", 3000);
      }
    }
  }

  #showAchievement(ach) {
    this.achToast.dataset.tier = ach.tier;
    this.achToast.innerHTML = `
      <span class="solo-ach-icon">${getActionIconSvg("trophy")}</span>
      <div><em>ACHIEVEMENT UNLOCKED</em><strong>${ach.title}</strong><small>${ach.desc}</small></div>`;
    this.achToast.hidden = false;
    this.achToast.classList.remove("show");
    void this.achToast.offsetWidth;
    this.achToast.classList.add("show");
    clearTimeout(this.achTimer);
    this.achTimer = setTimeout(() => {
      this.achToast.classList.remove("show");
      this.achToast.hidden = true;
    }, 3200);
  }

  #showComms(fighterId, key, duration) {
    const lore = PILOT_LORE[fighterId];
    if (!lore) return;
    this.commsImg.src = import.meta.env.BASE_URL + `assets/pilots/${fighterId}.png`;
    this.commsSpeaker.textContent = `${lore.callsign} · ${lore.pilot}`;
    this.commsLine.textContent = lore.lines[key] ?? "";
    this.comms.hidden = false;
    this.comms.classList.remove("show");
    void this.comms.offsetWidth;
    this.comms.classList.add("show");
    clearTimeout(this.commsTimer);
    this.commsTimer = setTimeout(() => {
      this.comms.classList.remove("show");
      this.comms.hidden = true;
    }, duration);
  }

  announce(text, duration, variant = "") {
    this.notice.textContent = text;
    this.notice.dataset.variant = variant;
    this.notice.classList.remove("show");
    void this.notice.offsetWidth;
    this.notice.classList.add("show");
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.classList.remove("show"), duration);
  }

  #syncSound() {
    const muted = this.actions.isMuted();
    this.sound.textContent = muted ? "静音" : "音效";
    this.sound.setAttribute("aria-label", muted ? "开启音效" : "静音");
    this.sound.setAttribute("aria-pressed", String(muted));

    const dialogMute = this.dialog.querySelector("[data-mute]");
    if (dialogMute) {
      dialogMute.innerHTML = `
        <span class="solo-btn-icon">${getActionIconSvg(muted ? "sound-off" : "sound-on")}</span>
        <span class="solo-btn-label">${muted ? "音效系统 · 已静音" : "音效系统 · 开启"}</span>
        <span class="solo-led ${muted ? "off" : "on"}" aria-hidden="true"></span>`;
      dialogMute.setAttribute("aria-label", muted ? "开启音效" : "静音");
      dialogMute.setAttribute("aria-pressed", String(muted));
    }
  }

  #toggleMute() {
    this.actions.onMute();
    this.#syncSound();
  }

  #syncLoadout(s) {
    const b = s.build;
    const chips = [`<span>主炮 Lv.${b.main}</span>`];
    for (const [id, lv] of Object.entries(b.secondary)) {
      chips.push(`<span class="sec">${SEC_LABELS[id] ?? id} ${lv}</span>`);
    }
    if (b.synergy) chips.push(`<span class="syn">超武 · ${b.synergy.name}</span>`);
    const html = chips.join("");
    if (this.lastValues.loadout !== html) {
      this.loadout.innerHTML = html;
      this.lastValues.loadout = html;
    }
  }

  #text(selector, text) {
    if (this.lastValues[selector] === text) return;
    this.root.querySelector(selector).textContent = text;
    this.lastValues[selector] = text;
  }

  #fill(selector, ratio) {
    if (this.lastValues[selector] === ratio) return;
    this.root.querySelector(selector).style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    this.lastValues[selector] = ratio;
  }

  #renderRankPips(level, max = 5) {
    const cells = Array.from({ length: max }, (_, i) => {
      const state = i < level - 1 ? "on" : i === level - 1 ? "next" : "off";
      return `<i class="${state}"></i>`;
    }).join("");
    return `<span class="solo-pips" aria-hidden="true">${cells}</span>`;
  }

  #showDialog(s) {
    if (s.phase === "playing") {
      this.dialog.hidden = true;
      this.dialog.replaceChildren();
      return;
    }
    const { onUpgrade, onPause, onRetry, onMenu } = this.actions;
    const lore = PILOT_LORE[s.fighterId];
    const base = import.meta.env.BASE_URL;
    let markup;
    if (s.phase === "upgrade") {
      markup = `
        <header class="solo-dialog-bar">
          <span class="solo-bar-code"><i class="solo-led on" aria-hidden="true"></i>ARMORY // LV.${s.level}</span>
          <span class="solo-bar-meta">主炮 RANK ${s.build.main}</span>
        </header>
        <div class="solo-dialog-head">
          <img class="solo-dialog-pilot" src="${base}assets/pilots/${s.fighterId}.png" alt="" draggable="false">
          <div class="solo-dialog-titles">
            <p class="solo-dialog-kicker">${lore?.callsign ?? "UNIT"} · 战备扩容</p>
            <h2 id="solo-dialog-title">战术强化模块</h2>
          </div>
        </div>
        <div class="solo-upgrades">
          ${s.cards.map(({ id, label, detail, kind, level, resonance }, idx) => {
            const iconHtml = id === "main"
              ? `<img class="solo-card-ship" src="${base}assets/fighters/${s.fighterId}.png" alt="" draggable="false">`
              : getUpgradeIconSvg(id);
            return `
            <button type="button" data-upgrade="${id}" data-card="${kind}" data-resonance="${resonance ? "true" : "false"}" style="--deal-i: ${idx}">
              <div class="solo-card-icon">
                ${iconHtml}
                <span class="solo-card-lv">LV.${level || 1}</span>
              </div>
              <div class="solo-card-body">
                <div class="solo-card-meta">
                  <em class="solo-card-tag">${kind}</em>
                  ${this.#renderRankPips(level || 1, 5)}
                </div>
                <strong>${label}</strong>
                <small>${detail}</small>
                ${resonance ? `<span class="solo-card-res">⚡ 共振觉醒 · ${resonance}</span>` : ""}
              </div>
              <div class="solo-card-act" aria-hidden="true">
                <kbd>${idx + 1}</kbd>
                <span>装配</span>
              </div>
            </button>`;
          }).join("")}
        </div>
        <footer class="solo-dialog-foot"><span>点选卡片或按 [1][2][3] 立即装配</span></footer>`;
    } else if (s.phase === "paused") {
      const modCount = Object.keys(s.build.secondary).length;
      const { score } = computeRunRank(s);
      markup = `
        <header class="solo-dialog-bar">
          <span class="solo-bar-code"><i class="solo-led pause" aria-hidden="true"></i>HOLD // SYSTEM PAUSED</span>
          <span class="solo-bar-meta">S${s.stage}·W${s.wave}</span>
        </header>
        <div class="solo-dialog-head">
          <img class="solo-dialog-pilot" src="${base}assets/pilots/${s.fighterId}.png" alt="" draggable="false">
          <div class="solo-dialog-titles">
            <p class="solo-dialog-kicker">TACTICAL STANDBY</p>
            <h2 id="solo-dialog-title">战斗暂停</h2>
          </div>
        </div>
        <div class="solo-pause-telemetry">
          <img class="solo-pause-ship" src="${base}assets/fighters/${s.fighterId}.png" alt="" draggable="false">
          <div class="solo-pause-unit">
            <strong>${lore ? `${lore.callsign} · ${lore.pilot}` : s.fighterId}</strong>
            <span>主炮 Lv.${s.build.main} · 模组 ${modCount}</span>
          </div>
          <div class="solo-pause-score">
            <em>SCORE</em>
            <b>${score.toLocaleString()}</b>
          </div>
        </div>
        <div class="solo-dialog-actions">
          <button class="solo-primary solo-arcade-btn" type="button" data-resume>
            <span class="solo-btn-icon">${getActionIconSvg("resume")}</span>
            <span class="solo-btn-label">继续战斗</span>
            <span class="solo-launch-arrow" aria-hidden="true">▶</span>
          </button>
          <button class="solo-secondary solo-arcade-btn" type="button" data-mute></button>
          <button class="solo-secondary solo-arcade-btn" type="button" data-menu>
            <span class="solo-btn-icon">${getActionIconSvg("hangar")}</span>
            <span class="solo-btn-label">返回机库整备</span>
          </button>
        </div>
        <footer class="solo-dialog-foot"><span>按 [ESC] 或点击上方按钮恢复作战</span></footer>`;
    } else {
      const { rank, score } = recordRunResult(s);
      const isWin = s.phase === "victory";
      markup = `
        <header class="solo-dialog-bar">
          <span class="solo-bar-code"><i class="solo-led ${isWin ? "on" : "off"}" aria-hidden="true"></i>${isWin ? "MISSION CLEAR" : "SIGNAL LOST"}</span>
          <span class="solo-bar-meta">${score.toLocaleString()} PTS</span>
        </header>
        <div class="solo-result-head">
          <div class="solo-dialog-head">
            <img class="solo-dialog-pilot" src="${base}assets/pilots/${s.fighterId}.png" alt="" draggable="false">
            <div class="solo-dialog-titles">
              <p class="solo-dialog-kicker">${lore ? `${lore.callsign} · ${lore.pilot}` : "DEBRIEF"}</p>
              <h2 id="solo-dialog-title">${isWin ? "星域制霸" : "战机坠毁"}</h2>
            </div>
          </div>
          <span class="solo-rank-stamp rank-${rank}">${rank}</span>
        </div>
        ${isWin && lore ? `<p class="solo-victory-quote">「${lore.lines.victory}」—— ${lore.pilot}</p>` : ""}
        <dl class="solo-results">
          <div><dt>击破</dt><dd>${s.kills}</dd></div>
          <div><dt>最高连击</dt><dd>${s.bestCombo}</dd></div>
          <div><dt>擦弹</dt><dd>${s.grazes}</dd></div>
          <div><dt>零件</dt><dd>${s.parts}</dd></div>
        </dl>
        <div class="solo-dialog-actions">
          <button class="solo-primary solo-arcade-btn" type="button" data-retry>
            <span class="solo-btn-icon">${getActionIconSvg("retry")}</span>
            <span class="solo-btn-label">再次出击</span>
            <span class="solo-launch-arrow" aria-hidden="true">▶</span>
          </button>
          <button class="solo-secondary solo-arcade-btn" type="button" data-menu>
            <span class="solo-btn-icon">${getActionIconSvg("hangar")}</span>
            <span class="solo-btn-label">返回机库整备</span>
          </button>
        </div>`;
    }
    this.dialog.hidden = false;
    this.dialog.innerHTML = `<section class="solo-dialog" data-kind="${s.phase}" role="dialog" aria-modal="true"
      aria-labelledby="solo-dialog-title" tabindex="-1">${markup}</section>`;
    this.dialog.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => onUpgrade(button.dataset.upgrade));
    });
    this.dialog.querySelector("[data-resume]")?.addEventListener("click", onPause);
    this.dialog.querySelector("[data-mute]")?.addEventListener("click", () => this.#toggleMute());
    this.dialog.querySelector("[data-menu]")?.addEventListener("click", onMenu);
    this.dialog.querySelector("[data-retry]")?.addEventListener("click", onRetry);
    this.#syncSound();
    this.dialog.firstElementChild.focus({ preventScroll: true });
  }

  destroy() {
    clearTimeout(this.noticeTimer);
    clearTimeout(this.commsTimer);
    clearTimeout(this.achTimer);
    window.removeEventListener("keydown", this.onKeyDown);
    this.root.replaceChildren();
  }
}

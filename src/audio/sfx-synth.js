import { bgm } from "./bgm-synth.js";

const MIN_GAP = 0.045;
const MAX_VOICES = 22;

// Shape, start and end frequency, decay (seconds), gain, and optional offset.
const CUES = {
  pulse: [["square", 1240, 425, 0.061, 0.042]],
  laser: [["sine", 820, 250, 0.13, 0.079], ["triangle", 1580, 535, 0.082, 0.033]],
  heavy: [["triangle", 224, 54, 0.175, 0.19], ["noise", 695, 173, 0.091, 0.16]],
  arc: [["noise", 3850, 1240, 0.109, 0.17], ["square", 950, 180, 0.089, 0.032]],
  void: [["sine", 280, 82, 0.22, 0.15], ["triangle", 355, 598, 0.112, 0.058]],
  ice: [["triangle", 1620, 710, 0.128, 0.052], ["sine", 2110, 1180, 0.13, 0.044, 0.015]],
  shield: [["square", 298, 108, 0.096, 0.057], ["sine", 1160, 490, 0.16, 0.09]],
  drone: [["triangle", 1350, 970, 0.067, 0.026]],
  impact: [["noise", 2800, 1520, 0.052, 0.092], ["triangle", 710, 410, 0.054, 0.052]],
  destroy: [["triangle", 115, 45, 0.215, 0.16], ["noise", 836, 315, 0.206, 0.19]],
  part: [["triangle", 162, 36, 0.38, 0.24], ["noise", 1180, 265, 0.29, 0.3]],
  crystal: [["sine", 815, 875, 0.105, 0.085], ["triangle", 1236, 1021, 0.149, 0.049, 0.04]],
  heal: [["sine", 560, 760, 0.12, 0.093], ["sine", 840, 1010, 0.19, 0.068, 0.057]],
  graze: [["noise", 4400, 2780, 0.06, 0.098], ["sine", 1460, 2210, 0.091, 0.06]],
  reflect: [["triangle", 168, 104, 0.29, 0.17], ["noise", 2500, 510, 0.33, 0.17]],
  hurt: [["sawtooth", 130, 46, 0.12, 0.059], ["noise", 695, 310, 0.07, 0.15]],
  warp: [["noise", 380, 2350, 0.44, 0.16], ["sine", 110, 275, 0.34, 0.106]],
  level: [["triangle", 523, 523, 0.13, 0.09], ["triangle", 659, 659, 0.13, 0.09, 0.06], ["sine", 784, 899, 0.26, 0.12, 0.12]],
  evolution: [["sine", 348, 348, 0.42, 0.12], ["triangle", 523, 523, 0.5, 0.093, 0.065],
    ["triangle", 659, 659, 0.47, 0.085, 0.13], ["sine", 1046, 1290, 0.6, 0.133, 0.2]],
  boss: [["triangle", 190, 258, 0.24, 0.19], ["triangle", 190, 271, 0.28, 0.19, 0.37],
    ["triangle", 210, 309, 0.32, 0.21, 0.75]],
  beamCharge: [["triangle", 250, 730, 0.56, 0.092]],
  beamFire: [["sawtooth", 133, 51, 0.36, 0.09], ["noise", 1560, 140, 0.41, 0.17]],
  phase: [["square", 374, 289, 0.141, 0.079], ["square", 464, 367, 0.17, 0.087, 0.22],
    ["triangle", 164, 53, 0.48, 0.19, 0.4]],
  overload: [["triangle", 208, 44, 0.53, 0.25], ["sine", 640, 120, 0.43, 0.1], ["noise", 3260, 220, 0.52, 0.29]],
};

export class SfxSynth {
  constructor() {
    this.muted = false;
    this.lastCue = new Map();
    this.voices = 0;
    this.crystalAt = -Infinity;
    this.crystalRun = 0;
  }

  unlock() {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    if (!this.context) {
      const context = this.context = new Audio();
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.67;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 10;
      limiter.ratio.value = 7;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.083;
      this.master.connect(limiter);
      limiter.connect(context.destination);
      this.output = limiter;
      this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.65), context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    bgm.attach(this);
  }

  toggleMute() {
    this.unlock();
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.67, this.context.currentTime, 0.014);
    return this.muted;
  }

  consume(events) {
    // Reserve polyphony for critical notifications ahead of repetitive fire.
    for (const event of events) {
      switch (event.type) {
        case "pickup":
          if (event.pickup === "heal") this.play("heal");
          else this.crystal();
          break;
        case "boss": this.play("boss"); break;
        case "boss-laser-charge": this.play("beamCharge"); break;
        case "boss-laser-fire": this.play("beamFire"); break;
        case "boss-phase": this.play("phase"); break;
        case "part-break": this.play("part"); break;
        case "destroy": this.play(event.heavy ? "part" : "destroy"); break;
        case "level": this.play("level"); break;
        case "evolution": this.play("evolution"); break;
        case "overload": this.play("overload"); break;
        case "graze": this.play("graze"); break;
        case "reflect": this.play("reflect"); break;
        case "hurt": this.play("hurt"); break;
        case "warp": this.play("warp"); break;
      }
    }
    for (const event of events) {
      if (this.voices >= MAX_VOICES - 5) break;
      if (event.type === "muzzle") this.play(event.cue);
      if (event.type === "impact") this.play("impact");
    }
  }

  crystal() {
    if (this.context?.state !== "running" || this.muted) return;
    const now = this.context.currentTime;
    this.crystalRun = now - this.crystalAt <= 1.5 ? Math.min(this.crystalRun + 1, 10) : 0;
    this.crystalAt = now;
    this.play("crystal", 2 ** (this.crystalRun / 12));
  }

  play(name, pitch = 1) {
    const cue = CUES[name];
    if (!cue || this.context?.state !== "running" || this.muted || this.voices + cue.length > MAX_VOICES) return false;
    const now = this.context.currentTime;
    if (now - (this.lastCue.get(name) ?? -Infinity) < MIN_GAP) return false;
    this.lastCue.set(name, now);
    for (const [shape, high, low, length, volume, delay = 0] of cue) {
      this.#voice(shape, high * pitch, low * pitch, length, volume, now + delay);
    }
    return true;
  }

  #voice(shape, from, to, length, volume, start) {
    const context = this.context;
    const end = start + length;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, end);
    envelope.connect(this.master);
    let source;
    let filter;
    if (shape === "noise") {
      source = context.createBufferSource();
      source.buffer = this.noise;
      filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.78;
      filter.frequency.setValueAtTime(from, start);
      filter.frequency.exponentialRampToValueAtTime(to, end);
      source.connect(filter);
      filter.connect(envelope);
    } else {
      source = context.createOscillator();
      source.type = shape;
      source.frequency.setValueAtTime(from, start);
      source.frequency.exponentialRampToValueAtTime(to, end);
      source.connect(envelope);
    }
    this.voices++;
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    source.start(start);
    source.stop(end);
  }
}

export const sfx = new SfxSynth();

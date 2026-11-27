const NOTE_HZ = (midi) => 440 * 2 ** ((midi - 69) / 12);

const PATTERNS = {
  hangar: {
    bpm: 112,
    bass: [38, 0, 38, 0, 41, 0, 41, 0, 43, 0, 43, 0, 40, 0, 45, 0],
    lead: [62, 0, 65, 69, 0, 67, 65, 0, 67, 0, 71, 74, 0, 72, 69, 0],
    hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  },
  stage: {
    bpm: 140,
    bass: [40, 52, 40, 52, 43, 55, 43, 55, 45, 57, 45, 57, 47, 59, 43, 55],
    lead: [64, 0, 67, 71, 72, 0, 71, 67, 69, 0, 72, 76, 74, 0, 71, 67],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0],
  },
  boss: {
    bpm: 158,
    bass: [38, 50, 38, 38, 41, 53, 41, 41, 39, 51, 39, 39, 44, 56, 43, 55],
    lead: [74, 0, 77, 74, 73, 0, 70, 69, 74, 77, 81, 0, 79, 77, 76, 73],
    hat: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  },
};

export class BgmSynth {
  constructor() {
    this.mode = "off";
    this.timer = null;
    this.step = 0;
    this.synth = null;
  }

  attach(synth) {
    this.synth = synth;
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    clearInterval(this.timer);
    this.timer = null;
    this.step = 0;
    if (mode === "off" || !PATTERNS[mode]) return;
    const ms = Math.round(60000 / PATTERNS[mode].bpm / 4);
    this.timer = setInterval(() => this.#tick(), ms);
  }

  #tick() {
    const s = this.synth;
    if (!s || s.muted || s.context?.state !== "running") return;
    const pat = PATTERNS[this.mode];
    if (!pat) return;
    const ctx = s.context;
    const t = ctx.currentTime + 0.015;
    const i = this.step % 16;
    this.step++;

    const bassMidi = pat.bass[i];
    if (bassMidi) this.#note(ctx, s.master, "triangle", NOTE_HZ(bassMidi), 0.14, 0.085, t);

    const leadMidi = pat.lead[i];
    if (leadMidi) this.#note(ctx, s.master, "square", NOTE_HZ(leadMidi), 0.12, 0.032, t);

    if (pat.hat[i] && s.noise) this.#hat(ctx, s.master, s.noise, t);
  }

  #note(ctx, dest, type, freq, dur, vol, start) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(start);
    osc.stop(start + dur);
  }

  #hat(ctx, dest, noiseBuf, start) {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuf;
    hp.type = "highpass";
    hp.frequency.value = 6200;
    gain.gain.setValueAtTime(0.018, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.038);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.onended = () => {
      src.disconnect();
      hp.disconnect();
      gain.disconnect();
    };
    src.start(start);
    src.stop(start + 0.04);
  }
}

export const bgm = new BgmSynth();

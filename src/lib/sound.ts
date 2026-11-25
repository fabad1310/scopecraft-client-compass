let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const sfx = {
  tick: () => tone(1800, 0.05, "square", 0.03),
  select: () => { tone(660, 0.08, "triangle", 0.08); tone(990, 0.12, "triangle", 0.06, 0.05); },
  deselect: () => tone(500, 0.1, "triangle", 0.06, 0, 300),
  submit: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "sine", 0.08, i * 0.08)); tone(200, 0.6, "sawtooth", 0.03, 0, 1200); },
};

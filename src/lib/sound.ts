let context: AudioContext | null = null;
export function playSound(capture = false) {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(capture ? 660 : 380, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(capture ? 880 : 190, context.currentTime + 0.13);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.2);
  } catch {
    /* Audio may be unavailable under browser autoplay policies. */
  }
}

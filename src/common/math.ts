export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

export const interpolate = {
  linear: (t: number): number => t,
  quadratic: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  bounce: (t: number): number => {
    if (t < 0.3636) return 7.5625 * t * t;
    if (t < 0.7272) {
      t -= 0.5454; // Bounce #2
      return 7.5625 * t * t + 0.75;
    }
    if (t < 0.909) {
      t -= 0.81818; // Bounce #3
      return 7.5625 * t * t + 0.9375;
    }
    t -= 0.9545; // Bounce #4
    return 7.5625 * t * t + 0.984375;
  },
};

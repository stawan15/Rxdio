/** A tiny physical "tick" on supported phones, so taps feel acknowledged before the network answers. */
export const tick = () => navigator.vibrate?.(8)

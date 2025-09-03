export const doubleRAF = (cb: () => void) => {
  requestAnimationFrame(() => requestAnimationFrame(() => cb()));
};
export const callWhenPageActive = (callback: () => void) => {
  let doc = document as any;
  if (doc.prerendering) {
    doc.addEventListener('prerenderingchange', () => callback(), true);
  } else {
    callback();
  }
};

import { onBFCacheRestore } from "./BackForwardCache";

const getNavigationEntry = (): PerformanceNavigationTiming | void => {
  const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
  if (
    navigationEntry &&
    navigationEntry.responseStart > 0 &&
    navigationEntry.responseStart < performance.now()
  ) {
    return navigationEntry;
  }
};

export const getActivationStart = (): number => {
  const navEntry = getNavigationEntry();
  if (!navEntry) {
    return 0
  }
  return (navEntry as any).activationStart ?? 0;
};





let firstHiddenTime = -1;
const onHiddenFunctions: Set<() => void> = new Set();

const initHiddenTime = () => {
  return document.visibilityState === 'hidden' && !(document as any).prerendering
    ? 0
    : Infinity;
};

const onVisibilityUpdate = (event: Event) => {
  // 
  if (document.visibilityState === 'hidden') {
    // 
    if (event.type === 'visibilitychange') {
      for (const onHiddenFunction of onHiddenFunctions) {
        onHiddenFunction();
      }
    }

    if (!isFinite(firstHiddenTime)) {
      firstHiddenTime = event.type === 'visibilitychange' ? event.timeStamp : 0;

      removeEventListener('prerenderingchange', onVisibilityUpdate, true);
    }
  }
};

export const getVisibilityWatcher = () => {
  if (firstHiddenTime < 0) {

    const activationStart = getActivationStart();

    const firstVisibilityStateHiddenTime = !(document as any).prerendering
      ? performance
        .getEntriesByType('visibility-state')
        .filter(
          (e) => e.name === 'hidden' && e.startTime > activationStart,
        )[0]?.startTime
      : undefined;


    firstHiddenTime = firstVisibilityStateHiddenTime ?? initHiddenTime();

    addEventListener('visibilitychange', onVisibilityUpdate, true);

    addEventListener('prerenderingchange', onVisibilityUpdate, true);

    onBFCacheRestore(() => {
      // 
      setTimeout(() => {
        firstHiddenTime = initHiddenTime();
      });
    });
  }

  return {
    get firstHiddenTime() {
      return firstHiddenTime;
    },
    onHidden(cb: () => void) {
      onHiddenFunctions.add(cb);
    },
  };
};
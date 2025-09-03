

interface LayoutShiftAttribution {
  node: Node | null;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  sources: LayoutShiftAttribution[];
  hadRecentInput: boolean;
}


interface PerformanceEntryMap {
  'event': PerformanceEventTiming[];
  'first-input': PerformanceEventTiming[];
  'layout-shift': LayoutShift[];
  'largest-contentful-paint': LargestContentfulPaint[];
  'long-animation-frame': any[];
  'paint': PerformancePaintTiming[];
  'navigation': PerformanceNavigationTiming[];
  'resource': PerformanceResourceTiming[];
}


export const observe = <K extends keyof PerformanceEntryMap>(
  type: K,
  callback: (entries: PerformanceEntryMap[K]) => void,
  opts: PerformanceObserverInit = {},
): PerformanceObserver | undefined => {
  try {
    if (PerformanceObserver.supportedEntryTypes.includes(type)) {
      const po = new PerformanceObserver((list) => {
        // use a microtask here, because invoked callback directly has a bug in safari.
        Promise.resolve().then(() => {
          callback(list.getEntries() as PerformanceEntryMap[K]);
        });
      });
      po.observe({ type, buffered: true, ...opts });
      return po;
    }
  } catch (err) {
    console.error(err)
  }
  return;
};

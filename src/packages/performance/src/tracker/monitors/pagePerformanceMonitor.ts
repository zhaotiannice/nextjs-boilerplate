import {
  PerformanceConfig,
  PerformanceMonitor,
  PerformanceMetrics,
  lcpEntry,
} from "./type";
import {
  getDomElementInfo,
  getDomPath,
  getLcpEntry,
  getNavigationTiming,
  getNetworkInfo,
  getSlowResourceItem,
  getTTFB,
} from "./utils";

const firstProperties = [
  "lcp",
  "navigationTiming",
  "ttfb",
  "fcp",
  "firstPaint",
  // "cls",
];
let firstRun = false;

const extract = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

const lock = {
  lcp: false,
  fid: false,
};

export const createPerformanceMonitor = (
  config: Partial<PerformanceConfig> = {}
): PerformanceMonitor => {
  const finalConfig: PerformanceConfig = {
    enabled: true,
    sampleRate: 1.0,
    maxLongTasks: 20,
    resourceThreshold: 2000,
    inputThreshold: 50,
    eventThreshold: 300,
    reportToConsole: false,
    lcpTimeout: 10000,
    clsSessionTimeout: 5000,
    inpPercentile: 98,
    onReport() {},
    ...config,
    resourceDomain: (config.resourceDomain || []).concat([
      window.location.host,
    ]),
  };

  const metrics: PerformanceMetrics = {
    lcp: null, // 最大内容绘制 (用户体验)
    inp: null, // 交互到下次绘制 (交互响应)
    fid: null, // 首次输入延迟 (交互响应)
    ttfb: null, // 首字节时间 (服务器响应)
    fcp: null, // 首次内容绘制 (感知加载)
    firstPaint: null, // 首次绘制 (开始渲染)
    cls: 0, // 累积布局偏移 (视觉稳定性)
    longTasks: [], // 长任务 (主线程阻塞)
    slowResources: [], // 慢资源 (资源加载)
    navigationTiming: null, // 导航时序
    interactionCount: 0, // 用户交互次数 (活跃度)
    totalBlockingTime: null, // 总阻塞时间 (交互准备)
  };

  let observers: PerformanceObserver[] = [];
  const lcpEntries: lcpEntry[] = [];
  const interactionEntries: number[] = [];
  let clsSessionStartTime = performance.now();
  let clsSessionValue = 0;
  const longTaskStartTime = 0;
  let isDestroyed = false;
  const customMetrics: Record<string, any> = {};

  const slowlyResourceCache = new Set<string>();

  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    console.warn("Performance monitoring not supported");
    return createDisabledMonitor();
  }

  const safeObserve = (observer: PerformanceObserver, options): boolean => {
    try {
      observer.observe(options);
      return true;
    } catch (error) {
      console.warn("PerformanceObserver failed:", error);
      return false;
    }
  };

  const log = (message: string, data?: any) => {
    if (finalConfig.reportToConsole) {
      if (data) {
        console.log(`📊 ${message}`, data);
      } else {
        console.log(`📊 ${message}`);
      }
    }
  };

  const updateMetric = (key: keyof PerformanceMetrics, value: any) => {
    (metrics as any)[key] = value;

    if (!firstRun) {
      //
      const notFilledKeys = firstProperties.filter((key) => {
        return !metrics[key];
      });

      if (!notFilledKeys.length) {
        finalConfig.onFirst?.({
          ...extract(metrics, firstProperties),
          networkInfo: getNetworkInfo(),
        });
        firstRun = true;
      }
    }

    finalConfig.onMetricUpdate?.(key, value);
  };

  const setupLCPObserver = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length === 0 || lock.lcp) return;

        entries.forEach((entry) => {
          Boolean((entry as any).element) &&
            lcpEntries.push(getLcpEntry(entry));
        });

        const latestLcp = entries[entries.length - 1].startTime;

        updateMetric("lcp", latestLcp);

        lock.lcp = true;

        // observer.disconnect()// run only once;

        // observers = observers.filter(item => item !== observer)
      });

      if (
        safeObserve(observer, {
          type: "largest-contentful-paint",
          buffered: true,
        })
      ) {
        observers.push(observer);
      }
    } catch (error) {
      console.warn("LCP setup failed:", error);
    }
  };

  const setupCLSObserver = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            const now = performance.now();
            const sessionDuration = now - clsSessionStartTime;

            if (sessionDuration > finalConfig.clsSessionTimeout!) {
              clsSessionValue = 0;
              clsSessionStartTime = now;
            }

            clsSessionValue += entry.value;
            updateMetric("cls", clsSessionValue);

            // log('CLS updated', clsSessionValue.toFixed(4));
          }
        });
      });

      if (safeObserve(observer, { type: "layout-shift", buffered: true })) {
        observers.push(observer);
      }
    } catch (error) {
      console.warn("CLS setup failed:", error);
    }
  };

  // const setupINPObserver = () => {
  //   try {
  //     const observer = new PerformanceObserver((list) => {
  //       list.getEntries().forEach((entry: PerformanceEventTiming) => {
  //         //
  //         if (
  //           // if interactionId has existed, this action has invoked by user
  //           (entry as any).interactionId && // user action
  //           entry.duration > 0) {

  //           let duration = entry.duration
  //           interactionEntries.push(duration);

  //           updateMetric('interactionCount', interactionEntries.length);

  //           const currentWorst = metrics.inp || 0;
  //           if (entry.duration > currentWorst &&
  //             entry.duration > 250 // only large than 250ms, we should record it
  //           ) {
  //             updateMetric('inp', entry.duration);
  //           }

  //           // log('Interaction recorded', {
  //           //   duration: entry.duration.toFixed(2),
  //           //   type: entry.name,
  //           //   total: interactionEntries.length
  //           // });
  //         }
  //       });
  //     });

  //     if (safeObserve(observer, {
  //       type: 'event',
  //       buffered: true,
  //       durationThreshold: 200 // only the event that larger than 200ms should record
  //     } as any)) {
  //       observers.push(observer);
  //     }
  //   } catch (error) {
  //     console.warn('INP setup failed:', error);
  //   }
  // };

  const setupPaintObserver = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === "first-paint") {
            updateMetric("firstPaint", entry.startTime);
          } else if (entry.name === "first-contentful-paint") {
            updateMetric("fcp", entry.startTime);
          }
        });
      });

      if (safeObserve(observer, { type: "paint", buffered: true })) {
        observers.push(observer);
      }
    } catch (error) {
      console.warn("Paint setup failed:", error);
    }
  };

  const captureNavigationTiming = () => {
    try {
      const navigationEntries = performance.getEntriesByType("navigation");
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;

        updateMetric("navigationTiming", getNavigationTiming(navEntry));
        updateMetric("ttfb", getTTFB(navEntry));
      }
    } catch (error) {
      console.warn("Navigation timing capture failed:", error);
    }
  };

  // const setupVisibilityChangeHandler = () => {
  //   if (typeof document !== 'undefined') {
  //     const handleVisibilityChange = () => {
  //       if (document.visibilityState === 'hidden') {
  //         finalizeMetrics();
  //       }
  //     };

  //     document.addEventListener('visibilitychange', handleVisibilityChange);

  //     // 清理函数
  //     return () => {
  //       document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     };
  //   }
  //   return () => { };
  // };

  const setupEventObserver = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const reportItems = [];

        list.getEntries().forEach((entry: PerformanceEventTiming) => {
          const { processingEnd, processingStart, name, target, duration } =
            entry;

          const hasID = (entry as any).interactionId;
          const isClick = name === "click";
          const runTime = processingEnd - processingStart;

          if (isClick && hasID && runTime > finalConfig.eventThreshold) {
            const reportItem = {
              type: "click_event",
              runTime,
              domPath: getDomPath(target as HTMLElement),
              domInfo: getDomElementInfo(target as HTMLElement),
            };

            reportItems.push(reportItem);
          }
        });

        if (Boolean(reportItems.length)) {
          finalConfig?.onReport?.(reportItems, "click_event");
        }
      });

      if (
        safeObserve(observer, {
          type: "event",
          buffered: true,
          durationThreshold: finalConfig.eventThreshold || 300,
        })
      ) {
        observers.push(observer);
      }
    } catch (error) {
      console.warn("FID setup failed:", error);
    }
  };

  const setupResourceObserver = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const resourceDomain = finalConfig.resourceDomain;
        const slowResources = [];

        list.getEntries().forEach((entry: PerformanceResourceTiming) => {
          const host = new URL(entry.name).host || "";
          if (
            entry.duration > finalConfig.resourceThreshold &&
            Boolean(resourceDomain.find((v) => host.includes(v)))
          ) {
            const item = getSlowResourceItem(entry);
            const name = item.name;

            if (!slowlyResourceCache.has(name)) {
              slowResources.push(item);
              slowlyResourceCache.add(name);
            }
          }
        });

        // report
        if (Boolean(slowResources.length)) {
          finalConfig?.onReport?.(slowResources.splice(0), "resource_event");
        }
      });

      if (safeObserve(observer, { type: "resource", buffered: true })) {
        observers.push(observer);
      }
    } catch (error) {
      console.warn("Resource setup failed:", error);
    }
  };

  const finalizeMetrics = () => {
    if (isDestroyed) return;

    if (lcpEntries.length > 0) {
      updateMetric("lcp", lcpEntries[lcpEntries.length - 1].startTime);
    }

    if (interactionEntries.length > 0) {
      const sortedDurations = interactionEntries.sort((a, b) => a - b);

      const percentileIndex = Math.floor(
        sortedDurations.length * (finalConfig.inpPercentile! / 100)
      );
      const finalINP = sortedDurations[percentileIndex];
      updateMetric("inp", finalINP);
    }

    reportMetrics();
  };

  const reportMetrics = () => {
    if (isDestroyed) return;

    const finalMetrics = {
      ...metrics,
      custom: customMetrics,
    };

    log("Final metrics report", finalMetrics);

    if (finalConfig.sendToAnalytics) {
      try {
        finalConfig.sendToAnalytics(finalMetrics);
      } catch (error) {
        console.error("Analytics send failed:", error);
      }
    }
  };

  const destroy = () => {
    if (isDestroyed) return;

    observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn("Observer disconnect error:", error);
      }
    });

    observers = [];
    isDestroyed = true;
    log("Performance monitor destroyed");
  };

  const reportNow = () => {
    if (isDestroyed) return;
    finalizeMetrics();
  };

  const getMetrics = (): PerformanceMetrics => ({ ...metrics });

  const addCustomMetric = (name: string, value: any) => {
    customMetrics[name] = value;
  };

  const mark = (name: string) => {
    performance.mark(name);
  };

  const measure = (name: string, startMark?: string, endMark?: string) => {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
    } else if (startMark) {
      performance.measure(name, startMark);
    } else {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  };

  // const cleanupVisibility = setupVisibilityChangeHandler();

  setupLCPObserver();
  setupCLSObserver();
  // setupINPObserver();
  setupEventObserver();
  // setupLongTaskObserver();
  setupResourceObserver();
  setupPaintObserver();

  // calculate when setup
  captureNavigationTiming();

  const extendedDestroy = () => {
    destroy();
    // cleanupVisibility();
  };

  return {
    getMetrics,
    reportNow,
    destroy: extendedDestroy,
    addCustomMetric,
    mark,
    measure,
  };
};

const createDisabledMonitor = (): PerformanceMonitor => ({
  getMetrics: () => ({
    lcp: null,
    cls: null,
    inp: null,
    fid: null,
    ttfb: null,
    fcp: null,
    firstPaint: null,
    longTasks: [],
    slowResources: [],
    navigationTiming: null,
    interactionCount: 0,
    totalBlockingTime: null,
  }),
  reportNow: () => {},
  destroy: () => {},
  addCustomMetric: () => {},
  mark: () => {},
  measure: () => {},
});

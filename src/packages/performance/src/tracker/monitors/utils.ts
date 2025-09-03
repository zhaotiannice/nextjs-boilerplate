export function getNavigationTiming(navEntry: PerformanceNavigationTiming) {
  return {
    dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
    tcp: navEntry.connectEnd - navEntry.connectStart,
    ssl:
      navEntry.secureConnectionStart > 0
        ? navEntry.connectEnd - navEntry.secureConnectionStart
        : 0,
    request: navEntry.responseStart - navEntry.requestStart,
    response: navEntry.responseEnd - navEntry.responseStart,
    domProcessing: navEntry.domComplete - navEntry.domInteractive,
    domContentLoaded:
      navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
    fullLoad: navEntry.loadEventEnd - navEntry.loadEventStart,
    redirect: navEntry.redirectEnd - navEntry.redirectStart,
    unload: navEntry.unloadEventEnd - navEntry.unloadEventStart,
  };
}

export const getTTFB = (navEntry: PerformanceNavigationTiming) => {
  return navEntry.responseStart - navEntry.requestStart;
};

export const getSlowResourceItem = (entry: PerformanceResourceTiming) => {
  return {
    name: entry.name,
    duration: entry.duration,
    size: entry.transferSize || 0,
    startTime: entry.startTime,
    initiatorType: entry.initiatorType,
    networkINfo: getNetworkInfo(),
    type: "resource",
  };
};

export const getDomElementInfo = (element: HTMLElement) => {
  return {
    cls: element?.className ?? "",
    id: element?.id ?? "",
  };
};

export const getLcpEntry = (entry: PerformanceEntry) => {
  // console.log('lcp entry', entry)
  return {
    domInfo: getDomElementInfo((entry as any).element),
    loadTime: (entry as any).loadTime || 0,
    size: (entry as any).size,
    startTime: entry.startTime,
    url: (entry as any).url || "",
  };
};

export function getNetworkInfo() {
  let connection = (navigator as any).connection;
  if (connection) {
    return {
      type: connection.effectiveType, // 3g/4g
      downlink: connection.downlink, // speed of download
      rtt: connection.rtt, // 往返延迟(ms)
    };
  }
}

export const getDomPath = (element: HTMLElement) => {
  const path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.tagName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.className && typeof element.className === "string") {
      const classes = element.className.split(" ").filter(Boolean);
      if (classes.length > 0) {
        selector += `.${classes.join(".")}`;
      }
    } else {
      const siblings = Array.from(element.parentNode.children);
      const index = siblings.indexOf(element) + 1; // nth-child是1-based的
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    element = element.parentNode as HTMLElement;
  }

  return path.join(" > ");
};

// types/performance.ts
export interface PerformanceMetrics {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fid: number | null;
  ttfb: number | null;
  fcp: number | null;
  firstPaint: number | null;
  longTasks: LongTaskMetric[];
  slowResources: ResourceMetric[];
  navigationTiming: NavigationTiming | null;
  interactionCount: number;
  totalBlockingTime: number | null;
}

export interface LongTaskMetric {
  duration: number;
  startTime: number;
  name: string;
  attribution?: TaskAttribution[];
}

export interface ResourceMetric {
  name: string;
  duration: number;
  type: string;
  size: number;
  startTime: number;
  initiatorType: string;
}

export interface NavigationTiming {
  dns: number;
  tcp: number;
  ssl: number;
  request: number;
  response: number;
  domProcessing: number;
  domContentLoaded: number;
  fullLoad: number;
  redirect: number;
  unload: number;
}

export interface TaskAttribution {
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  maxLongTasks: number;
  resourceThreshold: number;
  inputThreshold: number;
  reportToConsole: boolean;
  lcpTimeout?: number;
  clsSessionTimeout?: number;
  inpPercentile?: number;
  eventThreshold?: number;
  resourceDomain?: string[];
  sendToAnalytics?: (metrics: PerformanceMetrics) => void;
  onReport: (data: any, type: string) => void
  onMetricUpdate?: (metric: keyof PerformanceMetrics, value: any) => void;
  onFirst?: (data) => void
}

export interface PerformanceMonitor {
  getMetrics: () => PerformanceMetrics;
  reportNow: () => void;
  destroy: () => void;
  addCustomMetric: (name: string, value: any) => void;
  mark: (name: string) => void;
  measure: (name: string, startMark?: string, endMark?: string) => void;
}

export interface lcpEntry {
  loadTime: number;
  size: number;
  startTime: number;
  url: string;
  domInfo: Record<string, any>
}
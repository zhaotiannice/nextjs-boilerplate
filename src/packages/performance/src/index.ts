// import { initTracker } from "./tracker";
import { exposureTracker } from "./tracker/exposureTracker";
import { ReportKit } from "./tracker/ReportKit";
import { createPerformanceMonitor } from "./tracker/monitors/pagePerformanceMonitor";
import { reportPageView } from "./tracker/monitors/page";

const endpoint = "/api/submit";

const rtk = new ReportKit({ endpoint, requestThreshold: 1000 * 3 });

reportPageView({
  onReport(data) {
    rtk.reportData({
      type: "page_view",
      data: data,
    });
  },
});

exposureTracker.init({
  onReport: ({ elementInfo, elementData, element }) => {
    rtk.reportData({ type: "exposure", data: { elementInfo, elementData } });
  },
});

createPerformanceMonitor({
  resourceThreshold: 1500, // 1500ms
  inputThreshold: 50, // 50ms
  eventThreshold: 200,
  onFirst(data) {
    // lcp', 'navigationTiming', 'ttfb', 'fcp', 'firstPaint', 'cls'
    // let { lcp, ttfb, fcp } = data
    if (data.lcp > 2500 || data.ttfb >= 2000 || data.fcp >= 3000) {
      // console.log("onFirst", { data });
      rtk.reportData({ type: "init-page", data });
    }
  },
  onReport(data, type) {
    // report first-input and resource
    // console.log("onReport", type, data);

    rtk.reportData({ type, data });
  },
});

Object.assign(window, {
  RTK: {
    reportData: rtk.reportData,
  },
});

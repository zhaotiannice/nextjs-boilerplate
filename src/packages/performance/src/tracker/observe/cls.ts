

// import { onBFCacheRestore } from './lib/bfcache.js';
// import { bindReporter } from './lib/bindReporter.js';
// import { doubleRAF } from './lib/doubleRAF.js';
// import { initMetric } from './lib/initMetric.js';
// import { initUnique } from './lib/initUnique.js';
// import { LayoutShiftManager } from './lib/LayoutShiftManager.js';
// import { observe } from './lib/observe.js';
// import { runOnce } from './lib/runOnce.js';
// import { onFCP } from './onFCP.js';
// import { getVisibilityWatcher } from './lib/getVisibilityWatcher.js';
// import { CLSMetric, MetricRatingThresholds, ReportOpts } from './types.js';

import { onBFCacheRestore } from "./BackForwardCache";
import { onfcp } from "./fcp";
import { initUnique } from "./initUnique";
import { LayoutShiftManager } from "./LayoutManager";
import { observe } from "./observe";
import { runOnce } from "./runOnce";
import { getVisibilityWatcher } from "./utils";

// export const CLSThresholds: MetricRatingThresholds = [0.1, 0.25];

export const onCLS = (
  onReport: (metric) => void,
  opts = {},
) => {
  const visibilityWatcher = getVisibilityWatcher();

  onfcp(
    runOnce(() => {
      // let metric = initMetric('CLS', 0);
      // let report: ReturnType<typeof bindReporter>;

      const layoutShiftManager = initUnique(opts, LayoutShiftManager);

      const handleEntries = (entries) => {
        for (const entry of entries) {
          debugger
          layoutShiftManager._processEntry(entry);
        }

        // // If the current session value is larger than the current CLS value,
        // // update CLS and the entries contributing to it.
        // if (layoutShiftManager._sessionValue > metric.value) {
        //   metric.value = layoutShiftManager._sessionValue;
        //   metric.entries = layoutShiftManager._sessionEntries;
        //   report();
        // }
      };

      const po = observe('layout-shift', handleEntries);
      if (po) {
        // report = bindReporter(
        //   onReport,
        //   metric,
        //   CLSThresholds,
        //   opts!.reportAllChanges,
        // );

        // visibilityWatcher.onHidden(() => {
        //   handleEntries(po.takeRecords() as CLSMetric['entries']);
        //   report(true);
        // });

        // Only report after a bfcache restore if the `PerformanceObserver`
        // successfully registered.
        onBFCacheRestore(() => {
          // layoutShiftManager._sessionValue = 0;
          // metric = initMetric('CLS', 0);
          // report = bindReporter(
          //   onReport,
          //   metric,
          //   CLSThresholds,
          //   opts!.reportAllChanges,
          // );

          // doubleRAF(() => report());
        });

        // Queue a task to report (if nothing else triggers a report first).
        // This allows CLS to be reported as soon as FCP fires when
        // `reportAllChanges` is true.
        // setTimeout(report);
      }
    }),
  );
};

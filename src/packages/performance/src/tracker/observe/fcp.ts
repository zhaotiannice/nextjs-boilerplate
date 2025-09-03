

import { onBFCacheRestore } from "./BackForwardCache";
import { callWhenPageActive } from "./callWhenActive";
import { doubleRAF } from "./doubleRAF";
import { observe } from "./observe";
import { getActivationStart, getVisibilityWatcher } from "./utils";


// export const FCPThresholds: MetricRatingThresholds = [1800, 3000];


export const onfcp = (
  onReport: (metric: any) => void,
  opts: Record<string, any> = {},
) => {
  callWhenPageActive(() => {
    const visibilityWatcher = getVisibilityWatcher();

    let during = 0;
    const handleEntries = (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          po!.disconnect();

          // Only report if the page wasn't hidden prior to the first paint.
          if (entry.startTime < visibilityWatcher.firstHiddenTime) {

            // The activationStart reference is used because FCP should be
            // relative to page activation rather than navigation start if the
            // page was prerendered. But in cases where `activationStart` occurs
            // after the FCP, this time should be clamped at 0.
            during = Math.max(entry.startTime - getActivationStart(), 0);

            onReport(during);
          }
        }
      }
    };

    const po = observe('paint', handleEntries);

    if (po) {

      // Only report after a bfcache restore if the `PerformanceObserver`
      // successfully registered or the `paint` entry exists.
      onBFCacheRestore((event) => {
        doubleRAF(() => {
          during = performance.now() - event.timeStamp;
          onReport(during)
        });
      });
    }
  });
};

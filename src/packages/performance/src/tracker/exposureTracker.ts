import { utils } from "./utils";

type ExposureData = {
  element: HTMLElement;
  startTime: number;
  lastRatio: number;
  hasRecorded: boolean;
};

type parameterType = {
  onReport: (data: {
    element: HTMLElement;
    elementInfo: Record<string, any>;
  }) => void;
};
type ExposureTracker = {
  init: (parameter: parameterType) => void;
};

const createExposureTracker = (): ExposureTracker => {
  const trackedElements = new Map<string, ExposureData>();

  let observer: IntersectionObserver | null = null;
  let isChecking = false;

  let config = {} as parameterType;

  const getAnalyticsId = (element: HTMLElement): string | null => {
    return element.getAttribute("data-analytics-id");
  };

  const createDefaultTrackerItem = ({ element, ratio }) => {
    return {
      element,
      startTime: 0,
      lastRatio: ratio,
      hasRecorded: false,
    };
  };

  const isRatioInShow = (ratio: number) => ratio >= 0.5;

  const maxDuration = 2000;

  const analyticsExposeFlag = "data-analytics-expose";

  const batchCheckExposure = () => {
    const now = utils.getTimestamp();
    let hasVisibleElements = false;
    // console.log('trackedElements', trackedElements.size)

    trackedElements.forEach((data, elementId) => {
      if (!data.startTime || data.hasRecorded) {
        // not started or have been recorded, we should skip this
        return;
      }

      const duration = now - data.startTime;
      const currentRatio = data.lastRatio;

      let hasShow = isRatioInShow(currentRatio);

      if (!hasShow) {
        // reset, only displayed part on page
        data.hasRecorded = false;
      } else {
        if (duration >= maxDuration && data.startTime && !data.hasRecorded) {
          recordExposureEnd(data.element, elementId, duration);
          data.hasRecorded = true; // record it，
        } else {
          // there are some data not attach the time, so i should mark there still have tasks
          hasVisibleElements = true;
        }
      }
    });

    if (hasVisibleElements) {
      // check all again;
      requestAnimationFrame(batchCheckExposure);
    } else {
      isChecking = false;
    }
  };

  const startChecking = () => {
    if (!isChecking && trackedElements.size > 0) {
      isChecking = true;
      requestAnimationFrame(batchCheckExposure);
    }
  };

  /**
   * update tracker properties
   */
  const handleElementVisible = (
    element: HTMLElement,
    elementId: string,
    entry: IntersectionObserverEntry
  ) => {
    const ratio = entry.intersectionRatio;

    let existingData = trackedElements.get(elementId);

    if (!existingData) {
      existingData = createDefaultTrackerItem({ element, ratio });
      trackedElements.set(elementId, existingData);
    }

    // update current visible ratio
    existingData.lastRatio = ratio;

    if (isRatioInShow(ratio)) {
      if (!existingData.startTime) {
        existingData.startTime = utils.getTimestamp();
      }
    } else {
      // only display a little part, so i should update this to indicate that this element is not beginning
      existingData.startTime = 0;
    }
  };

  /**
   *
   */
  const handleElementFullyHidden = (
    element: HTMLElement,
    elementId: string
  ) => {
    trackedElements.delete(elementId); // remove this tracker

    if (!element.isConnected) {
      untrackElement(element);
    }
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const element = entry.target as HTMLElement;
      const elementId = getAnalyticsId(element);

      if (!elementId) {
        // no id here, we should untrack it
        untrackElement(element);
        return;
      }

      if (entry.isIntersecting) {
        handleElementVisible(element, elementId, entry);
      } else {
        // totally hidden
        handleElementFullyHidden(element, elementId);
      }
    });
    // always checking if we have extra tasks
    startChecking();
  };

  const recordExposureEnd = (
    element: HTMLElement,
    elementId: string,
    duration: number
  ) => {
    const elementInfo = utils.getElementInfo(element);
    // utils.log('元素曝光结束', { elementId, duration, elementInfo });

    config?.onReport?.({ element, elementInfo });
  };

  let observed = false;
  const observeDOMChanges = () => {
    if (!window.MutationObserver || observed) return;

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          const element = node as HTMLElement;
          if (element.nodeType === 1) {
            if (element.hasAttribute(`${analyticsExposeFlag}`)) {
              trackElement(element);
              // return;
            }

            const childElements = element.querySelectorAll(
              `[${analyticsExposeFlag}]`
            );
            childElements.forEach((childElement) => {
              trackElement(childElement as HTMLElement);
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    observed = true;
  };

  const autoTrackElements = () => {
    const elements = document.querySelectorAll(`[${analyticsExposeFlag}]`);
    elements.forEach((element) => {
      trackElement(element as HTMLElement);
    });
    //
    observeDOMChanges();
  };

  const trackElement = (element: HTMLElement) => {
    // debugger
    if (!observer || !element) {
      return;
    }
    observer.observe(element);
  };

  const untrackElement = (element: HTMLElement) => {
    if (!observer || !element) {
      return;
    }

    observer.unobserve(element);

    const elementId = getAnalyticsId(element);
    if (elementId) {
      trackedElements.delete(elementId);
    }
  };

  const init = (parameter: parameterType) => {
    if (!window.IntersectionObserver) {
      utils.log("not support");
      return;
    }

    try {
      observer = new IntersectionObserver(handleIntersection, {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      });

      autoTrackElements();
      config = Object.assign(config, parameter);
    } catch (error) {
      utils.log("tracker init failed", error);
    }
  };

  return {
    init,
  };
};

export const exposureTracker = createExposureTracker();

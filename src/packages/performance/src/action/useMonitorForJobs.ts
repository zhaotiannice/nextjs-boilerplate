type movingLogType = {
  key: string;
  time: number;
};

const allowReportMultiple = true;

const globalRecordKey = {
  key: "key",
  positions: "positions",
  duration: "duration",
  rect: "rect",
  textStructure: "textStructure",
  movingLogs: "movingLogs",
};

const createRecorder = (key: any) => {
  return {
    [globalRecordKey.key]: key,
    [globalRecordKey.duration]: 0,
    [globalRecordKey.positions]: [],
    [globalRecordKey.rect]: 0,
    [globalRecordKey.textStructure]: {},
    [globalRecordKey.movingLogs]: [],
  };
};

let logs = [] as any[];
if (typeof window !== "undefined") {
  (window as any).logs = logs;
}

const getRect = (element: HTMLElement) => {
  const { width, height } = element.getBoundingClientRect();
  return `${width | 0}.${height | 0}`;
};

const getHtmlStructure = (element: HTMLElement) => {
  const getByRole = (role: any) => {
    return element.querySelector(`[data-role="${role}"]`);
  };

  let getAllByRole = (role: string) => {
    return element.querySelectorAll(`[data-role="${role}"]`);
  };

  const header = getByRole("header")?.textContent || "";
  const salary = getByRole("salary")?.textContent || "";
  const salaryType = getByRole("salaryType")?.textContent || "";

  const tags: any[] = [];
  getAllByRole("tags").forEach?.((v: HTMLElement) => tags.push(v.innerText));

  const name = getByRole("company")?.textContent;

  return { header, salary, salaryType, tags, name };
};

const getRecorder = (() => {
  let currentRecorder = createRecorder(undefined);
  //
  return ({ key, monitorKey }: any) => {
    if (key !== currentRecorder.key) {
      currentRecorder = createRecorder(key);

      // [monitorKey] ||
      const arr = logs || [];
      arr.push(currentRecorder);
      logs = arr;
    }
    return currentRecorder;
  };
})();

const now = () => Date.now();

const logPosition = ({ key, event, rootElement, monitorKey }: any) => {
  const recorder = getRecorder({ key, monitorKey });
  let relativeX;
  let relativeY;
  const e = event;

  const rootRect = rootElement.getBoundingClientRect();
  relativeX = e.clientX - rootRect.left;
  relativeY = e.clientY - rootRect.top;

  const y = relativeY | 0;

  // why the Y will add 1, i should avoid parsing the 30 into 3
  const position = parseFloat(`${relativeX | 0}.${y < 0 ? 0 : y}1`);
  const pos = recorder[globalRecordKey.positions];
  const time = pos.length ? now() - pos[1] : now();

  pos.push(position, time);
};

const createWindowMoving = ({
  logMovingEvent,
  element,
}: {
  logMovingEvent: Function;
  element: HTMLElement;
}) => {
  let windowMovingBind = false;

  const windowMoving = (event: any) => {
    const keyStr = "data-observer-key";
    const target = event.target as HTMLElement;
    const closestObserverElement = target.closest(`[${keyStr}]`);
    const key = closestObserverElement?.getAttribute?.(keyStr);

    if (element === target || element.contains(target)) {
      // still in thr same element container
      logMovingEvent(key);
      return;
    }

    // in this case, user has moved the mouse out of the element
    destroyWindowMoving();
  };

  const bindWindowMoving = () => {
    if (!windowMovingBind) {
      window.addEventListener("mousemove", windowMoving);
      windowMovingBind = true;
    }
  };

  const destroyWindowMoving = () => {
    window.removeEventListener("mousemove", windowMoving);
    windowMovingBind = false;
    // console.log("destroyWindowMoving", element);
  };

  return {
    bindWindowMoving,
    destroyWindowMoving,
  };
};

const initMovingObj = (key = undefined) => ({ key, startTime: now() });

const createMouseAction = ({
  onFinished,
  minTime,
  key,
  onStart,
  ele,
  monitorKey,
}: any) => {
  let enterTime = 0;
  let lastTime = 0;
  const throttleDelay = 50;

  const element = ele as HTMLElement;

  let movingLogs: movingLogType[] = [];
  let globalMovingObj = initMovingObj();

  const logMovingEvent = (key: any) => {
    const preKey = globalMovingObj.key;

    if (key !== preKey) {
      // not the same key, so i should record the previous key
      if (preKey) {
        movingLogs.push({
          key: preKey,
          time: now() - globalMovingObj.startTime,
        });
      }
      // init a new moving object
      globalMovingObj = initMovingObj(key);
      return;
    }
  };

  const { destroyWindowMoving, bindWindowMoving } = createWindowMoving({
    logMovingEvent,
    element,
  });

  const mouseEnter = (e: any) => {
    enterTime = Date.now();
    const recorder = getRecorder({ key, monitorKey });
    recorder[globalRecordKey.rect] = getRect(element);
    recorder[globalRecordKey.textStructure] = getHtmlStructure(element);

    logPosition({ key, event: e, rootElement: ele, monitorKey });
    onStart();

    element.addEventListener("mouseleave", mouseleave);
    element.addEventListener("mousemove", handleMouseMove);

    bindWindowMoving();
  };

  // moveHandler for this ele
  const handleMouseMove = (event: any) => {
    const currentTime = now();
    if (currentTime - lastTime >= throttleDelay) {
      // 每 50ms 记录一次
      logPosition({ key, event, rootElement: ele, monitorKey });
      lastTime = currentTime;
    }
  };

  const mouseleave = (event: any) => {
    logPosition({ key, event, rootElement: ele, monitorKey });

    // has been moved out of the element but here is still moving object
    // it seems that user scroll to bottom quickly by hand
    const movingKey = globalMovingObj.key;
    const oldGlobalMovingObj = globalMovingObj;

    if (movingKey) {
      logMovingEvent(movingKey);
      globalMovingObj = initMovingObj();
    }

    destroyEventListener({ destroyEnter: false });

    const total = now() - enterTime;
    const recorder = getRecorder({ key, monitorKey });
    recorder[globalRecordKey.duration] = total;
    recorder[globalRecordKey.movingLogs] = movingLogs;

    // reset
    enterTime = 0;
    movingLogs = [];

    onFinished?.(total);
  };

  const destroyEventListener = ({ destroyEnter = true }) => {
    if (destroyEnter) {
      element.removeEventListener("mouseenter", mouseEnter);
    }

    element.removeEventListener("mouseleave", mouseleave);
    element.removeEventListener("mousemove", handleMouseMove);

    destroyWindowMoving();
  };

  element.addEventListener("mouseenter", mouseEnter);

  // console.log("key", key);
  return {
    destroy: () => {
      destroyEventListener({ destroyEnter: true });
    },
  };
};

function createMonitorForJobs({
  duration = 2000,
  onSend = (data: any) => {},
} = {}) {
  const itemRefs = new Map();
  const monitoringRef = new Map();
  const finishedRef = new Set();
  let observeRef = null;
  const handlerRef = {};
  const monitorKeyRef = `${Math.random()}`;

  let onSendRef = onSend || null;

  function sendCallback(data) {
    const reportArray = [];
    const allowReportMultiple = true; // 可以根据需要调整

    data.forEach((key) => {
      let shouldAdd = true;
      if (allowReportMultiple || (shouldAdd = !finishedRef.has(key))) {
        shouldAdd && finishedRef.add(key);
        reportArray.push(key);
      }
    });

    if (reportArray.length && onSendRef) {
      onSendRef(reportArray);
    }
  }

  function attachMoveListener(key, newEle, oldEle) {
    const action = handlerRef[key];

    if (oldEle && action && action.destroy) {
      action.destroy();
    }

    if (newEle) {
      handlerRef[key] = createMouseAction({
        onStart() {},
        monitorKey: monitorKeyRef,
        ele: newEle,
        key,
        minTime: 500,
        onFinished(time) {
          console.log({ key, time });
        },
      });
    }
  }

  function initializeObserver() {
    let hasRun = false;
    let scrollEndTimer = 0;

    function resetScrollTimer() {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = 0;
    }

    function scrollingCallback() {
      if (scrollEndTimer) {
        resetScrollTimer();
        sendData();
      }
    }

    function scrollCallbackEnd() {
      scrollEndTimer = window.setTimeout(() => {
        resetScrollTimer();
        sendData();
      }, duration);
    }

    const newMonitoringKeys = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();

        entries.forEach((entry) => {
          const target = entry.target;
          const itemId = target.getAttribute("data-item-id");
          const fullDisplay =
            entry.isIntersecting && entry.intersectionRatio === 1;

          const allMonitoringMap = monitoringRef;

          if (fullDisplay) {
            if (!allMonitoringMap.has(itemId)) {
              allMonitoringMap.set(itemId, now);
              newMonitoringKeys.set(itemId, now);
            }
          } else {
            // remove items
            const time = allMonitoringMap.get(itemId) || 0;
            if (time) {
              allMonitoringMap.delete(itemId);
              newMonitoringKeys.delete(itemId);
            }
          }
        });

        if (!hasRun) {
          scrollCallbackEnd();
          hasRun = true;
        }
      },
      { threshold: 1.0 }
    );

    observeRef = observer;

    // 观察所有已注册的元素
    itemRefs.forEach((element, key) => {
      if (element) {
        observer.observe(element);
        attachMoveListener(key, element, element);
      }
    });

    function sendData() {
      const map = newMonitoringKeys;
      const now = Date.now();
      const shouldSend = [];

      map.forEach((time, key) => {
        if (now - time >= duration) {
          shouldSend.push(key);
          newMonitoringKeys.delete(key);
        }
      });

      if (shouldSend.length) {
        sendCallback(shouldSend);
      }
    }

    window.addEventListener("scroll", scrollingCallback);
    window.addEventListener("scrollend", scrollCallbackEnd);

    // 返回清理函数
    return function cleanup() {
      window.removeEventListener("scroll", scrollingCallback);
      window.removeEventListener("scrollend", scrollCallbackEnd);
      observer.disconnect();
      clearTimeout(scrollEndTimer);
      itemRefs.clear();
    };
  }

  let cleanupObserver = null;

  // 初始化观察器
  function init() {
    if (cleanupObserver) {
      cleanupObserver();
    }
    cleanupObserver = initializeObserver();
    return cleanupObserver;
  }

  // 注册元素的方法
  function registerItem(itemId, element) {
    if (element && itemId) {
      // element.setAttribute("data-item-id", itemId);
      const oldElement = itemRefs.get(itemId);
      const observe = observeRef;

      if (oldElement !== element && observe) {
        if (oldElement) {
          observe.unobserve(oldElement);
        }
        observe.observe(element);
        attachMoveListener(itemId, element, oldElement);
      }
      itemRefs.set(itemId, element);
    }
  }

  // 更新配置的方法
  function updateConfig(newConfig) {
    if (newConfig.duration !== undefined) {
      duration = newConfig.duration;
    }
    if (newConfig.onSend !== undefined) {
      onSendRef = newConfig.onSend;
    }
  }

  // 销毁方法
  function destroy() {
    if (cleanupObserver) {
      cleanupObserver();
      cleanupObserver = null;
    }

    // 清理所有处理器
    Object.values(handlerRef).forEach((handler: any) => {
      if (handler && handler.destroy) {
        handler.destroy();
      }
    });

    itemRefs.clear();
    monitoringRef.clear();
    finishedRef.clear();
    observeRef = null;
  }

  // 返回公共方法
  return {
    init,
    registerItem,
    updateConfig,
    destroy,
    get monitoringMap() {
      return new Map(monitoringRef);
    },
    get finishedItems() {
      return new Set(finishedRef);
    },
  };
}

let tracker = createMonitorForJobs({
  onSend(e) {
    console.log("ele");
  },
});
tracker.init();

export const initActionRun = () => {
  if (!window.MutationObserver) return;

  let getId = (element: HTMLElement) => {
    return element.getAttribute?.("data-analytics-id");
  };

  const getElements = (node: HTMLElement) => {
    return node.querySelectorAll
      ? node.querySelectorAll("[data-analytics-id]")
      : [];
  };

  const addAllChildren = (node: HTMLElement) => {
    getElements(node).forEach((element) => {
      let id = getId(element);
      if (id) {
        tracker.registerItem(id, element);
      }
    });
  };

  addAllChildren(document.body);

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node: HTMLElement) {
        if (node.nodeType === 1) {
          let id;
          if ((id = getId(node))) {
            tracker.registerItem(id, node);
          }
          addAllChildren(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

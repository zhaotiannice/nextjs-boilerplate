/* eslint-disable @typescript-eslint/no-explicit-any */

const redirectSessionKey = "page_redirect_source";

function generateNonUniqueKey(options: any = {}) {
  const {
    prefix = "",
    storage = true,
    fallback = true,
    storageKey = "_app_nonunique_key",
  } = options;

  if (storage) {
    try {
      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) return storedKey;
    } catch (e) {
      console.warn("LocalStorage access denied, trying sessionStorage");
      try {
        const sessionKey = sessionStorage.getItem(storageKey);
        if (sessionKey) return sessionKey;
      } catch (e) {
        console.warn("SessionStorage also unavailable, generating new key");
      }
    }
  }

  let id;
  try {
    const perf = window.performance || Date;
    id = perf.now().toString(36).replace(".", "");

    if (window.crypto?.getRandomValues) {
      const randArr = new Uint8Array(2);
      window.crypto.getRandomValues(randArr);
      id += Array.from(randArr)
        .map((b) => b.toString(36))
        .join("");
    } else {
      id += Math.random().toString(36).substr(2, 6);
    }
  } catch (e) {
    if (!fallback) throw new Error("Key generation failed");
    id = "fk_" + Date.now().toString(36) + Math.floor(Math.random() * 999);
  }

  const key = prefix + id;

  if (storage) {
    try {
      localStorage.setItem(storageKey, key);
    } catch (e) {
      try {
        sessionStorage.setItem(storageKey, key);
      } catch (e) {
        console.warn("Persistent storage unavailable, using volatile key");
      }
    }
  }

  return key;
}

function getCurrentRouteInfo() {
  return {
    href: window.location.href,
    title: document.title,
  };
}

function getDeviceKeyAndRouteInfo(prefix = "device_") {
  const deviceKey = generateNonUniqueKey(prefix);

  const routeInfo = getCurrentRouteInfo();

  return {
    deviceKey,
    routeInfo,
  };
}

function getEnhancedReferrer() {
  let referrer = "";

  try {
    referrer = document.referrer || "";
    if (!referrer) {
      // 如果获取不到，直接使用 session 里面的数据来使用
      const sessionData = JSON.parse(
        sessionStorage.getItem(redirectSessionKey) || "{}"
      );

      referrer = sessionData?._source || "";
    }

    return referrer;
  } catch (e) {
    return "";
  }
}

interface UserInfo {
  name: string | null;
  id: string | null;
}

const getUserInfo = (): UserInfo | null => {
  try {
    const userData = localStorage.getItem("user");
    if (!userData) return null;

    const user = JSON.parse(userData);
    if (!user || typeof user !== "object") return null;

    return {
      name: user.name || null,
      id: user.id || null,
    };
  } catch {
    return null;
  }
};

function addDataBeforeNavigation() {
  window.addEventListener("beforeunload", (e) => {
    const sessionKey = redirectSessionKey;

    const mergedData = {
      // _timestamp: Date.now(),
      _source: window.location.href,
    };

    sessionStorage.setItem(sessionKey, JSON.stringify(mergedData));
  });
}
addDataBeforeNavigation();

const getPathName = () => {
  let { origin, pathname } = window.location;
  let currentPath = origin + pathname;

  return currentPath;
};

export const reportPageView = ({ onReport }) => {
  const deviceInfo = getDeviceKeyAndRouteInfo();
  const userInfo = getUserInfo();

  const parameter = {
    userInfo,
    location: "ph",
    language: "en",
    otherPageViewData: {},
    from: getEnhancedReferrer() || "",
    ...deviceInfo.routeInfo,
  };

  onReport?.(parameter);

  let last = getPathName() || "";

  // just for SPA
  const observeDom = () => {
    const run = () => {
      let currentPath = getPathName();

      try {
        if (last !== currentPath) {
          let routeInfo = getDeviceKeyAndRouteInfo().routeInfo;

          let newParameters = {
            ...parameter,
            from: last,
            ...routeInfo,
          };

          onReport?.(JSON.parse(JSON.stringify(newParameters)));

          last = currentPath;
        }
      } catch (error) {
        console.log(error);
      }
    };

    const observer = new MutationObserver((mutationList, observer) => {
      let shouldRun = false;
      for (const mutation of mutationList) {
        // when you routing between two routers, those doms should be modified anyway
        // otherwise, this does't work well in spa route
        if (mutation.type === "childList") {
          // dom has changed
          shouldRun = true;
          break;
        }
      }
      if (shouldRun) {
        run();
      }
    });
    observer.observe(document.body, { childList: true });

    return () => {
      observer.disconnect();
    };
  };

  observeDom();
};

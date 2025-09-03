function isInIframeSafe() {
  try {
    if (window.self !== window.top) return true;

    if (window.parent !== window.self) return true;

    return window.frameElement !== null;
  } catch (e) {
    return true;
  }
}

export function getEnhancedReferrer() {
  // const isFrame = isInIframeSafe();
  let referrer = "";

  try {
    // 如果说不在 iframe 中的时候，直接使用session的埋点，记录上一次访问的页面
    referrer = document.referrer || "";

    // if (isFrame) {
    //   try {
    //     const parentUrl = window.parent.location.href;
    //     return {
    //       type: "iframe_parent",
    //       url: parentUrl,
    //       referrer: referrer,
    //       isCrossOrigin: false,
    //     };
    //   } catch (e) {
    //     return {
    //       type: "iframe_parent_cross_origin",
    //       url: "",
    //       referrer: referrer,
    //       isCrossOrigin: true,
    //     };
    //   }
    // }

    return {
      // type: referrer ? "external" : "direct",
      referrer: referrer,
      // isCrossOrigin: false,
    };
  } catch (e) {
    return {
      // type: "error",
      referrer: "",
      // isCrossOrigin: false,
    };
  }
}

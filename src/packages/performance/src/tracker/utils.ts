export const utils = {
  generateId: function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  getTimestamp: function () {
    return Date.now();
  },

  getPageInfo: function () {
    return {
      url: window.location.href,
      title: document.title,
    };
  },

  getDeviceInfo: function () {
    const ua = navigator.userAgent;
    return {
      userAgent: ua,
      language: navigator.language,
      // platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  },

  getSessionInfo: function () {
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = utils.generateId();
      localStorage.setItem('analytics_session_id', sessionId);
    }

    return {
      sessionId: sessionId,
      startTime: parseInt(localStorage.getItem('analytics_session_start') || `${utils.getTimestamp()}`),
      pageViews: parseInt(localStorage.getItem('analytics_page_views') || '0')
    };
  },

  getElementInfo: function (element) {
    if (!element || !element.tagName) return {};

    const info = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      text: element.textContent ? element.textContent.substring(0, 100).trim() : '',
      href: element.href || '',
      src: element.src || '',
      alt: element.alt || '',
      title: element.title || '',
      position: {}
    };

    const customAttrs = ['data-id', 'data-name', 'data-type', 'data-category'];
    customAttrs.forEach(function (attr) {
      if (element.getAttribute(attr)) {
        info[attr.replace('data-', '')] = element.getAttribute(attr);
      }
    });

    const rect = element.getBoundingClientRect();
    info.position = {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      area: Math.round(rect.width * rect.height)
    };

    return info;
  },

  getVisibleRatio: function (element) {
    if (!element) return 0;

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));

    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = rect.width * rect.height;

    return totalArea > 0 ? visibleArea / totalArea : 0;
  },

  log: function (message, data: any = '') {
    console.log('[Analytics]', message, data || '');
    // if (config.debug) {
    //   console.log('[Analytics]', message, data || '');
    // }
  }
};


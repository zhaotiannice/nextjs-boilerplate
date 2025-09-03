/**
 * 前端埋点分析库
 * 类似 Google Analytics 的实现方式
 * 使用方法：只需要引入此 JS 文件，然后调用相应的 API
 */


// device page user info， 浏览器生成用户唯一id
// 数据临时缓冲池，管理数据上报
// 页面的元素点击埋点，需要配合开发人员给元素打标识，不可能任意元素都打埋点
(function (window, document) {
  'use strict';

  // 配置对象
  var config = {
    // 上报服务器地址
    endpoint: 'https://your-analytics-server.com/collect',
    // 项目 ID
    projectId: '',
    // 是否开启调试模式
    debug: false,
    // 采样率 (0-1)
    sampleRate: 1.0,
    // 批量上报间隔 (毫秒)
    batchInterval: 5000,
    // 批量上报大小
    batchSize: 10,
    // 用户标识
    userId: null,
    // 会话标识
    sessionId: null,
    // 设备信息
    deviceInfo: null,
    // 曝光追踪配置
    exposure: {
      // 元素可见比例阈值 (0-1)
      threshold: 0.5,
      // 可见持续时间阈值 (毫秒)
      durationThreshold: 1000,
      // 是否自动追踪带有 data-analytics-expose 属性的元素
      autoTrack: true,
      // 曝光追踪的根元素 (默认是视口)
      root: null,
      // 根元素的边距
      rootMargin: '0px'
    }
  };

  // 数据队列
  var eventQueue = [];
  var timer = null;

  // 曝光追踪相关变量
  var exposureObserver = null;
  var exposureTimers = {};
  var exposureData = {};

  // 工具函数
  var utils = {
    // 生成唯一ID
    generateId: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // 获取时间戳
    getTimestamp: function () {
      return Math.floor(Date.now() / 1000);
    },

    // 获取页面信息
    getPageInfo: function () {
      return {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };
    },

    // 获取设备信息
    getDeviceInfo: function () {
      var ua = navigator.userAgent;
      return {
        userAgent: ua,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    },

    // 获取会话信息
    getSessionInfo: function () {
      var sessionId = localStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = utils.generateId();
        localStorage.setItem('analytics_session_id', sessionId);
      }
      return {
        sessionId: sessionId,
        startTime: parseInt(localStorage.getItem('analytics_session_start') || utils.getTimestamp()),
        pageViews: parseInt(localStorage.getItem('analytics_page_views') || '0')
      };
    },

    // 获取元素信息
    getElementInfo: function (element) {
      if (!element || !element.tagName) return {};

      var info = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || '',
        className: element.className || '',
        text: element.textContent ? element.textContent.substring(0, 100).trim() : '',
        href: element.href || '',
        src: element.src || '',
        alt: element.alt || '',
        title: element.title || ''
      };

      // 获取自定义属性
      var customAttrs = ['data-id', 'data-name', 'data-type', 'data-category'];
      customAttrs.forEach(function (attr) {
        if (element.getAttribute(attr)) {
          info[attr.replace('data-', '')] = element.getAttribute(attr);
        }
      });

      // 获取位置信息
      var rect = element.getBoundingClientRect();
      info.position = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        area: Math.round(rect.width * rect.height)
      };

      return info;
    },

    // 计算元素可见比例
    getVisibleRatio: function (element) {
      if (!element) return 0;

      var rect = element.getBoundingClientRect();
      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;

      // 计算元素在视口中的可见区域
      var visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
      var visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));

      var visibleArea = visibleWidth * visibleHeight;
      var totalArea = rect.width * rect.height;

      return totalArea > 0 ? visibleArea / totalArea : 0;
    },

    // 日志输出
    log: function (message, data) {
      if (config.debug) {
        console.log('[Analytics]', message, data || '');
      }
    }
  };

  // 曝光追踪器
  var exposureTracker = {
    // 初始化曝光追踪
    init: function () {
      if (!window.IntersectionObserver) {
        utils.log('IntersectionObserver 不支持，曝光追踪功能不可用');
        return;
      }

      try {
        exposureObserver = new IntersectionObserver(
          this.handleIntersection.bind(this),
          {
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
            root: config.exposure.root,
            rootMargin: config.exposure.rootMargin
          }
        );

        utils.log('曝光追踪器初始化成功');

        // 自动追踪带有特定属性的元素
        if (config.exposure.autoTrack) {
          this.autoTrackElements();
        }
      } catch (error) {
        utils.log('曝光追踪器初始化失败', error);
      }
    },

    // 处理元素交叉事件
    handleIntersection: function (entries) {
      entries.forEach(function (entry) {
        var element = entry.target;
        var elementId = element.getAttribute('data-analytics-id') || utils.generateId();

        if (!element.getAttribute('data-analytics-id')) {
          element.setAttribute('data-analytics-id', elementId);
        }

        if (entry.isIntersecting) {
          // 元素进入视口
          this.handleElementVisible(element, elementId, entry);
        } else {
          // 元素离开视口
          this.handleElementHidden(element, elementId);
        }
      }.bind(this));
    },

    // 处理元素可见
    handleElementVisible: function (element, elementId, entry) {
      var visibleRatio = entry.intersectionRatio;
      var startTime = Date.now();

      // 记录曝光开始时间
      exposureData[elementId] = {
        element: element,
        startTime: startTime,
        visibleRatio: visibleRatio,
        entry: entry
      };

      // 设置定时器检查持续时间
      exposureTimers[elementId] = setTimeout(function () {
        this.checkExposureDuration(element, elementId);
      }.bind(this), config.exposure.durationThreshold);

      utils.log('元素开始可见', {
        elementId: elementId,
        visibleRatio: visibleRatio,
        elementInfo: utils.getElementInfo(element)
      });
    },

    // 处理元素隐藏
    handleElementHidden: function (element, elementId) {
      // 清除定时器
      if (exposureTimers[elementId]) {
        clearTimeout(exposureTimers[elementId]);
        delete exposureTimers[elementId];
      }

      // 如果已经曝光，记录曝光结束
      if (exposureData[elementId]) {
        var exposureInfo = exposureData[elementId];
        var duration = Date.now() - exposureInfo.startTime;

        if (duration >= config.exposure.durationThreshold) {
          this.recordExposureEnd(element, elementId, duration);
        }

        delete exposureData[elementId];
      }
    },

    // 检查曝光持续时间
    checkExposureDuration: function (element, elementId) {
      if (!exposureData[elementId]) return;

      var exposureInfo = exposureData[elementId];
      var currentRatio = utils.getVisibleRatio(element);

      // 检查是否达到阈值
      if (currentRatio >= config.exposure.threshold) {
        this.recordExposureStart(element, elementId, exposureInfo);
      }
    },

    // 记录曝光开始
    recordExposureStart: function (element, elementId, exposureInfo) {
      var elementInfo = utils.getElementInfo(element);

      reporter.sendEvent({
        type: 'exposure_start',
        elementId: elementId,
        elementInfo: elementInfo,
        exposureInfo: {
          visibleRatio: exposureInfo.visibleRatio,
          startTime: exposureInfo.startTime,
          threshold: config.exposure.threshold
        }
      });

      utils.log('元素曝光开始', {
        elementId: elementId,
        elementInfo: elementInfo
      });
    },

    // 记录曝光结束
    recordExposureEnd: function (element, elementId, duration) {
      var elementInfo = utils.getElementInfo(element);

      reporter.sendEvent({
        type: 'exposure_end',
        elementId: elementId,
        elementInfo: elementInfo,
        exposureInfo: {
          duration: duration,
          endTime: Date.now()
        }
      });

      utils.log('元素曝光结束', {
        elementId: elementId,
        duration: duration,
        elementInfo: elementInfo
      });
    },

    // 自动追踪元素
    autoTrackElements: function () {
      // 追踪带有 data-analytics-expose 属性的元素
      var elements = document.querySelectorAll('[data-analytics-expose]');
      elements.forEach(function (element) {
        this.trackElement(element);
      }.bind(this));

      // 监听动态添加的元素
      this.observeDOMChanges();
    },

    // 观察 DOM 变化
    observeDOMChanges: function () {
      if (!window.MutationObserver) return;

      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) { // 元素节点
              // 检查新添加的元素
              if (node.hasAttribute && node.hasAttribute('data-analytics-expose')) {
                exposureTracker.trackElement(node);
              }

              // 检查子元素
              var childElements = node.querySelectorAll ? node.querySelectorAll('[data-analytics-expose]') : [];
              childElements.forEach(function (element) {
                exposureTracker.trackElement(element);
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    // 追踪单个元素
    trackElement: function (element) {
      if (!exposureObserver || !element) return;

      exposureObserver.observe(element);
      utils.log('开始追踪元素曝光', utils.getElementInfo(element));
    },

    // 停止追踪元素
    untrackElement: function (element) {
      if (!exposureObserver || !element) return;

      exposureObserver.unobserve(element);
      var elementId = element.getAttribute('data-analytics-id');
      if (elementId) {
        delete exposureData[elementId];
        if (exposureTimers[elementId]) {
          clearTimeout(exposureTimers[elementId]);
          delete exposureTimers[elementId];
        }
      }
    },

    // 手动触发曝光事件
    triggerExposure: function (element, customData) {
      if (!element) return;

      var elementInfo = utils.getElementInfo(element);
      var visibleRatio = utils.getVisibleRatio(element);

      reporter.sendEvent({
        type: 'exposure_manual',
        elementId: element.getAttribute('data-analytics-id') || utils.generateId(),
        elementInfo: elementInfo,
        exposureInfo: {
          visibleRatio: visibleRatio,
          timestamp: Date.now(),
          customData: customData || {}
        }
      });
    },

    // 获取曝光统计
    getExposureStats: function () {
      var stats = {
        trackedElements: Object.keys(exposureData).length,
        activeTimers: Object.keys(exposureTimers).length,
        observerActive: !!exposureObserver
      };

      return stats;
    }
  };

  // 数据上报器
  var reporter = {
    // 发送单个事件
    sendEvent: function (eventData) {
      if (Math.random() > config.sampleRate) {
        utils.log('事件被采样过滤', eventData);
        return;
      }

      // 添加基础信息
      var data = {
        projectId: config.projectId,
        timestamp: utils.getTimestamp(),
        userId: config.userId,
        sessionId: config.sessionId,
        pageInfo: utils.getPageInfo(),
        deviceInfo: config.deviceInfo,
        ...eventData
      };

      // 添加到队列
      eventQueue.push(data);
      utils.log('事件已添加到队列', data);

      // 检查是否需要立即发送
      if (eventQueue.length >= config.batchSize) {
        this.flush();
      } else if (!timer) {
        timer = setTimeout(function () {
          reporter.flush();
        }, config.batchInterval);
      }
    },

    // 批量发送数据
    flush: function () {
      if (eventQueue.length === 0) return;

      var events = eventQueue.splice(0, config.batchSize);
      utils.log('开始批量上报', events);

      // 使用 beacon API 或 fetch 发送数据
      if (navigator.sendBeacon) {
        var success = navigator.sendBeacon(
          config.endpoint,
          JSON.stringify({
            events: events,
            timestamp: utils.getTimestamp()
          })
        );
        if (success) {
          utils.log('数据上报成功 (beacon)', events.length);
        } else {
          utils.log('数据上报失败 (beacon)', events.length);
          // 失败时重新加入队列
          eventQueue.unshift(...events);
        }
      } else {
        // 降级到 fetch
        fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            events: events,
            timestamp: utils.getTimestamp()
          })
        }).then(function (response) {
          if (response.ok) {
            utils.log('数据上报成功 (fetch)', events.length);
          } else {
            throw new Error('HTTP ' + response.status);
          }
        }).catch(function (error) {
          utils.log('数据上报失败 (fetch)', error);
          // 失败时重新加入队列
          eventQueue.unshift(...events);
        });
      }

      // 清除定时器
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };

  // 事件追踪器
  var tracker = {
    // 页面浏览事件
    pageView: function (pageName, pageData) {
      var sessionInfo = utils.getSessionInfo();
      sessionInfo.pageViews++;
      localStorage.setItem('analytics_page_views', sessionInfo.pageViews.toString());

      reporter.sendEvent({
        type: 'pageview',
        pageName: pageName || document.title,
        pageData: pageData || {},
        sessionInfo: sessionInfo
      });
    },

    // 自定义事件
    event: function (eventName, eventData) {
      reporter.sendEvent({
        type: 'event',
        eventName: eventName,
        eventData: eventData || {}
      });
    },

    // 用户行为事件
    userAction: function (action, target, data) {
      reporter.sendEvent({
        type: 'user_action',
        action: action,
        target: target,
        data: data || {}
      });
    },

    // 错误事件
    error: function (error, context) {
      reporter.sendEvent({
        type: 'error',
        error: {
          message: error.message || error,
          stack: error.stack,
          name: error.name
        },
        context: context || {}
      });
    },

    // 性能事件
    performance: function (metric, value, data) {
      reporter.sendEvent({
        type: 'performance',
        metric: metric,
        value: value,
        data: data || {}
      });
    },

    // 曝光事件
    exposure: function (element, customData) {
      exposureTracker.triggerExposure(element, customData);
    }
  };

  // 自动追踪功能
  var autoTracker = {
    // 初始化自动追踪
    init: function () {
      this.trackPageViews();
      this.trackClicks();
      this.trackErrors();
      this.trackPerformance();
      this.trackExposure();
    },

    // 追踪页面浏览
    trackPageViews: function () {
      // 初始页面浏览
      tracker.pageView();

      // 监听页面变化 (SPA 应用)
      if (window.history && window.history.pushState) {
        var originalPushState = history.pushState;
        var originalReplaceState = history.replaceState;

        history.pushState = function () {
          originalPushState.apply(this, arguments);
          setTimeout(function () {
            tracker.pageView();
          }, 100);
        };

        history.replaceState = function () {
          originalReplaceState.apply(this, arguments);
          setTimeout(function () {
            tracker.pageView();
          }, 100);
        };

        window.addEventListener('popstate', function () {
          setTimeout(function () {
            tracker.pageView();
          }, 100);
        });
      }
    },

    // 追踪点击事件
    trackClicks: function () {
      document.addEventListener('click', function (e) {
        var target = e.target;
        var action = 'click';
        var data = {};

        // 获取元素信息
        if (target.tagName) {
          data.tagName = target.tagName.toLowerCase();
          data.id = target.id;
          data.className = target.className;
          data.text = target.textContent ? target.textContent.substring(0, 50) : '';
          data.href = target.href || '';
        }

        tracker.userAction(action, target, data);
      });
    },

    // 追踪错误
    trackErrors: function () {
      window.addEventListener('error', function (e) {
        tracker.error(e.error || e, {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno
        });
      });

      window.addEventListener('unhandledrejection', function (e) {
        tracker.error(e.reason, {
          type: 'unhandledrejection'
        });
      });
    },

    // 追踪性能指标
    trackPerformance: function () {
      if (window.performance && window.performance.timing) {
        window.addEventListener('load', function () {
          setTimeout(function () {
            var timing = performance.timing;
            var navigationStart = timing.navigationStart;

            // 页面加载时间
            tracker.performance('pageLoadTime', timing.loadEventEnd - navigationStart);

            // DOM 解析时间
            tracker.performance('domParseTime', timing.domContentLoadedEventEnd - navigationStart);

            // 首次内容绘制时间
            if (timing.responseStart > 0) {
              tracker.performance('firstByteTime', timing.responseStart - navigationStart);
            }
          }, 0);
        });
      }

      // 追踪资源加载性能
      if (window.performance && window.performance.getEntriesByType) {
        window.addEventListener('load', function () {
          setTimeout(function () {
            var resources = performance.getEntriesByType('resource');
            resources.forEach(function (resource) {
              tracker.performance('resourceLoad', resource.duration, {
                name: resource.name,
                type: resource.initiatorType,
                size: resource.transferSize
              });
            });
          }, 1000);
        });
      }
    },

    // 追踪曝光
    trackExposure: function () {
      // 等待 DOM 加载完成后初始化曝光追踪
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          exposureTracker.init();
        });
      } else {
        exposureTracker.init();
      }
    }
  };

  // 主 API
  var Analytics = {
    // 初始化
    init: function (options) {
      // 合并配置
      Object.assign(config, options);

      // 初始化设备信息
      config.deviceInfo = utils.getDeviceInfo();

      // 初始化会话信息
      var sessionInfo = utils.getSessionInfo();
      config.sessionId = sessionInfo.sessionId;

      // 生成用户ID (如果未提供)
      if (!config.userId) {
        config.userId = localStorage.getItem('analytics_user_id');
        if (!config.userId) {
          config.userId = utils.generateId();
          localStorage.setItem('analytics_user_id', config.userId);
        }
      }

      utils.log('Analytics 初始化完成', config);

      // 启动自动追踪
      autoTracker.init();

      // 页面卸载时发送剩余数据
      window.addEventListener('beforeunload', function () {
        reporter.flush();
      });
    },

    // 设置用户ID
    setUserId: function (userId) {
      config.userId = userId;
      localStorage.setItem('analytics_user_id', userId);
    },

    // 页面浏览
    pageView: tracker.pageView,

    // 自定义事件
    event: tracker.event,

    // 用户行为
    userAction: tracker.userAction,

    // 错误追踪
    error: tracker.error,

    // 性能追踪
    performance: tracker.performance,

    // 曝光追踪
    exposure: tracker.exposure,

    // 曝光追踪器方法
    trackExposure: exposureTracker.trackElement.bind(exposureTracker),
    untrackExposure: exposureTracker.untrackElement.bind(exposureTracker),
    getExposureStats: exposureTracker.getExposureStats.bind(exposureTracker),

    // 手动发送数据
    flush: reporter.flush,

    // 获取配置
    getConfig: function () {
      return Object.assign({}, config);
    },

    // 设置配置
    setConfig: function (newConfig) {
      Object.assign(config, newConfig);
    }
  };

  // 暴露到全局
  window.Analytics = Analytics;

  // 自动初始化 (如果配置了)
  if (window.AnalyticsConfig) {
    Analytics.init(window.AnalyticsConfig);
  }

})(window, document);

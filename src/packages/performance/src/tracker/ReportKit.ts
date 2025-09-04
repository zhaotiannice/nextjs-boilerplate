import { utils } from "./utils";

export class ReportKit {
  #queue: any[];
  #lastTimer: number;
  #pending: boolean;

  static instance: ReportKit;
  #deviceInfo: {
    userAgent: string;
    language: string;
    // platform: navigator.platform,
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    timezone: string;
  };
  #bindReportFun: any;
  #config: { endpoint: string };
  #requestThreshold: any;

  constructor({ endpoint, requestThreshold = 5000 }) {
    if (ReportKit.instance) {
      return ReportKit.instance;
    }

    this.#queue = [];
    this.#lastTimer = 0;
    this.#requestThreshold = requestThreshold;
    this.#pending = false;
    this.#config = { endpoint };

    this.#deviceInfo = utils.getDeviceInfo();
    this.#bindReportFun = this.#reportFun.bind(this);
    this.#init();
    return (ReportKit.instance = this);
  }

  #init() {
    this.#lastTimer = utils.getTimestamp();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        console.log("hide");
        this.#reportWithSendBeacon();
      }
    });

    window.requestAnimationFrame(this.#bindReportFun);
  }

  #pushTask(data: any) {
    if (Boolean(data)) {
      this.#queue.push(data);
    }
  }

  #getParameters() {
    return {
      deviceInfo: this.#deviceInfo,
      data: this.#queue,
    };
  }

  async #reportFun() {
    let newTime = utils.getTimestamp();
    let shouldSkipThisTask =
      !this.#queue.length ||
      this.#pending ||
      newTime - this.#lastTimer <= this.#requestThreshold;
    if (shouldSkipThisTask) {
      window.requestAnimationFrame(this.#bindReportFun);
      return;
    }

    this.#lastTimer = newTime;
    let len = this.#queue.length;
    try {
      this.#pending = true;

      // console.log('this.#getParameters()', this.#getParameters())

      let endpoint = this.#config.endpoint;

      await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(this.#getParameters()),
      });

      this.#queue.splice(0, len); // clear the
    } catch (error) {
      console.error(error, this.#queue.splice(0, len));
    } finally {
      this.#pending = false;
      this.#lastTimer = utils.getTimestamp();
    }

    window.requestAnimationFrame(this.#bindReportFun);
  }

  #reportWithSendBeacon() {
    if (this.#queue.length) {
      let data = this.#getParameters();

      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });

      let url = this.#config.endpoint;
      navigator.sendBeacon(url, blob);
    }
  }

  reportData({ type, data }: { type: string; data: any }) {
    try {
      this.#pushTask({
        type,
        logData: data,
        browserInfo: this.#deviceInfo,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

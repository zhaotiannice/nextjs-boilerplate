
// add listener for Back-Forward Cache（bfcache） action
let bfcacheRestoreTime = -1;
export const getBFCacheRestoreTime = () => bfcacheRestoreTime;

export const onBFCacheRestore = (cb) => {
  addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) {
        bfcacheRestoreTime = event.timeStamp;
        cb(event);
      }
    },
    true,
  );
};
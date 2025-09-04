/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";

import classNames from "classnames";

import { PreviewCard } from "../card";

import styles from "./index.module.scss";

const List = ({ data }: { data: any[] }) => {
  const [checkedIndex, setCheckIndex] = useState(0);
  const currentItem = data[checkedIndex];
  const isLast = checkedIndex === data.length - 1;

  console.log({ currentItem });
  return (
    <>
      <div className={styles.listRoot}>
        {data.map((v, idx) => {
          return (
            <div
              key={idx}
              className={classNames(
                styles.listItem,
                checkedIndex === idx && styles.checked
              )}
              //
              onClick={() => {
                setCheckIndex(idx);
              }}
            >
              {v.textStructure.header}
            </div>
          );
        })}
      </div>
      <div className={styles.rightPreviewRoot} key={checkedIndex}>
        {Boolean(currentItem) && (
          <PreviewCard
            item={currentItem}
            isLast={isLast}
            onFinished={() => {
              if (!isLast) {
                console.log("isLast", isLast);
                setCheckIndex((pre) => {
                  const result = pre + 1;
                  return result;
                });
              }
            }}
          />
        )}
      </div>
    </>
  );
};

export function PreviewList() {
  const logs = useMemo(() => {
    return (window as any).getLogs?.() || [];
  }, []);

  if (!logs?.length) {
    return (
      <div style={{ textAlign: "center", fontSize: 20, fontWeight: 500 }}>
        No logs
      </div>
    );
  }

  return <div className={styles.previewArea}>{<List data={logs} />}</div>;
}

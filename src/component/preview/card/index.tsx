/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";

import styles from "./index.module.scss";
import { JobCardPc } from "../../JobItem/index.pc";
import { getJobById } from "@/src/data/jobs";
// import { JobCard } from "../JobCard";

const SlidingTrajectory = ({ positions, width, height, onFinished }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentIndexRef = useRef(0);
  const animationRef = useRef<number>(-1);

  const trajectory = useMemo(() => {
    const result: any[] = [];
    positions.map((v: any, i: number) => {
      if (i % 2 === 0) {
        const [x, y] = `${v}`.split(".");
        result.push(+x, +y.slice(0, -1));
      } else {
        // time
        result.push(i === 1 ? 0 : v);
      }
    });
    return result;
  }, [positions]);
  // console.log({ positions });
  const dpr = window.devicePixelRatio || 1;
  const totalPadding = 8;
  const halfPadding = totalPadding / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    canvas.width = parseInt(width) * dpr + totalPadding * dpr;
    canvas.height = parseInt(height) * dpr + totalPadding * dpr;

    ctx.translate(4 * dpr, 4 * dpr);
    // console.log("dpr", dpr);

    // 清空画布（白色背景）
    // debugger;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 设置轨迹样式（红色、2px宽）
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; // 半透明红色
    ctx.lineWidth = 1; // 更细的线宽
    ctx.beginPath();

    const drawNextPoint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const currentIndex = currentIndexRef.current;

      // 终止条件
      if (currentIndex >= trajectory.length - 3) {
        onFinished();
        return;
      }

      const x = trajectory[currentIndex + 0] * dpr + halfPadding;
      // why we subtract with 1, because when we combine the  'x' and 'y'
      // we should avoid the y is end with 0,
      // eg:  x:30,y:20 => 30.2(x.y)
      // enhancement: x:30,y:20 => 30.21(x.y)
      const y = (trajectory[currentIndex + 1] - 1) * dpr - halfPadding;

      // 绘制轨迹
      if (currentIndex === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "red";
      ctx.lineWidth = 0.8 * dpr;
      ctx.stroke();

      // 绘制鼠标指针
      ctx.fillStyle = "rgba(0, 0, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(x, y, 1.5 * dpr, 0, Math.PI * 2);
      ctx.fill();

      const time =
        trajectory[currentIndexRef.current + 2] -
        (trajectory[currentIndexRef.current - 1] || 0);
      // 更新索引并设置下一次绘制
      currentIndexRef.current += 3;
      animationRef.current = window.setTimeout(drawNextPoint, time);
    };

    drawNextPoint();

    // 清理函数
    return () => {
      clearTimeout(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      //   className={styles.}
      style={{
        backgroundColor: "transparent",
        width: Number(width) + totalPadding,
        height: Number(height) + totalPadding,
        position: "absolute",
        top: -halfPadding,
        left: -halfPadding,
      }}
    />
  );
};

const Card = ({ item, onFinished }: { item: any; onFinished: any }) => {
  const {
    //  key,
    duration,
    positions,
    rect,
    textStructure,
  } = item;
  const [width, height] = rect.split(".");

  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const newItem = getJobById(Number(item.key));

  return (
    <div
      className={styles.card}
      style={{ width: width + "px", height: height + "px" }}
    >
      <JobCardPc item={newItem} />

      <SlidingTrajectory
        onFinished={() => {
          finishedRef.current?.();
        }}
        positions={positions}
        width={width}
        height={height}
      />
    </div>
  );
};

export const PreviewCard = ({ item, isLast, onFinished }: any) => {
  let { key, duration, positions, rect, textStructure } = item;
  // console.log("duration", duration, positions);
  duration = positions[positions.length - 1];
  const [countdown, setCountdown] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const timerRef = useRef(0);

  // 倒计时效果
  useEffect(() => {
    if (countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [countdown]);

  // 清除定时器
  const clearExistingTimer = () => {
    const timer = timerRef.current;

    if (timer) {
      clearTimeout(timer);
      // setTimer(null);
    }
    setCountdown(0);
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => clearExistingTimer();
  }, []);

  // 播放下一个项目
  const playNextItem = () => {
    clearExistingTimer();
    onFinished?.();
  };

  // 处理完成事件
  const handleFinished = () => {
    if (isLast) {
      return;
    }
    // 设置2秒倒计时
    setCountdown(2);

    // 设置定时器，2秒后自动播放
    const newTimer = window.setTimeout(() => {
      playNextItem();
    }, 2000);

    timerRef.current = newTimer;
    // setTimer(timerRef.current);
  };

  return (
    <div>
      <Card item={item} onFinished={handleFinished} />
      <div className={styles.timer}>
        <div>total: {(duration / 1000).toFixed(1)}s</div>
        {countdown > 0 && (
          <div className={styles.countdownContainer}>
            即将播放下一个项目: {countdown}s
            <button onClick={playNextItem}>立即播放</button>
          </div>
        )}
      </div>
    </div>
  );
};

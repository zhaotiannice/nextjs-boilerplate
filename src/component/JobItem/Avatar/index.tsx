import React from "react";
import styles from "./Avatar.module.scss"; // 假设使用 CSS Modules

interface AvatarProps {
  /** 用户名称，用于生成首字母 */
  name?: string;
  /** 头像图片地址，优先级高于 name */
  src?: string;
  /** 头像尺寸 */
  size?: number;
  /** 背景颜色 */
  bgColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = "",
  src,
  size = 32,
  bgColor,
  textColor = "#fff",
  className = "",
  style,
  ...props
}) => {
  // 生成首字母（取第一个字符的大写）
  const getInitials = (nameStr: string): string => {
    if (!nameStr.trim()) return "?";

    const names = nameStr.trim().split(" ");
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    // 如果有多个单词，取第一个和最后一个的首字母
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };

  // 如果没有提供背景色，根据名称生成一个确定性颜色
  const getDefaultBgColor = (nameStr: string): string => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#F9A826",
      "#6C5CE7",
      "#00B894",
      "#FD79A8",
      "#A29BFE"
    ];
    const charSum = nameStr.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  const initials = getInitials(name);
  const backgroundColor = bgColor || getDefaultBgColor(name);
  const fontSize = Math.max(size * 0.4, 12); // 根据尺寸调整字体大小

  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,
    fontSize,
    backgroundColor,
    color: textColor,
    ...style
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${styles.avatar} ${styles.avatarImage} ${className}`}
        style={style}
        {...props}
      />
    );
  }

  return (
    <div
      className={`${styles.avatar} ${styles.avatarInitials} ${className}`}
      style={avatarStyle}
      {...props}
    >
      {initials}
    </div>
  );
};

"use client";
import Link from "next/link";
import styles from "./index.module.scss";
import { useEffect, useState } from "react";

let key = "useLocal";

export const Header = () => {
  const [useLocalRoute, setUseLocalRoute] = useState(false);
  useEffect(() => {
    setUseLocalRoute(sessionStorage.getItem(key) === "true");
  }, []);

  const handleCheckboxChange = (event) => {
    let checked = event.target.checked;
    setUseLocalRoute(checked);
    sessionStorage.setItem(key, `${checked}`);
  };

  let Component = useLocalRoute ? Link : "a";

  return (
    <div className={styles.header}>
      Menus:
      <Component href={"/"}>Home</Component>
      <Component href="/onsite-jobs">Onsite</Component>
      <Component href="remote-jobs">Remote</Component>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={useLocalRoute}
          onChange={handleCheckboxChange}
        />
        client render
      </label>
    </div>
  );
};

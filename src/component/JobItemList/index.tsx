import { JobCardPc } from "../JobItem/index.pc";
import styles from "./index.module.scss";

export const JobItemList = ({ data = [] }) => {
  return (
    <>
      <div className={styles.jobListWrapper}>
        {data.map((item, index) => {
          return <JobCardPc item={item} key={index} />;
        })}
      </div>

      <p style={{ textAlign: "center", padding: 10 }}>The End~~</p>
    </>
  );
};

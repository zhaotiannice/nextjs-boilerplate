import styles from "./page.module.css";
import { Header } from "../../src/component/header";
import { JobItemList } from "../../src/component/JobItemList";
import { PageTitle } from "../../src/component/PageTitle";
import { getJobs } from "../../src/data/jobs";

export default async function Home() {
  let start = Date.now();

  const data = await getJobs();

  return (
    <>
      <div className={styles.page}>
        <span style={{ display: "none" }}>{Date.now() - start}</span>
        <Header />
        <PageTitle title="Remote Jobs" />
        <JobItemList data={data as any} />
      </div>
      <p>remote footer</p>
    </>
  );
}

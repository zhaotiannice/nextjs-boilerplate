// "use client";
import { Header } from "../../src/component/header";
import { JobItemList } from "../../src/component/JobItemList";
import { PageTitle } from "../../src/component/PageTitle";
import { getJobs } from "../../src/data/jobs";

export default async function Home() {
  // const [show, setShow] = useState(false);
  let start = Date.now();
  const data = await getJobs();

  return (
    <>
      <span style={{ display: "none" }}>{Date.now() - start}</span>

      <div>
        <Header />
        <PageTitle title="Home Page" />

        {/* <button
          onClick={(e) => {
            setShow(!show);
          }}
        >
          toogle
        </button> */}

        <JobItemList data={data as any} />
      </div>

      {/* {show && <iframe src="/" style={{ height: "50vh", width: "100vw" }} />} */}
      <footer>home footer</footer>
    </>
  );
}

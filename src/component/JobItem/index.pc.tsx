"use client";
import React, { useMemo, useState } from "react";
import styles from "./index.pc.module.scss";
import { Avatar } from "./Avatar";

function classNames(obj: any) {
  if (typeof obj !== "object" || obj === null) {
    return "";
  }

  const classes = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key]) {
        classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

const JobTags = ({ featureTags, normalTags, maxRow }: any) => {
  const styledFeatureTags = useMemo(() => {
    const colors = ["#E4FDFF", "#E8F3FF"];
    const getColor = () => {
      return colors[0];
    };

    return (featureTags || [])?.slice(0, 3)?.map((item: any) => {
      return {
        tag: item,
        style: { background: getColor() },
      };
    });
  }, [featureTags]);

  let totalTags = [].concat(styledFeatureTags, normalTags);

  if (!totalTags.length) {
    return null;
  }

  return (
    <div style={{ paddingTop: 4 }}>
      <div
        className={styles.listTag}
        style={{ maxHeight: maxRow * 24 + Math.max((maxRow - 1) * 8, 0) }}
      >
        {normalTags?.length > 0
          ? totalTags.map((item: any, index) => {
              let tag = item.tag || item;
              let style = item.style || null;
              return (
                <span
                  data-role="tags"
                  className={styles.jobCardLocationItem}
                  style={style}
                  key={index}
                >
                  {tag}
                </span>
              );
            })
          : null}
      </div>
    </div>
  );
};

const Company = ({ company }: any) => {
  //
  return (
    <div
      className={classNames({
        [styles.listCompany]: true,
      })}
    >
      <div
        className={classNames({
          [styles.listCompanyLogo]: true,
        })}
      >
        <Avatar name={company?.company_name} />
      </div>

      <div data-role="company">{company?.company_name}</div>
    </div>
  );
};

const Recruiter = ({ recruiter, company }: any) => {
  const { reply_label = "", reply_label_number = "" } = recruiter;

  let reply = reply_label;
  if (reply_label_number) {
    reply = reply?.replace(
      String(reply_label_number),
      `<span>${reply_label_number}</span>`
    );
  }

  return (
    <div className={styles.listCompany}>
      <div
        className={classNames({
          [styles.listCompanyLogo]: true,
          [styles.listCompanyLogoActive]: !recruiter?.is_online,
        })}
      >
        <Avatar name={recruiter?.full_name} />
      </div>

      <a className={styles.jobHireCompanyName}>
        <span className={styles.jobHireCompanyNameFullName}>
          {" "}
          {recruiter?.full_name}{" "}
        </span>
        <b>{recruiter?.job_title ? " · " : ""}</b>
        <span>{recruiter?.job_title ? recruiter?.job_title : ""}</span>
      </a>

      <span
        className={styles.listCompanyReply}
        dangerouslySetInnerHTML={{ __html: reply }}
      ></span>
    </div>
  );
};

const Salary = ({ salary_info }: any) => {
  return (
    <div className={styles.salary}>
      <span className={styles.salaryText}>
        <span data-role="salary">{salary_info?.text}</span>
        {salary_info?.type_text && (
          <span data-role="salaryType" className={styles.month}>
            [{salary_info?.type_text}]
          </span>
        )}
      </span>
    </div>
  );
};

const UrgentIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="14"
      viewBox="0 0 15 14"
      fill="none"
    >
      <path
        d="M10.2416 1.75098H6.0334C5.83777 1.75098 5.6605 1.86618 5.58105 2.04494L2.97486 7.90887C2.82938 8.23621 3.06899 8.60492 3.4272 8.60492H6.09248L4.78982 13.1642C4.73302 13.363 4.98066 13.5049 5.12343 13.3553L11.7669 6.39552C12.0676 6.08051 11.8443 5.55872 11.4088 5.55872H9.13868L10.6844 2.46736C10.8489 2.13823 10.6096 1.75098 10.2416 1.75098Z"
        fill="black"
      />
    </svg>
  );
};

export const JobCardPc = ({ item }: any) => {
  const {
    company = {},
    salary_info = {},
    job_tags = {},
    recruiter = {},
    card_tags = [],
  } = item || {};
  const featureTags = card_tags;

  const [moveIn, setMoveIn] = useState(false);

  return (
    <div
      key={item.job_id}
      className={classNames({
        [styles.listItem]: true,
      })}
      onMouseEnter={() => {
        setMoveIn(true);
      }}
      onMouseLeave={() => {
        setMoveIn(false);
      }}
      data-analytics-expose
      data-analytics-id={item.job_id}
      data-analytics-data={JSON.stringify({
        qid: `${item.query_id || "dfd9b85f-8891-11f0-b810-a693b77e93c8"}`,
        reco: `${item.reco_from || "es"}`,
        jobId: item.job_id,
      })}
    >
      <div className={styles.wrapper}>
        <div className={styles.jobHireTop}>
          <div
            className={classNames({
              [styles.jobHireTopTitle]: true,
            })}
          >
            <span data-role="header">{item.job_title}</span>

            {item?.is_urgent && (
              <span className={styles.jobHireTitleUrgent}>
                <UrgentIcon />
                {item?.urgent_text}
              </span>
            )}
          </div>

          <div className={styles.container}>
            <Salary salary_info={salary_info} />
          </div>

          <JobTags maxRow={1} featureTags={featureTags} normalTags={job_tags} />
        </div>

        {moveIn ? (
          <Recruiter recruiter={recruiter} company={company} />
        ) : (
          <Company company={company} />
        )}
      </div>
    </div>
  );
};

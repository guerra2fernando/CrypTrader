/* eslint-disable */
// @ts-nocheck
import Link from "next/link";
import useSWR from "swr";

import { fetcher } from "../../lib/api";

type Report = {
  date: string;
  summary?: string;
};

type ReportsResponse = {
  reports: Report[];
};

export default function ReportsPage(): JSX.Element {
  const { data } = useSWR<ReportsResponse>("/api/reports?limit=30", fetcher);
  const items: Report[] = data?.reports ?? [];

  return (
    <div>
      <h2>Daily Reports</h2>
      {items.length ? (
        <ul>
          {items.map((report: Report) => (
            <li key={report.date} style={{ marginBottom: "0.5rem" }}>
              <Link href={`/reports/${report.date}`}>
                <strong>{report.date}</strong>
              </Link>
              <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                {report.summary || "No summary"}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No reports yet.</p>
      )}
    </div>
  );
}


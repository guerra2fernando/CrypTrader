/* eslint-disable */
// @ts-nocheck
import { useRouter } from "next/router";
import useSWR from "swr";

import { fetcher } from "../../lib/api";

type Report = {
  date: string;
  summary: string;
  top_strategies?: Array<{ strategy: string; pnl: number }>;
  charts?: Array<{ path: string }>;
};

type StrategyItem = NonNullable<Report["top_strategies"]>[number];

export default function ReportDetail(): JSX.Element {
  const router = useRouter();
  const { date } = router.query;
  const { data, error } = useSWR<Report>(
    () => (typeof date === "string" ? `/api/reports/${date}` : null),
    fetcher
  );

  return (
    <div>
      {error ? (
        <p>Failed to load report.</p>
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <>
          <h2>Report: {data.date}</h2>
          <p>{data.summary || "No summary provided."}</p>
          {data.top_strategies?.length ? (
            <section>
              <h3>Top Strategies</h3>
              <ul>
                {data.top_strategies.map((strategy: StrategyItem) => (
                  <li key={strategy.strategy}>
                    {strategy.strategy} — PnL: {strategy.pnl}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}


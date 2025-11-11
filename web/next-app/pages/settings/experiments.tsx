/* eslint-disable */
// @ts-nocheck
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ExperimentSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=experiments");
  }, [router]);

  return null;
}

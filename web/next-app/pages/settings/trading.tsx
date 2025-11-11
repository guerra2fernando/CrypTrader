/* eslint-disable */
// @ts-nocheck
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function TradingSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=trading");
  }, [router]);

  return null;
}

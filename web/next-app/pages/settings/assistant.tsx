/* eslint-disable */
// @ts-nocheck
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AssistantSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=assistant");
  }, [router]);

  return null;
}

/* eslint-disable */
// @ts-nocheck
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMode } from "@/lib/mode-context";

export default function StrategiesPage() {
  const router = useRouter();
  const { isAdvancedMode } = useMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect to consolidated pages
    if (isAdvancedMode) {
      router.replace("/analytics");
    } else {
      router.replace("/insights");
    }
  }, [isAdvancedMode, router]);

  if (!mounted) {
    return null;
  }

  return null;
}

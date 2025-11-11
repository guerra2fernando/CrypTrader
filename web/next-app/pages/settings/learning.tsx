import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LearningSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=learning");
  }, [router]);

  return null;
}

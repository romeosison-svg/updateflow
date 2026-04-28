"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { capturePostHogPageView } from "@/lib/analytics";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    capturePostHogPageView(pathname, posthog);
  }, [pathname, searchParams, posthog]);

  return null;
}

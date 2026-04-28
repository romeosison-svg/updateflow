"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { getPostHogInitOptions } from "@/lib/analytics";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    posthog.init(
      process.env.NEXT_PUBLIC_POSTHOG_KEY,
      getPostHogInitOptions(process.env.NEXT_PUBLIC_POSTHOG_HOST)
    );
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

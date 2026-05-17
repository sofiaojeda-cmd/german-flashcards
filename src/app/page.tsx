"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import db from "@/lib/db/schema";

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    db.settings.get("user").then((settings) => {
      if (settings?.onboardingComplete) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    });
  }, [router]);

  // Blank dark screen while checking — avoids flash
  return <div style={{ minHeight: "100dvh", backgroundColor: "var(--bg-base)" }} />;
}

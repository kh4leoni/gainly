"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResumePage() {
  const router = useRouter();

  useEffect(() => {
    const last = localStorage.getItem("gainly_last_path");
    if (last && (last.startsWith("/client/") || last.startsWith("/coach/"))) {
      router.replace(last);
    } else {
      router.replace("/");
    }
  }, [router]);

  return null;
}

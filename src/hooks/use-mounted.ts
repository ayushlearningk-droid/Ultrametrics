"use client";

import { useEffect, useState } from "react";

/** Returns true after the component has mounted (client-only). */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

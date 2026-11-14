"use client";

import { useEffect } from "react";
import { bootPwa } from "@/lib/pwa";

/** Registers the service worker and catches Android's early install event. */
export function PwaBoot() {
  useEffect(() => bootPwa(), []);
  return null;
}

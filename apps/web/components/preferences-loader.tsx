"use client";

import { useEffect } from "react";
import { applyPreferences, readPreferences } from "@/lib/preferences";

export function PreferencesLoader() {
  useEffect(() => applyPreferences(readPreferences(localStorage)), []);
  return null;
}

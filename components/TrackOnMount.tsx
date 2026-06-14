"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/** מתעד אירוע פעם אחת בטעינת המסך (למשל צפייה בחומר). */
export default function TrackOnMount({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, properties ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

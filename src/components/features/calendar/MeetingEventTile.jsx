"use client";

import { cn } from "@/lib/utils";

function normalizeTitle(title) {
  if (typeof title !== "string") return "";
  // Jeśli tytuł został zapisany razem z zakresem czasu (np. "00:30 - 01:00 Konsultacja"),
  // usuwamy sam zakres godzin, zostawiając tytuł.
  return title
    .replace(/\b\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kafel eventu dla react-big-calendar.
 * - Tło: pełne (nieprzezroczyste)
 * - Tekst: centrowany pion/poziom
 * - Skalowanie w zależności od długości spotkania
 */
export default function MeetingEventTile({ event }) {
  const title = typeof event?.title === "string" ? event.title : "";
  const normalizedTitle = normalizeTitle(title);

  const start = event?.start instanceof Date ? event.start : null;
  const end = event?.end instanceof Date ? event.end : null;
  const durationMinutes =
    start && end ? Math.max(0, Math.round((end - start) / 60000)) : 0;

  const isLong = durationMinutes >= 90; // 1.5h+

  return (
    <div
      className={cn(
        // Jasny zielony kafelek spójny z resztą UI (globals.css: --accent = #e2fbe8).
        "flex h-full w-full flex-col items-center justify-center rounded-none bg-accent px-2 text-center text-foreground border border-primary/25",
        isLong
          ? "py-1 text-[14px] font-semibold leading-tight"
          : "text-[12px] font-semibold leading-none"
      )}
    >
      <div className={cn("w-full truncate px-0")}>
        {normalizedTitle || title}
      </div>
    </div>
  );
}


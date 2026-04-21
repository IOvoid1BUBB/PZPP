"use client";

import ReactPlayer from "react-player";

export default function CoursePlayer({ url, title, blocked = false }: { url?: string; title?: string; blocked?: boolean }) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Brak źródła wideo dla tej lekcji.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-black">
      <ReactPlayer
        src={url}
        controls
        width="100%"
        height="100%"
        style={{ aspectRatio: "16 / 9" }}
        playing={!blocked}
        light={false}
      />
      <div className="border-t bg-background px-4 py-2 text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

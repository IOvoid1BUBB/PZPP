"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function stripHtmlForPreview(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {{ messages: Array<{ id: string; direction: string; type: string; body: string; subject?: string | null; createdAt: Date | string }> }} props
 */
export default function ChatWindow({ messages }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const outbound = msg.direction === "OUTBOUND";
            const typeLabel = msg.type === "SMS" ? "SMS" : "E-mail";
            const displayBody = outbound && msg.body?.includes("<")
              ? stripHtmlForPreview(msg.body)
              : msg.body;

            return (
              <div
                key={msg.id}
                className={cn("flex w-full", outbound ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    outbound
                      ? "rounded-br-md bg-primary/90 text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground"
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={outbound ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px] uppercase tracking-wide",
                        outbound && "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                      )}
                    >
                      {typeLabel}
                    </Badge>
                    {msg.subject ? (
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          outbound ? "text-primary-foreground/90" : "text-muted-foreground"
                        )}
                      >
                        {msg.subject}
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{displayBody}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

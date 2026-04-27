"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignConversationOwner } from "@/app/actions/messageActions";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function stripHtmlForPreview(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncatePreview(text, maxLen = 240) {
  const safe = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!safe) return "";
  if (safe.length <= maxLen) return safe;
  return `${safe.slice(0, maxLen - 1)}...`;
}

function effectiveMessageType(msg) {
  const raw = String(msg?.messageType || "").toUpperCase();
  if (raw) return raw;
  if (msg?.type === "EMAIL") return "EMAIL";
  return "CHAT";
}

function systemTimelineLabel(msg) {
  const mt = effectiveMessageType(msg);
  if (mt === "SYSTEM") {
    return (
      msg?.subject ||
      truncatePreview(stripHtmlForPreview(msg?.body), 120) ||
      "Zdarzenie systemowe"
    );
  }
  if (mt === "EMAIL") {
    if (msg?.direction === "OUTBOUND") return "Wysłano wiadomość e-mail do użytkownika";
    return "Odebrano wiadomość e-mail";
  }
  return msg?.subject || "Wiadomość";
}

/**
 * @param {{
 *  messages: Array<any>;
 *  leadId: string;
 *  role?: "STAFF" | "STUDENT";
 *  teamId?: string | null;
 *  ownerOptions?: Array<{ id: string; name?: string | null; email?: string | null }>;
 *  canManageTicket?: boolean;
 * }} props
 */
export default function ThreadView({
  messages = [],
  leadId,
  role = "STAFF",
  teamId = null,
  ownerOptions = [],
  canManageTicket = true,
}) {
  const scrollContainerRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStudent = role === "STUDENT";

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const visibleMessages = useMemo(() => {
    return messages.filter((msg) => msg?.messageType !== "INTERNAL_NOTE");
  }, [messages]);

  const currentOwner = useMemo(() => {
    const withOwner = [...visibleMessages]
      .reverse()
      .find((msg) => msg?.assignedTo?.id || msg?.assignedToId);
    return withOwner?.assignedTo?.id || withOwner?.assignedToId || "UNASSIGNED";
  }, [visibleMessages]);

  const handleAssignOwner = (value) => {
    if (!leadId) return;
    startTransition(async () => {
      const ownerId = value === "UNASSIGNED" ? null : value;
      const res = await assignConversationOwner(leadId, ownerId, { teamId });
      if (!res?.success) {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res?.error || "Nie udało się przypisać ownera.",
        });
        return;
      }
      toast({ title: "Zapisano", description: "Zmieniono ownera konwersacji." });
      queryClient.invalidateQueries({ queryKey: ["lead-messages"] });
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {!isStudent && canManageTicket ? (
        <div className="shrink-0 border-b border-border px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Owner konwersacji:</span>
            <Select value={currentOwner} onValueChange={handleAssignOwner} disabled={isPending}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue placeholder="Wybierz ownera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">Brak ownera</SelectItem>
                {ownerOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name || member.email || member.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending ? <Button type="button" size="sm" variant="ghost" disabled>Zapisywanie...</Button> : null}
          </div>
        </div>
      ) : null}
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <div className="flex flex-col gap-3">
          {visibleMessages.map((msg) => {
            const mt = effectiveMessageType(msg);
            const outbound = msg.direction === "OUTBOUND";
            const typeLabel =
              mt === "CHAT" || msg.type === "CHAT"
                ? "Chat"
                : msg.type === "SMS"
                  ? "SMS"
                  : "Email";
            const normalizedBody =
              outbound && msg.body?.includes("<") ? stripHtmlForPreview(msg.body) : msg.body;
            const displayBody = truncatePreview(normalizedBody, 800);
            const isSystemRow = mt === "EMAIL" || mt === "SYSTEM";

            if (isStudent && isSystemRow) return null;

            if (isSystemRow) {
              return (
                <div key={msg.id} className="flex w-full justify-center px-6">
                  <p className="max-w-md text-center text-xs leading-snug text-muted-foreground">
                    {systemTimelineLabel(msg)}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex w-full", outbound ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    outbound
                      ? "rounded-br-md bg-emerald-600 text-white"
                      : "rounded-bl-md border border-border bg-muted/80 text-foreground"
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={outbound ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px] uppercase tracking-wide",
                        outbound && "border-white/30 bg-white/15 text-white"
                      )}
                    >
                      {typeLabel}
                    </Badge>
                    {msg.subject ? (
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          outbound ? "text-white/90" : "text-muted-foreground"
                        )}
                      >
                        {msg.subject}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "whitespace-pre-wrap wrap-break-word leading-relaxed",
                      outbound ? "text-white" : "text-foreground"
                    )}
                  >
                    {displayBody}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

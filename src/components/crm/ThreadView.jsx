"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatThreadDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pl-PL");
}

/**
 * @param {{
 *  thread: {
 *    threadId: string;
 *    lead?: { firstName?: string; lastName?: string; email?: string };
 *    messages: Array<{ id: string; direction: string; body: string; subject?: string; type: string; createdAt: string|Date }>;
 *    internalComments?: Array<{ id: string; content: string; createdAt: string|Date; author?: { name?: string; email?: string } }>;
 *    assignedTo?: { id: string; name?: string; email?: string } | null;
 *  } | null;
 *  owners: Array<{ id: string; name?: string; email?: string }>;
 *  onAssignOwner: (threadId: string, userId: string) => Promise<void>;
 *  onAddComment: (threadId: string, content: string) => Promise<void>;
 * }} props
 */
export default function ThreadView({ thread, owners = [], onAssignOwner, onAddComment }) {
  const { toast } = useToast();
  const [isAssigning, startAssigning] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();
  const [comment, setComment] = useState("");
  const textRef = useRef(null);

  const selectedOwnerId = thread?.assignedTo?.id || "unassigned";
  const title = useMemo(() => {
    if (!thread?.lead) return "Wątek";
    const name = [thread.lead.firstName, thread.lead.lastName].filter(Boolean).join(" ").trim();
    return name || thread.lead.email || "Wątek";
  }, [thread]);

  if (!thread) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        Wybierz wątek z listy po lewej, aby zobaczyć szczegóły rozmowy.
      </div>
    );
  }

  const handleAssign = (value) => {
    const nextOwner = value === "unassigned" ? "" : value;
    startAssigning(async () => {
      try {
        await onAssignOwner(thread.threadId, nextOwner);
        toast({ title: "Zapisano", description: "Owner wątku został zaktualizowany." });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: error?.message || "Nie udało się przypisać ownera.",
        });
      }
    });
  };

  const handleAddComment = () => {
    const normalized = comment.trim();
    if (!normalized) {
      toast({ variant: "destructive", title: "Dodaj treść notatki." });
      return;
    }

    startCommentTransition(async () => {
      try {
        await onAddComment(thread.threadId, normalized);
        setComment("");
        if (textRef.current) textRef.current.style.height = "auto";
        toast({ title: "Dodano notatkę wewnętrzną." });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: error?.message || "Nie udało się dodać notatki.",
        });
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{thread.lead?.email || "Brak adresu e-mail"}</p>
          </div>
          <div className="w-full md:w-[280px]">
            <Select
              value={selectedOwnerId}
              onValueChange={handleAssign}
              disabled={isAssigning || isCommentPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Przypisz ownera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Nieprzypisane</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name || owner.email || owner.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
        <div className="flex flex-col gap-3">
          {thread.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ten wątek nie ma jeszcze żadnych wiadomości.</p>
          ) : null}
          {thread.messages.map((msg) => {
            const outbound = msg.direction === "OUTBOUND";
            return (
              <div key={msg.id} className={cn("flex w-full", outbound ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[min(100%,32rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    outbound
                      ? "rounded-br-md bg-primary/90 text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground"
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant={outbound ? "secondary" : "outline"}>{msg.type || "MSG"}</Badge>
                    {msg.subject ? (
                      <span className={cn("truncate text-xs", outbound ? "text-primary-foreground/90" : "text-muted-foreground")}>
                        {msg.subject}
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{msg.body}</p>
                  <p className={cn("mt-2 text-[10px]", outbound ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatThreadDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border bg-amber-50/40 px-4 py-3 dark:bg-muted/40">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Notatki wewnętrzne</h3>

        <div className="mb-3 max-h-40 space-y-2 overflow-y-auto pr-1">
          {(thread.internalComments || []).length ? (
            thread.internalComments.map((item) => (
              <div key={item.id} className="rounded-md border border-amber-200/60 bg-amber-100/60 p-2 text-xs text-foreground dark:border-border dark:bg-muted/70">
                <p className="whitespace-pre-wrap">{item.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(item.author?.name || item.author?.email || "Użytkownik")} - {formatThreadDate(item.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Brak notatek wewnętrznych dla tego wątku.</p>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            ref={textRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Dodaj notatkę wewnętrzną..."
            rows={2}
            disabled={isCommentPending}
            className="min-h-[56px] resize-none bg-background"
          />
          <Button type="button" size="sm" onClick={handleAddComment} disabled={isCommentPending}>
            Dodaj notatkę
          </Button>
        </div>
      </div>
    </div>
  );
}

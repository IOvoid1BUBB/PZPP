"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { pl as plLocale } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatAgo(value) {
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: plLocale });
  } catch {
    return "";
  }
}

export default function NotificationsBell({ className }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const lastSeenIdRef = useRef(null);

  const topUnread = useMemo(() => Math.min(99, unreadCount), [unreadCount]);

  async function fetchNotifications({ showToasts } = { showToasts: false }) {
    const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.success) return;

    const nextItems = Array.isArray(data.items) ? data.items : [];
    const nextUnread = Number(data.unreadCount || 0);

    if (showToasts && nextItems.length > 0) {
      const newestId = nextItems[0]?.id || null;
      const lastSeen = lastSeenIdRef.current;
      if (lastSeen && newestId && newestId !== lastSeen) {
        const idx = nextItems.findIndex((n) => n.id === lastSeen);
        const newOnes = idx === -1 ? nextItems.slice(0, 3) : nextItems.slice(0, idx).slice(0, 3);
        newOnes
          .filter((n) => !n.readAt)
          .reverse()
          .forEach((n) => {
            toast({
              title: n.title || "Powiadomienie",
              description: n.body || undefined,
            });
          });
      }
      if (newestId) lastSeenIdRef.current = newestId;
    } else {
      if (!lastSeenIdRef.current && nextItems[0]?.id) {
        lastSeenIdRef.current = nextItems[0].id;
      }
    }

    setItems(nextItems);
    setUnreadCount(nextUnread);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    }).catch(() => null);
    await fetchNotifications({ showToasts: false });
  }

  useEffect(() => {
    let mounted = true;
    fetchNotifications({ showToasts: false }).catch(() => null);

    const intervalMs = 10_000;
    const timer = window.setInterval(() => {
      if (!mounted) return;
      fetchNotifications({ showToasts: true }).catch(() => null);
    }, intervalMs);

    const onFocus = () => fetchNotifications({ showToasts: false }).catch(() => null);
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // soft mark-as-read when user opens the dropdown
    if (unreadCount > 0) {
      markAllRead().catch(() => null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative", className)}
          aria-label="Powiadomienia"
        >
          <Bell className="size-4" />
          {topUnread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
              {topUnread === 99 ? "99+" : topUnread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0">Powiadomienia</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              markAllRead().catch(() => null);
            }}
          >
            <CheckCheck className="mr-1 size-4" />
            Oznacz jako przeczytane
          </Button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[420px] overflow-auto p-1">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Brak powiadomień.
            </div>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md px-3 py-2",
                  !n.readAt && "bg-accent/40"
                )}
                onSelect={() => {
                  if (n?.url) {
                    window.location.href = n.url;
                  }
                }}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    {n.body ? (
                      <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {formatAgo(n.createdAt)}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


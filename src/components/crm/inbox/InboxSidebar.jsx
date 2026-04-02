"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * @param {{ leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>; activeLeadId: string | null; onSelectLead: (id: string) => void }} props
 */
export default function InboxSidebar({ leads, activeLeadId, onSelectLead }) {
  return (
    <aside className="flex h-full min-h-0 w-full max-w-[min(100%,20rem)] flex-col border-r border-border bg-muted/30">
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Leady</h2>
        <p className="text-xs text-muted-foreground">Wybierz rozmowę</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-0.5 p-2">
          {leads.map((lead) => {
            const isActive = activeLeadId === lead.id;
            const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
            return (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => onSelectLead(lead.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                      : "text-foreground/90 hover:bg-muted"
                  )}
                >
                  <span className="font-medium leading-tight">{name}</span>
                  <span className="mt-0.5 truncate text-xs text-muted-foreground">{lead.email}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}

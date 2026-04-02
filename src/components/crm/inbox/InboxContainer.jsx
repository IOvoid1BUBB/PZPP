"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeadMessages } from "@/app/actions/messageActions";
import InboxSidebar from "./InboxSidebar";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>;
 *   isStudentView?: boolean;
 * }} props
 */
export default function InboxContainer({ leads = [], isStudentView = false }) {
  const [activeLeadId, setActiveLeadId] = useState(null);

  const safeLeads = useMemo(() => leads.filter(Boolean), [leads]);

  useEffect(() => {
    if (safeLeads.length === 0) {
      setActiveLeadId(null);
      return;
    }
    setActiveLeadId((current) => {
      if (current && safeLeads.some((l) => l.id === current)) return current;
      return safeLeads[0].id;
    });
  }, [safeLeads]);

  const activeLead = useMemo(
    () => safeLeads.find((l) => l.id === activeLeadId) ?? null,
    [safeLeads, activeLeadId]
  );

  const { data: leadWithMessages } = useQuery({
    queryKey: ["lead-messages", activeLead?.id],
    queryFn: () => getLeadMessages(activeLead.id),
    enabled: Boolean(activeLead?.id),
    refetchInterval: 5000,
  });

  const messages = leadWithMessages?.messages ?? [];

  if (safeLeads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Brak leadów do wyświetlenia w skrzynce.
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div
        className={cn(
          "flex min-h-[min(70vh,720px)] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          isStudentView ? "flex-col" : "flex-col md:flex-row"
        )}
      >
        {!isStudentView ? (
          <InboxSidebar
            leads={safeLeads}
            activeLeadId={activeLeadId}
            onSelectLead={setActiveLeadId}
          />
        ) : null}

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", isStudentView && "w-full")}>
          {activeLead ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <h1 className="text-base font-semibold text-foreground">
                  {[activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") || "Lead"}
                </h1>
                <p className="text-xs text-muted-foreground">{activeLead.email}</p>
              </div>
              <ChatWindow messages={messages} />
              <MessageInput leadId={activeLead.id} leadEmail={activeLead.email} />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

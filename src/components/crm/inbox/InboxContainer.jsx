"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addInternalComment,
  assignThread,
  getAssignableInboxUsers,
  getThreadedMessages,
} from "@/app/actions/messageActions";
import InboxSidebar from "./InboxSidebar";
import MessageInput from "./MessageInput";
import ThreadView from "@/components/crm/ThreadView";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>;
 *   isStudentView?: boolean;
 * }} props
 */
export default function InboxContainer({ leads = [], isStudentView = false }) {
  const [activeThreadId, setActiveThreadId] = useState(null);
  const safeLeads = useMemo(() => (Array.isArray(leads) ? leads.filter(Boolean) : []), [leads]);

  const { data: threadedMessages = [], refetch: refetchThreads } = useQuery({
    queryKey: ["threaded-messages", isStudentView ? "student" : "dashboard"],
    queryFn: () => getThreadedMessages(),
    refetchInterval: 5000,
  });

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["inbox-assignable-users"],
    queryFn: () => getAssignableInboxUsers(),
    staleTime: 60 * 1000,
  });

  const threads = useMemo(() => {
    const existing = Array.isArray(threadedMessages) ? [...threadedMessages] : [];
    const existingLeadIds = new Set(existing.map((t) => t.leadId).filter(Boolean));

    for (const lead of safeLeads) {
      if (!lead?.id || existingLeadIds.has(lead.id)) continue;
      existing.push({
        threadId: lead.id,
        leadId: lead.id,
        lead: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
        },
        messages: [],
        internalComments: [],
        status: "OPEN",
        assignedTo: null,
        lastMessageAt: new Date(0).toISOString(),
      });
    }

    return existing;
  }, [threadedMessages, safeLeads]);

  useEffect(() => {
    if (threads.length === 0) {
      setActiveThreadId(null);
      return;
    }
    setActiveThreadId((current) => {
      if (current && threads.some((t) => t.threadId === current)) return current;
      return threads[0].threadId;
    });
  }, [threads]);

  const sidebarItems = useMemo(
    () =>
      threads.map((thread) => ({
        id: thread.threadId,
        firstName: thread.lead?.firstName || "",
        lastName: thread.lead?.lastName || "",
        email: thread.lead?.email || `Wątek ${thread.threadId}`,
      })),
    [threads]
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.threadId === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const hasAnyInboxData = threads.length > 0;

  if (!hasAnyInboxData) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Brak leadów do wyświetlenia w skrzynce.
      </div>
    );
  }

  const handleAssignOwner = async (threadId, userId) => {
    const result = await assignThread(threadId, userId);
    if (!result?.success) {
      throw new Error(result?.error || "Nie udało się przypisać ownera.");
    }
    await refetchThreads();
  };

  const handleAddComment = async (threadId, content) => {
    const result = await addInternalComment(threadId, content);
    if (!result?.success) {
      throw new Error(result?.error || "Nie udało się dodać notatki.");
    }
    await refetchThreads();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toaster />
      <div
        className={cn(
          "flex min-h-0 flex-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          isStudentView ? "flex-col" : "flex-col md:flex-row"
        )}
      >
        {!isStudentView ? (
          <InboxSidebar
            leads={sidebarItems}
            activeLeadId={activeThreadId}
            onSelectLead={setActiveThreadId}
          />
        ) : null}

        <div
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            isStudentView && "w-full"
          )}
        >
          {activeThread ? (
            <>
              <ThreadView
                thread={activeThread}
                owners={assignableUsers}
                onAssignOwner={handleAssignOwner}
                onAddComment={handleAddComment}
              />
              <MessageInput
                leadId={activeThread.leadId}
                leadEmail={activeThread?.lead?.email}
                disabled={!activeThread.leadId || !activeThread?.lead?.email}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

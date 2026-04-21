"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getLeadMessages } from "@/app/actions/messageActions";
import { getUserTeamsInboxSummary, scheduleTeamMeeting } from "@/app/actions/teamActions";
import InboxSidebar from "./InboxSidebar";
import ThreadView from "@/components/crm/ThreadView";
import MessageInput from "./MessageInput";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

/**
 * @param {{
 *   leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>;
 *   isStudentView?: boolean;
 * }} props
 */
export default function InboxContainer({ leads = [], isStudentView = false }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [activeChannel, setActiveChannel] = useState("PRIVATE");
  const [sidebarTab, setSidebarTab] = useState(/** @type {"private" | "teams"} */ ("private"));

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

  // Deep-link support: /dashboard/skrzynka?leadId=...
  useEffect(() => {
    const leadId = searchParams?.get("leadId");
    if (!leadId) return;
    if (!safeLeads.some((l) => l.id === leadId)) return;
    setActiveLeadId(leadId);
  }, [searchParams, safeLeads]);

  const activeLead = useMemo(
    () => safeLeads.find((l) => l.id === activeLeadId) ?? null,
    [safeLeads, activeLeadId]
  );

  const { data: teams = [] } = useQuery({
    queryKey: ["user-teams-inbox", isStudentView],
    queryFn: () => getUserTeamsInboxSummary(),
    enabled: !isStudentView,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sidebarTab === "private") {
      setActiveChannel("PRIVATE");
    }
  }, [sidebarTab]);

  useEffect(() => {
    if (isStudentView) return;
    if (sidebarTab !== "teams") return;
    if (!teams.length) return;
    if (activeChannel !== "PRIVATE") return;
    setActiveChannel(teams[0].id);
  }, [sidebarTab, teams, activeChannel, isStudentView]);

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeChannel) ?? null,
    [teams, activeChannel]
  );

  const { data: leadWithMessages } = useQuery({
    queryKey: ["lead-messages", activeLead?.id, activeChannel, isStudentView],
    queryFn: () =>
      getLeadMessages(activeLead.id, {
        ...(activeChannel === "PRIVATE"
          ? { privateOnly: true }
          : { teamId: activeChannel }),
        includeInternalNotes: false,
      }),
    enabled: Boolean(activeLead?.id),
    refetchInterval: 5000,
  });

  const messages = leadWithMessages?.messages ?? [];

  const ownerOptions = useMemo(() => {
    if (!activeTeam?.members?.length) return [];
    return activeTeam.members
      .map((member) => member?.user)
      .filter((user) => user?.id);
  }, [activeTeam]);

  const handleCreateTeamMeeting = async () => {
    if (!activeTeam?.id) return;
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const result = await scheduleTeamMeeting(activeTeam.id, {
      title: `Sync: ${activeTeam.name}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    if (result?.success) {
      toast({
        title: "Utworzono spotkanie",
        description: "Spotkanie zespołowe zostało zaplanowane.",
      });
      return;
    }

    toast({
      variant: "destructive",
      title: "Błąd",
      description: result?.error || "Nie udało się utworzyć spotkania zespołu.",
    });
  };

  if (safeLeads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Brak leadów do wyświetlenia w skrzynce.
      </div>
    );
  }

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
            leads={safeLeads}
            activeLeadId={activeLeadId}
            onSelectLead={setActiveLeadId}
            teams={teams}
            activeChannel={activeChannel}
            onSelectChannel={(channelId) => {
              setActiveChannel(channelId);
              if (channelId !== "PRIVATE") setSidebarTab("teams");
            }}
            sidebarTab={sidebarTab}
            onSidebarTabChange={(tab) => {
              setSidebarTab(tab);
              if (tab === "private") setActiveChannel("PRIVATE");
            }}
          />
        ) : null}

        <div
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            isStudentView && "w-full"
          )}
        >
          {activeLead ? (
            <>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h1 className="text-base font-semibold text-foreground">
                      {[activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") || "Lead"}
                    </h1>
                    <p className="text-xs text-muted-foreground">{activeLead.email}</p>
                  </div>
                  {!isStudentView ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {activeTeam ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                          title="Utwórz spotkanie dla zespołu"
                          aria-label="Utwórz spotkanie dla zespołu"
                          onClick={handleCreateTeamMeeting}
                        >
                          <CalendarDays className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <ThreadView
                messages={messages}
                leadId={activeLead.id}
                role={isStudentView ? "STUDENT" : "STAFF"}
                teamId={activeChannel === "PRIVATE" ? null : activeChannel}
                ownerOptions={ownerOptions}
                canManageTicket={!isStudentView}
              />
              <MessageInput
                leadId={activeLead.id}
                leadEmail={activeLead.email}
                teamId={activeChannel === "PRIVATE" ? null : activeChannel}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getLeadMessages } from "@/app/actions/messageActions";
import { createMeeting } from "@/app/actions/meetingActions";
import { deleteTeam, getUserTeamsInboxSummary } from "@/app/actions/teamActions";
import InboxSidebar from "./InboxSidebar";
import ThreadView from "@/components/crm/ThreadView";
import MessageInput from "./MessageInput";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

/**
 * @param {{
 *   leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>;
 *   isStudentView?: boolean;
 * }} props
 */
export default function InboxContainer({ leads = [], isStudentView = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [activeChannel, setActiveChannel] = useState("PRIVATE");
  const [sidebarTab, setSidebarTab] = useState(/** @type {"private" | "teams"} */ ("private"));
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [meetingMeetLink, setMeetingMeetLink] = useState("");

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

  const openMeetingModal = () => {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 30 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const toLocalInput = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setMeetingTitle(activeTeam ? `Spotkanie: ${activeTeam.name}` : "Spotkanie");
    setMeetingStart(toLocalInput(now));
    setMeetingEnd(toLocalInput(end));
    setMeetingMeetLink("");
    setMeetingOpen(true);
  };

  const handleCreateMeeting = async () => {
    if (!meetingTitle.trim()) {
      toast({ variant: "destructive", title: "Uzupełnij tytuł spotkania." });
      return;
    }
    if (!meetingStart || !meetingEnd) {
      toast({ variant: "destructive", title: "Uzupełnij daty spotkania." });
      return;
    }

    const startIso = new Date(meetingStart).toISOString();
    const endIso = new Date(meetingEnd).toISOString();

    const result = await createMeeting({
      title: meetingTitle.trim(),
      startTime: startIso,
      endTime: endIso,
      meetLink: meetingMeetLink.trim() || null,
      leadId: activeLead?.id || null,
      teamId: activeTeam?.id || null,
    });

    if (result?.success) {
      setMeetingOpen(false);
      toast({ title: "Utworzono spotkanie", description: "Spotkanie zostało zapisane." });
      return;
    }

    toast({
      variant: "destructive",
      title: "Błąd",
      description: result?.error || "Nie udało się utworzyć spotkania.",
    });
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam?.id) return;
    const res = await deleteTeam(activeTeam.id);
    if (res?.success) {
      toast({ title: "Usunięto zespół", description: "Zespół został usunięty." });
      // Force refresh of cached teams list (query has staleTime).
      queryClient.invalidateQueries({ queryKey: ["user-teams-inbox"] });
      setActiveChannel("PRIVATE");
      setSidebarTab("private");
      return;
    }
    toast({
      variant: "destructive",
      title: "Błąd",
      description: res?.error || "Nie udało się usunąć zespołu.",
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
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Utwórz spotkanie"
                            aria-label="Utwórz spotkanie"
                            onClick={openMeetingModal}
                          >
                            <CalendarDays className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="destructive" size="sm">
                                Usuń zespół
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Usunąć zespół?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  To działanie usunie zespół oraz członkostwa. Historia wiadomości zostanie zachowana
                                  (wiadomości w bazie pozostaną z pustym teamId).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTeam}>
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Utwórz spotkanie</DialogTitle>
                    <DialogDescription>
                      Spotkanie zostanie zapisane w kalendarzu i dodane do historii rozmowy leada.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="meeting-title">Tytuł</Label>
                      <Input
                        id="meeting-title"
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="Tytuł spotkania"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="meeting-start">Start</Label>
                      <Input
                        id="meeting-start"
                        type="datetime-local"
                        value={meetingStart}
                        onChange={(e) => setMeetingStart(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="meeting-end">Koniec</Label>
                      <Input
                        id="meeting-end"
                        type="datetime-local"
                        value={meetingEnd}
                        onChange={(e) => setMeetingEnd(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="meeting-link">Link (opcjonalnie)</Label>
                      <Input
                        id="meeting-link"
                        value={meetingMeetLink}
                        onChange={(e) => setMeetingMeetLink(e.target.value)}
                        placeholder="np. https://meet.google.com/..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setMeetingOpen(false)}>
                      Anuluj
                    </Button>
                    <Button type="button" onClick={handleCreateMeeting}>
                      Utwórz
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <ThreadView
                messages={messages}
                leadId={activeLead.id}
                role={isStudentView ? "STUDENT" : "STAFF"}
                teamId={activeChannel === "PRIVATE" ? null : activeChannel}
                ownerOptions={ownerOptions}
                canManageTicket={!isStudentView && Boolean(activeTeam?.id)}
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

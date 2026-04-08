"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquareText,
  NotepadText,
} from "lucide-react";
import {
  addNoteToLead,
  addTaskToLead,
  getLead360Profile,
} from "@/app/actions/crmTimelineActions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const eventStyleMap = {
  NOTE: {
    icon: NotepadText,
    dotClass: "bg-amber-500/15 text-amber-600 border-amber-300",
    title: "Notatka",
  },
  MESSAGE: {
    icon: Mail,
    dotClass: "bg-blue-500/15 text-blue-600 border-blue-300",
    title: "Wiadomosc",
  },
  MEETING: {
    icon: CalendarClock,
    dotClass: "bg-violet-500/15 text-violet-600 border-violet-300",
    title: "Spotkanie",
  },
  DOCUMENT: {
    icon: FileText,
    dotClass: "bg-emerald-500/15 text-emerald-600 border-emerald-300",
    title: "Dokument",
  },
  TASK: {
    icon: CheckCircle2,
    dotClass: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-300",
    title: "Zadanie",
  },
};

function formatDate(date) {
  return new Date(date).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(firstName, lastName) {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
}

export default function LeadProfileSheet({ isOpen, onClose, leadId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);

  const [noteContent, setNoteContent] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    userId: "",
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const loadLeadProfile = async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError("");

    const result = await getLead360Profile(leadId);
    if (!result?.success) {
      setError(result?.error || "Nie udalo sie pobrac profilu leada.");
      setProfile(null);
      setTimelineEvents([]);
      setIsLoading(false);
      return;
    }

    setProfile(result.lead);
    setTimelineEvents(result.timelineEvents || []);
    setTaskForm((prev) => ({
      ...prev,
      userId: result?.lead?.tasks?.[0]?.userId || prev.userId,
    }));
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && leadId) {
      loadLeadProfile();
    }
  }, [isOpen, leadId]);

  const handleAddNote = async () => {
    if (!leadId || !noteContent.trim()) return;
    setIsSavingNote(true);
    const result = await addNoteToLead(leadId, noteContent);
    setIsSavingNote(false);

    if (!result?.success) {
      setError(result?.error || "Nie udalo sie dodac notatki.");
      return;
    }

    setNoteContent("");
    await loadLeadProfile();
  };

  const handleAddTask = async () => {
    if (!leadId) return;
    setIsSavingTask(true);
    const result = await addTaskToLead(leadId, taskForm);
    setIsSavingTask(false);

    if (!result?.success) {
      setError(result?.error || "Nie udalo sie dodac zadania.");
      return;
    }

    setTaskForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      dueDate: "",
    }));
    await loadLeadProfile();
  };

  const details = useMemo(() => {
    if (!profile) return { fullName: "", initials: "?" };
    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    return { fullName, initials: getInitials(profile.firstName, profile.lastName) };
  }, [profile]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0">
        <SheetHeader className="border-b bg-gradient-to-br from-zinc-50 to-white">
          <SheetTitle>Profil Leada 360</SheetTitle>
          <SheetDescription>
            Pelny kontekst relacji, aktywnosci i kolejnych krokow.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : !profile ? (
          <div className="p-6 text-sm text-red-600">{error || "Brak danych leada."}</div>
        ) : (
          <div className="h-[calc(100vh-90px)] overflow-y-auto p-6 space-y-6">
            <Card className="gap-4 bg-zinc-50/70 border-zinc-200">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Lead Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12 border">
                      <AvatarFallback className="bg-zinc-900 text-white">
                        {details.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{details.fullName || "Bez imienia"}</p>
                      <p className="text-sm text-zinc-600">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="secondary">Status: {profile.status}</Badge>
                    <Badge>Score: {profile.score}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Tagi</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.tags?.length ? (
                      profile.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          #{tag.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-500">Brak tagow.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Szczegoly</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {profile.customFields?.length ? (
                      profile.customFields.map((field) => (
                        <div
                          key={field.id}
                          className="rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          <p className="text-zinc-500">{field.name}</p>
                          <p className="font-medium">{field.value}</p>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-500">Brak custom fields.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Szybkie akcje</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="note" className="gap-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="note">Notatka</TabsTrigger>
                    <TabsTrigger value="task">Zadanie</TabsTrigger>
                  </TabsList>

                  <TabsContent value="note" className="space-y-3">
                    <Label htmlFor="lead-note">Nowa notatka</Label>
                    <Textarea
                      id="lead-note"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Wpisz kontekst po rozmowie z leadem..."
                      className="min-h-24"
                    />
                    <Button
                      type="button"
                      onClick={handleAddNote}
                      disabled={isSavingNote || !noteContent.trim()}
                    >
                      {isSavingNote ? <Spinner className="mr-1" /> : <MessageSquareText />}
                      Zapisz notatke
                    </Button>
                  </TabsContent>

                  <TabsContent value="task" className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="task-title">Tytul zadania</Label>
                      <Input
                        id="task-title"
                        value={taskForm.title}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Np. Follow-up po wyslaniu oferty"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-description">Opis</Label>
                      <Textarea
                        id="task-description"
                        value={taskForm.description}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Co dokladnie trzeba dowiezc?"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="task-due-date">Termin</Label>
                        <Input
                          id="task-due-date"
                          type="datetime-local"
                          value={taskForm.dueDate}
                          onChange={(e) =>
                            setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="task-user-id">Przypisany User ID</Label>
                        <Input
                          id="task-user-id"
                          value={taskForm.userId}
                          onChange={(e) =>
                            setTaskForm((prev) => ({ ...prev, userId: e.target.value }))
                          }
                          placeholder="ID pracownika"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddTask}
                      disabled={
                        isSavingTask ||
                        !taskForm.title.trim() ||
                        !taskForm.userId.trim() ||
                        !taskForm.dueDate
                      }
                    >
                      {isSavingTask ? <Spinner className="mr-1" /> : <CheckCircle2 />}
                      Dodaj zadanie
                    </Button>
                  </TabsContent>
                </Tabs>

                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Os czasu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-200" />

                  <div className="space-y-4">
                    {timelineEvents.length ? (
                      timelineEvents.map((event) => {
                        const styles = eventStyleMap[event.type] || eventStyleMap.NOTE;
                        const Icon = styles.icon;

                        return (
                          <div key={`${event.type}-${event.id}`} className="relative rounded-lg border p-3">
                            <div
                              className={`absolute -left-[19px] top-4 flex size-5 items-center justify-center rounded-full border ${styles.dotClass}`}
                            >
                              <Icon className="size-3" />
                            </div>
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{styles.title}</p>
                              <p className="text-xs text-zinc-500">{formatDate(event.date)}</p>
                            </div>
                            <div className="text-sm text-zinc-700">
                              {event.type === "NOTE" && <p>{event.data.content}</p>}
                              {event.type === "MESSAGE" && (
                                <p>
                                  {event.data.subject ? `${event.data.subject} - ` : ""}
                                  {event.data.body}
                                </p>
                              )}
                              {event.type === "MEETING" && (
                                <p>
                                  {event.data.title} ({formatDate(event.data.startTime)})
                                </p>
                              )}
                              {event.type === "DOCUMENT" && (
                                <p>
                                  {event.data.title} {event.data.isSigned ? "(podpisany)" : "(oczekuje)"}
                                </p>
                              )}
                              {event.type === "TASK" && (
                                <p>
                                  {event.data.title} - termin: {formatDate(event.data.dueDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-zinc-500">Brak wydarzen na osi czasu.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

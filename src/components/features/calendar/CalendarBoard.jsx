"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Navigate,
  Views,
} from "react-big-calendar";
import {
  addDays,
  addWeeks,
  format,
  getDay,
  parse,
  startOfWeek,
} from "date-fns";
import { pl as plLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Chrome, Mail, CalendarDays, ExternalLink } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  createMeeting,
  deleteMeeting,
  getUnifiedCalendarEvents,
} from "@/app/actions/meetingActions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1, locale: plLocale }),
  getDay,
  locales: { pl: plLocale },
});

function formatDateTimePolish(date) {
  return format(date, "dd LLL yyyy, HH:mm", { locale: plLocale });
}

function formatDateInputValue(date) {
  return format(date, "yyyy-MM-dd");
}

function CalendarToolbar(toolbarProps) {
  const { date, label, onNavigate, onCreate } = toolbarProps;

  const monthLabel = date
    ? format(date, "LLLL yyyy", { locale: plLocale })
    : "";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onCreate?.()}
          aria-label="Dodaj spotkanie"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center leading-tight">
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg border-primary/30 bg-background/70 shadow-none hover:bg-accent/50"
          onClick={() => onNavigate?.(Navigate.TODAY)}
        >
          Dzisiaj
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-primary/30 bg-background/70 shadow-none hover:bg-accent/50"
          onClick={() => onNavigate?.(Navigate.PREVIOUS)}
          aria-label="Poprzedni okres"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-primary/30 bg-background/70 shadow-none hover:bg-accent/50"
          onClick={() => onNavigate?.(Navigate.NEXT)}
          aria-label="Następny okres"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CalendarBoard({ className }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const initialDate = useMemo(() => new Date(), []);

  
  const [controlledDate, setControlledDate] = useState(initialDate);

  const [range, setRange] = useState(() => ({
    start: startOfWeek(initialDate, { weekStartsOn: 1, locale: plLocale }),
    end: addDays(
      startOfWeek(initialDate, { weekStartsOn: 1, locale: plLocale }),
      7
    ),
  }));
  const [rangeVersion, setRangeVersion] = useState(0);

  const [events, setEvents] = useState([]);
  const seenExternalIdsRef = useRef(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [slotStart, setSlotStart] = useState(null);
  const [slotEnd, setSlotEnd] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");
  const [newFormError, setNewFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const CustomEvent = useMemo(() => {
    return function CustomEventInner({ event }) {
      const title = typeof event?.title === "string" ? event.title : "";

      const normalizedTitle = title
        .replace(/\b\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return (
        <div className="flex h-full w-full">
          <div
            className={cn(
              "flex h-full w-full items-center gap-1 overflow-hidden rounded-lg border px-2 py-1 text-foreground shadow-sm",
              event?.source === "google" && "border-red-200 bg-red-100/80",
              event?.source === "outlook" && "border-blue-200 bg-blue-100/80",
              event?.source === "local" && "border-primary/20 bg-accent"
            )}
          >
            {event?.source === "google" ? (
              <Chrome className="size-3.5 shrink-0 text-red-600" />
            ) : event?.source === "outlook" ? (
              <Mail className="size-3.5 shrink-0 text-blue-700" />
            ) : (
              <CalendarDays className="size-3.5 shrink-0 text-primary" />
            )}
            <div className="min-w-0 truncate text-[12px] font-semibold leading-none">
              {normalizedTitle || title}
            </div>
          </div>
        </div>
      );
    };
  }, []);

  const components = useMemo(() => ({ event: CustomEvent }), [CustomEvent]);

  // Formularz tworzenia spotkania
  const [createDay, setCreateDay] = useState(() => new Date());
  const [createStartTime, setCreateStartTime] = useState("");
  const [createEndTime, setCreateEndTime] = useState("");

  const wheelLockRef = useMemo(() => ({ last: 0 }), []);

  const handleWheelNavigate = useCallback(
    (e) => {
      const deltaX = e?.deltaX ?? 0;
      const deltaY = e?.deltaY ?? 0;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const wantsDateNavigation =
        e?.shiftKey || (absX >= 30 && absX >= absY);

      if (!wantsDateNavigation) return;

      const now = Date.now();
      if (now - wheelLockRef.last < 600) return;
      wheelLockRef.last = now;

      e.preventDefault?.();

      const dir =
        deltaX !== 0 ? Math.sign(deltaX) : e?.shiftKey ? -Math.sign(deltaY) : 0;
      if (!dir) return;

      setControlledDate((d) => addWeeks(d, dir > 0 ? 1 : -1));
    },
    [wheelLockRef]
  );

  const fetchMeetings = useCallback(
    async (start, end) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await getUnifiedCalendarEvents(
          null,
          start.toISOString(),
          end.toISOString()
        );
        const nextEvents = (result || []).map((event) => ({
            id: event.id,
            title: event.title,
            start: new Date(event.start),
            end: new Date(event.end),
            source: event.source,
            externalUrl: event.externalUrl,
            meetLink: event.externalUrl,
          }));

        // Detect new external events (Google/Outlook) and create in-app notifications.
        const newlySeen = [];
        for (const ev of nextEvents) {
          if (!ev?.id) continue;
          if (ev.source !== "google" && ev.source !== "outlook") continue;
          if (seenExternalIdsRef.current.has(ev.id)) continue;
          newlySeen.push(ev);
          seenExternalIdsRef.current.add(ev.id);
        }

        // Avoid firing notifications on the initial load.
        if (events.length > 0 && newlySeen.length > 0) {
          newlySeen.slice(0, 3).forEach((ev) => {
            toast({
              title: `Nowe wydarzenie (${ev.source})`,
              description: ev.title,
            });
          });
          await Promise.allSettled(
            newlySeen.slice(0, 10).map((ev) =>
              fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "createCalendarEvent",
                  eventId: ev.id,
                  title: ev.title,
                  source: ev.source,
                  url: `/dashboard/calendar?eventId=${encodeURIComponent(ev.id)}`,
                }),
              })
            )
          );
        } else if (events.length === 0) {
          // Prime the set on first load so existing events don't create notifications.
          nextEvents.forEach((ev) => {
            if (ev?.id && (ev.source === "google" || ev.source === "outlook")) {
              seenExternalIdsRef.current.add(ev.id);
            }
          });
        }

        setEvents(nextEvents);
      } catch (e) {
        console.error(e);
        setLoadError("Nie udało się pobrać spotkań.");
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    },
    [events.length, toast]
  );

  useEffect(() => {
    if (!range?.start || !range?.end) return;
    fetchMeetings(range.start, range.end);
  }, [fetchMeetings, range, rangeVersion]);

  // Deep-link support: /dashboard/calendar?eventId=...
  useEffect(() => {
    const eventId = searchParams?.get("eventId");
    if (!eventId) return;
    const match = events.find((e) => e?.id === eventId) || null;
    if (!match) return;
    setSelectedEvent(match);
    setDetailsDialogOpen(true);
  }, [searchParams, events]);

  const handleDetailsDialogOpenChange = useCallback(
    (open) => {
      setDetailsDialogOpen(open);
      if (open) return;

      // On close: clear selection and remove eventId from URL
      // so refetch/listeners can't re-open the popup automatically.
      setSelectedEvent(null);
      const currentEventId = searchParams?.get("eventId");
      if (currentEventId) {
        router.replace("/dashboard/calendar");
      }
    },
    [router, searchParams]
  );

  const refresh = useCallback(() => {
    setRangeVersion((v) => v + 1);
  }, []);

  // Background refresh so external integrations (e.g. Google) appear automatically.
  useEffect(() => {
    const intervalMs = 10_000;
    let timer = null;

    const tick = () => {
      if (typeof document === "undefined") {
        refresh();
        return;
      }
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    timer = window.setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const handleSelectSlot = useCallback((slotInfo) => {
    const start = slotInfo?.start;
    const end = slotInfo?.end;
    if (!start || !end) return;

    setSlotStart(start);
    setSlotEnd(end);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    if (!event) return;
    if (event.source !== "local" && event.externalUrl) {
      window.open(event.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  }, []);

  const weekDays = useMemo(() => {
    const start = startOfWeek(controlledDate, {
      weekStartsOn: 1,
      locale: plLocale,
    });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [controlledDate]);

  const openCreateDialog = useCallback(() => {
    const baseDay = slotStart
      ? new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate())
      : new Date(
          controlledDate.getFullYear(),
          controlledDate.getMonth(),
          controlledDate.getDate()
        );

    const prefillStart = slotStart ? format(slotStart, "HH:mm") : "";
    const prefillEnd = slotEnd ? format(slotEnd, "HH:mm") : "";

    setCreateDay(baseDay);
    setCreateStartTime(prefillStart);
    setCreateEndTime(prefillEnd);

    // Reset formularza przy otwarciu.
    setNewTitle("");
    setNewMeetLink("");
    setNewFormError("");
    setIsSubmitting(false);
    setNewDialogOpen(true);
  }, [controlledDate, slotEnd, slotStart]);

  const handleCreateMeeting = useCallback(async () => {
    setNewFormError("");

    if (!createStartTime || !createEndTime) {
      setNewFormError("Wybierz godzinę rozpoczęcia i zakończenia.");
      return;
    }

    const title = newTitle.trim();
    if (!title) {
      setNewFormError("Podaj tytuł spotkania.");
      return;
    }

    const [sh, sm] = createStartTime.split(":").map((n) => Number(n));
    const [eh, em] = createEndTime.split(":").map((n) => Number(n));
    if (
      [sh, sm, eh, em].some((n) => Number.isNaN(n)) ||
      sh < 0 ||
      sh > 23 ||
      eh < 0 ||
      eh > 23
    ) {
      setNewFormError("Nieprawidłowy format godzin.");
      return;
    }

    const startDateTime = new Date(
      createDay.getFullYear(),
      createDay.getMonth(),
      createDay.getDate(),
      sh,
      sm,
      0,
      0
    );
    const endDateTime = new Date(
      createDay.getFullYear(),
      createDay.getMonth(),
      createDay.getDate(),
      eh,
      em,
      0,
      0
    );

    if (endDateTime <= startDateTime) {
      setNewFormError("Zakończenie musi być późniejsze niż rozpoczęcie.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMeeting({
        title,
        meetLink: newMeetLink.trim() || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      if (!res?.success) {
        setNewFormError(res?.error || "Nie udało się utworzyć spotkania.");
        return;
      }

      setNewDialogOpen(false);
      setSelectedEvent(null);
      refresh();
    } catch (e) {
      console.error(e);
      setNewFormError("Wystąpił błąd podczas zapisu spotkania.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    createDay,
    createEndTime,
    createStartTime,
    newMeetLink,
    newTitle,
    refresh,
  ]);

  const handleDeleteMeeting = useCallback(async () => {
    if (!selectedEvent?.id) return;

    setDeleteError("");
    setIsDeleting(true);
    try {
      const res = await deleteMeeting(selectedEvent.id);
      if (!res?.success) {
        setDeleteError(res?.error || "Nie udało się usunąć spotkania.");
        setDeleteConfirmOpen(true);
        return;
      }

      setDeleteConfirmOpen(false);
      setDetailsDialogOpen(false);
      setSelectedEvent(null);
      refresh();
    } catch (e) {
      console.error(e);
      setDeleteError("Wystąpił błąd podczas usuwania.");
      setDeleteConfirmOpen(true);
    } finally {
      setIsDeleting(false);
    }
  }, [refresh, selectedEvent?.id]);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-primary/20 bg-background/70 p-3 shadow-sm",
        className,
        "[&_.rbc-calendar]:h-full [&_.rbc-row-segment]:p-0 [&_.rbc-time-view]:h-full [&_.rbc-time-view]:flex [&_.rbc-time-view]:flex-col [&_.rbc-time-content]:flex-1 [&_.rbc-time-content]:min-h-0 [&_.rbc-time-content]:bg-background/60 [&_.rbc-time-content]:pb-0 [&_.rbc-time-header]:hidden [&_.rbc-time-gutter]:hidden [&_.rbc-allday-cell]:hidden [&_.rbc-day-bg]:bg-accent/20 [&_.rbc-off-range-bg]:opacity-40 [&_.rbc-header]:text-muted-foreground [&_.rbc-header]:font-medium [&_.rbc-day-slot]:bg-transparent [&_.rbc-event-label]:hidden! [&_.rbc-day-slot_.rbc-events-container]:m-0 [&_.rbc-day-slot_.rbc-events-container]:p-0 [&_.rbc-day-slot_.rbc-event]:w-full! [&_.rbc-day-slot_.rbc-event]:left-0! [&_.rbc-day-slot_.rbc-event]:right-0! [&_.rbc-day-slot_.rbc-event]:min-h-[28px]!"
      )}
      onWheelCapture={handleWheelNavigate}
    >
      <div className="min-h-0 flex-1">
        {loadError ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-destructive/80">
            {loadError}
          </div>
        ) : (
          <BigCalendar
            localizer={localizer}
            culture="pl"
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView={Views.WEEK}
            views={[Views.WEEK]}
            selectable
            popup={false}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onRangeChange={(r) => {
              if (Array.isArray(r)) {
                const first = r[0];
                const last = r[r.length - 1];
                if (!first || !last) return;
                setRange({
                  start: first,
                  end: addDays(last, 1),
                });
                return;
              }

              if (r?.start && r?.end) {
                setRange(r);
              }
            }}
            date={controlledDate}
            onNavigate={(d) => setControlledDate(d)}
            components={{
              toolbar: (toolbarProps) => (
                <CalendarToolbar {...toolbarProps} onCreate={openCreateDialog} />
              ),
              ...components,
            }}
            messages={{
              next: "Następny",
              previous: "Poprzedni",
              today: "Dzisiaj",
              week: "Tydzień",
              month: "Miesiąc",
              showMore: (total) => `+${total}`,
            }}
            eventPropGetter={() => ({
              style: {
                border: "none",
                background: "transparent",
                margin: 0,
                width: "100%",
                left: 0,
                right: "0px",
                padding: 0,
                borderRadius: 0,
              },
            })}
            style={{ height: "100%" }}
            defaultDate={initialDate}
            step={30}
          />
        )}

        {isLoading ? (
          <div className="absolute left-0 top-0 z-10 flex w-full items-center justify-center rounded-2xl bg-background/50 p-6">
            <span className="rounded-lg border border-primary/20 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
              Ładowanie spotkań…
            </span>
          </div>
        ) : null}
      </div>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-[560px] rounded-2xl border-primary/20 bg-background dark:bg-zinc-950 p-6 z-60">
          <DialogHeader>
            <DialogTitle className="text-xl">Nowe spotkanie</DialogTitle>
            <DialogDescription>
              Kliknięty slot został automatycznie przypisany jako czas spotkania.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Data spotkania</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="meeting-date-input" className="text-xs font-medium text-muted-foreground">
                    Wpisz ręcznie
                  </Label>
                  <Input
                    id="meeting-date-input"
                    type="date"
                    value={formatDateInputValue(createDay)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      const [y, m, d] = value.split("-").map((n) => Number(n));
                      if ([y, m, d].some((n) => Number.isNaN(n))) return;
                      setCreateDay(new Date(y, m - 1, d));
                    }}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Wybierz w kalendarzu
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full justify-start rounded-md border-input bg-transparent px-3 text-left font-normal"
                      >
                        {format(createDay, "PPP", { locale: plLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <ShadcnCalendar
                        mode="single"
                        selected={createDay}
                        onSelect={(d) => {
                          if (d) setCreateDay(d);
                        }}
                        weekStartsOn={1}
                        locale={plLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Tytuł</Label>
              <Input
                id="meeting-title"
                placeholder="np. Konsultacja"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-link">Link do spotkania (opcjonalnie)</Label>
              <Input
                id="meeting-link"
                placeholder="https://meet.google.com/..."
                value={newMeetLink}
                onChange={(e) => setNewMeetLink(e.target.value)}
              />
            </div>

            <div className="grid gap-2 rounded-xl border border-primary/15 bg-accent/30 p-4">
              <div className="text-sm font-medium">Godziny</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="meeting-start">Start</Label>
                  <Input
                    id="meeting-start"
                    type="time"
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meeting-end">Koniec</Label>
                  <Input
                    id="meeting-end"
                    type="time"
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {newFormError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {newFormError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-primary/30"
              onClick={() => setNewDialogOpen(false)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateMeeting}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 size-4" />
              {isSubmitting ? "Tworzenie..." : "Utwórz spotkanie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={handleDetailsDialogOpenChange}>
        <DialogContent className="max-w-[560px] rounded-2xl border-primary/20 bg-background dark:bg-zinc-950 p-6 z-60">
          <DialogHeader>
            <DialogTitle className="text-xl">Szczegóły spotkania</DialogTitle>
            <DialogDescription>
              Informacje o wybranym wydarzeniu.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-muted-foreground">Tytuł</div>
                <div className="rounded-xl border border-primary/15 bg-accent/30 px-4 py-3 text-foreground">
                  {selectedEvent.title}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-muted-foreground">Czas</div>
                <div className="rounded-xl border border-primary/15 bg-accent/30 px-4 py-3 text-foreground">
                  {formatDateTimePolish(selectedEvent.start)} —{" "}
                  {formatDateTimePolish(selectedEvent.end)}
                </div>
              </div>

              {selectedEvent.meetLink ? (
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Link</div>
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    title={selectedEvent.meetLink}
                    className="max-w-full overflow-hidden text-ellipsis break-all rounded-xl border border-primary/15 bg-accent/30 px-4 py-3 text-primary underline-offset-4 hover:underline"
                  >
                    {selectedEvent.meetLink}
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/15 bg-accent/20 px-4 py-3 text-sm text-muted-foreground">
                  {selectedEvent?.source === "local"
                    ? "Brak linku do spotkania."
                    : "To wydarzenie pochodzi z integracji zewnętrznej."}
                </div>
              )}

              {selectedEvent?.source !== "local" && selectedEvent?.externalUrl ? (
                <a
                  href={selectedEvent.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-accent/30 px-4 py-3 text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  Otwórz wydarzenie w źródle
                </a>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Brak danych.</div>
          )}

          <DialogFooter className="mt-4">
            {selectedEvent?.source === "local" ? (
              <AlertDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => {
                      setDeleteError("");
                    }}
                  >
                    Usuń spotkanie
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="z-60 rounded-2xl bg-background p-6 dark:bg-zinc-950">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć spotkanie?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tego nie da się cofnąć.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {deleteError ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {deleteError}
                    </div>
                  ) : null}

                  <AlertDialogFooter className="mt-2">
                    <AlertDialogCancel
                      className="rounded-xl"
                      disabled={isDeleting}
                    >
                      Anuluj
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteMeeting}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Usuwanie..." : "Usuń"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-primary/30"
              onClick={() => handleDetailsDialogOpenChange(false)}
            >
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


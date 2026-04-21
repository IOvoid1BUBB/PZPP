"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addLessonNote, deleteLessonNote } from "@/actions/studentLessonNotes";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

/**
 * @param {string} lessonId
 * @param {Array<{ id: string, content: string, createdAt: string | Date }>} initialNotes — z serwera, najnowsze pierwsze (orderBy desc)
 */
export default function StudentLessonNotesEditor({ lessonId, initialNotes = [] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState(() => (Array.isArray(initialNotes) ? initialNotes : []));

  const notesSig = useMemo(
    () => (Array.isArray(initialNotes) ? initialNotes.map((n) => n.id).join(",") : ""),
    [initialNotes],
  );

  useEffect(() => {
    setNotes(Array.isArray(initialNotes) ? initialNotes : []);
  }, [lessonId, notesSig, initialNotes]);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const onAdd = () => {
    startTransition(async () => {
      const result = await addLessonNote({ lessonId, content: draft });
      if (!result?.success) {
        toast({
          title: "Nie udało się zapisać notatki",
          description: result?.error ?? "Spróbuj ponownie.",
          variant: "destructive",
        });
        return;
      }
      if (result.note) {
        setNotes((prev) => [result.note, ...prev]);
      }
      setDraft("");
      toast({ title: "Notatka dodana" });
      router.refresh();
    });
  };

  const onDelete = (noteId) => {
    startTransition(async () => {
      const result = await deleteLessonNote(noteId);
      if (!result?.success) {
        toast({
          title: "Nie udało się usunąć",
          description: result?.error ?? "Spróbuj ponownie.",
          variant: "destructive",
        });
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: "Notatka usunięta" });
      router.refresh();
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="rounded-lg border bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Dodaj notatkę</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Każde zapisane pole to osobny wpis w bazie — możesz dodać ich dowolnie wiele.
        </p>
        <Textarea
          className="mt-3 min-h-[120px] resize-y"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Wpisz treść notatki..."
        />
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={onAdd} disabled={isPending}>
            {isPending ? "Zapisywanie..." : "Dodaj notatkę"}
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold">Twoje notatki</h4>
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Brak notatek — dodaj pierwszą powyżej.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id}>
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete(note.id)}
                      disabled={isPending}
                    >
                      Usuń
                    </Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

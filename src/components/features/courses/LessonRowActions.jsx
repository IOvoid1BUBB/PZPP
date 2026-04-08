"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import LessonFormDialog from "@/components/features/courses/LessonFormDialog";

export default function LessonRowActions({ lesson, disabled, onUpdate, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label="Akcje lekcji">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LessonFormDialog
          mode="edit"
          lesson={lesson}
          isPending={disabled}
          onSubmit={(values) => onUpdate(lesson.id, values)}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 size-4" />
              Edytuj
            </DropdownMenuItem>
          }
        />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => e.preventDefault()}
          className="p-0"
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="flex w-full items-center px-2 py-1.5 text-sm">
                <Trash2 className="mr-2 size-4" />
                Usuń
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć lekcję?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta operacja jest nieodwracalna. Lekcja zostanie trwale usunięta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lesson.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Usuń lekcję
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


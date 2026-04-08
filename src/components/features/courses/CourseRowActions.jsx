"use client";

import Link from "next/link";
import { MoreHorizontal, Trash2, Pencil, Settings } from "lucide-react";

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

import CourseFormDialog from "@/components/features/courses/CourseFormDialog";

export default function CourseRowActions({ course, disabled, onUpdate, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={disabled} aria-label="Akcje kursu">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/kursy/${course.id}`} className="flex items-center">
              <Settings className="mr-2 size-4" />
              Zarządzaj modułami i lekcjami
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <CourseFormDialog
            mode="edit"
            course={course}
            isPending={disabled}
            onSubmit={(values) => onUpdate(course.id, values)}
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
                  <AlertDialogTitle>Usunąć kurs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta operacja jest nieodwracalna. Usunięcie kursu spowoduje także
                    usunięcie wszystkich modułów i lekcji.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(course.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Usuń kurs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


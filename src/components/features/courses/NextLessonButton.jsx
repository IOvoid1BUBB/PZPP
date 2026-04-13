"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { completeLessonAndProceed } from "@/app/actions/courseActions";

export default function NextLessonButton({ courseId, lessonId }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleNextLesson = () => {
    startTransition(async () => {
      const result = await completeLessonAndProceed({ courseId, lessonId });

      if (!result?.success) {
        toast({
          title: "Nie udało się zapisać postępu",
          description: result?.error ?? "Spróbuj ponownie za chwilę.",
          variant: "destructive",
        });
        return;
      }

      if (result.progress === 100) {
        toast({
          title: "Gratulacje!",
          description: "Ukończyłeś kurs i wygenerowaliśmy certyfikat.",
        });
      }

      if (result.redirectUrl) {
        router.push(result.redirectUrl);
        router.refresh();
      }
    });
  };

  return (
    <Button type="button" onClick={handleNextLesson} disabled={isPending} variant="ghost">
      {isPending ? "Zapisywanie..." : "Następna lekcja ->"}
    </Button>
  );
}
